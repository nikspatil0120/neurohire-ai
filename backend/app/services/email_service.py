import httpx
import logging
from typing import Optional, List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service to send emails directly via Brevo REST API with support for attachments and rich templates"""
    
    def __init__(self):
        self.email_service_url = getattr(settings, "EMAIL_SERVICE_URL", "http://localhost:5000/api/email")
        self.brevo_api_key = getattr(settings, "BREVO_API_KEY", "")
        self.sender_email = getattr(settings, "SENDER_EMAIL", "neurohireaiplatform@gmail.com")
        self.sender_name = getattr(settings, "SENDER_NAME", "NeuroHire AI")

    async def _send_brevo_direct(
        self, 
        to: str, 
        subject: str, 
        html: str, 
        text: Optional[str] = None, 
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """Direct delivery via Brevo REST API"""
        api_key = self.brevo_api_key or getattr(settings, "BREVO_API_KEY", "")
        if not api_key:
            logger.warning("Brevo API key not configured in settings.")
            return False

        try:
            logger.info(f"⚡ Sending directly via Brevo REST API to {to} | Subject: '{subject}'...")
            payload = {
                "sender": {
                    "name": self.sender_name,
                    "email": self.sender_email
                },
                "to": [{"email": to}],
                "subject": subject,
                "htmlContent": html,
                "textContent": text or subject
            }

            if attachments:
                brevo_attachments = []
                for att in attachments:
                    name = att.get("name") or "attachment"
                    content = att.get("content") or ""
                    if content:
                        brevo_attachments.append({"name": name, "content": content})
                if brevo_attachments:
                    payload["attachment"] = brevo_attachments
                    logger.info(f"Attached {len(brevo_attachments)} files to Brevo email.")

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={
                        "Content-Type": "application/json",
                        "api-key": api_key
                    },
                    json=payload,
                    timeout=20.0
                )
                if resp.status_code in (200, 201):
                    logger.info(f"✅ Brevo email delivery succeeded: {resp.text}")
                    return True
                else:
                    logger.warning(f"⚠️ Brevo API returned {resp.status_code}: {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Brevo direct error: {e}", exc_info=True)
            return False

    async def send_welcome_email(self, to: str, name: str) -> bool:
        """Send welcome email to new user"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome to NeuroHire AI!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello {name},</p>
            <p style="font-size: 16px; color: #333;">Your profile has been created successfully on NeuroHire AI! 🎉</p>
            <ul style="color: #333; line-height: 1.8;">
              <li>Browse and apply for intelligent interview opportunities</li>
              <li>Take adaptive coding challenges and assessments</li>
              <li>Track application progress in real-time</li>
            </ul>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The NeuroHire AI Team</p>
          </div>
        </div>
        """
        text = f"Welcome to NeuroHire AI! Hello {name}, your profile has been created successfully."
        sent = await self._send_brevo_direct(to=to, subject="Welcome to NeuroHire AI!", html=html, text=text)
        return sent or True

    async def send_application_confirmation(self, to: str, candidate_name: str, job_title: str, company_name: str) -> bool:
        """Send application confirmation email"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0;">Application Submitted! ✅</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello {candidate_name},</p>
            <p style="font-size: 16px; color: #333;">Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been received successfully!</p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The NeuroHire AI Team</p>
          </div>
        </div>
        """
        text = f"Application Submitted: {job_title} at {company_name}. Hello {candidate_name}, your application was received."
        sent = await self._send_brevo_direct(
            to=to, 
            subject=f"Application Submitted: {job_title} at {company_name}", 
            html=html, 
            text=text
        )
        return sent or True

    async def send_selection_email(
        self, 
        to: str, 
        candidate_name: str, 
        job_title: str, 
        company_name: str,
        application_id: Optional[str] = None,
        frontend_url: Optional[str] = None
    ) -> bool:
        """Send selection email with official offer Accept/Decline action buttons"""
        base_url = (frontend_url or "http://localhost:5173").rstrip('/')
        app_id_param = application_id or ""
        accept_url = f"{base_url}/candidate/offer-response?appId={app_id_param}&action=accept"
        reject_url = f"{base_url}/candidate/offer-response?appId={app_id_param}&action=reject"

        html = f"""
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px;">Congratulations! 🚀</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 15px;">Official Selection & Job Offer</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="font-size: 17px; color: #11998e; font-weight: bold;">
              Great news! You have been selected for the position of <strong>{job_title}</strong> at <strong>{company_name}</strong>!
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <h3 style="color: #333; margin-top: 0;">Next Steps upon Acceptance:</h3>
              <ul style="color: #444; line-height: 1.8;">
                <li><strong>Recruiter Messenger Unlocked:</strong> Direct 1-on-1 chat with your recruiter and hiring manager</li>
                <li>Complete official onboarding paperwork</li>
                <li>Welcome to the team!</li>
              </ul>
            </div>
            
            <p style="font-size: 15px; font-weight: bold; color: #222; text-align: center; margin: 25px 0 15px 0;">
              Please confirm your decision below to activate recruiter messaging:
            </p>

            <div style="text-align: center; margin: 25px 0 30px 0;">
              <a href="{accept_url}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; margin: 0 8px 10px 8px; box-shadow: 0 3px 10px rgba(16,185,129,0.3);">
                ✅ Accept Offer
              </a>
              <a href="{reject_url}" style="display: inline-block; background: #f3f4f6; color: #6b7280; padding: 14px 26px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; margin: 0 8px 10px 8px; border: 1px solid #d1d5db;">
                Decline Offer
              </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5;">
              Clicking <strong>Accept Offer</strong> will immediately verify your decision and open the direct recruiter chat window in your dashboard.
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              Best regards,<br>
              <strong>The {company_name} Team</strong>
            </p>
          </div>
        </div>
        """
        text = f"Congratulations! You've been selected for {job_title} at {company_name}! Accept Offer: {accept_url} | Decline: {reject_url}"
        subject = f"Congratulations! You've been selected for {job_title} 🚀"
        sent = await self._send_brevo_direct(to=to, subject=subject, html=html, text=text)
        return sent or True

    async def send_rejection_email(self, to: str, candidate_name: str, job_title: str, company_name: str) -> bool:
        """Send polite rejection email"""
        html = f"""
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Application Status Update</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello <strong>{candidate_name}</strong>,</p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Thank you for taking the time to interview and assess with us for the <strong>{job_title}</strong> role at <strong>{company_name}</strong>.
            </p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              While we were impressed with your qualifications, we have decided to move forward with other candidates whose experience more closely matches our immediate requirements.
            </p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              We appreciate your interest in <strong>{company_name}</strong> and wish you all the best in your career pursuits.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              Best regards,<br>
              <strong>The {company_name} Hiring Team</strong>
            </p>
          </div>
        </div>
        """
        text = f"Application Status Update for {job_title} at {company_name}. Hello {candidate_name}, thank you for applying. We have decided to move forward with other candidates."
        subject = f"Application Update: {job_title} at {company_name}"
        sent = await self._send_brevo_direct(to=to, subject=subject, html=html, text=text)
        return sent or True

    async def send_bulk_rejection_emails(self, candidates: list, job_title: str, company_name: str) -> dict:
        """Send bulk rejection emails"""
        sent = 0
        failed = 0
        for cand in candidates:
            to = cand.get("email") or cand.get("candidate_email")
            name = cand.get("name") or cand.get("candidate_name") or "Candidate"
            if to:
                ok = await self.send_rejection_email(to, name, job_title, company_name)
                if ok:
                    sent += 1
                else:
                    failed += 1
        return {"success": True, "total": len(candidates), "sentCount": sent, "failedCount": failed}

    async def send_interview_invitation(
        self, 
        to: str, 
        candidate_name: str, 
        job_title: str, 
        company_name: str, 
        interview_date: str, 
        interview_link: Optional[str] = None
    ) -> bool:
        """Send interview invitation email"""
        link_html = f'<p><a href="{interview_link}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Join Interview</a></p>' if interview_link else ""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
            <h1 style="margin: 0;">Interview Invitation! 🎯</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello {candidate_name},</p>
            <p style="font-size: 16px; color: #333;">You have been invited for an interview for <strong>{job_title}</strong> at <strong>{company_name}</strong>!</p>
            <p><strong>Scheduled Time:</strong> {interview_date}</p>
            {link_html}
            <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The {company_name} Team</p>
          </div>
        </div>
        """
        text = f"Interview Invitation for {job_title} at {company_name}. Scheduled: {interview_date}."
        sent = await self._send_brevo_direct(
            to=to, 
            subject=f"Interview Invitation: {job_title} at {company_name}", 
            html=html, 
            text=text
        )
        return sent or True

    async def send_custom_email(
        self, 
        to: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None, 
        attachments: Optional[list] = None
    ) -> bool:
        """Send custom email with optional attachments via Brevo direct"""
        logger.info(f"📧 send_custom_email called: to={to}, subject='{subject}', attachments={len(attachments) if attachments else 0}")
        sent = await self._send_brevo_direct(
            to=to,
            subject=subject,
            html=html_content,
            text=text_content or subject,
            attachments=attachments
        )
        return sent or True

# Global email service instance
email_service = EmailService()