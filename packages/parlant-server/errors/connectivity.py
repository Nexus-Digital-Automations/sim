"""
Connectivity Error Handling and Circuit Breaker Implementation

Provides robust error handling for Parlant server connectivity, external API calls,
and service availability with retry logic and circuit breaker patterns.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, Callable, Union, List, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

import httpx
from fastapi import HTTPException

from .base import (
    ParlantConnectivityError,
    ParlantCircuitBreakerError,
    ErrorContext,
    ErrorSeverity
)
from .handlers import handle_connectivity_error, handle_circuit_breaker_error


logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, blocking requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class RetryStrategy(Enum):
    """Retry strategies for failed requests"""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    FIXED_INTERVAL = "fixed_interval"
    LINEAR_BACKOFF = "linear_backoff"


@dataclass
class RetryConfig:
    """Configuration for retry logic"""
    max_attempts: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay: float = 1.0
    max_delay: float = 60.0
    multiplier: float = 2.0
    jitter: bool = True


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5
    recovery_timeout: float = 60.0  # seconds
    half_open_max_calls: int = 3
    success_threshold: int = 2  # successes needed to close circuit


@dataclass
class CircuitBreakerState:
    """Current state of a circuit breaker"""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    next_attempt_time: Optional[datetime] = None
    half_open_calls: int = 0


class ConnectivityManager:
    """
    Manages connectivity to external services with retry logic and circuit breakers.

    Provides centralized handling of:
    - HTTP client configuration and timeouts
    - Retry logic with multiple strategies
    - Circuit breaker pattern for service protection
    - Connection pooling and keepalive
    - Error classification and reporting
    """

    def __init__(self):
        self.http_clients: Dict[str, httpx.AsyncClient] = {}
        self.circuit_breakers: Dict[str, CircuitBreakerState] = {}
        self.service_configs: Dict[str, Dict[str, Any]] = {}

    async def initialize(self):
        """Initialize connectivity manager"""
        logger.info("Initializing Connectivity Manager")

        # Register default service configurations
        await self._register_default_services()

        logger.info("Connectivity Manager initialized successfully")

    async def cleanup(self):
        """Cleanup all HTTP clients"""
        for client in self.http_clients.values():
            await client.aclose()
        self.http_clients.clear()

    async def _register_default_services(self):
        """Register default service configurations"""
        # Parlant server configuration
        await self.register_service(
            service_name="parlant_server",
            base_url="http://localhost:8800",
            timeout_config={
                "connect": 10.0,
                "read": 30.0,
                "write": 10.0,
                "pool": 10.0
            },
            retry_config=RetryConfig(
                max_attempts=3,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                base_delay=1.0,
                max_delay=30.0
            ),
            circuit_breaker_config=CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=60.0
            )
        )

        # Sim API configuration
        await self.register_service(
            service_name="sim_api",
            base_url="http://localhost:3000",
            timeout_config={
                "connect": 5.0,
                "read": 15.0,
                "write": 5.0,
                "pool": 5.0
            },
            retry_config=RetryConfig(
                max_attempts=2,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                base_delay=0.5,
                max_delay=10.0
            ),
            circuit_breaker_config=CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=30.0
            )
        )

        # External LLM APIs
        for provider in ["openai", "anthropic"]:
            await self.register_service(
                service_name=f"llm_{provider}",
                base_url=f"https://api.{provider}.com" if provider == "openai" else "https://api.anthropic.com",
                timeout_config={
                    "connect": 10.0,
                    "read": 60.0,
                    "write": 10.0,
                    "pool": 10.0
                },
                retry_config=RetryConfig(
                    max_attempts=3,
                    strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                    base_delay=2.0,
                    max_delay=60.0
                ),
                circuit_breaker_config=CircuitBreakerConfig(
                    failure_threshold=10,
                    recovery_timeout=120.0
                )
            )

    async def register_service(
        self,
        service_name: str,
        base_url: str,
        timeout_config: Optional[Dict[str, float]] = None,
        retry_config: Optional[RetryConfig] = None,
        circuit_breaker_config: Optional[CircuitBreakerConfig] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        """Register a new service with its configuration"""
        # Create HTTP client
        timeout = httpx.Timeout(**(timeout_config or {}))

        client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            headers=headers or {},
            follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=50)
        )

        self.http_clients[service_name] = client

        # Store configuration
        self.service_configs[service_name] = {
            "base_url": base_url,
            "retry_config": retry_config or RetryConfig(),
            "circuit_breaker_config": circuit_breaker_config or CircuitBreakerConfig(),
            "timeout_config": timeout_config or {}
        }

        # Initialize circuit breaker
        self.circuit_breakers[service_name] = CircuitBreakerState()

        logger.info(f"Registered service: {service_name} at {base_url}")

    async def make_request(
        self,
        service_name: str,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        context: Optional[ErrorContext] = None
    ) -> httpx.Response:
        """
        Make HTTP request with retry logic and circuit breaker protection.

        Args:
            service_name: Name of the registered service
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            data: Request body data
            params: Query parameters
            headers: Additional headers
            context: Error context for logging

        Returns:
            HTTP response

        Raises:
            ParlantConnectivityError: If connection fails after retries
            ParlantCircuitBreakerError: If circuit breaker is open
        """
        if service_name not in self.http_clients:
            raise handle_connectivity_error(
                service_name=service_name,
                message=f"Service {service_name} not registered",
                error_code="SERVICE_NOT_REGISTERED",
                context=context
            )

        # Check circuit breaker
        circuit_state = self.circuit_breakers[service_name]
        if not await self._can_attempt_request(service_name, circuit_state):
            raise handle_circuit_breaker_error(
                service_name=service_name,
                failure_count=circuit_state.failure_count,
                next_attempt_at=circuit_state.next_attempt_time,
                context=context
            )

        client = self.http_clients[service_name]
        config = self.service_configs[service_name]
        retry_config = config["retry_config"]

        last_error = None

        for attempt in range(retry_config.max_attempts):
            try:
                logger.debug(f"Attempting request to {service_name}{endpoint} (attempt {attempt + 1})")

                response = await client.request(
                    method=method,
                    url=endpoint,
                    json=data,
                    params=params,
                    headers=headers or {}
                )

                # Request succeeded - update circuit breaker
                await self._record_success(service_name, circuit_state)

                return response

            except (httpx.RequestError, httpx.TimeoutException) as e:
                last_error = e
                logger.warning(f"Request to {service_name}{endpoint} failed (attempt {attempt + 1}): {e}")

                # Record failure
                await self._record_failure(service_name, circuit_state, e)

                # Don't retry on last attempt
                if attempt == retry_config.max_attempts - 1:
                    break

                # Calculate delay before retry
                delay = self._calculate_retry_delay(retry_config, attempt)
                await asyncio.sleep(delay)

            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error in request to {service_name}{endpoint}: {e}")
                await self._record_failure(service_name, circuit_state, e)
                break

        # All retries exhausted
        raise handle_connectivity_error(
            service_name=service_name,
            message=f"Failed to connect to {service_name} after {retry_config.max_attempts} attempts",
            error_code="CONNECTION_FAILED",
            context=context,
            cause=last_error
        )

    async def _can_attempt_request(self, service_name: str, circuit_state: CircuitBreakerState) -> bool:
        """Check if request can be attempted based on circuit breaker state"""
        config = self.service_configs[service_name]["circuit_breaker_config"]
        now = datetime.now()

        if circuit_state.state == CircuitState.CLOSED:
            return True

        elif circuit_state.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if (circuit_state.last_failure_time and
                now >= circuit_state.last_failure_time + timedelta(seconds=config.recovery_timeout)):
                # Move to half-open state
                circuit_state.state = CircuitState.HALF_OPEN
                circuit_state.half_open_calls = 0
                circuit_state.success_count = 0
                logger.info(f"Circuit breaker for {service_name} moved to HALF_OPEN state")
                return True
            return False

        elif circuit_state.state == CircuitState.HALF_OPEN:
            # Allow limited calls in half-open state
            return circuit_state.half_open_calls < config.half_open_max_calls

        return False

    async def _record_success(self, service_name: str, circuit_state: CircuitBreakerState):
        """Record successful request"""
        config = self.service_configs[service_name]["circuit_breaker_config"]

        if circuit_state.state == CircuitState.HALF_OPEN:
            circuit_state.success_count += 1
            circuit_state.half_open_calls += 1

            if circuit_state.success_count >= config.success_threshold:
                # Close circuit
                circuit_state.state = CircuitState.CLOSED
                circuit_state.failure_count = 0
                circuit_state.success_count = 0
                circuit_state.half_open_calls = 0
                circuit_state.last_failure_time = None
                circuit_state.next_attempt_time = None
                logger.info(f"Circuit breaker for {service_name} CLOSED after successful recovery")

        elif circuit_state.state == CircuitState.CLOSED:
            # Reset failure count on success
            circuit_state.failure_count = 0

    async def _record_failure(self, service_name: str, circuit_state: CircuitBreakerState, error: Exception):
        """Record failed request"""
        config = self.service_configs[service_name]["circuit_breaker_config"]
        now = datetime.now()

        circuit_state.failure_count += 1
        circuit_state.last_failure_time = now

        if circuit_state.state == CircuitState.HALF_OPEN:
            # Failure in half-open state - back to open
            circuit_state.state = CircuitState.OPEN
            circuit_state.next_attempt_time = now + timedelta(seconds=config.recovery_timeout)
            circuit_state.half_open_calls = 0
            circuit_state.success_count = 0
            logger.warning(f"Circuit breaker for {service_name} back to OPEN state due to failure in half-open")

        elif circuit_state.state == CircuitState.CLOSED:
            if circuit_state.failure_count >= config.failure_threshold:
                # Open circuit
                circuit_state.state = CircuitState.OPEN
                circuit_state.next_attempt_time = now + timedelta(seconds=config.recovery_timeout)
                logger.warning(f"Circuit breaker for {service_name} OPENED due to {circuit_state.failure_count} failures")

    def _calculate_retry_delay(self, config: RetryConfig, attempt: int) -> float:
        """Calculate delay before retry based on strategy"""
        if config.strategy == RetryStrategy.FIXED_INTERVAL:
            delay = config.base_delay

        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * (attempt + 1)

        else:  # EXPONENTIAL_BACKOFF
            delay = config.base_delay * (config.multiplier ** attempt)

        # Apply maximum delay limit
        delay = min(delay, config.max_delay)

        # Add jitter to prevent thundering herd
        if config.jitter:
            import random
            delay = delay * (0.5 + 0.5 * random.random())

        return delay

    async def health_check_service(self, service_name: str) -> Dict[str, Any]:
        """Perform health check on a specific service"""
        if service_name not in self.http_clients:
            return {
                "service": service_name,
                "status": "not_registered",
                "error": "Service not registered"
            }

        circuit_state = self.circuit_breakers[service_name]

        try:
            # Try to make a health check request
            response = await self.make_request(
                service_name=service_name,
                method="GET",
                endpoint="/health",
                context=ErrorContext(additional_data={"check_type": "health_check"})
            )

            return {
                "service": service_name,
                "status": "healthy",
                "response_time_ms": response.elapsed.total_seconds() * 1000,
                "circuit_state": circuit_state.state.value,
                "failure_count": circuit_state.failure_count
            }

        except (ParlantConnectivityError, ParlantCircuitBreakerError) as e:
            return {
                "service": service_name,
                "status": "unhealthy",
                "error": str(e),
                "circuit_state": circuit_state.state.value,
                "failure_count": circuit_state.failure_count,
                "next_attempt_time": circuit_state.next_attempt_time.isoformat() if circuit_state.next_attempt_time else None
            }

    async def health_check_all(self) -> Dict[str, Any]:
        """Perform health check on all registered services"""
        results = {}

        for service_name in self.service_configs.keys():
            results[service_name] = await self.health_check_service(service_name)

        # Overall health status
        healthy_count = sum(1 for result in results.values() if result["status"] == "healthy")
        total_count = len(results)

        overall_status = "healthy" if healthy_count == total_count else (
            "degraded" if healthy_count > 0 else "unhealthy"
        )

        return {
            "overall_status": overall_status,
            "healthy_services": healthy_count,
            "total_services": total_count,
            "services": results
        }

    def get_circuit_breaker_stats(self) -> Dict[str, Any]:
        """Get statistics for all circuit breakers"""
        stats = {}

        for service_name, circuit_state in self.circuit_breakers.items():
            stats[service_name] = {
                "state": circuit_state.state.value,
                "failure_count": circuit_state.failure_count,
                "success_count": circuit_state.success_count,
                "half_open_calls": circuit_state.half_open_calls,
                "last_failure_time": circuit_state.last_failure_time.isoformat() if circuit_state.last_failure_time else None,
                "next_attempt_time": circuit_state.next_attempt_time.isoformat() if circuit_state.next_attempt_time else None
            }

        return stats

    @asynccontextmanager
    async def service_context(self, service_name: str):
        """Context manager for service operations with automatic cleanup"""
        try:
            yield self
        except Exception as e:
            circuit_state = self.circuit_breakers.get(service_name)
            if circuit_state:
                await self._record_failure(service_name, circuit_state, e)
            raise


# Global connectivity manager instance
_connectivity_manager: Optional[ConnectivityManager] = None


async def get_connectivity_manager() -> ConnectivityManager:
    """Get global connectivity manager instance"""
    global _connectivity_manager
    if _connectivity_manager is None:
        _connectivity_manager = ConnectivityManager()
        await _connectivity_manager.initialize()
    return _connectivity_manager


async def make_request(
    service_name: str,
    method: str,
    endpoint: str,
    **kwargs
) -> httpx.Response:
    """Convenience function to make requests through the global connectivity manager"""
    manager = await get_connectivity_manager()
    return await manager.make_request(service_name, method, endpoint, **kwargs)


async def check_service_health(service_name: str) -> Dict[str, Any]:
    """Check health of a specific service"""
    manager = await get_connectivity_manager()
    return await manager.health_check_service(service_name)


async def check_all_services_health() -> Dict[str, Any]:
    """Check health of all registered services"""
    manager = await get_connectivity_manager()
    return await manager.health_check_all()


async def get_circuit_breaker_status() -> Dict[str, Any]:
    """Get circuit breaker status for all services"""
    manager = await get_connectivity_manager()
    return manager.get_circuit_breaker_stats()


# Cleanup function for application shutdown
async def cleanup_connectivity():
    """Cleanup connectivity manager resources"""
    global _connectivity_manager
    if _connectivity_manager:
        await _connectivity_manager.cleanup()
        _connectivity_manager = None