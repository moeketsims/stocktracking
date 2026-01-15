from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from ..config import get_supabase_admin_client
from ..routers.auth import require_auth
from ..models.responses import NotificationsResponse, NotificationItem

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationsResponse)
async def get_notifications(user_data: dict = Depends(require_auth)):
    """Get user's notifications."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        # Get notifications for this user
        result = supabase.table("usage_notifications").select("*").eq(
            "recipient_user_id", user.id
        ).order("created_at", desc=True).limit(50).execute()

        notifications = [
            NotificationItem(
                id=n["id"],
                notification_type=n["notification_type"],
                title=n["title"],
                body=n["body"],
                is_read=n.get("is_read", False),
                created_at=n["created_at"],
                data=n.get("data", {})
            )
            for n in (result.data or [])
        ]

        unread_count = sum(1 for n in notifications if not n.is_read)

        return NotificationsResponse(
            notifications=notifications,
            unread_count=unread_count
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_data: dict = Depends(require_auth)):
    """Mark a notification as read."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        result = supabase.table("usage_notifications").update({
            "is_read": True,
            "read_at": datetime.now().isoformat()
        }).eq("id", notification_id).eq("recipient_user_id", user.id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"success": True, "message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read-all")
async def mark_all_notifications_read(user_data: dict = Depends(require_auth)):
    """Mark all notifications as read."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        supabase.table("usage_notifications").update({
            "is_read": True,
            "read_at": datetime.now().isoformat()
        }).eq("recipient_user_id", user.id).eq("is_read", False).execute()

        return {"success": True, "message": "All notifications marked as read"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(user_data: dict = Depends(require_auth)):
    """Get count of unread notifications."""
    supabase = get_supabase_admin_client()
    user = user_data["user"]

    try:
        result = supabase.table("usage_notifications").select(
            "id"
        ).eq("recipient_user_id", user.id).eq("is_read", False).execute()

        return {"unread_count": len(result.data or [])}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
