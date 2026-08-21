#!/bin/sh
set -e

# Apply database migrations before the app starts.
python manage.py migrate --noinput

# Collect static files (used by the Django admin). Non-fatal if it fails.
python manage.py collectstatic --noinput || true

exec "$@"
