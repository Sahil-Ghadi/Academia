from firebase_admin import firestore
from datetime import datetime

db = firestore.client()

async def log_timeline_event(uid: str, type: str, title: str, 
                           description: str, icon: str = "Bot", 
                           details: list = None, mode: str = "academic"):
    """
    Log an event to the user's timeline.
    
    Args:
        uid: User ID
        type: Event type (schedule, detection, adjustment, priority, insight, roadmap, project)
        title: Event title
        description: Short description
        icon: Icon name (Feather icon)
        details: List of detail strings
        mode: 'academic' or 'side-hustle'
    """
    try:
        event_data = {
            "type": type,
            "title": title,
            "description": description,
            "icon": icon,
            "details": details or [],
            "mode": mode,
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        # Add to subcollection
        db.collection("user_profiles").document(uid).collection("timeline_events").add(event_data)
        
    except Exception as e:
        print(f"Failed to log timeline event: {e}")
