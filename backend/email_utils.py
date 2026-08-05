import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in backend/.env"
        )

    message = EmailMessage()
    message["Subject"] = "Reset your Jobly password"
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message.set_content(
        "We received a request to reset your Jobly password.\n\n"
        f"Reset it here: {reset_link}\n\n"
        "This link expires in 30 minutes. If you didn't request this, you can ignore this email."
    )
    message.add_alternative(
        f"""\
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
  <h2>Reset your password</h2>
  <p>We received a request to reset your Jobly password.</p>
  <p><a href="{reset_link}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">Reset password</a></p>
  <p>Or copy this link into your browser:<br>{reset_link}</p>
  <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
</div>
""",
        subtype="html",
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(message)
