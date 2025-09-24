"""
Rate Limiting for Authentication Requests
Provides configurable rate limiting to prevent abuse and brute force attacks
"""

import asyncio
import logging
import time
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class RateLimitRule:
    """Configuration for a specific rate limit rule."""
    requests_per_window: int
    window_seconds: int
    block_duration_seconds: int = 0  # 0 means no blocking, just deny
    rule_name: str = "default"


@dataclass
class RateLimitBucket:
    """Rate limit bucket tracking requests for a specific key."""
    requests: list = field(default_factory=list)  # List of request timestamps
    blocked_until: Optional[datetime] = None
    total_requests: int = 0
    total_blocked: int = 0
    first_request: Optional[datetime] = None
    last_request: Optional[datetime] = None


class RateLimiter:
    """
    In-memory rate limiter with multiple rule support.

    Supports different rate limiting strategies:
    - Authentication failures (stricter limits)
    - General API requests (looser limits)
    - Per-user limits
    - Per-IP limits
    """

    def __init__(self):
        self.buckets: Dict[str, RateLimitBucket] = defaultdict(RateLimitBucket)
        self.rules: Dict[str, RateLimitRule] = {}
        self._lock = asyncio.Lock()

        # Default rate limit rules
        self.setup_default_rules()

        # Cleanup task
        self._cleanup_task = None
        self.start_cleanup_task()

    def setup_default_rules(self):
        """Setup default rate limiting rules for authentication."""
        self.rules = {
            # Authentication attempts - strict limits
            "auth_attempts": RateLimitRule(
                requests_per_window=5,
                window_seconds=300,  # 5 minutes
                block_duration_seconds=900,  # 15 minutes block
                rule_name="auth_attempts"
            ),

            # Failed authentication attempts - very strict
            "auth_failures": RateLimitRule(
                requests_per_window=3,
                window_seconds=300,  # 5 minutes
                block_duration_seconds=1800,  # 30 minutes block
                rule_name="auth_failures"
            ),

            # General API requests - more permissive
            "api_requests": RateLimitRule(
                requests_per_window=100,
                window_seconds=60,  # 1 minute
                block_duration_seconds=0,  # No blocking, just deny
                rule_name="api_requests"
            ),

            # Session validation - moderate limits
            "session_validation": RateLimitRule(
                requests_per_window=60,
                window_seconds=60,  # 1 minute
                block_duration_seconds=300,  # 5 minutes block
                rule_name="session_validation"
            ),

            # Workspace access checks - permissive
            "workspace_access": RateLimitRule(
                requests_per_window=200,
                window_seconds=60,  # 1 minute
                block_duration_seconds=0,
                rule_name="workspace_access"
            )
        }

    def add_rule(self, rule_name: str, rule: RateLimitRule):
        """Add or update a rate limiting rule."""
        self.rules[rule_name] = rule
        logger.info(f"Added rate limit rule '{rule_name}': {rule.requests_per_window}/{rule.window_seconds}s")

    def start_cleanup_task(self):
        """Start background task to clean up old buckets."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_worker())

    async def _cleanup_worker(self):
        """Background worker to clean up expired rate limit buckets."""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self.cleanup_expired_buckets()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in rate limit cleanup worker: {e}")

    async def cleanup_expired_buckets(self):
        """Remove expired buckets to prevent memory leaks."""
        async with self._lock:
            now = datetime.now()
            expired_keys = []

            for key, bucket in self.buckets.items():
                # Remove buckets with no recent activity (older than 1 hour)
                if (bucket.last_request and
                    now - bucket.last_request > timedelta(hours=1) and
                    (not bucket.blocked_until or now > bucket.blocked_until)):
                    expired_keys.append(key)

            for key in expired_keys:
                del self.buckets[key]

            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired rate limit buckets")

    def _get_bucket_key(self, identifier: str, rule_name: str) -> str:
        """Generate bucket key for rate limiting."""
        return f"{rule_name}:{identifier}"

    async def check_rate_limit(
        self,
        identifier: str,
        rule_name: str = "api_requests"
    ) -> Tuple[bool, Dict[str, any]]:
        """
        Check if request should be rate limited.

        Args:
            identifier: Unique identifier (IP, user ID, etc.)
            rule_name: Name of rate limit rule to apply

        Returns:
            Tuple of (allowed: bool, info: dict)
        """
        async with self._lock:
            now = datetime.now()

            if rule_name not in self.rules:
                logger.warning(f"Rate limit rule '{rule_name}' not found, allowing request")
                return True, {"rule": rule_name, "status": "rule_not_found"}

            rule = self.rules[rule_name]
            bucket_key = self._get_bucket_key(identifier, rule_name)
            bucket = self.buckets[bucket_key]

            # Update bucket metadata
            if bucket.first_request is None:
                bucket.first_request = now
            bucket.last_request = now
            bucket.total_requests += 1

            # Check if currently blocked
            if bucket.blocked_until and now < bucket.blocked_until:
                bucket.total_blocked += 1
                remaining_block_time = (bucket.blocked_until - now).total_seconds()

                logger.warning(f"Rate limit blocked: {identifier} for rule {rule_name}, "
                             f"blocked for {remaining_block_time:.0f}s more")

                return False, {
                    "rule": rule_name,
                    "status": "blocked",
                    "blocked_until": bucket.blocked_until.isoformat(),
                    "remaining_block_seconds": int(remaining_block_time),
                    "total_requests": bucket.total_requests,
                    "total_blocked": bucket.total_blocked
                }

            # Clean up old requests outside the window
            window_start = now - timedelta(seconds=rule.window_seconds)
            bucket.requests = [req_time for req_time in bucket.requests if req_time > window_start]

            # Add current request
            bucket.requests.append(now)

            # Check if limit exceeded
            if len(bucket.requests) > rule.requests_per_window:
                bucket.total_blocked += 1

                # Apply blocking if configured
                if rule.block_duration_seconds > 0:
                    bucket.blocked_until = now + timedelta(seconds=rule.block_duration_seconds)
                    block_info = f"blocked until {bucket.blocked_until.isoformat()}"
                else:
                    block_info = "request denied (no blocking)"

                logger.warning(f"Rate limit exceeded: {identifier} for rule {rule_name}, "
                             f"{len(bucket.requests)}/{rule.requests_per_window} in {rule.window_seconds}s, "
                             f"{block_info}")

                return False, {
                    "rule": rule_name,
                    "status": "rate_limited",
                    "requests_in_window": len(bucket.requests),
                    "limit": rule.requests_per_window,
                    "window_seconds": rule.window_seconds,
                    "blocked_until": bucket.blocked_until.isoformat() if bucket.blocked_until else None,
                    "total_requests": bucket.total_requests,
                    "total_blocked": bucket.total_blocked
                }

            # Request allowed
            return True, {
                "rule": rule_name,
                "status": "allowed",
                "requests_in_window": len(bucket.requests),
                "limit": rule.requests_per_window,
                "window_seconds": rule.window_seconds,
                "remaining_requests": rule.requests_per_window - len(bucket.requests),
                "reset_time": (window_start + timedelta(seconds=rule.window_seconds)).isoformat(),
                "total_requests": bucket.total_requests
            }

    async def record_auth_failure(self, identifier: str):
        """Record an authentication failure for stricter rate limiting."""
        await self.check_rate_limit(identifier, "auth_failures")
        logger.info(f"Recorded auth failure for {identifier}")

    async def record_auth_success(self, identifier: str):
        """Record successful authentication (resets failure count if needed)."""
        # You might want to implement failure count reset logic here
        logger.debug(f"Recorded auth success for {identifier}")

    def get_stats(self) -> Dict[str, any]:
        """Get rate limiter statistics."""
        total_buckets = len(self.buckets)
        active_blocks = 0
        now = datetime.now()

        for bucket in self.buckets.values():
            if bucket.blocked_until and now < bucket.blocked_until:
                active_blocks += 1

        return {
            "total_buckets": total_buckets,
            "active_blocks": active_blocks,
            "rules": {name: {
                "requests_per_window": rule.requests_per_window,
                "window_seconds": rule.window_seconds,
                "block_duration_seconds": rule.block_duration_seconds
            } for name, rule in self.rules.items()},
            "cleanup_task_running": self._cleanup_task and not self._cleanup_task.done()
        }

    async def reset_bucket(self, identifier: str, rule_name: str = None):
        """Reset rate limit bucket for identifier."""
        async with self._lock:
            if rule_name:
                bucket_key = self._get_bucket_key(identifier, rule_name)
                if bucket_key in self.buckets:
                    del self.buckets[bucket_key]
                    logger.info(f"Reset rate limit bucket for {identifier} rule {rule_name}")
            else:
                # Reset all buckets for identifier
                keys_to_delete = [key for key in self.buckets.keys()
                                if key.split(':', 1)[1] == identifier]
                for key in keys_to_delete:
                    del self.buckets[key]
                logger.info(f"Reset all rate limit buckets for {identifier}")

    async def shutdown(self):
        """Shutdown rate limiter and cleanup resources."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        logger.info("Rate limiter shutdown complete")


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get or create the global rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
        logger.info("Initialized global rate limiter")
    return _rate_limiter


async def check_auth_rate_limit(identifier: str) -> Tuple[bool, Dict[str, any]]:
    """Convenience function to check authentication rate limits."""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(identifier, "auth_attempts")


async def check_session_rate_limit(identifier: str) -> Tuple[bool, Dict[str, any]]:
    """Convenience function to check session validation rate limits."""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(identifier, "session_validation")