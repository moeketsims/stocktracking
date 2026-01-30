"""APScheduler setup for background jobs."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler = None


def get_scheduler() -> AsyncIOScheduler:
    """Get the scheduler instance."""
    global scheduler
    return scheduler


def init_scheduler():
    """Initialize the scheduler with all jobs."""
    global scheduler

    if scheduler is not None:
        logger.warning("Scheduler already initialized")
        return scheduler

    scheduler = AsyncIOScheduler()

    # Import jobs here to avoid circular imports
    from app.jobs.request_expiration import process_request_escalations
    from app.jobs.low_stock_alerts import process_low_stock_alerts
    from app.jobs.overdue_loans import process_overdue_loans

    # Request expiration/escalation job - runs every 5 minutes
    scheduler.add_job(
        process_request_escalations,
        trigger=IntervalTrigger(minutes=5),
        id='request_escalation_job',
        name='Process Request Escalations',
        replace_existing=True,
        max_instances=1
    )

    # Low stock alert job - runs every 15 minutes
    scheduler.add_job(
        process_low_stock_alerts,
        trigger=IntervalTrigger(minutes=15),
        id='low_stock_alert_job',
        name='Process Low Stock Alerts',
        replace_existing=True,
        max_instances=1
    )

    # Overdue loans reminder job - runs every hour
    scheduler.add_job(
        process_overdue_loans,
        trigger=IntervalTrigger(hours=1),
        id='overdue_loans_job',
        name='Process Overdue Loan Reminders',
        replace_existing=True,
        max_instances=1
    )

    logger.info("Scheduler initialized with jobs")
    return scheduler


def start_scheduler():
    """Start the scheduler."""
    global scheduler

    if scheduler is None:
        init_scheduler()

    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")
    else:
        logger.info("Scheduler already running")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    global scheduler

    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shutdown")
