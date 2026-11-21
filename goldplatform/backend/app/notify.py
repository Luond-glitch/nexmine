"""Delivery of password-reset links. Both channels need provider settings in .env; without them nothing is sent."""
import logging, smtplib
from email.message import EmailMessage
import requests
from .config import settings as S

log = logging.getLogger("notify")


def send_email(to: str, subject: str, body: str) -> bool:
    if not (S.smtp_host and S.smtp_from): return False
    try:
        m = EmailMessage(); m["From"], m["To"], m["Subject"] = S.smtp_from, to, subject; m.set_content(body)
        with smtplib.SMTP(S.smtp_host, S.smtp_port, timeout=15) as srv:
            srv.starttls()
            if S.smtp_user: srv.login(S.smtp_user, S.smtp_password)
            srv.send_message(m)
        return True
    except Exception as e:
        log.warning("email failed: %s", type(e).__name__); return False


def send_sms(to: str, text: str) -> bool:   # Africa's Talking bulk SMS API
    if not (S.at_username and S.at_api_key): return False
    host = "api.sandbox.africastalking.com" if S.at_username == "sandbox" else "api.africastalking.com"
    try:
        data = {"username": S.at_username, "to": to, "message": text}
        if S.at_sender: data["from"] = S.at_sender
        r = requests.post(f"https://{host}/version1/messaging", data=data, headers={"apiKey": S.at_api_key, "Accept": "application/json"}, timeout=15)
        return r.status_code in (200, 201)
    except Exception as e:
        log.warning("sms failed: %s", type(e).__name__); return False
