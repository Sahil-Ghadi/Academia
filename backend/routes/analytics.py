

# ==========================================
# dashboard.py
# ==========================================

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from datetime import datetime, timedelta
from typing import List, Dict

dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])
db = firestore.client()

@dashboard_router.get("/sidehustle/{uid}")
async def get_sidehustle_dashboard(uid: str):
    """
    Get comprehensive side hustle dashboard data
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        profile_doc = user_ref.get()
        
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile_data = profile_doc.to_dict()
        
        # Get skills data
        skills_ref = user_ref.collection("skills")
        all_skills = [doc.to_dict() for doc in skills_ref.stream()]
        
        # Get projects data
        projects_ref = user_ref.collection("projects")
        all_projects = [doc.to_dict() for doc in projects_ref.stream()]
        
        # Get learning sources
        sources_ref = user_ref.collection("learning_sources")
        all_sources = [doc.to_dict() for doc in sources_ref.stream()]
        
        # Get activity alerts
        alerts_ref = user_ref.collection("activity_alerts").order_by("created_at", direction=firestore.Query.DESCENDING).limit(5)
        all_alerts = []
        for doc in alerts_ref.stream():
            alert_data = doc.to_dict()
            alert_data['id'] = doc.id
            all_alerts.append(alert_data)
        
        # Calculate stats
        if all_skills:
            skills_in_progress = len([s for s in all_skills if s.get('status') == 'in_progress'])
        elif profile_data.get('side_hustle_interests'):
            skills_in_progress = len(profile_data.get('side_hustle_interests', []))
        else:
            skills_in_progress = 0
        projects_completed = len([p for p in all_projects if p.get('status') == 'completed'])
        
        # Calculate weekly practice hours
        week_ago = datetime.now() - timedelta(days=7)
        practice_sessions = user_ref.collection("practice_sessions").where("date", ">=", week_ago).stream()
        weekly_hours = sum(session.to_dict().get('duration', 0) for session in practice_sessions) / 60  # Convert to hours
        
        # Calculate portfolio readiness
        total_portfolio_items = sum(1 for p in all_projects if p.get('in_portfolio', False))
        portfolio_target = 10  # Target number of portfolio items
        portfolio_ready = min(int((total_portfolio_items / portfolio_target) * 100), 100)
        
        # Format skill progress
        skill_progress = []
        icon_map = {
            'web': 'Code',
            'mobile': 'Code',
            'app': 'Code',
            'code': 'Code',
            'coding': 'Code',
            'dsa': 'FolderKanban',
            'data': 'FolderKanban',
            'design': 'Zap',
            'ui': 'Zap',
            'ux': 'Zap',
            'creative': 'Zap',
            'ai': 'Rocket',
            'ml': 'Rocket',
            'machine': 'Rocket',
            'artificial': 'Rocket',
            'intelligence': 'Rocket'
        }

        def get_icon(name):
            name_lower = name.lower()
            for key, icon in icon_map.items():
                if key in name_lower:
                    return icon
            return 'Code' # Default
        
        if all_skills:
            for skill in all_skills:
                # Try to get roadmap for detailed progress even if skill doc exists
                progress = int(skill.get('mastery', 0))
                try:
                    roadmap_doc = user_ref.collection("roadmaps").document(skill.get('name', '').lower()).get()
                    if roadmap_doc.exists:
                        r_data = roadmap_doc.to_dict()
                        total = 0
                        completed = 0
                        for phase in r_data.get('phases', []):
                            items = phase.get('items', [])
                            total += len(items)
                            completed += sum(1 for i in items if i.get('completed'))
                        if total > 0:
                            progress = int((completed / total) * 100)
                except:
                    pass

                skill_progress.append({
                    'name': skill.get('name', 'Skill'),
                    'progress': progress,
                    'icon': get_icon(skill.get('name', ''))
                })
        
        # Merge with profile interests that aren't already covered by skills
        existing_skill_names = set(s.get('name', '').lower() for s in skill_progress)
        
        if profile_data.get('side_hustle_interests'):
            for interest in profile_data.get('side_hustle_interests', []):
                if interest.lower() in existing_skill_names:
                    continue
                    
                progress = 0
                try:
                    roadmap_doc = user_ref.collection("roadmaps").document(interest.lower()).get()
                    if roadmap_doc.exists:
                        r_data = roadmap_doc.to_dict()
                        total = 0
                        completed = 0
                        for phase in r_data.get('phases', []):
                            items = phase.get('items', [])
                            total += len(items)
                            completed += sum(1 for i in items if i.get('completed'))
                        if total > 0:
                            progress = int((completed / total) * 100)
                except:
                    pass

                skill_progress.append({
                    'name': interest,
                    'progress': progress,
                    'icon': get_icon(interest)
                })
        
        # Format learning sources
        learning_sources = []
        for source in all_sources[:5]:  # Top 5 sources
            learning_sources.append({
                'id': source.get('id', ''),
                'source': source.get('name', ''),
                'skill': source.get('skill', ''),
                'type': source.get('type', 'course'),
                'status': source.get('status', 'Queued')
            })
        
        # Format assigned projects
        assigned_projects = []
        active_projects = [p for p in all_projects if p.get('status') == 'assigned']
        
        for project in active_projects[:5]:  # Top 5 active projects
            assigned_projects.append({
                'id': project.get('id', ''),
                'title': project.get('title', ''),
                'description': project.get('description', ''),
                'difficulty': project.get('difficulty', 'Beginner'),
                'estimatedTime': project.get('estimated_time', '8 hours'),
                'skills': project.get('skills', [])
            })
        
        # Format activity alerts
        activity_alerts = []
        for alert in all_alerts:
            alert_type = alert.get('type', 'info')
            activity_alerts.append({
                'id': alert.get('id', ''),
                'type': alert_type,
                'message': alert.get('message', ''),
                'time': format_time_ago(alert.get('created_at'))
            })
        
        # Calculate daily activity for heatmap (last 365 days)
        year_ago = datetime.now() - timedelta(days=365)
        activity_ref = user_ref.collection("activity_alerts").where("created_at", ">=", year_ago.isoformat()).stream()
        
        date_counts = {}
        for doc in activity_ref:
            data = doc.to_dict()
            date_str = data.get('created_at', '')[:10] # YYYY-MM-DD
            if date_str:
                date_counts[date_str] = date_counts.get(date_str, 0) + 1
        
        daily_activity = []
        for date, count in date_counts.items():
            daily_activity.append({"date": date, "count": count})
            
        # --- Telemetry / Video Watch Time ---
        telemetry_ref = user_ref.collection("telemetry").where("mode", "==", "side-hustle").stream()
        total_watch_seconds = 0
        for doc in telemetry_ref:
            try:
                total_watch_seconds += doc.to_dict().get('watch_time_seconds', 0)
            except:
                pass
                
        watch_minutes = int(total_watch_seconds / 60)
        if watch_minutes > 60:
            watch_time_str = f"{round(watch_minutes / 60, 1)}h"
        else:
            watch_time_str = f"{watch_minutes}m"

        return {
            "stats": {
                "skills_in_progress": skills_in_progress,
                "projects_completed": projects_completed,
                "weekly_practice": f"{int(weekly_hours)}h",
                "portfolio_ready": f"{portfolio_ready}%",
                "portfolio_ready_value": portfolio_ready,
                "video_watch_time": watch_time_str
            },
            "skill_progress": skill_progress,
            "learning_sources": learning_sources,
            "assigned_projects": assigned_projects,
            "activity_alerts": activity_alerts,
            "daily_activity": daily_activity,
            "monthly_project_stats": get_monthly_project_stats(all_projects)
        }
    
    except Exception as e:
        print(f"Dashboard Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.get("/deadlines/{uid}")
async def get_deadlines(uid: str):
    """
    Get upcoming deadlines for the user
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        deadlines_ref = user_ref.collection("deadlines").where("dueDate", ">=", datetime.now()).order_by("dueDate").limit(10)
        
        deadlines = []
        for doc in deadlines_ref.stream():
            data = doc.to_dict()
            deadlines.append({
                "id": doc.id,
                "title": data.get('title', ''),
                "dueDate": data.get('dueDate').isoformat() if data.get('dueDate') else None,
                "category": data.get('category', 'assignment'),
                "subject": data.get('subject')
            })
        
        return {"deadlines": deadlines}
    
    except Exception as e:
        print(f"Deadlines Error: {str(e)}")
        return {"deadlines": []}


@dashboard_router.get("/reminders/{uid}")
async def get_reminders(uid: str):
    """
    Get study reminders for the user
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        reminders_ref = user_ref.collection("reminders").where("completed", "==", False).order_by("dueTime").limit(10)
        
        reminders = []
        for doc in reminders_ref.stream():
            data = doc.to_dict()
            reminders.append({
                "id": doc.id,
                "subject": data.get('subject', ''),
                "topic": data.get('topic', ''),
                "dueTime": data.get('dueTime').isoformat() if data.get('dueTime') else None,
                "priority": data.get('priority', 'medium'),
                "completed": data.get('completed', False)
            })
        
        return {"reminders": reminders}
    
    except Exception as e:
        print(f"Reminders Error: {str(e)}")
        return {"reminders": []}


@dashboard_router.get("/status/{uid}")
async def get_crunch_mode_status(uid: str):
    """
    Check if user is in crunch mode (exam < 24h)
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        # Check exams in the next 24 hours
        exams_ref = user_ref.collection("exams")
        all_exams = exams_ref.stream()
        
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        
        crunch_mode = False
        crucial_exam = None
        
        for doc in all_exams:
            data = doc.to_dict()
            if 'date' in data:
                try:
                    exam_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
                    # Check if exam is today or tomorrow
                    if exam_date <= tomorrow and exam_date >= today:
                        # CHECK SYLLABUS COMPLETION
                        total = data.get('total_topics', 0)
                        completed = data.get('completed_topics', 0)
                        
                        # Only activate crunch mode if syllabus is NOT complete
                        if total > 0 and completed >= total:
                            continue

                        crunch_mode = True
                        crucial_exam = data.get('subject', 'Unknown Subject')
                        break
                except:
                    continue
                    
        return {
            "isCrunchMode": crunch_mode,
            "crucialExam": crucial_exam
        }
        
    except Exception as e:
        print(f"Status Check Error: {str(e)}")
        return {"isCrunchMode": False, "crucialExam": None}


def get_monthly_project_stats(all_projects: List[Dict]) -> List[Dict]:
    """
    Calculate monthly project completions for the last 6 months.
    Returns list of {name: 'Month', value: count}
    """
    # Initialize last 6 months with 0
    today = datetime.now()
    stats = {}
    for i in range(5, -1, -1):
        d = today - timedelta(days=i*30) # Approx month
        month_name = d.strftime("%b")
        stats[month_name] = 0
        
    # Count completed projects
    for project in all_projects:
        if project.get('status') == 'completed' and project.get('completed_at'):
            try:
                # Parse date
                completed_at = project.get('completed_at')
                if isinstance(completed_at, str):
                    dt = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                elif isinstance(completed_at, datetime):
                    dt = completed_at
                else:
                    continue
                
                # Check if within last 6 months window (approx)
                if (today - dt).days < 180:
                    month_name = dt.strftime("%b")
                    if month_name in stats:
                        stats[month_name] += 1
            except:
                continue

    # Convert to list ensuring order
    result = []
    # Re-generate key order to ensure chronological sort
    for i in range(5, -1, -1):
        d = today - timedelta(days=i*30)
        month_name = d.strftime("%b")
        # specific check to avoid duplicates if month names overlap in short window (unlikely with 30 days but safer)
        if not any(x['name'] == month_name for x in result): 
             result.append({"name": month_name, "value": stats.get(month_name, 0)})
             
    return result


def format_time_ago(timestamp) -> str:
    """Format timestamp to human-readable time ago"""
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


# ==========================================
# stats.py
# ==========================================

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from datetime import datetime
import statistics
from collections import Counter

stats_router = APIRouter(prefix="/stats", tags=["stats"])
db = firestore.client()


@stats_router.get("/academic/{uid}")
async def get_academic_stats(uid: str):
    try:
        user_ref = db.collection("user_profiles").document(uid)

        profile_doc = user_ref.get()
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        profile_data = profile_doc.to_dict()
        weak_areas_list = profile_data.get('weak_areas', [])

        # --- Improved Weak Area Scoring: Recency-Weighted Exponential Decay ---
        # Each entry in weak_areas_list is a topic string (ordered oldest → newest).
        # Mistakes that appeared more recently carry more weight.
        DECAY = 0.88  # Each step back in history reduces weight by 12%
        n = len(weak_areas_list)

        # Compute per-topic weighted score, full count, and recent count (last 10)
        topic_weights: dict[str, float] = {}
        topic_full_counts: dict[str, int] = {}
        topic_recent_counts: dict[str, int] = {}
        recent_window = weak_areas_list[-10:] if len(weak_areas_list) >= 10 else weak_areas_list

        for i, topic in enumerate(weak_areas_list):
            # index from end: 0 = oldest, n-1 = most recent
            recency_index = n - 1 - i
            weight = DECAY ** recency_index  # 1.0 for most recent, decays for older
            topic_weights[topic] = topic_weights.get(topic, 0) + weight
            topic_full_counts[topic] = topic_full_counts.get(topic, 0) + 1

        for topic in recent_window:
            topic_recent_counts[topic] = topic_recent_counts.get(topic, 0) + 1

        # Sort topics by weighted score (highest = most pressing weak area)
        sorted_topics = sorted(topic_weights.items(), key=lambda x: x[1], reverse=True)

        # Load wrong questions map stored during assessments
        wrong_questions_map = profile_data.get('wrong_questions_by_topic', {})

        weak_areas = []
        for topic, weight_score in sorted_topics:
            full_count = topic_full_counts[topic]
            recent_count = topic_recent_counts.get(topic, 0)

            # Confidence formula: base 35 + weighted score * 10, capped at 97
            # A single recent mistake → ~45%, three recent mistakes → ~75%
            confidence = min(35 + (weight_score * 10), 97)

            # Trend signal based on whether recent mistakes are proportionally higher
            recent_ratio = recent_count / full_count if full_count > 0 else 0
            if recent_ratio > 0.5:
                trend = "worsening"
            elif recent_ratio < 0.2 and full_count > 2:
                trend = "improving"
            else:
                trend = "stable"

            weak_areas.append({
                "subject": "Topic",
                "topic": topic,
                "confidence": round(confidence),
                "count": full_count,
                "trend": trend,
                "wrong_questions": wrong_questions_map.get(topic, []),
            })

        # --- Exam Readiness & Syllabus ---
        exams_ref = user_ref.collection("exams")
        all_exams = [doc.to_dict() for doc in exams_ref.stream()]

        total_readiness = 0
        total_syllabus_progress = 0
        count = len(all_exams)

        for data in all_exams:
            total_readiness += data.get('readiness_score', 0)
            completed = data.get('completed_topics', 0)
            total = data.get('total_topics', 0)
            if total > 0:
                total_syllabus_progress += (completed / total) * 100

        avg_readiness = round(total_readiness / count) if count > 0 else 0
        avg_syllabus = round(total_syllabus_progress / count) if count > 0 else 0

        # --- Study Hours ---
        plans_ref = user_ref.collection("generated_plans").order_by(
            "created_at", direction=firestore.Query.DESCENDING).limit(1)
        plan_docs = plans_ref.get()

        study_hours_today = 0
        if plan_docs:
            plan_data = plan_docs[0].to_dict()
            schedule = plan_data.get('schedule', [])
            today_str = datetime.now().strftime('%Y-%m-%d')
            for day in schedule:
                if day.get('date') == today_str or (
                        len(schedule) == 1 and
                        plan_data.get('created_at', '').startswith(today_str)):
                    for slot in day.get('slots', []):
                        if slot.get('type') == 'study':
                            study_hours_today += slot.get('duration', 0)

        study_hours_str = f"{round(study_hours_today / 60, 1)}h"

        # --- Telemetry / Video Watch Time ---
        telemetry_ref = user_ref.collection("telemetry").where("mode", "==", "academic").stream()
        total_watch_seconds = 0
        for doc in telemetry_ref:
            data = doc.to_dict()
            total_watch_seconds += data.get('watch_time_seconds', 0)
            
        watch_minutes = int(total_watch_seconds / 60)
        if watch_minutes > 60:
            watch_time_str = f"{round(watch_minutes / 60, 1)}h"
        else:
            watch_time_str = f"{watch_minutes}m"

        # --- Performance History ---
        history_ref = user_ref.collection("stats_history").order_by(
            "date", direction=firestore.Query.ASCENDING).limit(10)
        performance_data = []
        accuracies = []

        for doc in history_ref.stream():
            data = doc.to_dict()
            score = data.get('score', 0)
            accuracies.append(score)
            date_label = data.get('date').strftime("%d/%m %H:%M") if data.get('date') else "Test"
            performance_data.append({
                "name": date_label,
                "marks": score,
                "accuracy": score
            })

        global_accuracy = round(statistics.mean(accuracies)) if accuracies else 0

        # --- Agent Decisions ---
        decisions = []
        if avg_readiness < 50 and count > 0:
            decisions.append({"id": 1, "message": "Detected low readiness. Increasing revision blocks.", "time": "Just now"})
        worsening = [a for a in weak_areas if a["trend"] == "worsening"]
        if len(worsening) > 0:
            decisions.append({"id": 2, "message": f"{len(worsening)} topic(s) are worsening. Prioritising targeted revision.", "time": "1h ago"})
        elif len(weak_areas) > 3:
            decisions.append({"id": 2, "message": f"Identified {len(weak_areas)} weak topics. Targeted practice recommended.", "time": "1h ago"})
        if global_accuracy > 80:
            decisions.append({"id": 3, "message": "High accuracy maintained. Suggesting advanced difficulty.", "time": "2h ago"})
        if not decisions:
            decisions.append({"id": 1, "message": "Study plan optimized based on recent activity.", "time": "Just now"})

        return {
            "weak_areas": weak_areas,
            "performance_graph": performance_data if performance_data else [{"name": "Start", "marks": 0, "accuracy": 0}],
            "accuracy_rate": global_accuracy,
            "exam_readiness": avg_readiness,
            "agent_decisions": decisions,
            "study_hours": study_hours_str,
            "syllabus_completion": avg_syllabus,
            "video_watch_time": watch_time_str
        }

    except Exception as e:
        print(f"Stats Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@stats_router.get("/weak-area-summary/{uid}")
async def get_weak_area_summary(uid: str):
    """Generate an AI-powered learning plan to overcome identified weak areas."""
    try:
        from utils.llm import llm

        user_ref = db.collection("user_profiles").document(uid)
        profile_doc = user_ref.get()
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        profile_data = profile_doc.to_dict()
        weak_areas_list = profile_data.get('weak_areas', [])
        course = profile_data.get('course', 'your course')

        if not weak_areas_list:
            return {"summary": "🎉 No weak areas detected yet! Keep completing assessments to get personalised guidance."}

        # Count frequencies to find top weak areas
        area_counts = Counter(weak_areas_list)
        top_topics = [topic for topic, _ in area_counts.most_common(7)]
        topics_str = ", ".join(top_topics)

        prompt = f"""You are an expert academic tutor. A student studying {course} has the following identified weak areas based on their assessment performance: {topics_str}.

Write a concise, actionable, and encouraging study plan to help them overcome these weaknesses. 

Format your response in markdown with:
1. A one-sentence opening that acknowledges their weak areas
2. A section "## 🎯 Priority Topics" with bullet points listing each topic and a one-line explanation of WHY it matters and HOW to approach it (e.g., practice problems, concepts to review, resources)
3. A section "## 📅 Suggested Study Order" with a numbered 1-week plan
4. A short motivational closing line (1 sentence)

Keep the total response under 300 words. Be specific, not generic."""

        response = llm.invoke(prompt)
        summary = response.content if hasattr(response, 'content') else str(response)

        return {"summary": summary}

    except Exception as e:
        print(f"Weak Area Summary Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# timeline.py
# ==========================================

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from datetime import datetime, timedelta
from typing import List, Dict

timeline_router = APIRouter(prefix="/timeline", tags=["timeline"])
db = firestore.client()

@timeline_router.get("/events/{uid}")
async def get_timeline_events(uid: str, mode: str = "academic"):
    """
    Get AI agent timeline events based on user activity and agent decisions
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        profile_doc = user_ref.get()
        
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        events = []
        event_id = 1
        
        # Fetch Logged Events
        # Optimization: Filter by mode in-memory to avoid Firestore Composite Index requirement
        events_ref = user_ref.collection("timeline_events").order_by("created_at", direction=firestore.Query.DESCENDING).limit(50)
        
        try:
             stream = events_ref.stream()
             for doc in stream:
                 data = doc.to_dict()
                 
                 # Manual Filter
                 if data.get('mode') != mode:
                     continue
                 
                 created_at = data.get('created_at')
                 
                 # Handle timestamp
                 if not created_at:
                      created_at = datetime.now()
                 elif hasattr(created_at, 'timestamp'):
                      created_at = datetime.fromtimestamp(created_at.timestamp())
                 
                 events.append({
                     "id": doc.id,
                     "type": data.get('type', 'info'),
                     "icon": data.get('icon', 'Bot'),
                     "title": data.get('title', 'Event'),
                     "description": data.get('description', ''),
                     "time": get_time_ago(created_at),
                     "date": "Today" if is_today(created_at) else "Yesterday" if is_yesterday(created_at) else created_at.strftime('%Y-%m-%d'),
                     "details": data.get('details', [])
                 })
        except Exception as e:
             print(f"Error fetching timeline events from collection: {e}")

        # If empty, add default welcome event
        if not events:
            events.append({
                "id": "welcome",
                "type": "schedule",
                "icon": "Bot",
                "title": "AI Agent Initialized",
                "description": "Your personalized learning assistant is now active and monitoring your progress.",
                "time": "Just now",
                "date": "Today",
                "details": [
                    "Ready to create study plans",
                    "Tracking your progress",
                    "Optimizing learning path"
                ]
            })
        
        return {"events": events}
    
    except Exception as e:
        print(f"Timeline Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def get_time_ago(dt: datetime) -> str:
    """Convert datetime to human-readable time ago"""
    now = datetime.now()
    diff = now - dt
    
    if diff.total_seconds() < 60:
        return "Just now"
    elif diff.total_seconds() < 3600:
        minutes = int(diff.total_seconds() / 60)
        return f"{minutes}m ago"
    elif diff.total_seconds() < 86400:
        hours = int(diff.total_seconds() / 3600)
        return f"{hours}h ago"
    else:
        days = int(diff.total_seconds() / 86400)
        return f"{days}d ago"


def is_today(dt: datetime) -> bool:
    """Check if datetime is today"""
    return dt.date() == datetime.now().date()

def is_yesterday(dt: datetime) -> bool:
    """Check if datetime is yesterday"""
    return dt.date() == (datetime.now() - timedelta(days=1)).date()
