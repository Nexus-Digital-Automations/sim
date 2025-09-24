"""
Error Monitoring and Metrics System

Comprehensive monitoring system for tracking errors, performance metrics,
and integration health across all Parlant integration components.
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
import json

from .base import ParlantIntegrationError, ErrorContext, ErrorCategory, ErrorSeverity


logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to collect"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


@dataclass
class MetricData:
    """Individual metric data point"""
    timestamp: datetime
    value: float
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class ErrorEvent:
    """Error event for tracking and analysis"""
    timestamp: datetime
    error_type: str
    error_code: str
    category: str
    severity: str
    endpoint: str
    method: str
    user_id: Optional[str]
    workspace_id: Optional[str]
    duration_ms: float
    context: Dict[str, Any]


class ErrorMetrics:
    """
    Collects and manages error metrics for monitoring and alerting.

    Tracks:
    - Error rates by category and endpoint
    - Response times and performance metrics
    - Circuit breaker states
    - Authentication/authorization failures
    - Rate limiting violations
    """

    def __init__(self, retention_hours: int = 24):
        self.retention_hours = retention_hours
        self.metrics: Dict[str, List[MetricData]] = defaultdict(list)
        self.error_events: deque = deque(maxlen=10000)  # Keep last 10k errors
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, List[float]] = defaultdict(list)

        # Performance tracking
        self.response_times: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.error_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        # Start cleanup task
        self._cleanup_task = None
        self._start_cleanup_task()

    def record_request_success(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None
    ):
        """Record successful request metrics"""
        tags = {
            'endpoint': endpoint,
            'method': method,
            'status_code': str(status_code)
        }

        # Record response time
        self.record_metric('request_duration_ms', duration_ms, MetricType.HISTOGRAM, tags)
        self.response_times[f"{method}:{endpoint}"].append(duration_ms)

        # Increment success counter
        self.increment_counter('requests_total', tags)
        self.increment_counter('requests_success_total', tags)

        # Track requests per endpoint
        endpoint_key = f"{method}:{endpoint}"
        self.increment_counter(f'endpoint_requests:{endpoint_key}')

    def record_request_error(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        error_category: Optional[str],
        error_code: Optional[str],
        duration_ms: float,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None
    ):
        """Record error metrics"""
        tags = {
            'endpoint': endpoint,
            'method': method,
            'status_code': str(status_code),
            'error_category': error_category or 'unknown',
            'error_code': error_code or 'unknown'
        }

        # Record error response time
        self.record_metric('error_duration_ms', duration_ms, MetricType.HISTOGRAM, tags)

        # Increment error counters
        self.increment_counter('requests_total', tags)
        self.increment_counter('requests_error_total', tags)
        self.increment_counter('errors_by_category', {'category': error_category or 'unknown'})
        self.increment_counter('errors_by_code', {'error_code': error_code or 'unknown'})

        # Track endpoint errors
        endpoint_key = f"{method}:{endpoint}"
        self.error_counts[endpoint_key][error_category or 'unknown'] += 1

        # Create error event
        error_event = ErrorEvent(
            timestamp=datetime.now(),
            error_type=error_code or 'unknown',
            error_code=error_code or 'unknown',
            category=error_category or 'unknown',
            severity='medium',  # Default severity
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            workspace_id=workspace_id,
            duration_ms=duration_ms,
            context={'status_code': status_code}
        )
        self.error_events.append(error_event)

    def record_integration_error(self, error: ParlantIntegrationError, context: ErrorContext):
        """Record integration-specific error metrics"""
        tags = {
            'error_category': error.category.value,
            'error_code': error.error_code,
            'severity': error.severity.value,
            'endpoint': context.endpoint or 'unknown',
            'method': context.method or 'unknown'
        }

        # Increment error counters
        self.increment_counter('integration_errors_total', tags)
        self.increment_counter(f'errors_by_severity', {'severity': error.severity.value})

        # Record error event
        error_event = ErrorEvent(
            timestamp=error.context.timestamp,
            error_type=type(error).__name__,
            error_code=error.error_code,
            category=error.category.value,
            severity=error.severity.value,
            endpoint=context.endpoint or 'unknown',
            method=context.method or 'unknown',
            user_id=context.user_id,
            workspace_id=context.workspace_id,
            duration_ms=0,  # Duration not available for integration errors
            context=context.to_dict()
        )
        self.error_events.append(error_event)

    def record_metric(
        self,
        name: str,
        value: float,
        metric_type: MetricType,
        tags: Optional[Dict[str, str]] = None
    ):
        """Record a metric data point"""
        metric_data = MetricData(
            timestamp=datetime.now(),
            value=value,
            tags=tags or {}
        )

        metric_key = self._create_metric_key(name, tags)
        self.metrics[metric_key].append(metric_data)

        # Update appropriate storage based on type
        if metric_type == MetricType.COUNTER:
            self.counters[metric_key] += value
        elif metric_type == MetricType.GAUGE:
            self.gauges[metric_key] = value
        elif metric_type == MetricType.HISTOGRAM:
            self.histograms[metric_key].append(value)

    def increment_counter(self, name: str, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric"""
        self.record_metric(name, 1, MetricType.COUNTER, tags)

    def set_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric value"""
        self.record_metric(name, value, MetricType.GAUGE, tags)

    def _create_metric_key(self, name: str, tags: Optional[Dict[str, str]]) -> str:
        """Create unique metric key from name and tags"""
        if not tags:
            return name

        tag_string = ','.join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}[{tag_string}]"

    def get_error_rate(self, time_window_minutes: int = 5) -> Dict[str, float]:
        """Get error rates for different categories"""
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        recent_errors = [e for e in self.error_events if e.timestamp >= cutoff_time]

        if not recent_errors:
            return {}

        # Calculate error rates by category
        error_rates = {}
        total_errors = len(recent_errors)

        category_counts = defaultdict(int)
        for error in recent_errors:
            category_counts[error.category] += 1

        for category, count in category_counts.items():
            error_rates[category] = (count / total_errors) * 100

        return error_rates

    def get_endpoint_stats(self) -> Dict[str, Any]:
        """Get statistics by endpoint"""
        stats = {}

        for endpoint, response_times in self.response_times.items():
            if response_times:
                times = list(response_times)
                stats[endpoint] = {
                    'avg_response_time_ms': sum(times) / len(times),
                    'min_response_time_ms': min(times),
                    'max_response_time_ms': max(times),
                    'request_count': len(times),
                    'error_counts': dict(self.error_counts.get(endpoint, {}))
                }

        return stats

    def get_circuit_breaker_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics"""
        try:
            from .connectivity import get_connectivity_manager
            manager = asyncio.create_task(get_connectivity_manager())
            if manager.done():
                return manager.result().get_circuit_breaker_stats()
        except:
            pass

        return {}

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics"""
        now = datetime.now()

        return {
            'timestamp': now.isoformat(),
            'metrics_summary': {
                'total_counters': len(self.counters),
                'total_gauges': len(self.gauges),
                'total_histograms': len(self.histograms),
                'total_error_events': len(self.error_events)
            },
            'error_rates': self.get_error_rate(),
            'endpoint_stats': self.get_endpoint_stats(),
            'circuit_breaker_stats': self.get_circuit_breaker_metrics(),
            'top_errors': self._get_top_errors(),
            'performance_summary': self._get_performance_summary()
        }

    def _get_top_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top errors by frequency"""
        if not self.error_events:
            return []

        # Count errors by code
        error_counts = defaultdict(int)
        for error in self.error_events:
            error_counts[error.error_code] += 1

        # Sort by count and return top errors
        top_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

        return [{'error_code': code, 'count': count} for code, count in top_errors]

    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        if not self.response_times:
            return {}

        all_times = []
        for times in self.response_times.values():
            all_times.extend(times)

        if not all_times:
            return {}

        return {
            'avg_response_time_ms': sum(all_times) / len(all_times),
            'min_response_time_ms': min(all_times),
            'max_response_time_ms': max(all_times),
            'total_requests': len(all_times)
        }

    def _start_cleanup_task(self):
        """Start background cleanup task"""
        async def cleanup_old_metrics():
            while True:
                await asyncio.sleep(3600)  # Run every hour
                await self._cleanup_old_data()

        if asyncio.get_event_loop().is_running():
            self._cleanup_task = asyncio.create_task(cleanup_old_metrics())

    async def _cleanup_old_data(self):
        """Remove old metric data beyond retention period"""
        cutoff_time = datetime.now() - timedelta(hours=self.retention_hours)

        # Clean up metrics
        for metric_key, data_points in self.metrics.items():
            self.metrics[metric_key] = [
                dp for dp in data_points if dp.timestamp >= cutoff_time
            ]

        # Clean up histograms (keep only recent values)
        for hist_key, values in self.histograms.items():
            if len(values) > 10000:  # Keep only last 10k values
                self.histograms[hist_key] = values[-10000:]

        logger.debug("Completed metrics cleanup")


class ErrorLogger:
    """
    Advanced error logging with structured output and external integrations.

    Features:
    - Structured logging with JSON output
    - Error correlation and deduplication
    - External service integration (webhook, Slack, etc.)
    - Error trend analysis
    """

    def __init__(self):
        self.error_history: deque = deque(maxlen=5000)
        self.error_correlations: Dict[str, List[str]] = defaultdict(list)
        self.webhook_urls: List[str] = []

    async def log_error(
        self,
        error: Exception,
        context: ErrorContext,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Log error with comprehensive context"""
        error_record = {
            'timestamp': datetime.now().isoformat(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context.to_dict() if context else {},
            'additional_data': additional_data or {}
        }

        # Add Parlant-specific information if available
        if isinstance(error, ParlantIntegrationError):
            error_record.update({
                'error_code': error.error_code,
                'error_category': error.category.value,
                'error_severity': error.severity.value,
                'user_message': error.user_message,
                'details': error.details
            })

        # Store in history
        self.error_history.append(error_record)

        # Send to external services if configured
        await self._send_to_webhooks(error_record)

        # Log structured error
        logger.error("Structured error logged", extra=error_record)

    def configure_webhooks(self, webhook_urls: List[str]):
        """Configure webhook URLs for error notifications"""
        self.webhook_urls = webhook_urls

    async def _send_to_webhooks(self, error_record: Dict[str, Any]):
        """Send error to configured webhooks"""
        if not self.webhook_urls:
            return

        import httpx

        for webhook_url in self.webhook_urls:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        webhook_url,
                        json=error_record,
                        timeout=10.0
                    )
            except Exception as e:
                logger.warning(f"Failed to send error to webhook {webhook_url}: {e}")

    def get_error_trends(self, hours: int = 24) -> Dict[str, Any]:
        """Analyze error trends over time"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_errors = [
            error for error in self.error_history
            if datetime.fromisoformat(error['timestamp']) >= cutoff_time
        ]

        if not recent_errors:
            return {'trend': 'stable', 'error_count': 0}

        # Analyze trends
        error_counts_by_hour = defaultdict(int)
        for error in recent_errors:
            hour = datetime.fromisoformat(error['timestamp']).strftime('%Y-%m-%d %H:00:00')
            error_counts_by_hour[hour] += 1

        # Determine trend
        if len(error_counts_by_hour) < 2:
            trend = 'insufficient_data'
        else:
            hours_sorted = sorted(error_counts_by_hour.keys())
            recent_count = error_counts_by_hour[hours_sorted[-1]]
            previous_count = error_counts_by_hour[hours_sorted[-2]]

            if recent_count > previous_count * 1.5:
                trend = 'increasing'
            elif recent_count < previous_count * 0.5:
                trend = 'decreasing'
            else:
                trend = 'stable'

        return {
            'trend': trend,
            'error_count': len(recent_errors),
            'hourly_counts': dict(error_counts_by_hour)
        }


# Global instances
_error_metrics: Optional[ErrorMetrics] = None
_error_logger: Optional[ErrorLogger] = None


def get_error_metrics() -> ErrorMetrics:
    """Get global error metrics instance"""
    global _error_metrics
    if _error_metrics is None:
        _error_metrics = ErrorMetrics()
    return _error_metrics


def get_error_logger() -> ErrorLogger:
    """Get global error logger instance"""
    global _error_logger
    if _error_logger is None:
        _error_logger = ErrorLogger()
    return _error_logger


def setup_error_monitoring(
    retention_hours: int = 24,
    webhook_urls: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Setup error monitoring with configuration"""
    global _error_metrics, _error_logger

    # Initialize metrics
    _error_metrics = ErrorMetrics(retention_hours=retention_hours)

    # Initialize logger
    _error_logger = ErrorLogger()
    if webhook_urls:
        _error_logger.configure_webhooks(webhook_urls)

    logger.info("Error monitoring initialized successfully")

    return {
        'status': 'initialized',
        'retention_hours': retention_hours,
        'webhook_count': len(webhook_urls) if webhook_urls else 0
    }


async def get_monitoring_health() -> Dict[str, Any]:
    """Get monitoring system health status"""
    try:
        metrics = get_error_metrics()
        error_logger = get_error_logger()

        health_data = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'metrics': {
                'total_events': len(metrics.error_events),
                'active_counters': len(metrics.counters),
                'active_gauges': len(metrics.gauges),
                'active_histograms': len(metrics.histograms)
            },
            'logger': {
                'history_size': len(error_logger.error_history),
                'webhook_count': len(error_logger.webhook_urls)
            }
        }

        return health_data

    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


# Export monitoring data
async def export_metrics(format: str = 'json') -> str:
    """Export metrics in specified format"""
    metrics = get_error_metrics()
    stats = metrics.get_stats()

    if format.lower() == 'json':
        return json.dumps(stats, indent=2)
    else:
        # Could add other formats (Prometheus, CSV, etc.)
        raise ValueError(f"Unsupported export format: {format}")


def create_monitoring_dashboard_data() -> Dict[str, Any]:
    """Create data for monitoring dashboard"""
    metrics = get_error_metrics()
    error_logger = get_error_logger()

    return {
        'overview': {
            'total_requests': sum(metrics.counters.get(k, 0) for k in metrics.counters if 'requests_total' in k),
            'total_errors': sum(metrics.counters.get(k, 0) for k in metrics.counters if 'requests_error_total' in k),
            'avg_response_time': metrics._get_performance_summary().get('avg_response_time_ms', 0)
        },
        'error_rates': metrics.get_error_rate(),
        'endpoint_stats': metrics.get_endpoint_stats(),
        'error_trends': error_logger.get_error_trends(),
        'top_errors': metrics._get_top_errors(),
        'circuit_breaker_stats': metrics.get_circuit_breaker_metrics()
    }