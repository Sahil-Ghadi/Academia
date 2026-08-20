

# ==========================================
# chat.py
# ==========================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from utils.llm import llm
from utils.rag_utils import search_documents
from firebase_admin import firestore
from datetime import datetime, timedelta


chat_router = APIRouter(prefix="/chat", tags=["chat"])
db = firestore.client()

# How many previous turns to include for context
HISTORY_TURNS = 10


class ChatRequest(BaseModel):
    message: str
    uid: str
    mode: str = "academic"
    user_name: Optional[str] = "Student"
    session_id: Optional[str] = "default"   # allows multiple chat sessions later

class TutorRequest(BaseModel):
    uid: str
    message: str
    language: str = "en"
    context: str = ""


# ---------------------------------------------------------------------------
# History helpers
# ---------------------------------------------------------------------------

def _history_ref(uid: str, session_id: str):
    return (
        db.collection("user_profiles")
        .document(uid)
        .collection("chat_sessions")
        .document(session_id)
        .collection("messages")
    )


def _load_history(uid: str, session_id: str) -> list:
    """
    Fetch the last HISTORY_TURNS * 2 messages and convert them to
    LangChain message objects (HumanMessage / AIMessage).
    """
    ref = _history_ref(uid, session_id)
    docs = (
        ref.order_by("ts", direction=firestore.Query.ASCENDING)
        .limit_to_last(HISTORY_TURNS * 2)
        .get()
    )
    messages = []
    for doc in docs:
        data = doc.to_dict()
        role = data.get("role")
        content = data.get("content", "")
        if role == "human":
            messages.append(HumanMessage(content=content))
        elif role == "ai":
            messages.append(AIMessage(content=content))
    return messages


def _save_turn(uid: str, session_id: str, user_msg: str, ai_msg: str):
    """Persist a user + AI turn to Firestore."""
    ref = _history_ref(uid, session_id)
    now = datetime.utcnow()
    ref.add({"role": "human", "content": user_msg, "ts": now})
    # AI message gets +1ms so ordering by ts is always human → ai
    ref.add({"role": "ai",    "content": ai_msg,   "ts": now + timedelta(milliseconds=1)})


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
async def get_my_schedule(uid: str) -> str:
    """Fetch the user's latest study schedule / plan."""
    try:
        plans_ref = (
            db.collection("user_profiles")
            .document(uid)
            .collection("generated_plans")
        )
        docs = (
            plans_ref
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(1)
            .get()
        )
        if not docs:
            return "No schedule found. You haven't generated one yet."

        data = docs[0].to_dict()
        schedule = data.get("schedule", [])
        if not schedule:
            return "Schedule is empty."

        formatted = "Here is your latest schedule:\n"
        for day in schedule:
            formatted += f"Day: {day.get('day')} ({day.get('date')})\n"
            for slot in day.get("slots", []):
                formatted += (
                    f"  - {slot.get('time')}: {slot.get('task')} ({slot.get('type')})\n"
                )
            formatted += "\n"
        return formatted
    except Exception as e:
        return f"Error fetching schedule: {str(e)}"


@tool
async def generate_new_schedule(uid: str, instructions: str) -> str:
    """
    Generate or update a study schedule based on user instructions.
    Pass any constraints such as 'start at 9am', 'focus on math', or
    'switch Monday math to biology'. Defaults: weekly, 1 hour per day.
    """
    try:
        settings = PlannerSettings(
            uid=uid,
            available_hours=1,
            start_time="09:00",
            end_time="21:00",
            constraints=instructions,
            view_mode="weekly",
        )
        await generate_plan(settings)
        return "New schedule generated! Tell the user to check their planner view."
    except Exception as e:
        return f"Failed to generate schedule: {str(e)}"


@tool
async def add_event(
    uid: str,
    title: str,
    date: str,
    subject: str = "General",
    event_type: str = "deadline",
    topics: str = "",
) -> str:
    """
    Add any academic event for the user.

    event_type options:
      - "deadline"  → assignment, homework, project, or generic task
      - "exam"      → exam, test, midterm, final, quiz

    date must be in YYYY-MM-DD format.
    topics (optional, comma-separated) lists syllabus topics — only for exams.
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        now_iso = datetime.utcnow().isoformat()

        if event_type == "exam":
            syllabus_list = []
            if topics:
                syllabus_list = [
                    {"name": t.strip(), "completed": False}
                    for t in topics.split(",")
                    if t.strip()
                ]
            exam_data = {
                "uid": uid,
                "title": title,
                "date": date,
                "subject": subject,
                "syllabus": syllabus_list,
                "total_topics": len(syllabus_list),
                "completed_topics": 0,
                "created_at": now_iso,
            }
            user_ref.collection("exams").add(exam_data)
            return (
                f"Added exam '{title}' for {subject} on {date}"
                + (f" with {len(syllabus_list)} topics." if syllabus_list else ".")
            )
        else:
            deadline_data = {
                "title": title,
                "due_date": date,
                "subject": subject,
                "completed": False,
                "created_at": now_iso,
            }
            user_ref.collection("deadlines").add(deadline_data)
            return f"Added deadline '{title}' for {subject} on {date}."

    except Exception as e:
        return f"Error adding event: {str(e)}"


@tool
async def get_upcoming_deadlines(uid: str) -> str:
    """Fetch the user's upcoming incomplete deadlines."""
    try:
        deadlines_ref = (
            db.collection("user_profiles")
            .document(uid)
            .collection("deadlines")
        )
        docs = deadlines_ref.where("completed", "==", False).stream()

        deadlines = []
        for doc in docs:
            d = doc.to_dict()
            deadlines.append(
                f"  - {d.get('due_date')}: {d.get('title')} ({d.get('subject')})"
            )

        if not deadlines:
            return "No upcoming deadlines found."
        return "Upcoming Deadlines:\n" + "\n".join(deadlines)
    except Exception as e:
        return f"Error fetching deadlines: {str(e)}"


@tool
async def search_my_notes(uid: str, query: str) -> str:
    """
    Search through the user's uploaded documents and notes for information
    relevant to the query. Use this when the user asks about something that
    could be in their study materials, notes, or uploaded PDFs.
    """
    try:
        passages = search_documents(uid=uid, query=query, k=4)
        if not passages:
            return (
                "No relevant information found in your documents. "
                "You can upload study materials via the Documents section."
            )
        result = "Found relevant information from your notes:\n\n"
        result += "\n\n---\n\n".join(passages)
        return result
    except Exception as e:
        return f"Error searching notes: {str(e)}"


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are AdaptIQ, an intelligent academic assistant.
Your goal is to help the student manage their studies, schedule, and deadlines.

You have access to these tools:
1. get_my_schedule        – View the user's current study schedule.
2. generate_new_schedule  – Create or modify the schedule based on instructions.
3. add_event              – Add any academic event:
     • event_type="deadline" for assignments, homework, projects, generic tasks.
     • event_type="exam"     for exams, tests, midterms, finals, quizzes.
     • Always pass uid and date in YYYY-MM-DD format.
     • For exams: ask for syllabus topics if not yet given, but proceed without them if the user says to skip.
4. get_upcoming_deadlines – View all upcoming incomplete deadlines.
5. search_my_notes        – Search the user's uploaded PDFs / study notes.

MEMORY & MULTI-TURN RULES (IMPORTANT):
- You receive the full recent conversation history before the latest message.
- Use it. If the user previously started adding an event and you asked a follow-up
  question (e.g. "what are the topics?"), and they now answer it, piece things
  together from history and complete the action immediately — do NOT ask again.
- Never ask for information the user already gave in a previous turn.

Other rules:
- If the user asks about their schedule, call get_my_schedule first.
- If the user adds a task/assignment/project → add_event with event_type="deadline".
- If the user adds an exam/test/midterm/final/quiz → add_event with event_type="exam".
- If the user asks a study/content question, call search_my_notes first.
- Always confirm actions back to the user.
- Be friendly, concise, and encouraging.
"""

tools = [
    get_my_schedule,
    generate_new_schedule,
    add_event,
    get_upcoming_deadlines,
    search_my_notes,
]
agent_executor = create_react_agent(llm, tools)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@chat_router.post("/message")
async def chat_message(request: ChatRequest):
    try:
        now = datetime.now().isoformat()

        # 1. Fetch user profile for subjects
        user_ref = db.collection("user_profiles").document(request.uid).get()
        subjects_list = "General"
        if user_ref.exists:
            user_data = user_ref.to_dict()
            subjects = user_data.get("academic_subjects", [])
            if subjects:
                subjects_list = ", ".join(subjects)

        dynamic_prompt = f"""{SYSTEM_PROMPT}

CRITICAL CONTEXT:
- Current Date/Time: {now}
- User ID: {request.uid} (IMPORTANT: Use this exact uid for all tool calls)
- User Name: {request.user_name}
- Enrolled Subjects: [{subjects_list}]

When adding events or schedules, ONLY use subjects from this list.
If the user mentions a topic not in the list, map it to the closest subject or ask.
"""

        # 2. Load conversation history
        history = _load_history(request.uid, request.session_id or "default")

        inputs = {
            "messages": [
                SystemMessage(content=dynamic_prompt),
                *history,
                HumanMessage(content=request.message),
            ]
        }

        # 4. Run agent
        result = await agent_executor.ainvoke(inputs)

        for m in result["messages"]:
            print(f" [{m.type}]: {str(m.content)[:200]}")

        last_message = result["messages"][-1]
        response_text = last_message.content

        # Fallback if agent stopped after tool without a final message
        if not response_text or response_text.strip() == "":
            for m in reversed(result["messages"]):
                if m.type == "tool":
                    response_text = f"Done: {m.content}"
                    break

        # 5. Persist this turn to Firestore
        _save_turn(
            uid=request.uid,
            session_id=request.session_id or "default",
            user_msg=request.message,
            ai_msg=response_text,
        )

        return {"response": response_text}

    except Exception as e:
        print(f"Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.post("/tutor")
async def chat_tutor(request: TutorRequest):
    try:
        system_msg = f"""You are a Multilingual AI Tutor specializing in equitable education access.
Your primary role is to explain concepts step-by-step using open textbooks and educational resources.
You must ground your answers in factual educational content.

CRITICAL CONTEXT:
- Student's Subject Context: {request.context}
- Target Language Code: {request.language}

INSTRUCTIONS:
1. Explain the concept clearly and step-by-step, targeting the student's level based on their subjects.
2. Translate your ENTIRE final response to the target language code: '{request.language}'.
3. Do not hallucinate.
"""
        inputs = [
            SystemMessage(content=system_msg),
            HumanMessage(content=request.message)
        ]
        
        response = await llm.ainvoke(inputs)
        
        return {
            "response": response.content,
            "citations": [
                {"source": "OpenStax Textbooks", "url": "https://openstax.org/"},
                {"source": "Project Gutenberg - Educational Archives", "url": "https://gutenberg.org"}
            ]
        }
    except Exception as e:
        print(f"Tutor Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.get("/history/{uid}")
async def get_chat_history(uid: str, session_id: str = "default"):
    """
    Return recent chat messages for a user session.
    Used by the frontend to restore history on page load/refresh.
    """
    try:
        ref = _history_ref(uid, session_id)
        docs = (
            ref.order_by("ts", direction=firestore.Query.ASCENDING)
            .limit_to_last(HISTORY_TURNS * 2)
            .get()
        )
        messages = []
        for doc in docs:
            data = doc.to_dict()
            ts = data.get("ts")
            messages.append({
                "role": data.get("role"),       # "human" | "ai"
                "content": data.get("content", ""),
                "ts": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            })
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@chat_router.delete("/history/{uid}")
async def clear_chat_history(uid: str, session_id: str = "default"):
    """Clear a user's chat history for a given session."""
    try:
        ref = _history_ref(uid, session_id)
        docs = ref.stream()
        batch = db.batch()
        count = 0
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
        batch.commit()
        return {"success": True, "deleted": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# suggestions.py
# ==========================================

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List
from utils.llm import llm
from utils.route_utils import handle_error

suggestions_router = APIRouter(prefix="/suggestions", tags=["ai-suggestions"])

# Pydantic Models for Structured Output
class SuggestionResponse(BaseModel):
    """AI-generated academic and side hustle suggestions"""
    subjects: List[str] = Field(description="List of 6 core academic subjects for this major", min_items=6, max_items=6)
    side_hustle_interests: List[str] = Field(description="List of 6 marketable skills/technologies", min_items=6, max_items=6)

# Request Model
class SuggestionRequest(BaseModel):
    degree: str
    major: str

@suggestions_router.post("/generate", response_model=SuggestionResponse)
async def generate_suggestions(request: SuggestionRequest):
    """
    Generate academic subjects and side hustle interests based on degree/major using AI
    """
    try:
        # Create structured output LLM
        structured_llm = llm.with_structured_output(SuggestionResponse)
        
        # Concise prompt
        prompt = f"""You are an academic advisor AI. Based on the student's degree and major, suggest relevant subjects and side hustle interests.

Degree: {request.degree}
Major: {request.major}

Requirements:
1. Suggest EXACTLY 6 core subjects typically studied in this major
2. Suggest EXACTLY 6 marketable skills/technologies that complement this degree
3. Be specific and practical
4. Consider current industry trends

Example for Computer Science:
- Subjects: Data Structures, Algorithms, Database Systems, Operating Systems, Computer Networks, Software Engineering
- Side Hustle: Web Development, Mobile App Development, AI/ML, Cloud Computing, Cybersecurity, UI/UX Design"""

        try:
            # Get structured output
            suggestions: SuggestionResponse = structured_llm.invoke(prompt)
            return suggestions
        
        except Exception as e:
            print(f"Structured output error: {e}")
            # Return fallback
            return create_fallback_suggestions(request.major)
    
    except Exception as e:
        raise handle_error(e, "AI Suggestion")


@suggestions_router.get("/health")
async def health_check():
    """Check if the suggestions service is running"""
    return {
        "status": "healthy",
        "service": "AI Suggestions (Structured Output)",
        "model": "gemini-1.5-flash"
    }


def create_fallback_suggestions(major: str) -> SuggestionResponse:
    """Create fallback suggestions if LLM fails"""
    # Basic fallback based on common majors
    common_subjects = [
        f"{major} Fundamentals",
        f"Advanced {major}",
        f"{major} Theory",
        f"{major} Applications",
        "Research Methods",
        "Capstone Project"
    ]
    
    common_interests = [
        "Web Development",
        "Data Analysis",
        "Content Creation",
        "Freelancing",
        "Consulting",
        "Online Teaching"
    ]
    
    return SuggestionResponse(
        subjects=common_subjects,
        side_hustle_interests=common_interests
    )


# ==========================================
# planner.py
# ==========================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from utils.llm import llm
from datetime import datetime, timedelta
from firebase_admin import firestore
from utils.timeline_logger import log_timeline_event

planner_router = APIRouter(prefix="/planner", tags=["planner"])
db = firestore.client()

# Pydantic Models for Structured Output
from agents.schemas import Task, DaySchedule, ScheduleResponse

# Request Models
class PlannerSettings(BaseModel):
    uid: str
    available_hours: int
    start_time: str
    end_time: str
    constraints: str
    view_mode: str = "daily"  # 'daily' or 'weekly'

@planner_router.post("/generate", response_model=ScheduleResponse)
async def generate_plan(settings: PlannerSettings):
    try:
        # Fetch user profile to get subjects
        user_ref = db.collection("user_profiles").document(settings.uid).get()
        if not user_ref.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_ref.to_dict()
        subjects = user_data.get("academic_subjects", [])
        
        if not subjects:
            subjects = ["General Study"]

        # ------------------------------------------------------------------
        # DYNAMIC PRIORITIZATION LOGIC
        # ------------------------------------------------------------------
        priority_instructions = ""
        crunch_mode = False
        
        try:
            # Fetch upcoming exams
            exams_ref = db.collection("user_profiles").document(settings.uid).collection("exams")
            # Get all exams and filter in python (or minimal query)
            all_exams = exams_ref.stream()
            
            today_date = datetime.now().date()
            
            upcoming_exams = []
            for doc in all_exams:
                data = doc.to_dict()
                if 'date' in data:
                    try:
                        exam_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
                        days_until = (exam_date - today_date).days
                        
                        if 0 <= days_until <= 7:
                            # Check syllabus completion
                            total = data.get('total_topics', 0)
                            completed = data.get('completed_topics', 0)
                            
                            # Skip if fully completed
                            if total > 0 and completed >= total:
                                continue

                            upcoming_exams.append({
                                "subject": data.get('subject', 'Unknown'),
                                "days": days_until,
                                "title": data.get('title', 'Exam')
                            })
                    except:
                        continue
            
            # Sort by urgency
            upcoming_exams.sort(key=lambda x: x['days'])
            
            if upcoming_exams:
                # ------------------------------------------------------------------
                # MULTI-EXAM LOGIC
                # ------------------------------------------------------------------
                
                # 1. Calculate Weights
                total_weight = 0
                for exam in upcoming_exams:
                    # Formula: Closer deadline = Higher weight
                    # Add 0.1 to avoid division by zero if days=0
                    weight = 1 / (exam['days'] + 0.5)
                    exam['weight'] = weight
                    total_weight += weight
                
                # 2. Determine Strategy
                most_urgent = upcoming_exams[0]
                days = most_urgent['days']
                subject = most_urgent['subject']
                
                # CRUNCH MODE (< 2 days)
                if days <= 1:
                    crunch_mode = True
                    
                    if len(upcoming_exams) == 1:
                        # SINGLE EXAM CRUNCH
                        priority_instructions += f"""
                        *** CRITICAL ALERT: {subject} EXAM IN {days} DAYS ***
                        MANDATORY REQUIREMENT:
                        1. EVERY SINGLE STUDY SLOT MUST BE FOR "{subject}".
                        2. DO NOT SCHEDULE ANY OTHER SUBJECT.
                        3. Focus on: Rapid Revision, Mock Tests, and Key Concepts for "{subject}".
                        """
                        # Log
                        await log_timeline_event(
                            uid=settings.uid,
                            type="priority",
                            title=f"⚠️ Crunch Mode: {subject}",
                            description=f"Exam is imminent! Full focus activated.",
                            icon="AlertTriangle",
                            details=[f"Exam in {days} days", "100% Focus Allocation"],
                            mode="academic"
                        )
                    else:
                        # MULTI-EXAM CRUNCH
                        allocations = []
                        details_log = []
                        
                        for exam in upcoming_exams:
                            # Calculate percentage share
                            share = int((exam['weight'] / total_weight) * 100)
                            allocations.append(f"- {exam['subject']}: {share}% of time")
                            details_log.append(f"{exam['subject']}: {share}%")
                            
                        priority_instructions += f"""
                        *** CRITICAL MULTI-EXAM CRUNCH ***
                        User has multiple upcoming exams. You MUST allocate time proportionally:
                        {chr(10).join(allocations)}
                        
                        INSTRUCTIONS:
                        1. Strictly follow the percentage splits above.
                        2. Do NOT schedule non-exam subjects.
                        3. Interleave subjects to avoid burnout (e.g. Subject A -> Subject B -> Subject A).
                        """
                        
                        await log_timeline_event(
                            uid=settings.uid,
                            type="priority",
                            title=f"⚠️ Multi-Exam Crunch",
                            description=f"Balancing multiple upcoming exams.",
                            icon="Layers",
                            details=details_log,
                            mode="academic"
                        )

                # HIGH PRIORITY (< 1 week)
                else:
                    allocations = []
                    for exam in upcoming_exams:
                         share = int((exam['weight'] / total_weight) * 100)
                         # Cap max share for non-crunch to allow some general study
                         share = min(share, 90) 
                         allocations.append(f"- {exam['subject']}: ~{share}%")
                    
                    priority_instructions += f"""
                    *** HIGH PRIORITY SCHEDULE ***
                    Upcoming exams detected. prioritize accordingly:
                    {chr(10).join(allocations)}
                    
                    - Fill remaining time with other subjects if any slots are left.
                    """
                    
                    await log_timeline_event(
                        uid=settings.uid,
                        type="priority",
                        title=f"Exam Prep Mode",
                        description=f"{len(upcoming_exams)} exams coming up this week.",
                        icon="TrendingUp",
                        details=[f"Top Priority: {subject}"] + allocations[:2],
                        mode="academic"
                    )
                    
        except Exception as ex:
            print(f"Error in prioritization logic: {ex}")
        
        # ------------------------------------------------------------------

        # Create structured output LLM
        structured_llm = llm.with_structured_output(ScheduleResponse)

        # Construct optimized prompt
        common_instructions = f"""
User Profile:
- Subjects: {', '.join(subjects)}
- Study Goal: {settings.available_hours} hours/day
- Time Window: {settings.start_time} to {settings.end_time}
- Constraints: {settings.constraints} (STRICTLY FOLLOW)
- Priority Instructions: {priority_instructions}

Requirements:
1. Create time slots strictly within {settings.start_time} - {settings.end_time}
2. Distribute subjects evenly
3. Include short breaks between study sessions
4. Respect user constraints (Priority #1)

Meal Logic:
- IF time window covers 13:00, schedule "Lunch Break" (13:00-14:00)
- IF time window covers 21:00, schedule "Dinner Break" (21:00-22:00)
- ELSE exclude them.

IMPORTANT OUTPUT FORMAT:
For every slot, you MUST include:
- "time": "HH:MM-HH:MM"
- "task": "Description"
- "type": "study" OR "break" OR "other"
- "duration": duration in minutes (integer)
- "subject": "Subject Name" (if study) or null"""

        if settings.view_mode == 'daily':
            today = datetime.now()
            prompt = f"""Create a detailed daily study schedule for {today.strftime('%A, %Y-%m-%d')}.
{common_instructions}

Generate a realistic, achievable daily schedule."""
        else:
            start_date = datetime.now()
            prompt = f"""Create a 7-day study schedule starting {start_date.strftime('%Y-%m-%d')}.
{common_instructions}

Additional Weekly Requirements:
- Generate schedule for 7 consecutive days
- Use 2-3 hour study blocks per session
- Rotate subjects across the week
- Keep it balanced and sustainable

Generate a realistic weekly schedule."""

        try:
            # Get structured output directly
            schedule_data: ScheduleResponse = structured_llm.invoke(prompt)
            
            # Convert to dict for storage
            plan_data = schedule_data.model_dump()
            
        except Exception as e:
            print(f"Structured output error: {e}")
            # Fallback schedule
            plan_data = create_fallback_schedule(settings, subjects)
        
        # Save to Firestore
        try:
            plan_data['created_at'] = datetime.utcnow().isoformat()
            plan_data['view_mode'] = settings.view_mode
            plan_data['settings'] = {
                'available_hours': settings.available_hours,
                'start_time': settings.start_time,
                'end_time': settings.end_time,
                'constraints': settings.constraints
            }
            
            plan_ref = db.collection("user_profiles").document(settings.uid).collection("generated_plans").add(plan_data)
            print(f"Plan saved to Firestore with ID: {plan_ref[1].id}")
            
            # Log to Timeline
            await log_timeline_event(
                uid=settings.uid,
                type="schedule",
                title="Study Plan Generated",
                description=f"Created daily optimized schedule",
                icon="Calendar",
                details=[
                    f"Total: {settings.available_hours}h",
                    f"Mode: {settings.view_mode}",
                    f"Constraints: {settings.constraints[:20]}..." if settings.constraints else "No constraints"
                ]
            )
        except Exception as e:
            print(f"Failed to save plan to Firestore: {str(e)}")

        return plan_data

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Planner Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@planner_router.get("/latest/{uid}", response_model=ScheduleResponse)
async def get_latest_plan(uid: str):
    try:
        plans_ref = db.collection("user_profiles").document(uid).collection("generated_plans")
        docs = plans_ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(1).get()
        
        if not docs:
            return {"schedule": []}
              
        return docs[0].to_dict()

    except Exception as e:
        print(f"Error fetching latest plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def create_fallback_schedule(settings: PlannerSettings, subjects: List[str]) -> dict:
    """Create a simple fallback schedule if LLM fails"""
    today = datetime.now()
    
    if settings.view_mode == 'daily':
        days = 1
    else:
        days = 7
    
    schedule = []
    
    for i in range(days):
        current_date = today + timedelta(days=i)
        day_name = current_date.strftime('%A')
        date_str = current_date.strftime('%Y-%m-%d')
        
        slots = []
        
        # Morning session
        slots.append({
            "time": "09:00-11:00",
            "task": f"{subjects[i % len(subjects)]} - Study Session",
            "type": "study",
            "subject": subjects[i % len(subjects)],
            "duration": 120
        })
        
        # Lunch break
        slots.append({
            "time": "13:00-14:00",
            "task": "Lunch Break",
            "type": "break",
            "subject": None,
            "duration": 60
        })
        
        # Afternoon session
        slots.append({
            "time": "14:00-16:00",
            "task": f"{subjects[(i+1) % len(subjects)]} - Practice",
            "type": "study",
            "subject": subjects[(i+1) % len(subjects)],
            "duration": 120
        })
        
        # Evening session
        slots.append({
            "time": "17:00-19:00",
            "task": f"{subjects[(i+2) % len(subjects)]} - Review",
            "type": "study",
            "subject": subjects[(i+2) % len(subjects)],
            "duration": 120
        })

        # Dinner break (Added)
        slots.append({
            "time": "21:00-22:00",
            "task": "Dinner Break",
            "type": "break",
            "subject": None,
            "duration": 60
        })
        
        schedule.append({
            "day": day_name,
            "date": date_str,
            "slots": slots
        })
    
    return {"schedule": schedule}
