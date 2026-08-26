"""Celery application instance.

Configured to use Redis as both broker and result backend.
Import this module from any Celery task:

    from app.core.celery_app import celery_app

Add tasks by registering them on ``celery_app.task`` or by using
the ``@celery_app.task`` decorator in your task modules.

Environment variables consumed (all set via docker-compose or .env):

    CELERY_BROKER_URL   – Redis URL for task queuing
    CELERY_RESULT_BACKEND – Redis URL for storing task results
"""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "petropulse",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Periodic task schedule (celery beat)
    beat_schedule={
        "refresh-portfolio-cache-every-30m": {
            "task": "app.tasks.portfolio.refresh_portfolio_cache",
            "schedule": 1800.0,  # 30 minutes
        },
    },
)

# Auto-discover tasks in the app.tasks package
celery_app.autodiscover_tasks(["app.tasks"])
