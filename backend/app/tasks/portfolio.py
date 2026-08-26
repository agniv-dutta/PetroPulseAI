"""Portfolio-related Celery tasks."""

from celery.utils.log import get_task_logger

from app.core.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(name="app.tasks.portfolio.refresh_portfolio_cache")
def refresh_portfolio_cache() -> dict:
    """Re-run the full portfolio analysis and warm the in-memory cache.

    Scheduled every 30 minutes by celery beat so that the dashboard
    always shows relatively fresh ML scores without requiring a
    manual refresh.
    """
    from app.core.database import SessionLocal
    from app.intelligence.pipeline import get_portfolio_analysis

    logger.info("Starting scheduled portfolio cache refresh")
    db = SessionLocal()
    try:
        results = get_portfolio_analysis(db, force_refresh=True)
        logger.info("Portfolio cache refreshed — %d assets analysed", len(results))
        return {"status": "ok", "assets_refreshed": len(results)}
    except Exception:
        logger.exception("Portfolio cache refresh failed")
        return {"status": "error"}
    finally:
        db.close()
