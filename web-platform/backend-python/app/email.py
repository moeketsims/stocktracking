"""Email utility for sending invitation and notification emails."""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import get_settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """Send an email using Gmail SMTP."""
    settings = get_settings()

    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured, skipping email send")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_user}>"
        msg["To"] = to_email

        # Add plain text version
        if text_content:
            msg.attach(MIMEText(text_content, "plain"))

        # Add HTML version
        msg.attach(MIMEText(html_content, "html"))

        # Connect and send
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_invitation_email(
    to_email: str,
    full_name: str,
    role: str,
    token: str,
    invited_by_name: str = "Admin"
) -> bool:
    """Send an invitation email with the signup link."""
    settings = get_settings()
    invite_url = f"{settings.app_url}?invite={token}"

    role_display = {
        "admin": "Administrator",
        "zone_manager": "Zone Manager",
        "location_manager": "Location Manager",
        "driver": "Driver",
        "staff": "Staff Member"
    }.get(role, role)

    subject = "You're Invited to Potato Stock Tracking"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .role-badge {{ display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Potato Stock Tracking</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Inventory Management System</p>
            </div>
            <div class="content">
                <h2>Hello{' ' + full_name if full_name else ''}!</h2>
                <p>You've been invited by <strong>{invited_by_name}</strong> to join the Potato Stock Tracking system as a <span class="role-badge">{role_display}</span>.</p>
                <p>Click the button below to create your account and set your password:</p>
                <p style="text-align: center;">
                    <a href="{invite_url}" class="button">Accept Invitation</a>
                </p>
                <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in 7 days.</p>
                <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4f46e5; font-size: 12px;">{invite_url}</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
                <p>This email was sent to {to_email}</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hello{' ' + full_name if full_name else ''}!

You've been invited by {invited_by_name} to join the Potato Stock Tracking system as a {role_display}.

Click the link below to create your account and set your password:

{invite_url}

This invitation link will expire in 7 days.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send a password reset email."""
    subject = "Reset Your Password - Potato Stock Tracking"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Potato Stock Tracking</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Reset Your Password

We received a request to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_stock_request_notification(
    to_email: str,
    recipient_name: str,
    location_name: str,
    quantity_bags: int,
    urgency: str,
    current_stock_pct: float,
    request_id: str,
    recipient_user_id: str = None
) -> bool:
    """Send notification to drivers about a new stock request."""
    settings = get_settings()
    # Include 'for' parameter so frontend can detect if wrong user is logged in
    request_url = f"{settings.app_url}/requests?id={request_id}"
    if recipient_user_id:
        request_url += f"&for={recipient_user_id}"

    urgency_emoji = "🚨" if urgency == "urgent" else "📦"
    urgency_text = "URGENT (needed today)" if urgency == "urgent" else "Normal (within 3 days)"
    urgency_color = "#dc2626" if urgency == "urgent" else "#059669"

    subject = f"{urgency_emoji} Stock Request - {location_name}" + (" (Urgent)" if urgency == "urgent" else "")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .urgency-badge {{ display: inline-block; background: {urgency_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Stock Request</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A shop needs stock replenishment</p>
            </div>
            <div class="content">
                <h2>Hi {recipient_name}!</h2>
                <p>A shop needs stock replenishment:</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>⏰ Urgency</span>
                        <span class="urgency-badge">{urgency_text}</span>
                    </div>
                    <div class="info-row">
                        <span>📊 Current stock</span>
                        <strong>{current_stock_pct}% of target</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">Accept Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">If you can't fulfill this request, another driver will be notified.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {recipient_name}!

A shop needs stock replenishment:

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
⏰ Urgency: {urgency_text}
📊 Current stock: {current_stock_pct}% of target

Click below to accept this request:
{request_url}

If you can't fulfill this, another driver will be notified.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_accepted_by_driver_notification(
    to_email: str,
    requester_name: str,
    location_name: str,
    quantity_bags: int,
    driver_name: str,
    request_id: str
) -> bool:
    """Send notification to store manager when a driver accepts their request."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests?id={request_id}"

    subject = f"🚚 A driver has accepted your stock request"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .status-badge {{ display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Request Accepted!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A driver is on it</p>
            </div>
            <div class="content">
                <h2>Hi {requester_name}!</h2>
                <p>Good news! A driver has accepted your stock request and will be creating a delivery trip soon.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>👤 Accepted by</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="status-badge">ACCEPTED</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">View Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">You'll receive another notification once the driver creates the delivery trip with vehicle and pickup details.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {requester_name}!

Good news! A driver has accepted your stock request and will be creating a delivery trip soon.

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
👤 Accepted by: {driver_name}
📋 Status: ACCEPTED

View request: {request_url}

You'll receive another notification once the driver creates the delivery trip with vehicle and pickup details.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_accepted_notification(
    to_email: str,
    requester_name: str,
    location_name: str,
    quantity_bags: int,
    driver_name: str,
    vehicle_reg: str,
    vehicle_desc: str,
    supplier_name: str,
    trip_number: str,
    trip_id: str
) -> bool:
    """Send notification to store manager when trip is created for their request."""
    settings = get_settings()
    trip_url = f"{settings.app_url}/trips?id={trip_id}"

    subject = f"✅ Your stock request has been accepted"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Request Accepted!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your stock is on the way</p>
            </div>
            <div class="content">
                <h2>Hi {requester_name}!</h2>
                <p>Great news! Your stock request has been accepted.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📋 Request</span>
                        <strong>{quantity_bags} bags for {location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>👤 Driver</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🚗 Vehicle</span>
                        <strong>{vehicle_reg} ({vehicle_desc})</strong>
                    </div>
                    <div class="info-row">
                        <span>🏭 Picking up from</span>
                        <strong>{supplier_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🎫 Trip #</span>
                        <strong>{trip_number}</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{trip_url}" class="button">View Trip Details</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">You'll be notified when the delivery arrives.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {requester_name}!

Great news! Your stock request has been accepted.

📋 Request: {quantity_bags} bags for {location_name}
👤 Driver: {driver_name}
🚗 Vehicle: {vehicle_reg} ({vehicle_desc})
🏭 Picking up from: {supplier_name}
🎫 Trip #: {trip_number}

View trip details: {trip_url}

You'll be notified when the delivery arrives.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_delivery_arrived_notification(
    to_email: str,
    manager_name: str,
    trip_number: str,
    driver_name: str,
    quantity_bags: float,
    supplier_name: str,
    delivery_id: str
) -> bool:
    """Send notification to store manager when delivery arrives."""
    settings = get_settings()
    confirm_url = f"{settings.app_url}/stock?confirm={delivery_id}"

    subject = f"📦 Delivery arrived - Please confirm receipt"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Delivery Arrived!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Please confirm the stock receipt</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>A delivery has arrived at your location.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>🎫 Trip</span>
                        <strong>#{trip_number}</strong>
                    </div>
                    <div class="info-row">
                        <span>👤 Driver</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Delivered</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>🏭 From</span>
                        <strong>{supplier_name}</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{confirm_url}" class="button">Confirm Receipt</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">Please verify the quantity and confirm to add the stock to your inventory.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

A delivery has arrived at your location.

🎫 Trip: #{trip_number}
👤 Driver: {driver_name}
📦 Delivered: {quantity_bags} bags
🏭 From: {supplier_name}

Please confirm you received the stock:
{confirm_url}

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_delivery_confirmed_notification(
    to_email: str,
    recipient_name: str,
    recipient_type: str,  # "driver" or "manager"
    location_name: str,
    quantity_bags: float,
    quantity_kg: float,
    trip_number: str,
    has_discrepancy: bool = False,
    discrepancy_kg: float = 0,
    confirmed_by_name: str = "Store Manager"
) -> bool:
    """Send notification when delivery is confirmed - to both driver and store manager."""
    settings = get_settings()
    
    if recipient_type == "driver":
        subject = f"✅ Delivery Confirmed - {location_name}"
        intro = "Your delivery has been confirmed by the store."
        action_text = "Great job on the delivery!"
    else:
        subject = f"✅ Stock Confirmed - {quantity_bags:.0f} bags received"
        intro = "The delivery has been confirmed and added to your inventory."
        action_text = "Stock has been added to inventory."

    discrepancy_html = ""
    discrepancy_text = ""
    if has_discrepancy:
        discrepancy_html = f"""
                <div class="info-row" style="background: #fef3c7; border-radius: 4px; padding: 8px;">
                    <span>⚠️ Discrepancy</span>
                    <strong style="color: #d97706;">{discrepancy_kg:.1f} kg difference</strong>
                </div>
        """
        discrepancy_text = f"\n⚠️ Discrepancy: {discrepancy_kg:.1f} kg difference"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .success-badge {{ background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Delivery Confirmed! ✅</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">{action_text}</p>
            </div>
            <div class="content">
                <h2>Hi {recipient_name}!</h2>
                <p>{intro}</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🎫 Trip</span>
                        <strong>#{trip_number}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Confirmed</span>
                        <strong>{quantity_bags:.0f} bags ({quantity_kg:.1f} kg)</strong>
                    </div>
                    <div class="info-row">
                        <span>✍️ Confirmed by</span>
                        <strong>{confirmed_by_name}</strong>
                    </div>
                    {discrepancy_html}
                </div>

                <p style="text-align: center; margin-top: 20px;">
                    <span class="success-badge">✓ Delivery Complete</span>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {recipient_name}!

{intro}

📍 Location: {location_name}
🎫 Trip: #{trip_number}
📦 Confirmed: {quantity_bags:.0f} bags ({quantity_kg:.1f} kg)
✍️ Confirmed by: {confirmed_by_name}{discrepancy_text}

✓ Delivery Complete

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_trip_started_notification(
    to_email: str,
    manager_name: str,
    location_name: str,
    quantity_bags: int,
    driver_name: str,
    vehicle_reg: str,
    vehicle_desc: str,
    supplier_name: str,
    trip_number: str,
    trip_id: str
) -> bool:
    """Send notification to store manager when driver starts the trip."""
    settings = get_settings()
    trip_url = f"{settings.app_url}/trips?id={trip_id}"

    subject = f"🚚 Delivery on the way - Trip #{trip_number} started"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .status-badge {{ display: inline-block; background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Delivery On The Way!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your stock is being delivered</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>Great news! The driver has started the delivery trip for your stock request.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Destination</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>👤 Driver</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🚗 Vehicle</span>
                        <strong>{vehicle_reg} ({vehicle_desc})</strong>
                    </div>
                    <div class="info-row">
                        <span>🏭 Picking up from</span>
                        <strong>{supplier_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="status-badge">IN PROGRESS</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{trip_url}" class="button">Track Trip</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">You'll be notified when the delivery arrives at your location.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

Great news! The driver has started the delivery trip for your stock request.

📍 Destination: {location_name}
📦 Quantity: {quantity_bags} bags
👤 Driver: {driver_name}
🚗 Vehicle: {vehicle_reg} ({vehicle_desc})
🏭 Picking up from: {supplier_name}
📋 Status: IN PROGRESS

Track trip: {trip_url}

You'll be notified when the delivery arrives at your location.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_reminder_notification(
    to_email: str,
    recipient_name: str,
    location_name: str,
    quantity_bags: int,
    urgency: str,
    hours_pending: int,
    request_id: str
) -> bool:
    """Send reminder to drivers about a pending stock request."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests?id={request_id}"

    urgency_emoji = "🚨" if urgency == "urgent" else "⏰"
    urgency_text = "URGENT" if urgency == "urgent" else "Normal"
    urgency_color = "#dc2626" if urgency == "urgent" else "#f59e0b"

    subject = f"{urgency_emoji} Reminder: Stock request waiting {hours_pending}h - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, {urgency_color} 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .alert-badge {{ display: inline-block; background: {urgency_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Reminder: Stock Request Waiting</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">This request has been pending for {hours_pending} hours</p>
            </div>
            <div class="content">
                <h2>Hi {recipient_name}!</h2>
                <p>A stock request is still waiting for a driver:</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>⏰ Urgency</span>
                        <span class="alert-badge">{urgency_text}</span>
                    </div>
                    <div class="info-row">
                        <span>⏳ Waiting</span>
                        <strong>{hours_pending} hours</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">Accept This Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">This request will be escalated to management if not accepted soon.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {recipient_name}!

Reminder: A stock request is still waiting for a driver.

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
⏰ Urgency: {urgency_text}
⏳ Waiting: {hours_pending} hours

Accept this request: {request_url}

This request will be escalated to management if not accepted soon.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_escalation_notification(
    to_email: str,
    manager_name: str,
    location_name: str,
    quantity_bags: int,
    urgency: str,
    hours_pending: int,
    request_id: str
) -> bool:
    """Send escalation notification to zone manager about unaccepted request."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests?id={request_id}"

    urgency_text = "URGENT" if urgency == "urgent" else "Normal"

    subject = f"⚠️ ESCALATION: Stock request unaccepted for {hours_pending}h - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .escalation-badge {{ display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">⚠️ Request Escalation</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">No driver has accepted this request</p>
            </div>
            <div class="content">
                <h2>Attention {manager_name}!</h2>
                <p>A stock request has been waiting for {hours_pending} hours without being accepted by any driver. Please investigate and ensure delivery.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>⏰ Urgency</span>
                        <strong>{urgency_text}</strong>
                    </div>
                    <div class="info-row">
                        <span>⏳ Waiting</span>
                        <span class="escalation-badge">{hours_pending} HOURS</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">View Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">This request will expire if not fulfilled soon. Please assign a driver or investigate driver availability.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Attention {manager_name}!

⚠️ REQUEST ESCALATION

A stock request has been waiting for {hours_pending} hours without being accepted by any driver.

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
⏰ Urgency: {urgency_text}
⏳ Waiting: {hours_pending} hours

View request: {request_url}

Please investigate and ensure delivery.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_expired_notification(
    to_email: str,
    requester_name: str,
    location_name: str,
    quantity_bags: int,
    hours_pending: int,
    request_id: str
) -> bool:
    """Send notification to requester when their request has expired."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests"

    subject = f"❌ Stock request expired - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .expired-badge {{ display: inline-block; background: #6b7280; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Request Expired</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">No driver was available to fulfill this request</p>
            </div>
            <div class="content">
                <h2>Hi {requester_name},</h2>
                <p>Unfortunately, your stock request has expired after {hours_pending} hours without being fulfilled.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="expired-badge">EXPIRED</span>
                    </div>
                </div>

                <p>You can create a new request if you still need stock replenishment.</p>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">Create New Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">If this is urgent, please contact your zone manager directly.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {requester_name},

Your stock request has expired after {hours_pending} hours without being fulfilled.

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
📋 Status: EXPIRED

You can create a new request if you still need stock replenishment:
{request_url}

If this is urgent, please contact your zone manager directly.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_cancelled_notification(
    to_email: str,
    driver_name: str,
    location_name: str,
    quantity_bags: int,
    cancellation_reason: str,
    cancelled_by_name: str,
    request_id: str
) -> bool:
    """Send notification to driver when their accepted request is cancelled."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests"

    subject = f"🚫 Stock request cancelled - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .cancelled-badge {{ display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .reason-box {{ background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 16px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Request Cancelled</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A request you accepted has been cancelled</p>
            </div>
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>A stock request you had accepted has been cancelled by {cancelled_by_name}.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="cancelled-badge">CANCELLED</span>
                    </div>
                </div>

                <div class="reason-box">
                    <strong>Cancellation Reason:</strong>
                    <p style="margin: 8px 0 0 0;">{cancellation_reason}</p>
                </div>

                <p>If you had already started preparations, please contact your manager.</p>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">View Other Requests</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {driver_name},

A stock request you had accepted has been cancelled by {cancelled_by_name}.

📍 Location: {location_name}
📦 Quantity: {quantity_bags} bags
📋 Status: CANCELLED

Cancellation Reason:
{cancellation_reason}

If you had already started preparations, please contact your manager.

View other requests: {request_url}

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_low_stock_alert(
    to_email: str,
    manager_name: str,
    location_name: str,
    item_name: str,
    current_qty: float,
    reorder_point: float,
    escalation_level: int = 1
) -> bool:
    """Send low stock alert to location manager."""
    settings = get_settings()
    requests_url = f"{settings.app_url}/requests"

    shortage_pct = round(((reorder_point - current_qty) / reorder_point) * 100, 1) if reorder_point > 0 else 0

    subject = f"⚠️ Low Stock Alert - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .alert-badge {{ display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .progress-bar {{ background: #e5e7eb; border-radius: 4px; height: 8px; margin-top: 8px; }}
            .progress-fill {{ background: #dc2626; border-radius: 4px; height: 8px; width: {min(100 - shortage_pct, 100)}%; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">⚠️ Low Stock Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Stock level below reorder point</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>Stock at your location has fallen below the reorder point. Please create a stock request.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Item</span>
                        <strong>{item_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📊 Current Stock</span>
                        <strong>{current_qty:.0f} kg</strong>
                    </div>
                    <div class="info-row">
                        <span>⚠️ Reorder Point</span>
                        <strong>{reorder_point:.0f} kg</strong>
                    </div>
                    <div class="info-row">
                        <span>📉 Below Threshold</span>
                        <span class="alert-badge">{shortage_pct}%</span>
                    </div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 4px;">Stock Level</p>

                <p style="text-align: center;">
                    <a href="{requests_url}" class="button">Create Stock Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">If no action is taken, this alert will be escalated to your zone manager.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

⚠️ LOW STOCK ALERT

Stock at your location has fallen below the reorder point.

📍 Location: {location_name}
📦 Item: {item_name}
📊 Current Stock: {current_qty:.0f} kg
⚠️ Reorder Point: {reorder_point:.0f} kg
📉 Below Threshold: {shortage_pct}%

Create a stock request: {requests_url}

If no action is taken, this alert will be escalated to your zone manager.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_low_stock_escalation(
    to_email: str,
    manager_name: str,
    location_name: str,
    item_name: str,
    current_qty: float,
    reorder_point: float,
    escalation_level: int,
    hours_unresolved: int,
    is_repeat: bool = False
) -> bool:
    """Send low stock escalation to zone manager or admin."""
    settings = get_settings()
    requests_url = f"{settings.app_url}/requests"

    level_text = "Zone Manager" if escalation_level == 2 else "Admin"
    repeat_text = " (Daily Reminder)" if is_repeat else ""

    subject = f"🚨 LOW STOCK ESCALATION{repeat_text} - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .escalation-badge {{ display: inline-block; background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">🚨 Low Stock Escalation</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Unresolved for {hours_unresolved}+ hours</p>
            </div>
            <div class="content">
                <h2>Attention {manager_name}!</h2>
                <p>A low stock situation at <strong>{location_name}</strong> has been unresolved for {hours_unresolved} hours. No stock request has been created.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Item</span>
                        <strong>{item_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📊 Current Stock</span>
                        <strong>{current_qty:.0f} kg</strong>
                    </div>
                    <div class="info-row">
                        <span>⚠️ Reorder Point</span>
                        <strong>{reorder_point:.0f} kg</strong>
                    </div>
                    <div class="info-row">
                        <span>⏳ Unresolved</span>
                        <span class="escalation-badge">{hours_unresolved}+ HOURS</span>
                    </div>
                    <div class="info-row">
                        <span>📋 Escalation Level</span>
                        <strong>{level_text}</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{requests_url}" class="button">Take Action</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">Please investigate why no stock request has been created and ensure stock is replenished.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Attention {manager_name}!

🚨 LOW STOCK ESCALATION{repeat_text}

A low stock situation at {location_name} has been unresolved for {hours_unresolved} hours.

📍 Location: {location_name}
📦 Item: {item_name}
📊 Current Stock: {current_qty:.0f} kg
⚠️ Reorder Point: {reorder_point:.0f} kg
⏳ Unresolved: {hours_unresolved}+ hours
📋 Escalation Level: {level_text}

Take action: {requests_url}

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_request_updated_notification(
    to_email: str,
    recipient_name: str,
    location_name: str,
    old_quantity_bags: int,
    new_quantity_bags: int,
    old_urgency: str,
    new_urgency: str,
    updated_by_name: str,
    request_id: str
) -> bool:
    """Send notification to drivers when a request they may be interested in is modified."""
    settings = get_settings()
    request_url = f"{settings.app_url}/requests?id={request_id}"

    changes = []
    if old_quantity_bags != new_quantity_bags:
        changes.append(f"Quantity: {old_quantity_bags} → {new_quantity_bags} bags")
    if old_urgency != new_urgency:
        urgency_display = {"urgent": "Urgent", "normal": "Normal"}
        changes.append(f"Urgency: {urgency_display.get(old_urgency, old_urgency)} → {urgency_display.get(new_urgency, new_urgency)}")

    changes_text = "\n".join(f"• {c}" for c in changes)
    changes_html = "".join(f"<li>{c}</li>" for c in changes)

    new_urgency_color = "#dc2626" if new_urgency == "urgent" else "#059669"

    subject = f"📝 Stock request updated - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .changes-box {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin: 16px 0; }}
            .urgency-badge {{ display: inline-block; background: {new_urgency_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Request Updated</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A stock request has been modified</p>
            </div>
            <div class="content">
                <h2>Hi {recipient_name}!</h2>
                <p>A stock request has been updated by {updated_by_name}:</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Location</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{new_quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>⏰ Urgency</span>
                        <span class="urgency-badge">{new_urgency.upper()}</span>
                    </div>
                </div>

                <div class="changes-box">
                    <strong>Changes Made:</strong>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                        {changes_html}
                    </ul>
                </div>

                <p style="text-align: center;">
                    <a href="{request_url}" class="button">View Request</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {recipient_name}!

A stock request has been updated by {updated_by_name}:

📍 Location: {location_name}
📦 Quantity: {new_quantity_bags} bags
⏰ Urgency: {new_urgency.upper()}

Changes Made:
{changes_text}

View request: {request_url}

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_driver_km_submission_request(
    to_email: str,
    driver_name: str,
    location_name: str,
    vehicle_reg: str,
    trip_number: str,
    starting_km: int,
    submission_token: str
) -> bool:
    """Send email to driver to submit their closing odometer reading."""
    settings = get_settings()
    submit_url = f"{settings.app_url}/submit-km?token={submission_token}"

    subject = f"Submit Closing Km - Trip #{trip_number}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .success-badge {{ background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Delivery Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Please log your closing odometer reading</p>
            </div>
            <div class="content">
                <h2>Hi {driver_name}!</h2>
                <p>Your delivery has been confirmed by the store. Please submit your closing odometer reading to complete the trip.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Delivered to</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🚗 Vehicle</span>
                        <strong>{vehicle_reg}</strong>
                    </div>
                    <div class="info-row">
                        <span>🎫 Trip</span>
                        <strong>#{trip_number}</strong>
                    </div>
                    <div class="info-row">
                        <span>📊 Starting Km</span>
                        <strong>{starting_km:,} km</strong>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{submit_url}" class="button">Submit Closing Km</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">This link will expire in 7 days. If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4f46e5; font-size: 12px;">{submit_url}</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {driver_name}!

Your delivery has been confirmed by the store. Please submit your closing odometer reading to complete the trip.

📍 Delivered to: {location_name}
🚗 Vehicle: {vehicle_reg}
🎫 Trip: #{trip_number}
📊 Starting Km: {starting_km:,} km

Submit your closing km here:
{submit_url}

This link will expire in 7 days.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_km_submitted_notification(
    to_email: str,
    manager_name: str,
    driver_name: str,
    vehicle_reg: str,
    trip_number: str,
    starting_km: int,
    closing_km: int,
    trip_distance: int
) -> bool:
    """Notify vehicle manager when driver submits closing km."""
    settings = get_settings()

    subject = f"Closing Km Submitted - Trip #{trip_number}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .distance-badge {{ background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; font-size: 18px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Km Submitted</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Driver has logged their closing odometer</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>A driver has submitted their closing odometer reading for a completed trip.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>👤 Driver</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🚗 Vehicle</span>
                        <strong>{vehicle_reg}</strong>
                    </div>
                    <div class="info-row">
                        <span>🎫 Trip</span>
                        <strong>#{trip_number}</strong>
                    </div>
                    <div class="info-row">
                        <span>📊 Starting Km</span>
                        <strong>{starting_km:,} km</strong>
                    </div>
                    <div class="info-row">
                        <span>📊 Closing Km</span>
                        <strong>{closing_km:,} km</strong>
                    </div>
                </div>

                <p style="text-align: center; margin-top: 20px;">
                    <span class="distance-badge">{trip_distance:,} km traveled</span>
                </p>

                <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 16px;">
                    Vehicle kilometers have been updated automatically.
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

A driver has submitted their closing odometer reading for a completed trip.

👤 Driver: {driver_name}
🚗 Vehicle: {vehicle_reg}
🎫 Trip: #{trip_number}
📊 Starting Km: {starting_km:,} km
📊 Closing Km: {closing_km:,} km

Trip Distance: {trip_distance:,} km

Vehicle kilometers have been updated automatically.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_trip_started_with_eta_notification(
    to_email: str,
    manager_name: str,
    location_name: str,
    quantity_bags: int,
    driver_name: str,
    vehicle_reg: str,
    vehicle_desc: str,
    supplier_name: str,
    trip_number: str,
    trip_id: str,
    estimated_arrival_time: str = None
) -> bool:
    """Send notification to store manager when driver starts trip with ETA."""
    settings = get_settings()
    trip_url = f"{settings.app_url}/trips?id={trip_id}"

    eta_display = ""
    eta_html = ""
    if estimated_arrival_time:
        try:
            from datetime import datetime
            eta_dt = datetime.fromisoformat(estimated_arrival_time.replace("Z", "+00:00"))
            eta_display = eta_dt.strftime("%I:%M %p")
            eta_html = f"""
                    <div class="info-row">
                        <span>🕐 Estimated Arrival</span>
                        <strong style="color: #059669;">{eta_display}</strong>
                    </div>"""
        except:
            pass

    subject = f"🚚 Delivery on the way - Trip #{trip_number}" + (f" (ETA: {eta_display})" if eta_display else "")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .status-badge {{ display: inline-block; background: #fef3c7; color: #b45309; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Delivery On The Way!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your stock is being delivered</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>Great news! The driver has started the delivery trip for your stock request.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>📍 Destination</span>
                        <strong>{location_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity_bags} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>👤 Driver</span>
                        <strong>{driver_name}</strong>
                    </div>
                    <div class="info-row">
                        <span>🚗 Vehicle</span>
                        <strong>{vehicle_reg} ({vehicle_desc})</strong>
                    </div>
                    <div class="info-row">
                        <span>🏭 Picking up from</span>
                        <strong>{supplier_name}</strong>
                    </div>{eta_html}
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="status-badge">IN PROGRESS</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{trip_url}" class="button">Track Trip</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">You'll be notified when the delivery arrives at your location.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

Great news! The driver has started the delivery trip for your stock request.

📍 Destination: {location_name}
📦 Quantity: {quantity_bags} bags
👤 Driver: {driver_name}
🚗 Vehicle: {vehicle_reg} ({vehicle_desc})
🏭 Picking up from: {supplier_name}
{"🕐 Estimated Arrival: " + eta_display if eta_display else ""}
📋 Status: IN PROGRESS

Track trip: {trip_url}

You'll be notified when the delivery arrives at your location.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


# ==================== LOAN NOTIFICATIONS ====================

def send_loan_request_notification(
    to_email: str,
    manager_name: str,
    borrower_shop: str,
    quantity: int,
    return_date: str,
    requester_name: str,
    notes: str = None
) -> bool:
    """Send notification to lender when a loan is requested."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    notes_html = ""
    notes_text = ""
    if notes:
        notes_html = f"""
                <div class="info-row">
                    <span>📝 Notes</span>
                    <strong>{notes}</strong>
                </div>"""
        notes_text = f"\n📝 Notes: {notes}"

    subject = f"📦 Stock Loan Request from {borrower_shop}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .loan-badge {{ display: inline-block; background: #f3e8ff; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Stock Loan Request</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A shop wants to borrow stock</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p><strong>{requester_name}</strong> from <strong>{borrower_shop}</strong> is requesting to borrow stock from your shop.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>🏪 Requesting Shop</span>
                        <strong>{borrower_shop}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Quantity</span>
                        <strong>{quantity} bags</strong>
                    </div>
                    <div class="info-row">
                        <span>📅 Return By</span>
                        <strong>{return_date}</strong>
                    </div>{notes_html}
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="loan-badge">PENDING</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Review Request</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">You can accept (with the same or reduced quantity) or reject this request.</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

{requester_name} from {borrower_shop} is requesting to borrow stock from your shop.

🏪 Requesting Shop: {borrower_shop}
📦 Quantity: {quantity} bags
📅 Return By: {return_date}{notes_text}
📋 Status: PENDING

Review the request: {loans_url}

You can accept (with the same or reduced quantity) or reject this request.

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_loan_accepted_notification(
    to_email: str,
    manager_name: str,
    lender_shop: str,
    quantity_requested: int,
    quantity_approved: int,
    quantity_changed: bool
) -> bool:
    """Send notification to borrower when loan is accepted."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    if quantity_changed:
        qty_html = f"""
                <div class="info-row" style="background: #fef3c7; padding: 8px; border-radius: 4px;">
                    <span>⚠️ Adjusted</span>
                    <strong>{quantity_requested} → {quantity_approved} bags</strong>
                </div>"""
    else:
        qty_html = ""

    subject = f"✅ Loan Approved by {lender_shop}" + (" (Quantity Adjusted)" if quantity_changed else "")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            .info-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
            .info-row:last-child {{ border-bottom: none; }}
            .approved-badge {{ display: inline-block; background: #d1fae5; color: #059669; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Loan Approved!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your loan request has been accepted</p>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>Great news! <strong>{lender_shop}</strong> has approved your loan request.</p>

                <div class="info-box">
                    <div class="info-row">
                        <span>🏪 Lender</span>
                        <strong>{lender_shop}</strong>
                    </div>
                    <div class="info-row">
                        <span>📦 Approved Quantity</span>
                        <strong>{quantity_approved} bags</strong>
                    </div>{qty_html}
                    <div class="info-row">
                        <span>📋 Status</span>
                        <span class="approved-badge">ACCEPTED</span>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Confirm & Arrange Pickup</a>
                </p>

                <p style="color: #6b7280; font-size: 14px;">{"Please confirm the adjusted quantity or reject if it doesn't meet your needs." if quantity_changed else "Please confirm and assign a driver to pick up the stock."}</p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Hi {manager_name}!

Great news! {lender_shop} has approved your loan request for {quantity_approved} bags.

Confirm and arrange pickup: {loans_url}

---
Potato Stock Tracking System
    """

    return send_email(to_email, subject, html_content, text_content)


def send_loan_rejected_notification(
    to_email: str,
    manager_name: str,
    lender_shop: str,
    quantity: int,
    reason: str = None,
    is_counter_offer_rejection: bool = False
) -> bool:
    """Send notification when loan is rejected."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    if is_counter_offer_rejection:
        subject = f"❌ Counter-offer Rejected"
    else:
        subject = f"❌ Loan Request Declined by {lender_shop}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Loan Declined</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name},</h2>
                <p>{lender_shop} has declined the loan request for {quantity} bags.</p>
                {f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""}
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Request from Another Shop</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, {lender_shop} declined the loan. View: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_loan_confirmed_notification(
    to_email: str,
    manager_name: str,
    borrower_shop: str,
    quantity: int
) -> bool:
    """Send notification to lender when borrower confirms the loan."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    subject = f"✅ Loan Confirmed - {borrower_shop} will arrange pickup"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Loan Confirmed!</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p><strong>{borrower_shop}</strong> confirmed the loan for {quantity} bags. Please prepare for pickup.</p>
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">View Loan Details</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, {borrower_shop} confirmed loan for {quantity} bags. View: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_loan_pickup_complete_notification(
    to_email: str,
    manager_name: str,
    borrower_shop: str,
    quantity: int,
    driver_name: str
) -> bool:
    """Send notification to lender when pickup is complete."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    subject = f"📦 Loan Pickup Complete - {quantity} bags collected"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Pickup Complete!</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>{driver_name} picked up {quantity} bags for {borrower_shop}. The loan is now active.</p>
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Track Loan</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, {quantity} bags picked up. Loan is active. View: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_loan_return_initiated_notification(
    to_email: str,
    manager_name: str,
    borrower_shop: str,
    quantity: int
) -> bool:
    """Send notification to lender when borrower initiates return."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    subject = f"🔄 Loan Return Initiated - {borrower_shop} is returning {quantity} bags"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Return Initiated!</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p><strong>{borrower_shop}</strong> is returning {quantity} bags. A driver will be on the way.</p>
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Track Return</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, {borrower_shop} is returning {quantity} bags. View: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_loan_completed_notification(
    to_email: str,
    manager_name: str,
    other_shop: str,
    quantity: int,
    is_lender: bool
) -> bool:
    """Send notification when loan is completed."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    if is_lender:
        subject = f"✅ Loan Completed - {quantity} bags returned from {other_shop}"
        message = f"{quantity} bags have been returned to your stock."
    else:
        subject = f"✅ Loan Completed - {quantity} bags returned to {other_shop}"
        message = f"You have successfully returned {quantity} bags."

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Loan Completed!</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>{message}</p>
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">View Loan History</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, {message} View: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_loan_overdue_reminder(
    to_email: str,
    manager_name: str,
    lender_shop: str,
    quantity: int,
    days_overdue: int,
    original_return_date: str
) -> bool:
    """Send overdue reminder to borrower."""
    settings = get_settings()
    loans_url = f"{settings.app_url}/loans"

    subject = f"⚠️ Overdue Loan Reminder - {quantity} bags due to {lender_shop}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">⚠️ Overdue Loan</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p>Your loan of {quantity} bags from {lender_shop} is overdue by {days_overdue} day(s). Original due date was {original_return_date}.</p>
                <p style="text-align: center;">
                    <a href="{loans_url}" class="button">Arrange Return Now</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"Hi {manager_name}, Your loan is overdue by {days_overdue} days. Arrange return: {loans_url}"

    return send_email(to_email, subject, html_content, text_content)


def send_time_proposal_notification(
    to_email: str,
    manager_name: str,
    location_name: str,
    quantity_bags: int,
    driver_name: str,
    requested_time: str,
    proposed_time: str,
    reason: str,
    request_id: str
) -> bool:
    """Send notification to manager when driver proposes different delivery time."""
    settings = get_settings()
    requests_url = f"{settings.app_url}/requests"

    # Map reason codes to human-readable text
    reason_text = {
        "vehicle_issue": "Vehicle broke down or needs repairs",
        "another_urgent_request": "Another urgent request took priority",
        "route_conditions": "Route conditions (weather/road issues)",
        "schedule_conflict": "Schedule conflict with existing commitments",
        "other": "Other reason"
    }.get(reason, reason)

    subject = f"⏰ Delivery Time Proposal - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0; }}
            .time-comparison {{ display: flex; justify-content: space-between; margin: 20px 0; }}
            .time-box {{ text-align: center; padding: 15px; border-radius: 8px; flex: 1; margin: 0 5px; }}
            .requested {{ background: #fee2e2; color: #dc2626; }}
            .proposed {{ background: #d1fae5; color: #059669; }}
            .button {{ display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">⏰ Delivery Time Proposal</h1>
            </div>
            <div class="content">
                <h2>Hi {manager_name}!</h2>
                <p><strong>{driver_name}</strong> has proposed a different delivery time for your stock request.</p>

                <div class="info-box">
                    <p><strong>Location:</strong> {location_name}</p>
                    <p><strong>Quantity:</strong> {quantity_bags} bags</p>
                    <p><strong>Reason:</strong> {reason_text}</p>
                </div>

                <div class="time-comparison">
                    <div class="time-box requested">
                        <p style="margin: 0; font-size: 12px;">Your Request</p>
                        <p style="margin: 5px 0; font-weight: bold;">{requested_time}</p>
                    </div>
                    <div class="time-box proposed">
                        <p style="margin: 0; font-size: 12px;">Driver's Proposal</p>
                        <p style="margin: 5px 0; font-weight: bold;">{proposed_time}</p>
                    </div>
                </div>

                <p style="text-align: center;">
                    <a href="{requests_url}" class="button">Review Proposal</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""Hi {manager_name},

{driver_name} has proposed a different delivery time for your stock request.

Location: {location_name}
Quantity: {quantity_bags} bags

Your requested time: {requested_time}
Driver's proposed time: {proposed_time}
Reason: {reason_text}

Review the proposal: {requests_url}
"""

    return send_email(to_email, subject, html_content, text_content)


def send_proposal_accepted_notification(
    to_email: str,
    driver_name: str,
    location_name: str,
    quantity_bags: int,
    agreed_time: str,
    request_id: str
) -> bool:
    """Send notification to driver when manager accepts their proposed time."""
    settings = get_settings()
    requests_url = f"{settings.app_url}/requests"

    subject = f"✅ Time Proposal Accepted - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 20px; margin: 15px 0; }}
            .button {{ display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">✅ Proposal Accepted!</h1>
            </div>
            <div class="content">
                <h2>Hi {driver_name}!</h2>
                <p>Great news! The store manager has accepted your proposed delivery time.</p>

                <div class="info-box">
                    <p><strong>Location:</strong> {location_name}</p>
                    <p><strong>Quantity:</strong> {quantity_bags} bags</p>
                    <p><strong>Agreed Delivery Time:</strong> {agreed_time}</p>
                </div>

                <p>You can now proceed to create a trip for this delivery.</p>

                <p style="text-align: center;">
                    <a href="{requests_url}" class="button">View Request</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""Hi {driver_name},

Great news! The store manager has accepted your proposed delivery time.

Location: {location_name}
Quantity: {quantity_bags} bags
Agreed Delivery Time: {agreed_time}

You can now proceed to create a trip for this delivery.

View request: {requests_url}
"""

    return send_email(to_email, subject, html_content, text_content)


def send_proposal_declined_notification(
    to_email: str,
    driver_name: str,
    location_name: str,
    quantity_bags: int,
    manager_notes: str,
    request_id: str
) -> bool:
    """Send notification to driver when manager declines their proposed time."""
    settings = get_settings()
    requests_url = f"{settings.app_url}/requests"

    subject = f"❌ Time Proposal Declined - {location_name}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 15px 0; }}
            .button {{ display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">❌ Proposal Declined</h1>
            </div>
            <div class="content">
                <h2>Hi {driver_name},</h2>
                <p>The store manager has declined your proposed delivery time. The request is now available for other drivers.</p>

                <div class="info-box">
                    <p><strong>Location:</strong> {location_name}</p>
                    <p><strong>Quantity:</strong> {quantity_bags} bags</p>
                    {f"<p><strong>Manager's Note:</strong> {manager_notes}</p>" if manager_notes else ""}
                </div>

                <p style="text-align: center;">
                    <a href="{requests_url}" class="button">View Requests</a>
                </p>
            </div>
            <div class="footer">
                <p>Potato Stock Tracking System</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""Hi {driver_name},

The store manager has declined your proposed delivery time. The request is now available for other drivers.

Location: {location_name}
Quantity: {quantity_bags} bags
{f"Manager's Note: {manager_notes}" if manager_notes else ""}

View requests: {requests_url}
"""

    return send_email(to_email, subject, html_content, text_content)
