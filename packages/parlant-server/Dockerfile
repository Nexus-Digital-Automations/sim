# Parlant Server Dockerfile
# ========================

FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.12-slim as production

# Create app user
RUN groupadd -r parlant && useradd -r -g parlant parlant

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/parlant/.local

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs && chown -R parlant:parlant /app

# Switch to non-root user
USER parlant

# Add local Python packages to PATH
ENV PATH=/home/parlant/.local/bin:$PATH
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Default command
CMD ["python", "server.py"]