"""Project-wide DRF exception handling.

Keeps API error responses in a consistent, user-friendly shape while logging
the underlying technical detail server-side. Raw Django tracebacks are never
sent to clients (DEBUG aside).
"""

import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def friendly_exception_handler(exc, context):
    """Wrap DRF's default handler, logging unexpected errors."""
    response = drf_exception_handler(exc, context)

    if response is None:
        # An error DRF does not know how to turn into a response (e.g. an
        # unexpected exception). Log it; let Django's own handler produce a 500.
        logger.exception("Unhandled API exception", exc_info=exc)
        return None

    # Normalise a top-level "detail" string into a consistent envelope while
    # preserving field-level validation errors.
    return response
