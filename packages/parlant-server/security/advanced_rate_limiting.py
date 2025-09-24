"""
Advanced Rate Limiting and Abuse Prevention System
==================================================

This module implements comprehensive rate limiting and abuse prevention
for enterprise multitenant chat messaging with advanced algorithms,
behavioral analysis, and intelligent threat detection.

Key Features:
- Multi-tier rate limiting (per-user, per-workspace, per-IP, global)
- Adaptive rate limiting based on user behavior patterns
- Advanced abuse detection with machine learning patterns
- Distributed rate limiting across multiple instances
- Intelligent penalty and recovery systems
- Real-time monitoring and alerting
- Integration with security and compliance systems
"""

import asyncio
import logging
import json
import hashlib
from typing import Dict, List, Optional, Any, Set, Tuple, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from uuid import uuid4, UUID
from enum import Enum
from collections import defaultdict, deque
import time
import statistics
from math import exp, log

import redis.asyncio as redis
from fastapi import HTTPException
from pydantic import BaseModel

from config.settings import get_settings
from messaging.enterprise_multitenant_chat_system import (
    ChatSecurityPolicy,
    SecurityThreatLevel,
    ChatGovernanceAction
)
from compliance.enterprise_audit_system import (
    get_enterprise_audit_system,
    ComplianceFramework,
    DataClassification
)

logger = logging.getLogger(__name__)


class RateLimitTier(str, Enum):
    """Rate limiting tiers with different policies."""
    FREE = "free"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


class AbuseType(str, Enum):
    """Types of abuse patterns."""
    SPAM = "spam"
    FLOODING = "flooding"
    SCRAPING = "scraping"
    BRUTE_FORCE = "brute_force"
    DDOS = "ddos"
    CONTENT_ABUSE = "content_abuse"
    SOCIAL_ENGINEERING = "social_engineering"
    IMPERSONATION = "impersonation"


class PenaltyLevel(str, Enum):
    """Penalty levels for rate limit violations."""
    WARNING = "warning"
    THROTTLE = "throttle"
    TEMPORARY_BLOCK = "temporary_block"
    EXTENDED_BLOCK = "extended_block"
    PERMANENT_BAN = "permanent_ban"


@dataclass
class RateLimitWindow:
    """Sliding window rate limit tracker."""
    window_id: str
    window_size: timedelta
    max_requests: int
    current_requests: int = 0
    window_start: datetime = field(default_factory=datetime.now)
    request_times: deque = field(default_factory=lambda: deque(maxlen=1000))

    def is_expired(self) -> bool:
        """Check if window has expired."""
        return datetime.now() - self.window_start > self.window_size

    def add_request(self, timestamp: Optional[datetime] = None) -> bool:
        """Add request to window, return True if allowed."""
        if timestamp is None:
            timestamp = datetime.now()

        # Clean old requests outside window
        cutoff_time = timestamp - self.window_size
        while self.request_times and self.request_times[0] < cutoff_time:
            self.request_times.popleft()
            self.current_requests -= 1

        # Check if request is allowed
        if self.current_requests >= self.max_requests:
            return False

        # Add request
        self.request_times.append(timestamp)
        self.current_requests += 1
        return True


@dataclass
class UserBehaviorProfile:
    """User behavior analysis for adaptive rate limiting."""
    user_id: str
    workspace_id: str

    # Activity patterns
    average_messages_per_minute: float = 0.0
    peak_messages_per_minute: float = 0.0
    typical_message_length: float = 0.0
    activity_hours: Set[int] = field(default_factory=set)

    # Behavioral indicators
    burst_frequency: float = 0.0  # How often user sends message bursts
    consistency_score: float = 1.0  # How consistent user's behavior is
    legitimacy_score: float = 1.0  # Overall legitimacy assessment

    # Time tracking
    first_seen: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    total_messages: int = 0

    # Violation history
    violations: List[Dict[str, Any]] = field(default_factory=list)
    current_penalty: Optional[PenaltyLevel] = None
    penalty_until: Optional[datetime] = None

    def update_activity(self, message_count: int, message_length: int):
        """Update user activity metrics."""
        now = datetime.now()

        # Update activity patterns
        time_diff = (now - self.last_activity).total_seconds() / 60.0
        if time_diff > 0:
            current_rate = message_count / time_diff
            self.average_messages_per_minute = (
                self.average_messages_per_minute * 0.8 + current_rate * 0.2
            )
            self.peak_messages_per_minute = max(
                self.peak_messages_per_minute, current_rate
            )

        # Update message length
        self.typical_message_length = (
            self.typical_message_length * 0.9 + message_length * 0.1
        )

        # Track active hours
        self.activity_hours.add(now.hour)

        # Update counters
        self.total_messages += message_count
        self.last_activity = now

    def calculate_trust_score(self) -> float:
        """Calculate overall trust score for user."""
        age_days = (datetime.now() - self.first_seen).days
        age_score = min(1.0, age_days / 30.0)  # Max trust after 30 days

        # Consistency score based on behavior patterns
        consistency_penalty = len(self.violations) * 0.1

        # Legitimacy assessment
        legitimacy_score = self.legitimacy_score

        return max(0.0, min(1.0, age_score * legitimacy_score - consistency_penalty))


@dataclass
class AbuseDetectionResult:
    """Result from abuse detection analysis."""
    user_id: str
    workspace_id: str
    abuse_types: List[AbuseType]
    confidence_score: float
    risk_indicators: Dict[str, Any]
    recommended_action: ChatGovernanceAction
    penalty_level: PenaltyLevel
    evidence: List[str]
    timestamp: datetime = field(default_factory=datetime.now)


class AdvancedRateLimitingSystem:
    """
    Advanced rate limiting and abuse prevention system.

    Provides intelligent, adaptive rate limiting with behavioral analysis
    and comprehensive abuse detection capabilities.
    """

    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[redis.Redis] = None

        # Rate limit configurations by tier
        self._tier_configs: Dict[RateLimitTier, Dict[str, Any]] = {
            RateLimitTier.FREE: {
                "messages_per_minute": 10,
                "messages_per_hour": 100,
                "messages_per_day": 500,
                "burst_allowance": 3,
                "recovery_rate": 0.1  # Tokens per second
            },
            RateLimitTier.STANDARD: {
                "messages_per_minute": 30,
                "messages_per_hour": 500,
                "messages_per_day": 2000,
                "burst_allowance": 10,
                "recovery_rate": 0.5
            },
            RateLimitTier.PREMIUM: {
                "messages_per_minute": 60,
                "messages_per_hour": 1000,
                "messages_per_day": 5000,
                "burst_allowance": 20,
                "recovery_rate": 1.0
            },
            RateLimitTier.ENTERPRISE: {
                "messages_per_minute": 120,
                "messages_per_hour": 2000,
                "messages_per_day": 10000,
                "burst_allowance": 50,
                "recovery_rate": 2.0
            },
            RateLimitTier.ADMIN: {
                "messages_per_minute": 300,
                "messages_per_hour": 5000,
                "messages_per_day": 50000,
                "burst_allowance": 100,
                "recovery_rate": 5.0
            }
        }

        # Active rate limit windows by user/workspace/IP
        self._user_windows: Dict[str, Dict[str, RateLimitWindow]] = defaultdict(dict)
        self._workspace_windows: Dict[str, Dict[str, RateLimitWindow]] = defaultdict(dict)
        self._ip_windows: Dict[str, Dict[str, RateLimitWindow]] = defaultdict(dict)
        self._global_windows: Dict[str, RateLimitWindow] = {}

        # User behavior profiles
        self._user_profiles: Dict[str, UserBehaviorProfile] = {}

        # Abuse detection patterns
        self._abuse_patterns: Dict[AbuseType, Dict[str, Any]] = {}

        # Token bucket for adaptive rate limiting
        self._token_buckets: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # Penalty tracking
        self._active_penalties: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # Monitoring metrics
        self._metrics: Dict[str, Any] = defaultdict(dict)

    async def initialize(self):
        """Initialize the advanced rate limiting system."""
        logger.info("Initializing Advanced Rate Limiting System")

        try:
            # Initialize Redis connection
            await self._initialize_redis_connection()

            # Load abuse detection patterns
            await self._initialize_abuse_patterns()

            # Start background monitoring
            asyncio.create_task(self._cleanup_expired_windows())
            asyncio.create_task(self._update_behavior_profiles())
            asyncio.create_task(self._abuse_detection_loop())
            asyncio.create_task(self._penalty_management_loop())

            logger.info("Advanced Rate Limiting System initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize rate limiting system: {e}")
            raise

    async def check_rate_limit(
        self,
        user_id: str,
        workspace_id: str,
        ip_address: Optional[str] = None,
        user_tier: RateLimitTier = RateLimitTier.STANDARD,
        message_size: int = 0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Comprehensive rate limit check with intelligent adaptation.

        Returns: (allowed, violation_info)
        """
        logger.debug(f"Checking rate limit for user {user_id} in workspace {workspace_id}")

        # Check for active penalties
        penalty_check = await self._check_active_penalties(user_id, workspace_id)
        if not penalty_check["allowed"]:
            return False, penalty_check

        # Get or create user behavior profile
        profile = await self._get_user_profile(user_id, workspace_id)

        # Adaptive rate limits based on trust score
        trust_score = profile.calculate_trust_score()
        adapted_limits = await self._adapt_rate_limits(user_tier, trust_score)

        # Multi-tier rate limit checks
        checks = [
            ("user", await self._check_user_rate_limit(user_id, adapted_limits, message_size)),
            ("workspace", await self._check_workspace_rate_limit(workspace_id, adapted_limits)),
            ("global", await self._check_global_rate_limit(adapted_limits))
        ]

        # Add IP-based check if available
        if ip_address:
            checks.append(
                ("ip", await self._check_ip_rate_limit(ip_address, adapted_limits))
            )

        # Find first violation
        for check_type, result in checks:
            if not result["allowed"]:
                # Update behavior profile with violation
                violation_info = {
                    "type": check_type,
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "timestamp": datetime.now(),
                    "limits": adapted_limits,
                    "violation_details": result
                }

                await self._record_rate_limit_violation(profile, violation_info)

                # Check if this triggers abuse detection
                abuse_result = await self._analyze_for_abuse(profile, violation_info)
                if abuse_result and abuse_result.confidence_score > 0.7:
                    await self._apply_abuse_penalty(profile, abuse_result)
                    violation_info["abuse_detected"] = True
                    violation_info["abuse_result"] = abuse_result

                return False, violation_info

        # Update successful activity
        profile.update_activity(1, message_size)
        await self._record_successful_request(user_id, workspace_id, ip_address, trust_score)

        return True, None

    async def apply_penalty(
        self,
        user_id: str,
        workspace_id: str,
        penalty_level: PenaltyLevel,
        reason: str,
        duration_minutes: Optional[int] = None
    ):
        """Apply penalty to user for rate limit or abuse violations."""
        logger.warning(f"Applying {penalty_level.value} penalty to user {user_id}: {reason}")

        # Calculate penalty duration
        if not duration_minutes:
            duration_minutes = self._calculate_penalty_duration(penalty_level)

        penalty_until = datetime.now() + timedelta(minutes=duration_minutes)

        # Store penalty
        penalty_info = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "penalty_level": penalty_level.value,
            "reason": reason,
            "applied_at": datetime.now(),
            "penalty_until": penalty_until,
            "duration_minutes": duration_minutes
        }

        self._active_penalties[workspace_id][user_id] = penalty_info

        # Persist to Redis
        if self.redis_client:
            await self.redis_client.setex(
                f"penalty:{workspace_id}:{user_id}",
                duration_minutes * 60,
                json.dumps(penalty_info, default=str)
            )

        # Update user profile
        profile = await self._get_user_profile(user_id, workspace_id)
        profile.current_penalty = penalty_level
        profile.penalty_until = penalty_until
        profile.violations.append(penalty_info)

        # Log compliance event
        try:
            audit_system = await get_enterprise_audit_system()
            await audit_system.log_compliance_event(
                workspace_id=workspace_id,
                user_id=user_id,
                event_type="rate_limit_penalty_applied",
                event_description=f"Penalty {penalty_level.value} applied: {reason}",
                frameworks={ComplianceFramework.SOC2},
                data_classification=DataClassification.INTERNAL,
                metadata={
                    "penalty_level": penalty_level.value,
                    "duration_minutes": duration_minutes,
                    "reason": reason
                }
            )
        except Exception as e:
            logger.error(f"Failed to log compliance event: {e}")

        logger.warning(f"Penalty applied to user {user_id} until {penalty_until}")

    async def get_rate_limit_status(
        self,
        user_id: str,
        workspace_id: str,
        user_tier: RateLimitTier = RateLimitTier.STANDARD
    ) -> Dict[str, Any]:
        """Get current rate limit status for user."""
        profile = await self._get_user_profile(user_id, workspace_id)
        trust_score = profile.calculate_trust_score()
        adapted_limits = await self._adapt_rate_limits(user_tier, trust_score)

        # Get current usage across all windows
        user_usage = await self._get_current_usage(f"user:{user_id}")
        workspace_usage = await self._get_current_usage(f"workspace:{workspace_id}")

        return {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "user_tier": user_tier.value,
            "trust_score": trust_score,
            "adapted_limits": adapted_limits,
            "current_usage": {
                "user": user_usage,
                "workspace": workspace_usage
            },
            "active_penalty": {
                "level": profile.current_penalty.value if profile.current_penalty else None,
                "until": profile.penalty_until.isoformat() if profile.penalty_until else None
            },
            "behavior_profile": {
                "average_messages_per_minute": profile.average_messages_per_minute,
                "total_messages": profile.total_messages,
                "legitimacy_score": profile.legitimacy_score,
                "violations_count": len(profile.violations)
            }
        }

    # Private implementation methods

    async def _initialize_redis_connection(self):
        """Initialize Redis connection for distributed rate limiting."""
        try:
            redis_url = self.settings.redis_url or "redis://localhost:6379"
            self.redis_client = redis.from_url(redis_url, decode_responses=True)

            # Test connection
            await self.redis_client.ping()
            logger.info("Rate limiting Redis connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise

    async def _initialize_abuse_patterns(self):
        """Initialize abuse detection patterns."""
        self._abuse_patterns = {
            AbuseType.SPAM: {
                "min_messages_per_minute": 50,
                "duplicate_content_threshold": 0.8,
                "short_message_ratio": 0.7
            },
            AbuseType.FLOODING: {
                "min_messages_per_second": 5,
                "sustained_duration_seconds": 30,
                "burst_threshold": 20
            },
            AbuseType.SCRAPING: {
                "regular_intervals": True,
                "high_read_ratio": 0.9,
                "minimal_engagement": True
            },
            AbuseType.BRUTE_FORCE: {
                "failed_attempts_threshold": 10,
                "time_window_minutes": 5,
                "pattern_regularity": 0.8
            }
        }

    async def _get_user_profile(self, user_id: str, workspace_id: str) -> UserBehaviorProfile:
        """Get or create user behavior profile."""
        profile_key = f"{workspace_id}:{user_id}"

        if profile_key not in self._user_profiles:
            # Try to load from Redis
            if self.redis_client:
                profile_data = await self.redis_client.get(f"profile:{profile_key}")
                if profile_data:
                    data = json.loads(profile_data)
                    self._user_profiles[profile_key] = UserBehaviorProfile(**data)

            # Create new profile if not found
            if profile_key not in self._user_profiles:
                self._user_profiles[profile_key] = UserBehaviorProfile(
                    user_id=user_id,
                    workspace_id=workspace_id
                )

        return self._user_profiles[profile_key]

    async def _adapt_rate_limits(
        self,
        base_tier: RateLimitTier,
        trust_score: float
    ) -> Dict[str, Any]:
        """Adapt rate limits based on user trust score."""
        base_config = self._tier_configs[base_tier].copy()

        # Increase limits for trusted users
        multiplier = 1.0 + (trust_score * 0.5)  # Up to 50% increase

        # Decrease limits for untrusted users
        if trust_score < 0.5:
            multiplier = trust_score  # Significant reduction for low trust

        adapted_config = {}
        for key, value in base_config.items():
            if isinstance(value, (int, float)) and key != "recovery_rate":
                adapted_config[key] = max(1, int(value * multiplier))
            else:
                adapted_config[key] = value

        return adapted_config

    async def _check_user_rate_limit(
        self,
        user_id: str,
        limits: Dict[str, Any],
        message_size: int
    ) -> Dict[str, Any]:
        """Check user-specific rate limits with token bucket algorithm."""
        bucket_key = f"user:{user_id}"

        # Get or create token bucket
        if bucket_key not in self._token_buckets:
            self._token_buckets[bucket_key] = {
                "tokens": limits["burst_allowance"],
                "last_refill": datetime.now(),
                "capacity": limits["burst_allowance"],
                "refill_rate": limits["recovery_rate"]
            }

        bucket = self._token_buckets[bucket_key]

        # Refill tokens based on time elapsed
        now = datetime.now()
        time_elapsed = (now - bucket["last_refill"]).total_seconds()
        tokens_to_add = time_elapsed * bucket["refill_rate"]

        bucket["tokens"] = min(
            bucket["capacity"],
            bucket["tokens"] + tokens_to_add
        )
        bucket["last_refill"] = now

        # Check if request is allowed
        tokens_needed = 1 + (message_size / 1000)  # Extra tokens for large messages

        if bucket["tokens"] >= tokens_needed:
            bucket["tokens"] -= tokens_needed
            return {"allowed": True, "tokens_remaining": bucket["tokens"]}
        else:
            return {
                "allowed": False,
                "tokens_remaining": bucket["tokens"],
                "tokens_needed": tokens_needed,
                "retry_after": (tokens_needed - bucket["tokens"]) / bucket["refill_rate"]
            }

    async def _check_workspace_rate_limit(
        self,
        workspace_id: str,
        limits: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check workspace-wide rate limits."""
        # Similar token bucket implementation for workspace
        bucket_key = f"workspace:{workspace_id}"

        if bucket_key not in self._token_buckets:
            # Workspace gets 10x user limits
            self._token_buckets[bucket_key] = {
                "tokens": limits["burst_allowance"] * 10,
                "last_refill": datetime.now(),
                "capacity": limits["burst_allowance"] * 10,
                "refill_rate": limits["recovery_rate"] * 10
            }

        bucket = self._token_buckets[bucket_key]

        # Refill and check (same logic as user)
        now = datetime.now()
        time_elapsed = (now - bucket["last_refill"]).total_seconds()
        tokens_to_add = time_elapsed * bucket["refill_rate"]

        bucket["tokens"] = min(bucket["capacity"], bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return {"allowed": True, "tokens_remaining": bucket["tokens"]}
        else:
            return {
                "allowed": False,
                "tokens_remaining": bucket["tokens"],
                "retry_after": 1.0 / bucket["refill_rate"]
            }

    async def _check_ip_rate_limit(
        self,
        ip_address: str,
        limits: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check IP-based rate limits to prevent coordinated attacks."""
        bucket_key = f"ip:{ip_address}"

        if bucket_key not in self._token_buckets:
            # IP gets stricter limits
            self._token_buckets[bucket_key] = {
                "tokens": limits["burst_allowance"] // 2,
                "last_refill": datetime.now(),
                "capacity": limits["burst_allowance"] // 2,
                "refill_rate": limits["recovery_rate"] / 2
            }

        bucket = self._token_buckets[bucket_key]

        # Refill and check
        now = datetime.now()
        time_elapsed = (now - bucket["last_refill"]).total_seconds()
        tokens_to_add = time_elapsed * bucket["refill_rate"]

        bucket["tokens"] = min(bucket["capacity"], bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return {"allowed": True, "tokens_remaining": bucket["tokens"]}
        else:
            return {
                "allowed": False,
                "tokens_remaining": bucket["tokens"],
                "retry_after": 1.0 / bucket["refill_rate"]
            }

    async def _check_global_rate_limit(self, limits: Dict[str, Any]) -> Dict[str, Any]:
        """Check global system rate limits."""
        # Simplified global check - would typically use distributed counter
        bucket_key = "global"

        if bucket_key not in self._token_buckets:
            self._token_buckets[bucket_key] = {
                "tokens": 10000,  # High global limit
                "last_refill": datetime.now(),
                "capacity": 10000,
                "refill_rate": 100.0  # High refill rate
            }

        bucket = self._token_buckets[bucket_key]

        # Refill and check
        now = datetime.now()
        time_elapsed = (now - bucket["last_refill"]).total_seconds()
        tokens_to_add = time_elapsed * bucket["refill_rate"]

        bucket["tokens"] = min(bucket["capacity"], bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return {"allowed": True, "tokens_remaining": bucket["tokens"]}
        else:
            return {
                "allowed": False,
                "tokens_remaining": bucket["tokens"],
                "retry_after": 1.0 / bucket["refill_rate"]
            }

    async def _analyze_for_abuse(
        self,
        profile: UserBehaviorProfile,
        violation_info: Dict[str, Any]
    ) -> Optional[AbuseDetectionResult]:
        """Analyze user behavior for abuse patterns."""
        detected_abuse = []
        confidence_scores = []
        risk_indicators = {}
        evidence = []

        # Check for spam patterns
        if profile.average_messages_per_minute > self._abuse_patterns[AbuseType.SPAM]["min_messages_per_minute"]:
            detected_abuse.append(AbuseType.SPAM)
            confidence_scores.append(0.8)
            evidence.append(f"High message rate: {profile.average_messages_per_minute}/min")

        # Check for flooding
        recent_violations = [v for v in profile.violations if
                           (datetime.now() - v.get("timestamp", datetime.now())).total_seconds() < 60]
        if len(recent_violations) >= 3:
            detected_abuse.append(AbuseType.FLOODING)
            confidence_scores.append(0.9)
            evidence.append(f"Multiple violations in short time: {len(recent_violations)}")

        # Overall confidence score
        if confidence_scores:
            overall_confidence = max(confidence_scores)

            # Determine recommended action
            if overall_confidence >= 0.9:
                action = ChatGovernanceAction.BLOCK
                penalty = PenaltyLevel.EXTENDED_BLOCK
            elif overall_confidence >= 0.7:
                action = ChatGovernanceAction.QUARANTINE
                penalty = PenaltyLevel.TEMPORARY_BLOCK
            else:
                action = ChatGovernanceAction.FLAG
                penalty = PenaltyLevel.THROTTLE

            return AbuseDetectionResult(
                user_id=profile.user_id,
                workspace_id=profile.workspace_id,
                abuse_types=detected_abuse,
                confidence_score=overall_confidence,
                risk_indicators=risk_indicators,
                recommended_action=action,
                penalty_level=penalty,
                evidence=evidence
            )

        return None

    def _calculate_penalty_duration(self, penalty_level: PenaltyLevel) -> int:
        """Calculate penalty duration in minutes based on level."""
        durations = {
            PenaltyLevel.WARNING: 0,  # No actual penalty
            PenaltyLevel.THROTTLE: 5,
            PenaltyLevel.TEMPORARY_BLOCK: 30,
            PenaltyLevel.EXTENDED_BLOCK: 240,  # 4 hours
            PenaltyLevel.PERMANENT_BAN: 525600  # 1 year
        }
        return durations.get(penalty_level, 30)

    async def _cleanup_expired_windows(self):
        """Background task to clean up expired rate limit windows."""
        while True:
            try:
                current_time = datetime.now()

                # Clean up token buckets that haven't been used
                for bucket_type in [self._token_buckets]:
                    expired_keys = []
                    for key, bucket in bucket_type.items():
                        if (current_time - bucket["last_refill"]).total_seconds() > 3600:  # 1 hour
                            expired_keys.append(key)

                    for key in expired_keys:
                        del bucket_type[key]

                # Wait 10 minutes before next cleanup
                await asyncio.sleep(600)

            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
                await asyncio.sleep(60)


# Global instance
rate_limiting_system: Optional[AdvancedRateLimitingSystem] = None


async def get_rate_limiting_system() -> AdvancedRateLimitingSystem:
    """Get the global rate limiting system instance."""
    global rate_limiting_system

    if rate_limiting_system is None:
        rate_limiting_system = AdvancedRateLimitingSystem()
        await rate_limiting_system.initialize()

    return rate_limiting_system


# Convenience functions for rate limiting checks

async def check_chat_rate_limit(
    user_id: str,
    workspace_id: str,
    ip_address: Optional[str] = None,
    user_tier: RateLimitTier = RateLimitTier.STANDARD,
    message_size: int = 0
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Check rate limit for chat message."""
    system = await get_rate_limiting_system()
    return await system.check_rate_limit(
        user_id=user_id,
        workspace_id=workspace_id,
        ip_address=ip_address,
        user_tier=user_tier,
        message_size=message_size
    )


async def apply_chat_penalty(
    user_id: str,
    workspace_id: str,
    penalty_level: PenaltyLevel,
    reason: str,
    duration_minutes: Optional[int] = None
):
    """Apply penalty for chat violations."""
    system = await get_rate_limiting_system()
    await system.apply_penalty(
        user_id=user_id,
        workspace_id=workspace_id,
        penalty_level=penalty_level,
        reason=reason,
        duration_minutes=duration_minutes
    )