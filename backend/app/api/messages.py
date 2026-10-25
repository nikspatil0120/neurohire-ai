"""
Messaging API
Collections used:
  - messages: chat messages between candidates and recruiters
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends, UploadFile, File
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
import logging
import os
import uuid
import aiofiles

from app.core.database import get_mongo_db
from app.api.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────

class MessageCreate(BaseModel):
    conversation_id: str  # Link between candidate and recruiter
    sender_id: str
    sender_name: str
    sender_role: str  # "candidate" or "recruiter"
    recipient_id: str
    recipient_name: str
    recipient_role: str
    content: Optional[str] = ""
    company_name: Optional[str] = ""  # For grouping by company
    message_type: Optional[str] = "text"  # "text", "image", "file", "audio"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    reply_to: Optional[Dict[str, Any]] = None

class ReactionUpdate(BaseModel):
    user_id: str
    emoji: str

class MessageResponse(BaseModel):
    _id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    recipient_id: str
    recipient_name: str
    recipient_role: str
    content: str
    company_name: str
    created_at: str
    read: bool
    message_type: Optional[str] = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    reply_to: Optional[Dict[str, Any]] = None
    reactions: Optional[List[Dict[str, Any]]] = []
    is_deleted: Optional[bool] = False


class Conversation(BaseModel):
    _id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    recruiter_id: str
    recruiter_name: str
    recruiter_email: str
    company_name: str
    last_message: str
    last_message_time: str
    unread_count: int


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def format_utc_timestamp(ts) -> str:
    if not ts:
        return ""
    ts_str = str(ts)
    if not ts_str.endswith("Z") and "+" not in ts_str and not ("-" in ts_str[10:]):
        return f"{ts_str}Z"
    return ts_str


def message_helper(msg) -> dict:
    return {
        "_id": str(msg["_id"]),
        "conversation_id": str(msg.get("conversation_id", "")),
        "sender_id": msg.get("sender_id", ""),
        "sender_name": msg.get("sender_name", ""),
        "sender_role": msg.get("sender_role", ""),
        "recipient_id": msg.get("recipient_id", ""),
        "recipient_name": msg.get("recipient_name", ""),
        "recipient_role": msg.get("recipient_role", ""),
        "content": msg.get("content", ""),
        "company_name": msg.get("company_name", ""),
        "message_type": msg.get("message_type", "text"),
        "file_url": msg.get("file_url"),
        "file_name": msg.get("file_name"),
        "file_size": msg.get("file_size"),
        "file_type": msg.get("file_type"),
        "reply_to": msg.get("reply_to"),
        "reactions": msg.get("reactions", []),
        "is_deleted": msg.get("is_deleted", False),
        "created_at": format_utc_timestamp(msg.get("created_at", "")),
        "read": msg.get("read", False)
    }


def conversation_helper(conv) -> dict:
    return {
        "_id": str(conv["_id"]),
        "candidate_id": conv.get("candidate_id", ""),
        "candidate_name": conv.get("candidate_name", ""),
        "candidate_email": conv.get("candidate_email", ""),
        "recruiter_id": conv.get("recruiter_id", ""),
        "recruiter_name": conv.get("recruiter_name", ""),
        "recruiter_email": conv.get("recruiter_email", ""),
        "company_name": conv.get("company_name", ""),
        "last_message": conv.get("last_message", ""),
        "last_message_time": format_utc_timestamp(conv.get("last_message_time", "")),
        "unread_count": conv.get("unread_count", 0),
        "enabled": conv.get("enabled", True)
    }


# ─────────────────────────────────────────────
# MESSAGE ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    """Upload a file or image for messaging"""
    try:
        chat_dir = os.path.join("storage", "uploads", "chat")
        os.makedirs(chat_dir, exist_ok=True)
        
        orig_name = file.filename or "file"
        ext = os.path.splitext(orig_name)[1].lower()
        content_type = file.content_type or "application/octet-stream"
        
        # Categorize
        if content_type.startswith("image/") or ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]:
            file_category = "image"
        elif content_type.startswith("audio/") or ext in [".mp3", ".wav", ".ogg", ".m4a", ".webm", ".aac"]:
            file_category = "audio"
        else:
            file_category = "file"
            
        unique_filename = f"{uuid.uuid4().hex[:10]}_{orig_name}"
        save_path = os.path.join(chat_dir, unique_filename)
        
        contents = await file.read()
        file_size = len(contents)
        
        async with aiofiles.open(save_path, "wb") as f:
            await f.write(contents)
            
        file_url = f"http://localhost:8000/storage/uploads/chat/{unique_filename}"
        
        return {
            "success": True,
            "file_url": file_url,
            "file_name": orig_name,
            "file_size": file_size,
            "file_type": file_category,
            "mime_type": content_type
        }
    except Exception as e:
        logger.error(f"Error in upload_chat_file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_message(message_data: MessageCreate):
    """Send a message between candidate and recruiter"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        # Create or update conversation
        now = f"{datetime.utcnow().isoformat()}Z"
        
        # Determine last_message preview snippet
        last_msg_snippet = (message_data.content or "").strip()
        if message_data.message_type == "image":
            last_msg_snippet = f"📷 {last_msg_snippet}" if last_msg_snippet else "📷 Photo"
        elif message_data.message_type == "file":
            last_msg_snippet = f"📄 {message_data.file_name or 'Document'}"
        elif message_data.message_type == "audio":
            last_msg_snippet = "🎤 Voice message"
        elif not last_msg_snippet:
            last_msg_snippet = "Attachment"

        # Generate conversation ID (sorted pair of IDs to ensure uniqueness)
        participant_ids = sorted([message_data.sender_id, message_data.recipient_id])
        conversation_id = f"{participant_ids[0]}_{participant_ids[1]}"
        
        # Check if conversation exists
        conversation = await mongodb["conversations"].find_one({
            "candidate_id": message_data.sender_id if message_data.sender_role == "candidate" else message_data.recipient_id,
            "recruiter_id": message_data.recipient_id if message_data.sender_role == "candidate" else message_data.sender_id
        })
        
        if conversation:
            # Update conversation
            await mongodb["conversations"].update_one(
                {"_id": conversation["_id"]},
                {"$set": {
                    "last_message": last_msg_snippet,
                    "last_message_time": now,
                    "unread_count": conversation.get("unread_count", 0) + 1 if message_data.sender_role != conversation.get("last_sender_role") else conversation.get("unread_count", 0),
                    "last_sender_role": message_data.sender_role,
                    "updated_at": now
                }}
            )
        else:
            # Create new conversation
            conv_doc = {
                "candidate_id": message_data.sender_id if message_data.sender_role == "candidate" else message_data.recipient_id,
                "candidate_name": message_data.sender_name if message_data.sender_role == "candidate" else message_data.recipient_name,
                "candidate_email": message_data.sender_id if message_data.sender_role == "candidate" else message_data.recipient_id,
                "recruiter_id": message_data.recipient_id if message_data.sender_role == "candidate" else message_data.sender_id,
                "recruiter_name": message_data.recipient_name if message_data.sender_role == "candidate" else message_data.sender_name,
                "recruiter_email": message_data.recipient_id if message_data.sender_role == "candidate" else message_data.sender_id,
                "company_name": message_data.company_name or "",
                "last_message": last_msg_snippet,
                "last_message_time": now,
                "unread_count": 1,
                "last_sender_role": message_data.sender_role,
                "created_at": now,
                "updated_at": now
            }
            await mongodb["conversations"].insert_one(conv_doc)

        # Save message
        msg_doc = {
            "conversation_id": conversation_id,
            "sender_id": message_data.sender_id,
            "sender_name": message_data.sender_name,
            "sender_role": message_data.sender_role,
            "recipient_id": message_data.recipient_id,
            "recipient_name": message_data.recipient_name,
            "recipient_role": message_data.recipient_role,
            "content": message_data.content or "",
            "company_name": message_data.company_name or "",
            "message_type": message_data.message_type or "text",
            "file_url": message_data.file_url,
            "file_name": message_data.file_name,
            "file_size": message_data.file_size,
            "file_type": message_data.file_type,
            "reply_to": message_data.reply_to,
            "reactions": [],
            "is_deleted": False,
            "read": False,
            "created_at": now
        }
        result = await mongodb["messages"].insert_one(msg_doc)
        
        created = await mongodb["messages"].find_one({"_id": result.inserted_id})
        return {"success": True, "message": message_helper(created)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"send_message error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/message/{message_id}/reaction")
async def toggle_reaction(message_id: str, reaction: ReactionUpdate):
    """Add or toggle an emoji reaction on a message"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            msg_oid = ObjectId(message_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid message_id")

        msg = await mongodb["messages"].find_one({"_id": msg_oid})
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        reactions = msg.get("reactions", []) or []
        # Check if user already reacted with this emoji
        existing_idx = next((i for i, r in enumerate(reactions) if r.get("user_id") == reaction.user_id and r.get("emoji") == reaction.emoji), None)
        
        if existing_idx is not None:
            # Remove reaction (toggle off)
            reactions.pop(existing_idx)
        else:
            # Remove any previous reaction from same user and add new one
            reactions = [r for r in reactions if r.get("user_id") != reaction.user_id]
            reactions.append({"user_id": reaction.user_id, "emoji": reaction.emoji})

        await mongodb["messages"].update_one(
            {"_id": msg_oid},
            {"$set": {"reactions": reactions}}
        )

        return {"success": True, "reactions": reactions}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"toggle_reaction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/message/{message_id}")
async def delete_message(message_id: str):
    """Delete a message (WhatsApp style - marked deleted)"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            msg_oid = ObjectId(message_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid message_id")

        result = await mongodb["messages"].update_one(
            {"_id": msg_oid},
            {"$set": {
                "is_deleted": True,
                "content": "This message was deleted",
                "file_url": None,
                "file_name": None
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")

        return {"success": True, "message": "Message deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_message error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/{conversation_id}")
async def get_conversation_messages(conversation_id: str, skip: int = 0, limit: int = 50):
    """Get all messages in a conversation"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        cursor = mongodb["messages"].find({"conversation_id": conversation_id}).sort("created_at", 1).skip(skip).limit(limit)
        messages = [message_helper(m) async for m in cursor]
        return {"success": True, "messages": messages, "count": len(messages)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_conversation_messages error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/user/{user_id}")
async def get_user_conversations(user_id: str, user_role: str = Query(...)):
    """Get all conversations for a user (candidate or recruiter)"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        if user_role == "candidate":
            query = {"candidate_id": user_id}
        else:
            query = {"recruiter_id": user_id}

        cursor = mongodb["conversations"].find(query).sort("last_message_time", -1)
        conversations = [conversation_helper(c) async for c in cursor]
        return {"success": True, "conversations": conversations, "count": len(conversations)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_user_conversations error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/by-company/{candidate_id}")
async def get_candidate_conversations_by_company(candidate_id: str):
    """Get candidate's conversations grouped by company"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        cursor = mongodb["conversations"].find({"candidate_id": candidate_id, "enabled": True}).sort("last_message_time", -1)
        conversations = [conversation_helper(c) async for c in cursor]
        
        # Group by company
        grouped = {}
        for conv in conversations:
            company = conv["company_name"] or "Other"
            if company not in grouped:
                grouped[company] = []
            grouped[company].append(conv)
        
        return {"success": True, "grouped_conversations": grouped}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_candidate_conversations_by_company error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/all")
async def get_all_conversations(skip: int = 0, limit: int = 100):
    """Admin: Get all conversations"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        cursor = mongodb["conversations"].find().sort("last_message_time", -1).skip(skip).limit(limit)
        conversations = [conversation_helper(c) async for c in cursor]
        total = await mongodb["conversations"].count_documents({})
        return {"success": True, "conversations": conversations, "count": len(conversations), "total": total}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_all_conversations error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/conversation/{conversation_id}/read")
async def mark_conversation_read(conversation_id: str, user_id: str = Query(...)):
    """Mark all messages in conversation for this user as read and reset unread_count"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        # 1. Update messages addressed to user or from other party
        await mongodb["messages"].update_many(
            {"conversation_id": conversation_id, "recipient_id": user_id, "read": False},
            {"$set": {"read": True}}
        )
        await mongodb["messages"].update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user_id}, "read": False},
            {"$set": {"read": True}}
        )

        # 2. Reset conversation unread_count
        try:
            conv_oid = ObjectId(conversation_id)
            await mongodb["conversations"].update_one(
                {"_id": conv_oid},
                {"$set": {"unread_count": 0}}
            )
        except Exception:
            pass

        await mongodb["conversations"].update_one(
            {"_id": conversation_id},
            {"$set": {"unread_count": 0}}
        )

        parts = conversation_id.split("_")
        if len(parts) == 2:
            await mongodb["conversations"].update_one(
                {"$or": [
                    {"candidate_id": parts[0], "recruiter_id": parts[1]},
                    {"candidate_id": parts[1], "recruiter_id": parts[0]}
                ]},
                {"$set": {"unread_count": 0}}
            )

        return {"success": True, "message": "Conversation marked as read"}
    except Exception as e:
        logger.error(f"mark_conversation_read error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/message/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        try:
            msg_oid = ObjectId(message_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid message_id")

        msg = await mongodb["messages"].find_one({"_id": msg_oid})
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        result = await mongodb["messages"].update_one(
            {"_id": msg_oid},
            {"$set": {"read": True}}
        )
        
        # Reset conversation unread_count
        conv_id = msg.get("conversation_id")
        if conv_id:
            try:
                await mongodb["conversations"].update_one(
                    {"_id": ObjectId(conv_id)},
                    {"$set": {"unread_count": 0}}
                )
            except Exception:
                pass
            await mongodb["conversations"].update_one(
                {"_id": conv_id},
                {"$set": {"unread_count": 0}}
            )
            parts = str(conv_id).split("_")
            if len(parts) == 2:
                await mongodb["conversations"].update_one(
                    {"$or": [
                        {"candidate_id": parts[0], "recruiter_id": parts[1]},
                        {"candidate_id": parts[1], "recruiter_id": parts[0]}
                    ]},
                    {"$set": {"unread_count": 0}}
                )

        return {"success": True, "message": "Message marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"mark_message_read error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class AdminMessageCreate(BaseModel):
    conversation_id: str
    admin_id: str
    admin_name: str
    content: str

@router.post("/admin/send", status_code=status.HTTP_201_CREATED)
async def admin_send_message(data: AdminMessageCreate):
    """Admin interferes and sends a message into an ongoing conversation."""
    try:
        mongodb = get_mongo_db()
        if mongodb is None:
            raise HTTPException(status_code=503, detail="Database not available")

        # Find conversation by string _id or ObjectId
        conv = await mongodb["conversations"].find_one({"_id": data.conversation_id})
        if not conv:
            try:
                conv = await mongodb["conversations"].find_one({"_id": ObjectId(data.conversation_id)})
            except Exception:
                pass

        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        now = f"{datetime.utcnow().isoformat()}Z"
        conv_id_str = str(conv["_id"])

        # Insert message with admin role
        msg_doc = {
            "conversation_id": conv_id_str,
            "sender_id": data.admin_id,
            "sender_name": data.admin_name,
            "sender_role": "admin",
            "recipient_id": conv.get("candidate_id", ""),
            "recipient_name": f"{conv.get('candidate_name', '')} & {conv.get('recruiter_name', '')}",
            "recipient_role": "both",
            "content": data.content,
            "company_name": conv.get("company_name", ""),
            "read": False,
            "created_at": now
        }
        res = await mongodb["messages"].insert_one(msg_doc)

        # Update conversation last_message
        await mongodb["conversations"].update_one(
            {"_id": conv["_id"]},
            {"$set": {
                "last_message": f"[Admin] {data.content}",
                "last_message_time": now,
                "last_sender_role": "admin",
                "updated_at": now
            }}
        )

        created = await mongodb["messages"].find_one({"_id": res.inserted_id})
        return {"success": True, "message": message_helper(created)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"admin_send_message error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))