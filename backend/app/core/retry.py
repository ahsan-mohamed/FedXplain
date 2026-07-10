"""
retry.py

A reusable retry decorator (built on `tenacity`) for any operation that
talks to something outside our process -- SMTP server, LLM API, etc.
Every retry attempt and final failure is logged, so ops/monitoring has
a clear trail of what failed and how many times we tried.
"""

from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    before_sleep_log, retry_if_exception_type,
)
import logging

from app.core.config import settings

logger = logging.getLogger("fedxplain.retry")


def with_retry(exception_types=(Exception,)):
    """Decorator factory: retries the wrapped function up to
    settings.MAX_RETRIES times with exponential backoff, logging each
    retry attempt at WARNING level before sleeping."""
    return retry(
        stop=stop_after_attempt(settings.MAX_RETRIES),
        wait=wait_exponential(multiplier=settings.RETRY_BACKOFF_SECONDS, min=1, max=30),
        retry=retry_if_exception_type(exception_types),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
