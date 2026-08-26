FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (build-time only for compiled packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---------- build stage: install Python deps ----------
FROM base AS builder

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- runtime stage ----------
FROM base AS runtime

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r petropulse && useradd -r -g petropulse -d /app -s /sbin/nologin petropulse \
    && mkdir -p /app/logs /app/data /app/models \
    && chown -R petropulse:petropulse /app

# Copy application code
COPY app/ ./app/

# Copy alembic migrations (needed for init_db)
COPY alembic.ini ./
COPY migrations/ ./migrations/

USER petropulse

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
