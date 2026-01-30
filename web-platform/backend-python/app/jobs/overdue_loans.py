"""Overdue Loans Reminder Job.

Monitors active loans and sends reminders when they become overdue.

Process:
1. Find active loans past their estimated return date
2. Mark them as overdue
3. Send reminder emails to borrower
4. Optionally escalate after extended overdue periods
"""

from datetime import datetime, timedelta
import logging
from ..config import get_supabase_admin_client
from ..email import send_loan_overdue_reminder

logger = logging.getLogger(__name__)


async def process_overdue_loans():
    """Check for overdue loans and send reminders."""
    logger.info("[OVERDUE LOANS JOB] Starting overdue loans processing...")

    try:
        supabase = get_supabase_admin_client()
        now = datetime.now()
        today = now.date()

        # Find active loans that are past their return date
        active_loans = supabase.table("loans").select(
            "*, borrower:borrower_location_id(id, name), lender:lender_location_id(id, name)"
        ).eq("status", "active").lt(
            "estimated_return_date", today.isoformat()
        ).execute()

        if active_loans.data:
            logger.info(f"[OVERDUE LOANS JOB] Found {len(active_loans.data)} overdue loans to mark")

            for loan in active_loans.data:
                await mark_loan_overdue(supabase, loan)
        else:
            logger.info("[OVERDUE LOANS JOB] No new overdue loans found")

        # Send reminders for existing overdue loans (every 24 hours)
        await send_overdue_reminders(supabase, now)

    except Exception as e:
        logger.error(f"[OVERDUE LOANS JOB] Error: {str(e)}")


async def mark_loan_overdue(supabase, loan: dict):
    """Mark a loan as overdue and send initial notification."""
    loan_id = loan["id"]
    borrower = loan.get("borrower", {})
    lender = loan.get("lender", {})
    quantity = loan.get("quantity_approved") or loan.get("quantity_requested")

    try:
        # Update loan status to overdue
        supabase.table("loans").update({
            "status": "overdue"
        }).eq("id", loan_id).execute()

        logger.info(f"[OVERDUE LOANS] Marked loan {loan_id} as overdue")

        # Get borrower location managers to notify
        borrower_managers = supabase.table("profiles_with_email").select(
            "email, full_name"
        ).eq("location_id", loan["borrower_location_id"]).in_(
            "role", ["location_manager", "admin", "zone_manager"]
        ).eq("is_active", True).execute()

        days_overdue = (datetime.now().date() - datetime.fromisoformat(loan["estimated_return_date"].split("T")[0]).date()).days

        for manager in (borrower_managers.data or []):
            if manager.get("email"):
                try:
                    send_loan_overdue_reminder(
                        to_email=manager["email"],
                        manager_name=manager.get("full_name", "Manager"),
                        borrower_location_name=borrower.get("name", "Unknown"),
                        lender_location_name=lender.get("name", "Unknown"),
                        quantity=quantity,
                        estimated_return_date=loan["estimated_return_date"],
                        days_overdue=days_overdue,
                        loan_id=loan_id
                    )
                    logger.info(f"[OVERDUE LOANS] Sent overdue notice to {manager['email']}")
                except Exception as e:
                    logger.error(f"[OVERDUE LOANS] Failed to send email to {manager['email']}: {e}")

    except Exception as e:
        logger.error(f"[OVERDUE LOANS] Failed to mark loan {loan_id} as overdue: {e}")


async def send_overdue_reminders(supabase, now: datetime):
    """Send daily reminders for loans that are still overdue."""
    try:
        # Get all overdue loans
        overdue_loans = supabase.table("loans").select(
            "*, borrower:borrower_location_id(id, name), lender:lender_location_id(id, name)"
        ).eq("status", "overdue").execute()

        for loan in (overdue_loans.data or []):
            # Check when last reminder was sent (stored in updated_at)
            updated_at = datetime.fromisoformat(loan["updated_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            hours_since_update = (now - updated_at).total_seconds() / 3600

            # Send reminder every 24 hours
            if hours_since_update >= 24:
                borrower = loan.get("borrower", {})
                lender = loan.get("lender", {})
                quantity = loan.get("quantity_approved") or loan.get("quantity_requested")

                # Get borrower location managers
                borrower_managers = supabase.table("profiles_with_email").select(
                    "email, full_name"
                ).eq("location_id", loan["borrower_location_id"]).in_(
                    "role", ["location_manager", "admin", "zone_manager"]
                ).eq("is_active", True).execute()

                days_overdue = (now.date() - datetime.fromisoformat(loan["estimated_return_date"].split("T")[0]).date()).days

                for manager in (borrower_managers.data or []):
                    if manager.get("email"):
                        try:
                            send_loan_overdue_reminder(
                                to_email=manager["email"],
                                manager_name=manager.get("full_name", "Manager"),
                                borrower_location_name=borrower.get("name", "Unknown"),
                                lender_location_name=lender.get("name", "Unknown"),
                                quantity=quantity,
                                estimated_return_date=loan["estimated_return_date"],
                                days_overdue=days_overdue,
                                loan_id=loan["id"]
                            )
                        except Exception as e:
                            logger.error(f"[OVERDUE LOANS] Failed to send reminder: {e}")

                # Touch the updated_at to track when we last sent a reminder
                supabase.table("loans").update({
                    "updated_at": now.isoformat()
                }).eq("id", loan["id"]).execute()

                logger.info(f"[OVERDUE LOANS] Sent daily reminder for loan {loan['id']} ({days_overdue} days overdue)")

    except Exception as e:
        logger.error(f"[OVERDUE LOANS] Failed to send overdue reminders: {e}")
