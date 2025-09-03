# Python Data Science Code Execution Sandbox
# Secure, minimal container for executing Python code with data science libraries
FROM python:3.11-slim

# Create non-root user for security
RUN groupadd -r sandbox && useradd -r -g sandbox sandbox

# Install system dependencies and security tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    build-essential \
    pkg-config \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create secure directories
RUN mkdir -p /app /tmp/sandbox /var/tmp/sandbox /home/sandbox && \
    chown -R sandbox:sandbox /app /tmp/sandbox /var/tmp/sandbox /home/sandbox && \
    chmod 755 /app && \
    chmod 1777 /tmp/sandbox /var/tmp/sandbox

# Install Python packages
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# Install additional data science packages that might have binary dependencies
RUN pip install --no-cache-dir \
    tensorflow-cpu==2.13.0 \
    torch==2.0.1+cpu \
    torchvision==0.15.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu \
    || echo "Optional ML packages not installed"

# Clean up build dependencies to reduce image size
RUN apt-get purge -y build-essential pkg-config libffi-dev && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Set up secure Python environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONHASHSEED=random
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Create matplotlib config directory and set backend
RUN mkdir -p /home/sandbox/.matplotlib && \
    echo "backend: Agg" > /home/sandbox/.matplotlib/matplotlibrc && \
    chown -R sandbox:sandbox /home/sandbox/.matplotlib

# Security: Remove shell history and disable shell features
RUN rm -f /root/.bash_history /home/sandbox/.bash_history && \
    echo 'set +h' >> /home/sandbox/.profile

# Switch to non-root user
USER sandbox
WORKDIR /tmp/sandbox

# Set Python path and other environment variables
ENV PYTHONPATH="/tmp/sandbox:/app"
ENV MPLBACKEND=Agg

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python --version || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sleep", "infinity"]