import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service to send emails via the Node.js email service"""
    
    def __init__(self):
        self.email_service_url = "http://localhost:5000/api/email"
    
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
            logger.error(f"Error sending welcome email: {e}")
            return False
    
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
            logger.error(f"Error sending application confirmation: {e}")
            return False
    
    async def send_selection_email(self, to: str, candidate_name: str, job_title: str, company_name: str) -> bool:
        """Send selection email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.email_service_url}/selection",
                    json={
                        "to": to,
                        "candidateName": candidate_name,
                        "jobTitle": job_title,
                        "companyName": company_name
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    logger.info(f"Selection email sent to {to}")
                    return True
                else:
                    logger.error(f"Failed to send selection email: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error sending selection email: {e}")
            return False
    
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

# Global email service instance
email_service = EmailService()