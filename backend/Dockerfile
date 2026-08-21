# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

# Keep Python lean and predictable inside containers.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps kept minimal — SQLite ships with the base image.
# (Add libpq-dev + build-essential here if you switch to Postgres/psycopg.)

# Install Python deps first so this layer is cached across code changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt \
    && pip install "gunicorn==23.0.0"

# Application code.
COPY . .

# Run as a non-root user.
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/staticfiles /app/data \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

COPY --chown=appuser:appuser entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
