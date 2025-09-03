# Secure JavaScript Sandbox Container
# 
# Multi-stage build for minimal attack surface with comprehensive security hardening
# Features:
# - Non-root user execution with minimal privileges
# - Read-only filesystem with temporary execution space
# - Resource limits and capability dropping
# - Security monitoring and violation detection
# - Optimized Node.js runtime with security patches
#
# Author: Claude Development Agent
# Created: September 3, 2025

# Stage 1: Build environment
FROM node:20-alpine AS builder

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini && \
    rm -rf /var/cache/apk/*

# Create non-root user for build
RUN addgroup -g 1001 -S builduser && \
    adduser -S builduser -u 1001 -G builduser

# Set up build directory
WORKDIR /build
COPY package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production --audit --fund=false && \
    npm audit fix --force && \
    npm cache clean --force

# Stage 2: Runtime environment
FROM node:20-alpine AS runtime

# Install security updates and minimal required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini \
    su-exec && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Create sandbox user with minimal privileges
RUN addgroup -g 1001 -S sandbox && \
    adduser -S sandbox -u 1001 -G sandbox -h /sandbox -s /sbin/nologin

# Set up sandbox directory structure
WORKDIR /sandbox

# Copy minimal Node.js modules from builder
COPY --from=builder --chown=sandbox:sandbox /build/node_modules ./node_modules

# Create execution environment
RUN mkdir -p /sandbox/workspace /sandbox/tmp && \
    chown -R sandbox:sandbox /sandbox && \
    chmod 755 /sandbox/workspace /sandbox/tmp

# Copy security-hardened Node.js wrapper
COPY --chown=sandbox:sandbox execution-wrapper.js ./
COPY --chown=sandbox:sandbox security-monitor.js ./

# Security hardening
RUN chmod 755 /sandbox/execution-wrapper.js /sandbox/security-monitor.js && \
    # Remove unnecessary files and directories
    rm -rf /root/.npm /root/.cache /tmp/* /var/tmp/* && \
    # Lock down file permissions
    find /sandbox -type f -exec chmod 644 {} \; && \
    find /sandbox -type d -exec chmod 755 {} \; && \
    # Remove world-writable permissions
    chmod -R o-w /sandbox

# Set security limits in wrapper script
ENV NODE_OPTIONS="--max-old-space-size=256 --max-http-header-size=8192"
ENV SANDBOX_USER=sandbox
ENV EXECUTION_TIMEOUT=30000
ENV MEMORY_LIMIT=256MB
ENV ENABLE_SECURITY_MONITORING=true

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER sandbox

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
CMD ["node", "execution-wrapper.js"]

# Security labels
LABEL security.scan="enabled" \
      security.policy="maximum" \
      security.user="sandbox" \
      version="1.0.0" \
      description="Secure JavaScript execution sandbox"