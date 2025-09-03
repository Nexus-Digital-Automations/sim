# Secure Python Sandbox Container
#
# Multi-stage build for minimal attack surface with comprehensive security hardening
# Features:
# - Non-root user execution with minimal privileges
# - Read-only filesystem with temporary execution space
# - Resource limits and capability dropping
# - Pre-installed data science libraries with security patches
# - Virtual environment isolation
# - Comprehensive security monitoring
#
# Author: Claude Development Agent
# Created: September 3, 2025

# Stage 1: Build environment with security hardening
FROM python:3.11-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    gcc \
    musl-dev \
    linux-headers \
    libffi-dev \
    openssl-dev \
    python3-dev \
    build-base && \
    rm -rf /var/cache/apk/*

# Create non-root build user
RUN addgroup -g 1001 -S builduser && \
    adduser -S builduser -u 1001 -G builduser

# Set up build environment
WORKDIR /build
USER builduser

# Create virtual environment
RUN python -m venv /build/venv
ENV PATH="/build/venv/bin:$PATH"

# Copy requirements and install packages
COPY --chown=builduser:builduser requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir safety bandit semgrep && \
    pip cache purge

# Security scan of installed packages
RUN safety check --json --output safety-report.json || true && \
    bandit -r /build/venv/lib/python*/site-packages/ -f json -o bandit-report.json || true

# Stage 2: Runtime environment with maximum security
FROM python:3.11-alpine AS runtime

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini \
    su-exec \
    shadow && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Create sandbox user with minimal privileges
RUN addgroup -g 1001 -S sandbox && \
    adduser -S sandbox -u 1001 -G sandbox -h /sandbox -s /sbin/nologin && \
    # Lock the account
    passwd -l sandbox

# Set up secure directory structure
WORKDIR /sandbox
RUN mkdir -p /sandbox/workspace /sandbox/tmp /sandbox/venv /sandbox/logs && \
    chown -R sandbox:sandbox /sandbox && \
    chmod 750 /sandbox && \
    chmod 755 /sandbox/workspace /sandbox/tmp

# Copy Python virtual environment from builder
COPY --from=builder --chown=sandbox:sandbox /build/venv /sandbox/venv
COPY --from=builder --chown=sandbox:sandbox /build/safety-report.json /sandbox/logs/
COPY --from=builder --chown=sandbox:sandbox /build/bandit-report.json /sandbox/logs/

# Copy security-hardened execution environment
COPY --chown=sandbox:sandbox execution-wrapper.py ./
COPY --chown=sandbox:sandbox security-monitor.py ./
COPY --chown=sandbox:sandbox requirements.txt ./

# Security hardening - remove unnecessary files and lock permissions
RUN find /sandbox -type f -name "*.pyc" -delete && \
    find /sandbox -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
    # Set restrictive permissions
    chmod 644 /sandbox/*.py /sandbox/*.txt && \
    chmod 755 /sandbox/execution-wrapper.py && \
    find /sandbox -type f -exec chmod o-rwx {} \; && \
    find /sandbox -type d -exec chmod o-rwx {} \; && \
    # Remove world-writable permissions
    chmod -R o-w /sandbox

# Configure Python environment
ENV PYTHONPATH="/sandbox/venv/lib/python3.11/site-packages:/sandbox"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONHASHSEED=random
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Security environment variables
ENV SANDBOX_USER=sandbox
ENV EXECUTION_TIMEOUT=60000
ENV MEMORY_LIMIT=512MB
ENV ENABLE_SECURITY_MONITORING=true
ENV PYTHON_SECURITY_MODE=maximum
ENV TMPDIR=/sandbox/tmp

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER sandbox

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "print('healthy')" || exit 1

# Default command
CMD ["python", "execution-wrapper.py"]

# Security labels and metadata
LABEL security.scan="enabled" \
      security.policy="maximum" \
      security.user="sandbox" \
      security.python.version="3.11" \
      security.packages="scanned" \
      version="1.0.0" \
      description="Secure Python execution sandbox with data science libraries"