"""Email utility for sending invitation and notification emails."""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import get_settings


def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """Send an email using Gmail SMTP."""
    settings = get_settings()

    if not settings.smtp_user or not settings.smtp_password:
        print("[EMAIL] SMTP not configured, skipping email send")
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

        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True

    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {str(e)}")
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
