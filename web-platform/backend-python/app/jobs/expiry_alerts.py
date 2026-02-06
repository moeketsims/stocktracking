"""Daily expiry alert digest job.

Sends email notifications for batches expiring within the configured warning period.
"""

from datetime import datetime, timedelta
import logging
from ..config import get_supabase_admin_client
from ..email import send_email

logger = logging.getLogger(__name__)


async def process_expiry_alerts():
    """Check for expiring batches and send digest emails."""
    logger.info("[EXPIRY ALERTS] Starting expiry alert processing...")

    try:
        supabase = get_supabase_admin_client()

        # Get notification settings (enabled ones)
        settings = supabase.table("expiry_notification_settings").select(
            "*"
        ).eq("enabled", True).execute()

        alerts_sent = 0
        for setting in (settings.data or []):
            sent = await _send_expiry_digest(supabase, setting)
            if sent:
                alerts_sent += 1

        logger.info(f"[EXPIRY ALERTS] Completed. Sent {alerts_sent} digest(s).")

    except Exception as e:
        logger.error(f"[EXPIRY ALERTS] Error: {str(e)}")


async def _send_expiry_digest(supabase, setting: dict) -> bool:
    """Send expiry digest for a location (or system-wide if location_id is None)."""
    location_id = setting.get("location_id")
    warning_days = setting.get("warning_days", 7)

    threshold_date = (datetime.utcnow() + timedelta(days=warning_days)).date().isoformat()

    query = supabase.table("stock_batches").select(
        "id, remaining_qty, received_at, expiry_date, items(name), locations(name)"
    ).gt("remaining_qty", 0).lte("expiry_date", threshold_date).order("expiry_date")

    if location_id:
        query = query.eq("location_id", location_id)

    batches = query.execute()

    if not batches.data:
        return False

    # Get manager recipients
    if location_id:
        recipients = supabase.table("profiles").select(
            "user_id, full_name"
        ).eq("location_id", location_id).in_(
            "role", ["location_manager", "zone_manager", "admin"]
        ).eq("is_active", True).execute()
    else:
        recipients = supabase.table("profiles").select(
            "user_id, full_name"
        ).in_("role", ["admin"]).eq("is_active", True).execute()

    if not recipients.data:
        return False

    # Look up emails
    user_ids = [r["user_id"] for r in recipients.data if r.get("user_id")]
    emails = {}
    for uid in user_ids:
        try:
            user_resp = supabase.auth.admin.get_user_by_id(uid)
            if user_resp and user_resp.user and user_resp.user.email:
                emails[uid] = user_resp.user.email
        except Exception:
            pass

    if not emails:
        logger.warning("[EXPIRY ALERTS] No email addresses found for recipients")
        return False

    html = _build_expiry_digest_html(batches.data, warning_days)
    subject = f"Expiry Alert: {len(batches.data)} batch(es) expiring within {warning_days} days"

    sent_count = 0
    for uid, email in emails.items():
        try:
            if send_email(to_email=email, subject=subject, html_content=html):
                sent_count += 1
        except Exception as e:
            logger.error(f"[EXPIRY ALERTS] Failed to send email to {email}: {str(e)}")

    return sent_count > 0


def _build_expiry_digest_html(batches: list, warning_days: int) -> str:
    """Build HTML email content for expiry digest."""
    today = datetime.utcnow().date().isoformat()

    rows = ""
    expired_count = 0
    expiring_count = 0

    for batch in batches:
        item_name = (batch.get("items") or {}).get("name", "Unknown")
        location_name = (batch.get("locations") or {}).get("name", "Unknown")
        expiry_date = batch.get("expiry_date", "")
        remaining_qty = batch.get("remaining_qty", 0)

        is_expired = expiry_date <= today
        if is_expired:
            expired_count += 1
            status_badge = '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:12px;">EXPIRED</span>'
        else:
            expiring_count += 1
            days_left = (datetime.fromisoformat(expiry_date).date() - datetime.utcnow().date()).days
            status_badge = f'<span style="background:#fefce8;color:#ca8a04;padding:2px 8px;border-radius:12px;font-size:12px;">{days_left} day{"s" if days_left != 1 else ""} left</span>'

        rows += f"""
        <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{item_name}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{location_name}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{remaining_qty:.1f} kg</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{expiry_date}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;">{status_badge}</td>
        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; }}
            table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }}
            th {{ background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #6b7280; }}
            .summary {{ display: flex; gap: 16px; margin-bottom: 20px; }}
            .stat {{ background: white; padding: 16px; border-radius: 8px; flex: 1; text-align: center; }}
            .stat-value {{ font-size: 24px; font-weight: bold; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0;">Expiry Alert Digest</h1>
                <p style="margin:8px 0 0;">{len(batches)} batch(es) require attention</p>
            </div>
            <div class="content">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <div style="background:white;padding:16px;border-radius:8px;flex:1;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#dc2626;">{expired_count}</div>
                        <div style="color:#6b7280;font-size:13px;">Expired</div>
                    </div>
                    <div style="background:white;padding:16px;border-radius:8px;flex:1;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#ca8a04;">{expiring_count}</div>
                        <div style="color:#6b7280;font-size:13px;">Expiring Soon</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Location</th>
                            <th>Remaining</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
            <div class="footer">
                <p>This is an automated alert from Potato Stock Tracking.</p>
            </div>
        </div>
    </body>
    </html>
    """
