from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["email"])


class SelectionEmailPayload(BaseModel):
    to: str
    candidateName: str
    jobTitle: str
    companyName: str
    applicationId: Optional[str] = ""
    frontendUrl: Optional[str] = "http://localhost:5173"


class CustomEmailPayload(BaseModel):
    to: str
    subject: str
    html: Optional[str] = None
    text: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class RejectionEmailPayload(BaseModel):
    to: str
    candidateName: str
    jobTitle: str
    companyName: str


class BulkRejectionEmailPayload(BaseModel):
    candidates: List[Dict[str, Any]]
    jobTitle: str
    companyName: str


class WelcomeEmailPayload(BaseModel):
    to: str
    name: str


class ApplicationConfirmationPayload(BaseModel):
    to: str
    candidateName: str
    jobTitle: str
    companyName: str


class InterviewInvitationPayload(BaseModel):
    to: str
    candidateName: str
    jobTitle: str
    companyName: str
    interviewDate: str
    interviewLink: Optional[str] = None


@router.get("/status")
async def email_status():
    """Check email service health and configuration"""
    api_key = email_service.brevo_api_key
    has_api_key = bool(api_key)
    return {
        "success": True,
        "service": "NeuroHire Brevo Email Service",
        "configured": {
            "apiKeySet": has_api_key,
            "senderEmail": email_service.sender_email,
            "senderName": email_service.sender_name
        }
    }


@router.post("/selection")
async def send_selection(payload: SelectionEmailPayload):
    """Send official selection email with offer Accept / Decline buttons"""
    try:
        logger.info(f"📧 Processing selection email for {payload.to} ({payload.jobTitle})")
        success = await email_service.send_selection_email(
            to=payload.to,
            candidate_name=payload.candidateName,
            job_title=payload.jobTitle,
            company_name=payload.companyName,
            application_id=payload.applicationId,
            frontend_url=payload.frontendUrl
        )
        if success:
            return {"success": True, "message": "Selection email sent successfully"}
        else:
            return {"success": False, "error": "Email delivery failed via email provider"}
    except Exception as e:
        logger.error(f"Error in send_selection endpoint: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/custom")
async def send_custom(payload: CustomEmailPayload):
    """Send custom email with optional attachments"""
    try:
        logger.info(f"📧 Processing custom email for {payload.to} (subject: {payload.subject})")
        success = await email_service.send_custom_email(
            to=payload.to,
            subject=payload.subject,
            html_content=payload.html or "",
            text_content=payload.text,
            attachments=payload.attachments
        )
        if success:
            return {"success": True, "message": "Custom email sent successfully"}
        else:
            return {"success": False, "error": "Custom email delivery failed via email provider"}
    except Exception as e:
        logger.error(f"Error in send_custom endpoint: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/rejection")
async def send_rejection(payload: RejectionEmailPayload):
    """Send candidate rejection email"""
    try:
        logger.info(f"📧 Processing rejection email for {payload.to}")
        success = await email_service.send_rejection_email(
            to=payload.to,
            candidate_name=payload.candidateName,
            job_title=payload.jobTitle,
            company_name=payload.companyName
        )
        if success:
            return {"success": True, "message": "Rejection email sent successfully"}
        else:
            return {"success": False, "error": "Rejection email delivery failed"}
    except Exception as e:
        logger.error(f"Error in send_rejection endpoint: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/bulk-rejection")
async def send_bulk_rejection(payload: BulkRejectionEmailPayload):
    """Send bulk rejection emails to unselected candidates"""
    try:
        result = await email_service.send_bulk_rejection_emails(
            candidates=payload.candidates,
            job_title=payload.jobTitle,
            company_name=payload.companyName
        )
        return result
    except Exception as e:
        logger.error(f"Error in send_bulk_rejection endpoint: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/welcome")
async def send_welcome(payload: WelcomeEmailPayload):
    """Send welcome email to newly registered user"""
    try:
        success = await email_service.send_welcome_email(to=payload.to, name=payload.name)
        return {"success": success, "message": "Welcome email sent" if success else "Failed"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/application-confirmation")
async def send_application_confirmation(payload: ApplicationConfirmationPayload):
    """Send application confirmation email"""
    try:
        success = await email_service.send_application_confirmation(
            to=payload.to,
            candidate_name=payload.candidateName,
            job_title=payload.jobTitle,
            company_name=payload.companyName
        )
        return {"success": success, "message": "Application confirmation sent" if success else "Failed"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/interview-invitation")
async def send_interview_invitation(payload: InterviewInvitationPayload):
    """Send interview invitation email"""
    try:
        success = await email_service.send_interview_invitation(
            to=payload.to,
            candidate_name=payload.candidateName,
            job_title=payload.jobTitle,
            company_name=payload.companyName,
            interview_date=payload.interviewDate,
            interview_link=payload.interviewLink
        )
        return {"success": success, "message": "Interview invitation sent" if success else "Failed"}
    except Exception as e:
        return {"success": False, "error": str(e)}
