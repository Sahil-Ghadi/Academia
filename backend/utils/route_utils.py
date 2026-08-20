"""
Shared utilities for routes to avoid code repetition
"""
from firebase_admin import firestore
from fastapi import HTTPException
from typing import Optional, Dict, Any
from datetime import datetime

db = firestore.client()


def get_user_profile(uid: str) -> Dict[str, Any]:
    """
    Get user profile from Firestore
    
    Args:
        uid: User ID
        
    Returns:
        User profile data as dictionary
        
    Raises:
        HTTPException: If user not found
    """
    user_ref = db.collection("user_profiles").document(uid).get()
    
    if not user_ref.exists:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_ref.to_dict()


def get_user_subjects(uid: str, default: Optional[list] = None) -> list:
    """
    Get user's academic subjects
    
    Args:
        uid: User ID
        default: Default subjects if none found
        
    Returns:
        List of subjects
    """
    if default is None:
        default = ["General Study"]
    
    try:
        profile = get_user_profile(uid)
        subjects = profile.get("academic_subjects", [])
        return subjects if subjects else default
    except:
        return default


def save_to_firestore(collection: str, uid: str, data: dict, subcollection: Optional[str] = None) -> str:
    """
    Save data to Firestore
    
    Args:
        collection: Main collection name (e.g., "user_profiles")
        uid: User ID
        data: Data to save
        subcollection: Optional subcollection name
        
    Returns:
        Document ID
    """
    try:
        # Add timestamp
        data['created_at'] = datetime.utcnow().isoformat()
        data['updated_at'] = datetime.utcnow().isoformat()
        
        if subcollection:
            doc_ref = db.collection(collection).document(uid).collection(subcollection).add(data)
            return doc_ref[1].id
        else:
            doc_ref = db.collection(collection).document(uid)
            doc_ref.set(data, merge=True)
            return uid
    except Exception as e:
        print(f"Error saving to Firestore: {str(e)}")
        raise


def format_time_ago(timestamp) -> str:
    """
    Format timestamp to human-readable time ago
    
    Args:
        timestamp: Firestore timestamp, datetime, or ISO string
        
    Returns:
        Human-readable time string (e.g., "2 hours ago")
    """
    if not timestamp:
        return "Just now"
    
    # Handle Firestore timestamp
    if hasattr(timestamp, 'timestamp'):
        dt = datetime.fromtimestamp(timestamp.timestamp())
    elif isinstance(timestamp, str):
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except:
            return "Just now"
    elif isinstance(timestamp, datetime):
        dt = timestamp
    else:
        return "Just now"
    
    now = datetime.now()
    diff = now - dt
    
    if diff.total_seconds() < 60:
        return "Just now"
    elif diff.total_seconds() < 3600:
        minutes = int(diff.total_seconds() / 60)
        return f"{minutes} {'minute' if minutes == 1 else 'minutes'} ago"
    elif diff.total_seconds() < 86400:
        hours = int(diff.total_seconds() / 3600)
        return f"{hours} {'hour' if hours == 1 else 'hours'} ago"
    else:
        days = int(diff.total_seconds() / 86400)
        return f"{days} {'day' if days == 1 else 'days'} ago"


def handle_error(error: Exception, context: str = "Operation") -> HTTPException:
    """
    Standardized error handling
    
    Args:
        error: The exception that occurred
        context: Context of the error for logging
        
    Returns:
        HTTPException with appropriate status code
    """
    import traceback
    traceback.print_exc()
    print(f"{context} Error: {str(error)}")
    
    if isinstance(error, HTTPException):
        return error
    
    return HTTPException(status_code=500, detail=str(error))
