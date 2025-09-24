"""
Rate Limiting and Abuse Prevention System

Comprehensive rate limiting system for Parlant integration APIs with
adaptive limits, abuse detection, and graceful degradation.
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque

from .base import ParlantRateLimitError, ErrorContext
from .handlers import handle_rate_limit_error
from .monitoring import get_error_metrics


logger = logging.getLogger(__name__)


class RateLimitScope(Enum):
    """Scopes for rate limiting"""
    USER = "user"
    IP = "ip"
    WORKSPACE = "workspace"
    API_KEY = "api_key"
    GLOBAL = "global"


class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"
    ADAPTIVE = "adaptive"


@dataclass
class RateLimit:
    """Rate limit configuration"""
    requests_per_minute: int
    requests_per_hour: int = 0
    requests_per_day: int = 0
    burst_allowance: int = 0  # Additional requests allowed in burst
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW


@dataclass
class RateLimitState:
    """Current state of rate limiting for a key"""
    requests_count: int = 0
    window_start: datetime = field(default_factory=datetime.now)
    last_request: Optional[datetime] = None
    tokens: float = 0.0  # For token bucket strategy
    burst_used: int = 0
    total_requests: int = 0  # All-time counter


@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    remaining: int
    reset_at: datetime
    limit: int
    strategy: str
    retry_after_seconds: Optional[int] = None


class RateLimiter:
    """
    Advanced rate limiting system with multiple strategies and abuse prevention.

    Features:
    - Multiple rate limiting strategies (token bucket, sliding window, etc.)
    - Per-user, per-IP, and per-workspace limits
    - Adaptive limits based on user behavior
    - Burst allowances for legitimate traffic spikes
    - Abuse detection and automatic blocking
    - Graceful degradation under high load
    """

    def __init__(self):
        self.rate_limits: Dict[str, RateLimit] = {}
        self.rate_states: Dict[str, RateLimitState] = defaultdict(RateLimitState)
        self.blocked_keys: Dict[str, datetime] = {}
        self.abuse_patterns: Dict[str, List[datetime]] = defaultdict(list)

        # Default rate limits
        self._setup_default_limits()

        # Cleanup task
        self._cleanup_task = None
        self._start_cleanup_task()

    def _setup_default_limits(self):
        """Setup default rate limits for different scopes"""
        # User limits (per authenticated user)
        self.rate_limits["user:default"] = RateLimit(
            requests_per_minute=100,
            requests_per_hour=1000,
            requests_per_day=10000,
            burst_allowance=20
        )

        # Premium user limits
        self.rate_limits["user:premium"] = RateLimit(
            requests_per_minute=500,
            requests_per_hour=5000,
            requests_per_day=50000,
            burst_allowance=100
        )

        # IP limits (per IP address)
        self.rate_limits["ip:default"] = RateLimit(
            requests_per_minute=200,
            requests_per_hour=2000,
            requests_per_day=20000,
            burst_allowance=50
        )

        # Workspace limits
        self.rate_limits["workspace:default"] = RateLimit(
            requests_per_minute=1000,
            requests_per_hour=10000,
            requests_per_day=100000,
            burst_allowance=200
        )

        # API key limits
        self.rate_limits["api_key:default"] = RateLimit(
            requests_per_minute=300,
            requests_per_hour=3000,
            requests_per_day=30000,
            burst_allowance=60
        )

        # Global limits (system-wide protection)
        self.rate_limits["global:system"] = RateLimit(
            requests_per_minute=10000,
            requests_per_hour=100000,
            burst_allowance=2000
        )

    async def check_rate_limit(
        self,
        key: str,
        scope: RateLimitScope,
        user_tier: str = "default",
        context: Optional[ErrorContext] = None
    ) -> RateLimitResult:
        """
        Check if request is within rate limits.

        Args:
            key: Unique identifier (user_id, IP, workspace_id, etc.)
            scope: Rate limit scope
            user_tier: User tier for limit selection
            context: Request context

        Returns:
            RateLimitResult with decision and metadata
        """
        # Check if key is blocked for abuse
        if await self._is_blocked_for_abuse(key):
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=self.blocked_keys.get(key, datetime.now() + timedelta(hours=1)),
                limit=0,
                strategy="blocked",
                retry_after_seconds=3600
            )

        # Get rate limit configuration
        limit_config = self._get_rate_limit_config(scope, user_tier)
        state_key = f"{scope.value}:{key}"
        state = self.rate_states[state_key]

        # Apply rate limiting strategy
        if limit_config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            result = await self._check_sliding_window(limit_config, state, state_key)
        elif limit_config.strategy == RateLimitStrategy.TOKEN_BUCKET:
            result = await self._check_token_bucket(limit_config, state, state_key)
        elif limit_config.strategy == RateLimitStrategy.FIXED_WINDOW:
            result = await self._check_fixed_window(limit_config, state, state_key)
        else:  # ADAPTIVE
            result = await self._check_adaptive_limit(limit_config, state, state_key, key, scope)

        # Record metrics
        await self._record_rate_limit_metrics(scope, key, result, context)

        # Check for abuse patterns if request was allowed
        if result.allowed:
            await self._detect_abuse_patterns(key, context)

        return result

    async def _check_sliding_window(
        self,
        limit_config: RateLimit,
        state: RateLimitState,
        state_key: str
    ) -> RateLimitResult:
        """Check rate limit using sliding window strategy"""
        now = datetime.now()
        window_size = timedelta(minutes=1)

        # Reset window if needed
        if now >= state.window_start + window_size:
            state.requests_count = 0
            state.window_start = now
            state.burst_used = 0

        # Check limit (including burst allowance)
        effective_limit = limit_config.requests_per_minute + limit_config.burst_allowance

        if state.requests_count >= effective_limit:
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=state.window_start + window_size,
                limit=limit_config.requests_per_minute,
                strategy="sliding_window",
                retry_after_seconds=int((state.window_start + window_size - now).total_seconds())
            )

        # Allow request
        state.requests_count += 1
        state.last_request = now
        state.total_requests += 1

        # Track burst usage
        if state.requests_count > limit_config.requests_per_minute:
            state.burst_used = state.requests_count - limit_config.requests_per_minute

        remaining = max(0, effective_limit - state.requests_count)

        return RateLimitResult(
            allowed=True,
            remaining=remaining,
            reset_at=state.window_start + window_size,
            limit=limit_config.requests_per_minute,
            strategy="sliding_window"
        )

    async def _check_token_bucket(
        self,
        limit_config: RateLimit,
        state: RateLimitState,
        state_key: str
    ) -> RateLimitResult:
        """Check rate limit using token bucket strategy"""
        now = datetime.now()

        # Initialize tokens if first request
        if state.last_request is None:
            state.tokens = limit_config.requests_per_minute
            state.last_request = now

        # Calculate tokens to add based on time elapsed
        time_elapsed = (now - state.last_request).total_seconds() / 60.0  # minutes
        tokens_to_add = time_elapsed * limit_config.requests_per_minute

        # Add tokens up to bucket capacity
        bucket_capacity = limit_config.requests_per_minute + limit_config.burst_allowance
        state.tokens = min(bucket_capacity, state.tokens + tokens_to_add)
        state.last_request = now

        # Check if we have tokens available
        if state.tokens < 1:
            # Calculate when next token will be available
            time_for_next_token = 60.0 / limit_config.requests_per_minute  # seconds
            next_token_at = now + timedelta(seconds=time_for_next_token)

            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=next_token_at,
                limit=limit_config.requests_per_minute,
                strategy="token_bucket",
                retry_after_seconds=int(time_for_next_token)
            )

        # Consume one token
        state.tokens -= 1
        state.total_requests += 1

        return RateLimitResult(
            allowed=True,
            remaining=int(state.tokens),
            reset_at=now + timedelta(minutes=1),
            limit=limit_config.requests_per_minute,
            strategy="token_bucket"
        )

    async def _check_adaptive_limit(
        self,
        limit_config: RateLimit,
        state: RateLimitState,
        state_key: str,
        key: str,
        scope: RateLimitScope
    ) -> RateLimitResult:
        """Check rate limit using adaptive strategy"""
        # Analyze recent behavior to adjust limits
        recent_pattern = await self._analyze_request_pattern(key, scope)

        # Adjust limits based on pattern
        adjusted_limit = limit_config.requests_per_minute

        if recent_pattern.get('consistent_usage', False):
            # Reward consistent, predictable usage
            adjusted_limit = int(adjusted_limit * 1.2)
        elif recent_pattern.get('bursty_pattern', False):
            # Penalize bursty, unpredictable usage
            adjusted_limit = int(adjusted_limit * 0.8)

        # Create temporary adjusted config
        adjusted_config = RateLimit(
            requests_per_minute=adjusted_limit,
            requests_per_hour=limit_config.requests_per_hour,
            requests_per_day=limit_config.requests_per_day,
            burst_allowance=int(limit_config.burst_allowance * 0.5),  # Reduce burst for adaptive
            strategy=RateLimitStrategy.SLIDING_WINDOW
        )

        return await self._check_sliding_window(adjusted_config, state, state_key)

    async def _analyze_request_pattern(self, key: str, scope: RateLimitScope) -> Dict[str, Any]:
        """Analyze request patterns for adaptive limiting"""
        # This is a simplified analysis - in production, you'd use more sophisticated metrics
        state_key = f"{scope.value}:{key}"
        state = self.rate_states[state_key]

        # Analyze based on available data
        analysis = {
            'consistent_usage': False,
            'bursty_pattern': False,
            'total_requests': state.total_requests
        }

        # Simple heuristics (can be enhanced)
        if state.total_requests > 1000:  # Enough data for analysis
            # Check if usage is consistent (would need historical data)
            analysis['consistent_usage'] = state.burst_used < state.total_requests * 0.1
            analysis['bursty_pattern'] = state.burst_used > state.total_requests * 0.3

        return analysis

    async def _detect_abuse_patterns(self, key: str, context: Optional[ErrorContext]):
        """Detect potential abuse patterns"""
        now = datetime.now()
        self.abuse_patterns[key].append(now)

        # Keep only last hour of requests
        hour_ago = now - timedelta(hours=1)
        self.abuse_patterns[key] = [
            timestamp for timestamp in self.abuse_patterns[key]
            if timestamp >= hour_ago
        ]

        # Check for abuse indicators
        requests_last_hour = len(self.abuse_patterns[key])

        # Different thresholds for different types of keys
        abuse_threshold = 5000  # Default threshold

        if requests_last_hour >= abuse_threshold:
            # Block the key
            self.blocked_keys[key] = now + timedelta(hours=1)

            logger.critical(f"Abuse detected and blocked: {key}", extra={
                'key': key,
                'requests_last_hour': requests_last_hour,
                'threshold': abuse_threshold,
                'context': context.to_dict() if context else {}
            })

            # Record abuse metric
            metrics = get_error_metrics()
            metrics.increment_counter('abuse_blocked', {'key_type': key.split(':')[0] if ':' in key else 'unknown'})

    async def _is_blocked_for_abuse(self, key: str) -> bool:
        """Check if key is blocked for abuse"""
        if key in self.blocked_keys:
            if datetime.now() < self.blocked_keys[key]:
                return True
            else:
                # Block expired, remove it
                del self.blocked_keys[key]
        return False

    def _get_rate_limit_config(self, scope: RateLimitScope, user_tier: str) -> RateLimit:
        """Get rate limit configuration for scope and tier"""
        config_key = f"{scope.value}:{user_tier}"

        if config_key in self.rate_limits:
            return self.rate_limits[config_key]

        # Fall back to default
        default_key = f"{scope.value}:default"
        if default_key in self.rate_limits:
            return self.rate_limits[default_key]

        # Ultimate fallback
        return RateLimit(requests_per_minute=60, burst_allowance=10)

    async def _record_rate_limit_metrics(
        self,
        scope: RateLimitScope,
        key: str,
        result: RateLimitResult,
        context: Optional[ErrorContext]
    ):
        """Record rate limiting metrics"""
        metrics = get_error_metrics()

        # Record rate limit check
        metrics.increment_counter('rate_limit_checks', {
            'scope': scope.value,
            'allowed': str(result.allowed).lower(),
            'strategy': result.strategy
        })

        # Record rate limit violations
        if not result.allowed:
            metrics.increment_counter('rate_limit_violations', {
                'scope': scope.value,
                'strategy': result.strategy
            })

            # Create rate limit error for logging
            if context:
                error = handle_rate_limit_error(
                    limit=result.limit,
                    remaining=result.remaining,
                    reset_at=result.reset_at,
                    context=context
                )

    def _start_cleanup_task(self):
        """Start background cleanup task"""
        async def cleanup():
            while True:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._cleanup_old_data()

        if asyncio.get_event_loop().is_running():
            self._cleanup_task = asyncio.create_task(cleanup())

    async def _cleanup_old_data(self):
        """Clean up old rate limiting data"""
        now = datetime.now()

        # Clean up expired blocks
        expired_blocks = [
            key for key, expiry in self.blocked_keys.items()
            if now >= expiry
        ]
        for key in expired_blocks:
            del self.blocked_keys[key]

        # Clean up old rate states (inactive for > 1 hour)
        hour_ago = now - timedelta(hours=1)
        inactive_states = [
            key for key, state in self.rate_states.items()
            if state.last_request and state.last_request < hour_ago
        ]
        for key in inactive_states[:1000]:  # Clean up in batches
            del self.rate_states[key]

        # Clean up old abuse patterns
        for key in list(self.abuse_patterns.keys()):
            self.abuse_patterns[key] = [
                timestamp for timestamp in self.abuse_patterns[key]
                if timestamp >= hour_ago
            ]
            if not self.abuse_patterns[key]:
                del self.abuse_patterns[key]

        logger.debug("Rate limiting cleanup completed", extra={
            'expired_blocks': len(expired_blocks),
            'inactive_states_cleaned': len(inactive_states),
            'active_rate_states': len(self.rate_states)
        })

    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        now = datetime.now()

        return {
            'timestamp': now.isoformat(),
            'active_rate_states': len(self.rate_states),
            'blocked_keys': len(self.blocked_keys),
            'abuse_patterns_tracked': len(self.abuse_patterns),
            'rate_limit_configs': len(self.rate_limits),
            'blocked_until': {
                key: expiry.isoformat()
                for key, expiry in self.blocked_keys.items()
            }
        }

    # Configuration methods
    def set_rate_limit(self, scope: RateLimitScope, tier: str, limit: RateLimit):
        """Set custom rate limit configuration"""
        config_key = f"{scope.value}:{tier}"
        self.rate_limits[config_key] = limit

    def unblock_key(self, key: str) -> bool:
        """Manually unblock a key"""
        if key in self.blocked_keys:
            del self.blocked_keys[key]
            logger.info(f"Manually unblocked key: {key}")
            return True
        return False


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


# Convenience functions
async def check_user_rate_limit(
    user_id: str,
    user_tier: str = "default",
    context: Optional[ErrorContext] = None
) -> RateLimitResult:
    """Check rate limit for user"""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(user_id, RateLimitScope.USER, user_tier, context)


async def check_ip_rate_limit(
    ip_address: str,
    context: Optional[ErrorContext] = None
) -> RateLimitResult:
    """Check rate limit for IP address"""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(ip_address, RateLimitScope.IP, "default", context)


async def check_workspace_rate_limit(
    workspace_id: str,
    context: Optional[ErrorContext] = None
) -> RateLimitResult:
    """Check rate limit for workspace"""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(workspace_id, RateLimitScope.WORKSPACE, "default", context)


async def check_global_rate_limit(
    context: Optional[ErrorContext] = None
) -> RateLimitResult:
    """Check global system rate limit"""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit("system", RateLimitScope.GLOBAL, "system", context)


def get_rate_limiting_stats() -> Dict[str, Any]:
    """Get rate limiting statistics"""
    limiter = get_rate_limiter()
    return limiter.get_stats()


def unblock_key(key: str) -> bool:
    """Manually unblock a key"""
    limiter = get_rate_limiter()
    return limiter.unblock_key(key)