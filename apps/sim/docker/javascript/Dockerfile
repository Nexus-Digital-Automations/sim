# JavaScript Code Execution Sandbox
# Secure, minimal container for executing JavaScript code with NPM packages
FROM node:18-alpine

# Create non-root user for security
RUN addgroup -g 1000 sandbox && \
    adduser -D -s /bin/sh -u 1000 -G sandbox sandbox

# Install security and monitoring tools
RUN apk add --no-cache \
    dumb-init \
    su-exec \
    curl \
    && rm -rf /var/cache/apk/*

# Create secure directories
RUN mkdir -p /app /tmp/sandbox /var/tmp/sandbox && \
    chown -R sandbox:sandbox /app /tmp/sandbox /var/tmp/sandbox && \
    chmod 755 /app && \
    chmod 1777 /tmp/sandbox /var/tmp/sandbox

# Install commonly used NPM packages for security and performance
# These are pre-installed to avoid downloading during execution
WORKDIR /app
COPY package.json .
RUN npm install --production --no-audit --no-fund && \
    npm cache clean --force && \
    chown -R sandbox:sandbox /app/node_modules

# Set up secure environment
ENV NODE_ENV=production
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Remove unnecessary files and packages
RUN rm -rf \
    /root/.npm \
    /usr/local/lib/node_modules/npm/docs \
    /usr/local/lib/node_modules/npm/man \
    /usr/local/lib/node_modules/npm/html \
    /opt/yarn* \
    && find /usr/local/lib/node_modules/npm -name test -o -name .nyc_output | xargs rm -rf

# Security: Remove shell history and disable shell features
RUN rm -f /root/.ash_history /home/sandbox/.ash_history && \
    echo 'set +h' >> /home/sandbox/.profile

# Switch to non-root user
USER sandbox
WORKDIR /tmp/sandbox

# Set resource limits in the container (additional to Docker limits)
ENV NODE_OPTIONS="--max-old-space-size=256 --max-executable-size=128"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sleep", "infinity"]