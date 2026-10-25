import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service to send emails via the Node.js email service with direct Brevo fallback"""
    
    def __init__(self):
        self.email_service_url = getattr(settings, "EMAIL_SERVICE_URL", "http://localhost:5000/api/email")
        self.brevo_api_key = getattr(settings, "BREVO_API_KEY", "")
        self.sender_email = getattr(settings, "SENDER_EMAIL", "neurohireaiplatform@gmail.com")
        self.sender_name = getattr(settings, "SENDER_NAME", "NeuroHire AI")

    async def _send_brevo_direct(self, to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
        """Direct fallback to Brevo REST API if Node service is unavailable"""
        api_key = self.brevo_api_key or getattr(settings, "BREVO_API_KEY", "")
        if not api_key:
            return False
        try:
            logger.info(f"⚡ Python fallback: Sending directly via Brevo REST API to {to}...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={
                        "Content-Type": "application/json",
                        "api-key": api_key
                    },
                    json={
                        "sender": {
                            "name": self.sender_name,
                            "email": self.sender_email
                        },
                        "to": [{"email": to}],
                        "subject": subject,
                        "htmlContent": html,
                        "textContent": text or subject
                    },
                    timeout=15.0
                )
                if resp.status_code in (200, 201):
                    logger.info(f"✅ Python Brevo direct delivery succeeded: {resp.text}")
                    return True
                else:
                    logger.warning(f"⚠️ Python Brevo direct returned {resp.status_code}: {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Python Brevo direct error: {e}")
            return False
    
    async def send_welcome_email(self, to: str, name: str) -> bool:
        """Send welcome email to new user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/welcome",
                    json={
                        "to": to,
                        "name": name
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Welcome email sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send welcome email: {response.text}")
                    return False
        except Exception as e:
            logger.warning(f"Error sending welcome email via node service: {e}. Trying direct Brevo fallback...")
            return await self._send_brevo_direct(
                to=to,
                subject="Welcome to NeuroHire AI!",
                html=f"<h2>Welcome to NeuroHire AI!</h2><p>Hello {name}, your profile has been created successfully.</p>",
                text=f"Welcome to NeuroHire AI! Hello {name}, your profile has been created successfully."
            )
    
    async def send_application_confirmation(self, to: str, candidate_name: str, job_title: str, company_name: str) -> bool:
        """Send application confirmation email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/application-confirmation",
                    json={
                        "to": to,
                        "candidateName": candidate_name,
                        "jobTitle": job_title,
                        "companyName": company_name
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Application confirmation sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send application confirmation: {response.text}")
                    return False
        except Exception as e:
            logger.warning(f"Error sending application confirmation via node service: {e}. Trying direct Brevo fallback...")
            return await self._send_brevo_direct(
                to=to,
                subject=f"Application Submitted: {job_title} at {company_name}",
                html=f"<h2>Application Submitted!</h2><p>Hello {candidate_name}, your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> was submitted.</p>",
                text=f"Hello {candidate_name}, your application for {job_title} at {company_name} was submitted."
            )
    
    async def send_selection_email(
        self, 
        to: str, 
        candidate_name: str, 
        job_title: str, 
        company_name: str,
        application_id: Optional[str] = None,
        frontend_url: Optional[str] = None
    ) -> bool:
        """Send selection email with offer accept/decline links"""
        try:
            payload = {
                "to": to,
                "candidateName": candidate_name,
                "jobTitle": job_title,
                "companyName": company_name
            }
            if application_id:
                payload["applicationId"] = application_id
            if frontend_url:
                payload["frontendUrl"] = frontend_url

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/selection",
                    json=payload,
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Selection email sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send selection email: {response.text}")
                    return False
        except Exception as e:
            logger.warning(f"Error sending selection email via node service: {e}. Trying direct Brevo fallback...")
            return await self._send_brevo_direct(
                to=to,
                subject=f"Congratulations! You've been selected for {job_title}",
                html=f"<h2>Congratulations!</h2><p>Hello {candidate_name}, you have been selected for {job_title} at {company_name}!</p>",
                text=f"Congratulations! You have been selected for {job_title} at {company_name}!"
            )
    
    async def send_rejection_email(self, to: str, candidate_name: str, job_title: str, company_name: str) -> bool:
        """Send rejection email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/rejection",
                    json={
                        "to": to,
                        "candidateName": candidate_name,
                        "jobTitle": job_title,
                        "companyName": company_name
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Rejection email sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send rejection email: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending rejection email: {e}")
            return False

    async def send_bulk_rejection_emails(self, candidates: list, job_title: str, company_name: str) -> dict:
        """Send bulk rejection emails via node email service with direct fallback"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/bulk-rejection",
                    json={
                        "candidates": candidates,
                        "jobTitle": job_title,
                        "companyName": company_name
                    },
                    timeout=30.0
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Bulk rejection returned {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error in send_bulk_rejection_emails via node service: {e}")

        # Fallback: send individually
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

    
    async def send_interview_invitation(self, to: str, candidate_name: str, job_title: str, company_name: str, interview_date: str, interview_link: Optional[str] = None) -> bool:
        """Send interview invitation email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/interview-invitation",
                    json={
                        "to": to,
                        "candidateName": candidate_name,
                        "jobTitle": job_title,
                        "companyName": company_name,
                        "interviewDate": interview_date,
                        "interviewLink": interview_link
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Interview invitation sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send interview invitation: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending interview invitation: {e}")
            return False
    
    async def send_custom_email(self, to: str, subject: str, html_content: str, text_content: Optional[str] = None, attachments: Optional[list] = None) -> bool:
        """Send custom email with optional attachments"""
        try:
            # Log email content info
            logger.info(f"📧 Python Email Service - send_custom_email called:")
            logger.info(f"  - to: {to}")
            logger.info(f"  - subject: {subject}")
            logger.info(f"  - html_content length: {len(html_content) if html_content else 0}")
            logger.info(f"  - text_content length: {len(text_content) if text_content else 0}")
            logger.info(f"  - html_content preview: {html_content[:200] if html_content else 'No HTML'}")
            
            # Log attachment info
            if attachments:
                logger.info(f"Sending email with {len(attachments)} attachments")
                for i, att in enumerate(attachments):
                    logger.info(f"Attachment {i+1}: name={att.get('name')}, content_length={len(att.get('content', ''))}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/custom",
                    json={
                        "to": to,
                        "subject": subject,
                        "html": html_content,
                        "text": text_content or subject,
                        "attachments": attachments or []
                    },
                    timeout=30.0
                )
                if response.status_code == 200:
                    logger.info(f"Custom email sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send custom email: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending custom email: {e}")
            return False

# Global email service instance
email_service = EmailService()