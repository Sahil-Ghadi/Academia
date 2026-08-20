from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from firebase_admin import firestore
from datetime import datetime, timezone, date, timedelta

gamification_router = APIRouter(prefix="/gamification", tags=["gamification"])
db = firestore.client()

# ─────────────────────────────────────────────────────────
# XP Config
# ─────────────────────────────────────────────────────────

XP_EVENTS = {
    "assessment_complete":  {"xp": 50,  "label": "Assessment Completed"},
    "assessment_ace":       {"xp": 100, "label": "Aced the Assessment"},
    "tutor_session":        {"xp": 20,  "label": "Tutor Session"},
    "video_watched":        {"xp": 15,  "label": "Video Lesson Watched"},
    "project_complete":     {"xp": 200, "label": "Project Completed"},
    "exam_created":         {"xp": 10,  "label": "Exam Added"},
    "daily_login":          {"xp": 25,  "label": "Daily Login Bonus"},
    "streak_milestone":     {"xp": 75,  "label": "Streak Milestone"},
    "note_uploaded":        {"xp": 30,  "label": "Notes Uploaded"},
    "skill_gap_analyzed":   {"xp": 15,  "label": "Skill Gap Analyzed"},
    "resume_generated":     {"xp": 40,  "label": "Resume Generated"},
    "planner_generated":    {"xp": 10,  "label": "Study Plan Created"},
}

# Level thresholds — XP required to REACH this level
LEVELS = [
    {"level": 1,  "title": "Novice",       "min_xp": 0,     "icon": "Sprout"},
    {"level": 2,  "title": "Apprentice",   "min_xp": 200,   "icon": "BookOpen"},
    {"level": 3,  "title": "Scholar",      "min_xp": 600,   "icon": "GraduationCap"},
    {"level": 4,  "title": "Adept",        "min_xp": 1200,  "icon": "Zap"},
    {"level": 5,  "title": "Expert",       "min_xp": 2500,  "icon": "Trophy"},
    {"level": 6,  "title": "Virtuoso",     "min_xp": 4500,  "icon": "Gem"},
    {"level": 7,  "title": "Master",       "min_xp": 8000,  "icon": "Star"},
    {"level": 8,  "title": "Grandmaster",  "min_xp": 15000, "icon": "Crown"},
]

# Badge definitions
BADGES = [
    {"id": "first_steps",        "name": "First Steps",       "desc": "Complete your first assessment",  "icon": "Target", "condition": "assessments_taken >= 1"},
    {"id": "on_fire",            "name": "On Fire",           "desc": "Reach a 3-day streak",            "icon": "Flame", "condition": "streak >= 3"},
    {"id": "week_warrior",       "name": "Week Warrior",      "desc": "Reach a 7-day streak",            "icon": "Swords", "condition": "streak >= 7"},
    {"id": "project_pioneer",    "name": "Project Pioneer",   "desc": "Complete your first project",     "icon": "Rocket", "condition": "projects_completed >= 1"},
    {"id": "century",            "name": "Century",           "desc": "Earn 100 XP",                     "icon": "Award", "condition": "total_xp >= 100"},
    {"id": "scholar",            "name": "Scholar",           "desc": "Reach level 3",                   "icon": "Book", "condition": "level >= 3"},
    {"id": "ace",                "name": "Ace",               "desc": "Score 100% on an assessment",     "icon": "Star", "condition": "special:ace"},
    {"id": "grinder",            "name": "Grinder",           "desc": "Earn XP 5 days in a row",         "icon": "Dumbbell", "condition": "streak >= 5"},
    {"id": "knowledge_seeker",   "name": "Knowledge Seeker",  "desc": "Watch 10 learning videos",        "icon": "PlaySquare", "condition": "videos_watched >= 10"},
    {"id": "resume_ready",       "name": "Resume Ready",      "desc": "Generate your first resume",      "icon": "FileText", "condition": "resume_count >= 1"},
]


def _get_level_info(total_xp: int) -> dict:
    current = LEVELS[0]
    next_level = None
    for i, lvl in enumerate(LEVELS):
        if total_xp >= lvl["min_xp"]:
            current = lvl
            next_level = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    xp_for_next = next_level["min_xp"] if next_level else current["min_xp"]
    xp_current_start = current["min_xp"]
    xp_progress = total_xp - xp_current_start
    xp_needed = xp_for_next - xp_current_start if next_level else 0
    progress_pct = min(int((xp_progress / xp_needed) * 100), 100) if xp_needed > 0 else 100
    return {
        "level": current["level"],
        "title": current["title"],
        "icon": current["icon"],
        "progress_pct": progress_pct,
        "xp_in_level": xp_progress,
        "xp_to_next": xp_needed - xp_progress if next_level else 0,
        "next_title": next_level["title"] if next_level else "Max Level",
    }


def _check_badges(gamification_data: dict, special: Optional[str] = None) -> List[dict]:
    """Return list of newly unlocked badges."""
    unlocked = set(gamification_data.get("unlocked_badges", []))
    newly_unlocked = []
    stats = {
        "total_xp": gamification_data.get("total_xp", 0),
        "streak": gamification_data.get("current_streak", 0),
        "level": _get_level_info(gamification_data.get("total_xp", 0))["level"],
        "assessments_taken": gamification_data.get("assessments_taken", 0),
        "projects_completed": gamification_data.get("projects_completed", 0),
        "videos_watched": gamification_data.get("videos_watched", 0),
        "resume_count": gamification_data.get("resume_count", 0),
    }
    for badge in BADGES:
        if badge["id"] in unlocked:
            continue
        cond = badge["condition"]
        earned = False
        if cond.startswith("special:"):
            earned = special == cond.split(":")[1]
        else:
            key, op, val = cond.split(" ")
            stat_val = stats.get(key, 0)
            if op == ">=" and stat_val >= int(val):
                earned = True
        if earned:
            newly_unlocked.append(badge)
    return newly_unlocked


# ─────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────

class AwardXPRequest(BaseModel):
    uid: str
    event_type: str
    special: Optional[str] = None   # e.g. "ace" for perfect score


class GamificationState(BaseModel):
    uid: str


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────

@gamification_router.post("/award")
async def award_xp(request: AwardXPRequest):
    """Award XP for a specific event and update streak/badges."""
    event = XP_EVENTS.get(request.event_type)
    if not event:
        return {"error": f"Unknown event type: {request.event_type}"}

    xp_amount = event["xp"]
    user_ref = db.collection("user_profiles").document(request.uid)
    gam_ref = user_ref.collection("gamification").document("state")
    gam_doc = gam_ref.get()

    today = date.today().isoformat()
    now = datetime.now(timezone.utc)

    if gam_doc.exists:
        data = gam_doc.to_dict()
    else:
        data = {
            "total_xp": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
            "unlocked_badges": [],
            "assessments_taken": 0,
            "projects_completed": 0,
            "videos_watched": 0,
            "resume_count": 0,
            "xp_history": [],
        }

    # Increment counters used for badge checks
    if request.event_type in ("assessment_complete", "assessment_ace"):
        data["assessments_taken"] = data.get("assessments_taken", 0) + 1
    elif request.event_type == "project_complete":
        data["projects_completed"] = data.get("projects_completed", 0) + 1
    elif request.event_type == "video_watched":
        data["videos_watched"] = data.get("videos_watched", 0) + 1
    elif request.event_type == "resume_generated":
        data["resume_count"] = data.get("resume_count", 0) + 1

    # Update streak
    last_date = data.get("last_activity_date")
    streak_bonus_xp = 0
    streak_event = None

    if last_date is None:
        data["current_streak"] = 1
    elif last_date == today:
        pass  # Already active today, streak unchanged
    elif last_date == (date.today() - timedelta(days=1)).isoformat():
        data["current_streak"] = data.get("current_streak", 0) + 1
        # Milestone bonuses
        streak = data["current_streak"]
        if streak in (3, 7, 14, 30, 60, 100):
            streak_bonus_xp = XP_EVENTS["streak_milestone"]["xp"]
            streak_event = f"{streak}-Day Streak"
    else:
        data["current_streak"] = 1  # Streak broken

    data["last_activity_date"] = today
    data["longest_streak"] = max(data.get("longest_streak", 0), data["current_streak"])

    # Award XP
    old_xp = data.get("total_xp", 0)
    data["total_xp"] = old_xp + xp_amount + streak_bonus_xp

    # XP history entry
    history = data.get("xp_history", [])
    history.append({
        "event": event["label"],
        "xp": xp_amount,
        "ts": now.isoformat(),
        "date": today,
    })
    if streak_bonus_xp > 0:
        history.append({
            "event": streak_event,
            "xp": streak_bonus_xp,
            "ts": now.isoformat(),
            "date": today,
        })
    data["xp_history"] = history[-50:]  # keep last 50

    # Check for newly unlocked badges
    newly_unlocked = _check_badges(data, special=request.special)
    for badge in newly_unlocked:
        data["unlocked_badges"] = data.get("unlocked_badges", []) + [badge["id"]]

    # Compute level info
    old_level_info = _get_level_info(old_xp)
    new_level_info = _get_level_info(data["total_xp"])
    leveled_up = new_level_info["level"] > old_level_info["level"]

    gam_ref.set(data)

    return {
        "xp_awarded": xp_amount,
        "bonus_xp": streak_bonus_xp,
        "total_xp": data["total_xp"],
        "current_streak": data["current_streak"],
        "longest_streak": data["longest_streak"],
        "level_info": new_level_info,
        "leveled_up": leveled_up,
        "new_level": new_level_info if leveled_up else None,
        "new_badges": newly_unlocked,
        "event_label": event["label"],
    }


@gamification_router.get("/state/{uid}")
async def get_gamification_state(uid: str):
    """Get the full gamification state for a user."""
    gam_ref = db.collection("user_profiles").document(uid).collection("gamification").document("state")
    doc = gam_ref.get()

    if not doc.exists:
        total_xp = 0
        data = {
            "total_xp": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
            "unlocked_badges": [],
            "assessments_taken": 0,
            "projects_completed": 0,
            "videos_watched": 0,
            "resume_count": 0,
            "xp_history": [],
        }
    else:
        data = doc.to_dict()
        total_xp = data.get("total_xp", 0)

    level_info = _get_level_info(total_xp)

    # Build full badge list with unlock status
    unlocked_ids = set(data.get("unlocked_badges", []))
    all_badges = []
    for badge in BADGES:
        all_badges.append({
            **badge,
            "unlocked": badge["id"] in unlocked_ids,
        })

    # Recent XP history (last 10)
    history = data.get("xp_history", [])[-10:]

    return {
        "total_xp": total_xp,
        "current_streak": data.get("current_streak", 0),
        "longest_streak": data.get("longest_streak", 0),
        "last_activity_date": data.get("last_activity_date"),
        "level_info": level_info,
        "badges": all_badges,
        "xp_history": history,
        "assessments_taken": data.get("assessments_taken", 0),
        "projects_completed": data.get("projects_completed", 0),
        "videos_watched": data.get("videos_watched", 0),
    }


@gamification_router.post("/daily-login")
async def record_daily_login(uid: str):
    """Record daily login and award XP if first login today."""
    today = date.today().isoformat()
    gam_ref = db.collection("user_profiles").document(uid).collection("gamification").document("state")
    doc = gam_ref.get()

    if doc.exists:
        data = doc.to_dict()
        if data.get("last_activity_date") == today:
            return {"already_awarded": True, "message": "Login bonus already claimed today."}

    # Award daily login XP through the main award endpoint
    from fastapi import Request
    req = AwardXPRequest(uid=uid, event_type="daily_login")
    return await award_xp(req)
