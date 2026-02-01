"""Error handling utilities for production-safe exception handling."""

import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def handle_exception(e: Exception, operation: str = "operation") -> HTTPException:
    """
    Log full error internally, return generic message to client.

    This prevents leaking internal error details to API consumers while
    ensuring full error context is available in server logs.

    Args:
        e: The exception that was caught
        operation: A description of what operation failed (for user-friendly message)

    Returns:
        HTTPException with generic error message
    """
    logger.error(f"Error during {operation}: {str(e)}", exc_info=True)
    return HTTPException(status_code=500, detail=f"An error occurred during {operation}")
