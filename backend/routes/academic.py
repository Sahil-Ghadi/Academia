

# ==========================================
# learning.py
# ==========================================

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from utils.llm import llm
from utils.route_utils import handle_error
from youtube_search import YoutubeSearch

learning_router = APIRouter(prefix="/learning", tags=["learning"])

# Pydantic Models for Structured Output
class SearchQuery(BaseModel):
    """Optimized YouTube search query"""
    query: str = Field(description="Single optimized YouTube search query for educational content")

# Request/Response Models
class RecommendationRequest(BaseModel):
    topic: str
    subject: str

class VideoResource(BaseModel):
    id: str
    title: str
    thumbnail: str
    duration: str
    channel: str
    link: str
    viewCount: Optional[str] = "N/A"

@learning_router.post("/recommend", response_model=List[VideoResource])
async def recommend_resources(request: RecommendationRequest):
    """Recommend YouTube learning resources using AI-optimized search"""
    try:
        # Create structured output LLM
        structured_llm = llm.with_structured_output(SearchQuery)
        
        # Concise prompt
        prompt = f"""Generate ONE optimized YouTube search query for learning about "{request.topic}" in {request.subject}.

Requirements:
1. Focus on conceptual understanding and visual explanations
2. Target educational content
3. Be specific and clear
4. Return only the search query text

Example: For "Photosynthesis" in Biology, return: "photosynthesis explained animation visual"
"""

        try:
            # Get optimized query
            search_query: SearchQuery = structured_llm.invoke(prompt)
            query = search_query.query.strip().replace('"', '')
        except Exception as e:
            print(f"Structured output error: {e}")
            # Fallback to simple query
            query = f"{request.topic} {request.subject} explained"
        
        # Search YouTube
        results = YoutubeSearch(query, max_results=4).to_dict()

        videos = []
        for item in results:
            link = f"https://www.youtube.com{item['url_suffix']}"
            thumbnail = item['thumbnails'][0] if item.get('thumbnails') else ""
            
            videos.append({
                "id": item['id'],
                "title": item['title'],
                "thumbnail": thumbnail,
                "duration": item.get('duration', 'N/A'),
                "channel": item.get('channel', 'Unknown'),
                "link": link,
                "viewCount": item.get('views', 'N/A')
            })
        
        return videos

    except Exception as e:
        raise handle_error(e, "Learning Resources")


class PersonalizedPathRequest(BaseModel):
    uid: str
    subject: str

class PersonalizedPathItem(BaseModel):
    id: str
    item_type: str  # "video", "reading", "practice_easy", "practice_hard", "edge_case"
    title: str
    description: str
    topic_tag: str
    difficulty_level: int
    url: Optional[str] = None

class PathOutput(BaseModel):
    items: List[PersonalizedPathItem]

@learning_router.post("/personalized_path", response_model=List[PersonalizedPathItem])
async def generate_personalized_path(request: PersonalizedPathRequest):
    """Generate a multi-modal personalized learning path based on mastery states."""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        user_ref = db.collection("user_profiles").document(request.uid)
        profile_doc = user_ref.get()
        mastery = profile_doc.to_dict().get('mastery_profile', {}) if profile_doc.exists else {}
        
        # Fallback if no mastery
        if not mastery:
            mastery = {"Basics": {"elo_rating": 1200.0}}
            
        import uuid
        
        prompt = f"""You are an Adaptive Learning Path Generator.
        The user is learning "{request.subject}".
        Their current mastery profile (Topic to Elo rating): {mastery}.
        
        Apply this State Machine Logic:
        - Low Mastery (Elo < 1100) -> Recommend foundational reading or a video.
        - Medium Mastery (Elo 1100-1300) -> Recommend practice questions.
        - High Mastery (Elo > 1300) -> Recommend edge-case/hard application questions.
        
        Generate exactly 4 personalized path items.
        Set item_type to one of: "video", "reading", "practice_easy", "practice_hard", "edge_case".
        """
        
        structured_llm = llm.with_structured_output(PathOutput)
        response = structured_llm.invoke(prompt)
        
        path_items = []
        for item in response.items:
            item.id = str(uuid.uuid4())
            if item.item_type == "video" and not item.url:
                try:
                    results = YoutubeSearch(item.title, max_results=1).to_dict()
                    if results:
                        item.url = f"https://www.youtube.com{results[0]['url_suffix']}"
                except Exception:
                    pass
            path_items.append(item)
            
        return path_items
        
    except Exception as e:
        raise handle_error(e, "Personalized Path")

class TelemetryRequest(BaseModel):
    uid: str
    video_id: str
    topic: str
    subject: str
    watch_time_seconds: int
    mode: str = "academic"

@learning_router.post("/telemetry")
async def log_telemetry(request: TelemetryRequest):
    """Log watch time telemetry for videos."""
    try:
        from firebase_admin import firestore
        from utils.timeline_logger import log_timeline_event
        db = firestore.client()
        user_ref = db.collection("user_profiles").document(request.uid)
        
        # Log to timeline
        await log_timeline_event(
            uid=request.uid,
            type="learning",
            title="Video Lesson Completed",
            description=f"Watched {request.topic} video for {request.watch_time_seconds}s",
            icon="Youtube",
            details=[f"Subject: {request.subject}", f"Duration: {request.watch_time_seconds}s"],
            mode=request.mode
        )
        
        # Update a telemetry subcollection
        user_ref.collection("telemetry").add({
            "video_id": request.video_id,
            "topic": request.topic,
            "subject": request.subject,
            "watch_time_seconds": request.watch_time_seconds,
            "mode": request.mode,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        
        return {"status": "success"}
    except Exception as e:
        raise handle_error(e, "Learning Telemetry")


# ==========================================
# assessment.py
# ==========================================

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from utils.llm import llm, assessment_llm
from utils.route_utils import handle_error
from firebase_admin import firestore
import uuid
from utils.timeline_logger import log_timeline_event

assessment_router = APIRouter(prefix="/assessment", tags=["assessment"])
db = firestore.client()

# Pydantic Models for Structured Output
class MCQuestion(BaseModel):
    """Multiple choice question"""
    question: str = Field(description="The question text")
    options: List[str] = Field(description="Four answer options", min_items=4, max_items=4)
    correct_answer: int = Field(description="Index of correct option (0-3)", ge=0, le=3)
    topic_tag: str = Field(description="Specific topic this question tests")
    explanation: Optional[str] = Field(default=None, description="A brief explanation of why the correct answer is right and others are wrong")

class AssessmentQuestions(BaseModel):
    """Collection of assessment questions"""
    questions: List[MCQuestion] = Field(description="List of 10 MCQ questions", min_items=10, max_items=10)

# Request Models
class GenerateRequest(BaseModel):
    uid: str
    subject: str
    topics: List[str]
    set_number: int  # 1, 2, or 3

class Question(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_answer: int
    topic_tag: str
    explanation: Optional[str] = None

class AnswerSubmit(BaseModel):
    question_id: str
    selected: int
    attempts: int = 1
    hints_used: int = 0
    time_taken_sec: int = 15

class SubmitRequest(BaseModel):
    uid: str
    exam_id: str
    set_number: int
    answers: List[AnswerSubmit]
    questions: List[Question]

class AdaptiveNextRequest(BaseModel):
    uid: str
    subject: str
    topic: str
    last_question_correct: Optional[bool] = None

class AdaptiveItem(BaseModel):
    id: str
    item_type: str  # "question" or "lesson"
    difficulty_level: int
    topic_tag: str
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    lesson_text: Optional[str] = None
    key_takeaway: Optional[str] = None

class LessonOutput(BaseModel):
    lesson_text: str = Field(description="A short, encouraging micro-lesson explaining the core concept")
    key_takeaway: str = Field(description="One sentence summary of the rule or concept")

class SingleQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    topic_tag: str

@assessment_router.post("/adaptive_next", response_model=List[AdaptiveItem])
async def generate_adaptive_next(request: AdaptiveNextRequest):
    """Generate the next adaptive item(s) based on real-time mastery."""
    try:
        user_ref = db.collection("user_profiles").document(request.uid)
        profile_doc = user_ref.get()
        mastery = profile_doc.to_dict().get('mastery_profile', {}) if profile_doc.exists else {}
        
        topic_elo = mastery.get(request.topic, {}).get("elo_rating", 1200.0)
        
        # Map Elo to 1-5 difficulty
        if topic_elo < 1000:
            difficulty = 1
        elif topic_elo < 1150:
            difficulty = 2
        elif topic_elo < 1350:
            difficulty = 3
        elif topic_elo < 1500:
            difficulty = 4
        else:
            difficulty = 5

        items = []
        
        # Scaffolding: if they just got a question wrong
        if request.last_question_correct is False:
            lesson_prompt = f"""The student just incorrectly answered a question about "{request.topic}" in "{request.subject}".
            Provide a very brief, encouraging micro-lesson (2-3 sentences) explaining the core concept clearly.
            Also provide a 1-sentence key takeaway."""
            
            structured_lesson = llm.with_structured_output(LessonOutput)
            lesson_data = structured_lesson.invoke(lesson_prompt)
            
            items.append(AdaptiveItem(
                id=str(uuid.uuid4()),
                item_type="lesson",
                difficulty_level=difficulty,
                topic_tag=request.topic,
                lesson_text=lesson_data.lesson_text,
                key_takeaway=lesson_data.key_takeaway
            ))
            
            # Drop difficulty for the follow-up question
            difficulty = max(1, difficulty - 1)

        # Generate exactly 1 question at the determined difficulty
        structured_q = llm.with_structured_output(SingleQuestion)
        q_prompt = f"""Generate EXACTLY ONE Multiple Choice Question for "{request.subject}" specifically about "{request.topic}".
        The difficulty level MUST be {difficulty} out of 5 (1=Beginner, 5=Expert).
        Provide the question, exactly 4 options, the correct_answer index (0-3), and the topic_tag.
        Test understanding based on the difficulty level."""
        
        q_data = structured_q.invoke(q_prompt)
        
        items.append(AdaptiveItem(
            id=str(uuid.uuid4()),
            item_type="question",
            difficulty_level=difficulty,
            topic_tag=q_data.topic_tag,
            question=q_data.question,
            options=q_data.options,
            correct_answer=q_data.correct_answer
        ))
        
        return items
        
    except Exception as e:
        raise handle_error(e, "Adaptive Generation")

@assessment_router.post("/generate", response_model=List[Question])
async def generate_assessment(request: GenerateRequest):
    """Generate 10 MCQ questions using structured output with retry logic based on user Elo."""
    # Fetch user mastery to determine adaptive test composition
    user_ref = db.collection("user_profiles").document(request.uid)
    profile_doc = user_ref.get()
    mastery = profile_doc.to_dict().get('mastery_profile', {}) if profile_doc.exists else {}
    
    # Calculate average Elo for the requested topics
    avg_elo = 1200.0
    valid_elos = [mastery.get(t, {}).get("elo_rating", 1200.0) for t in request.topics]
    if valid_elos:
        avg_elo = sum(valid_elos) / len(valid_elos)
        
    if avg_elo < 1000:
        difficulty_mix = "7 Easy, 2 Medium, 1 Hard"
    elif avg_elo < 1300:
        difficulty_mix = "2 Easy, 5 Medium, 3 Hard"
    elif avg_elo < 1500:
        difficulty_mix = "1 Easy, 3 Medium, 6 Hard"
    else:
        difficulty_mix = "1 Medium, 9 Hard"

    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            topics_str = ", ".join(request.topics)
            
            # Use local Ollama for structured assessment generation
            prompt = f"""You are an expert exam question generator. Generate EXACTLY 10 Multiple Choice Questions for the subject "{request.subject}".

Topics to cover: {topics_str}
Learner Elo Rating: {avg_elo:.1f}
Required Difficulty Mix: {difficulty_mix}

Respond with ONLY a raw JSON object matching this EXACT schema, no markdown, no extra text:
{{
  "questions": [
    {{
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correct_answer": 0,
      "topic_tag": "<topic>",
      "difficulty": "<Easy | Medium | Hard>",
      "explanation": "<brief explanation of the correct answer>"
    }}
  ]
}}

Rules:
- Generate EXACTLY 10 questions, no more no less.
- correct_answer is the 0-based index of the correct option.
- Follow the Difficulty Mix strictly.
- Output ONLY the JSON. Do NOT include any text before or after it."""

            # Get structured output from Ollama (returns raw JSON string)
            import json as _json
            raw_response = assessment_llm.invoke(prompt)
            raw_text = raw_response.content.strip()
            # Strip markdown code fences if any
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            parsed_json = _json.loads(raw_text)
            assessment_data = parsed_json.get("questions", [])
            
            # Validate we got exactly 10 questions
            if not isinstance(assessment_data, list) or len(assessment_data) != 10:
                print(f"Attempt {attempt + 1}: Got {len(assessment_data) if isinstance(assessment_data, list) else 0} questions, retrying...")
                continue
            
            # Validate each question is complete
            all_complete = True
            for i, q in enumerate(assessment_data):
                if not isinstance(q, dict) or not all([
                    q.get('question'),
                    isinstance(q.get('options'), list) and len(q['options']) == 4,
                    isinstance(q.get('correct_answer'), int) and 0 <= q['correct_answer'] <= 3,
                    q.get('topic_tag')
                ]):
                    print(f"Attempt {attempt + 1}: Question {i+1} incomplete, retrying...")
                    all_complete = False
                    break
            
            if not all_complete:
                continue
            
            # All questions are complete, format and return
            questions = []
            for q in assessment_data:
                questions.append({
                    "id": str(uuid.uuid4()),
                    "question": q["question"],
                    "options": q["options"],
                    "correct_answer": q["correct_answer"],
                    "topic_tag": q.get("topic_tag", request.subject),
                    "difficulty": q.get("difficulty", "Medium"),
                    "explanation": q.get("explanation", "")
                })
            print(f"Successfully generated {len(questions)} questions via Ollama on attempt {attempt + 1}")
            return questions
        
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:
                # Last attempt failed, use fallback
                print("All attempts failed, using fallback questions")
                return create_fallback_questions(request.subject, request.topics)
            continue
    
    # If we somehow get here, return fallback
    return create_fallback_questions(request.subject, request.topics)


@assessment_router.post("/submit")
async def submit_assessment(request: SubmitRequest):
    """Submit and grade assessment"""
    try:
        correct_count = 0
        total = len(request.questions)
        weak_topics = []
        
        from utils.learner_model import EloSystem, calculate_actual_score
        from datetime import datetime
        elo_system = EloSystem()
        
        # Get profile first for mastery tracking
        user_ref = db.collection("user_profiles").document(request.uid)
        profile_doc = user_ref.get()
        profile_dict = profile_doc.to_dict() if profile_doc.exists else {}
        mastery_profile = profile_dict.get('mastery_profile', {})
        
        # Grade answers and update Learner Model
        wrong_by_topic: dict = {}
        for q in request.questions:
            ans = next((a for a in request.answers if a.question_id == q.id), None)
            user_ans = ans.selected if ans else -1
            
            is_correct = (user_ans == q.correct_answer)
            if is_correct:
                correct_count += 1
            else:
                weak_topics.append(q.topic_tag)
                correct_text = q.options[q.correct_answer] if q.correct_answer < len(q.options) else "N/A"
                wrong_by_topic.setdefault(q.topic_tag, []).append({
                    "question": q.question,
                    "correct": correct_text
                })
                
            # -- Knowledge Graph & Mastery Scoring Update --
            topic = q.topic_tag
            topic_data = mastery_profile.get(topic, {
                "elo_rating": 1200.0,
                "exposure_count": 0
            })
            
            actual_score = calculate_actual_score(
                is_correct=is_correct,
                attempts=ans.attempts if ans else 1,
                hints_used=ans.hints_used if ans else 0,
                time_taken_sec=ans.time_taken_sec if ans else 15
            )
            
            # Assume base question difficulty of 1200 for now
            new_learner_rating, _ = elo_system.update_rating(topic_data["elo_rating"], 1200.0, actual_score)
            
            topic_data["elo_rating"] = new_learner_rating
            topic_data["exposure_count"] += 1
            topic_data["last_tested"] = datetime.utcnow().isoformat()
            mastery_profile[topic] = topic_data
        
        accuracy = (correct_count / total) * 100
        
        # Update exam readiness + increment attempt count + store score history
        attempt_count = 1
        score_history = [round(accuracy, 1)]
        
        if request.exam_id and request.exam_id != "temp_drill":
            exam_ref = user_ref.collection("exams").document(request.exam_id)
            exam_doc = exam_ref.get()
            exam_data = exam_doc.to_dict() if exam_doc.exists else {}
            attempt_count = exam_data.get("attempt_count", 0) + 1
            score_history = exam_data.get("score_history", [])
            score_history.append(round(accuracy, 1))
            score_history = score_history[-10:]  # Keep last 10

            try:
                exam_ref.update({
                    "readiness_score": accuracy,
                    "last_assessment_date": firestore.SERVER_TIMESTAMP,
                    "attempt_count": attempt_count,
                    "score_history": score_history
                })
            except Exception as e:
                print(f"Skipping exam doc update (might not exist): {e}")
        
        # Update weak areas
        current_weak_areas = profile_dict.get('weak_areas', [])
        updated_weak_areas = (current_weak_areas + weak_topics)[-50:]

        existing_wrong_q = profile_dict.get('wrong_questions_by_topic', {})
        for topic, new_qs in wrong_by_topic.items():
            merged = existing_wrong_q.get(topic, []) + new_qs
            existing_wrong_q[topic] = merged[-5:]

        user_ref.update({
            "weak_areas": updated_weak_areas,
            "wrong_questions_by_topic": existing_wrong_q,
            "mastery_profile": mastery_profile
        })
        
        # Log performance history
        user_ref.collection("stats_history").add({
            "date": firestore.SERVER_TIMESTAMP,
            "exam_subject": request.exam_id,
            "score": accuracy,
            "type": "assessment"
        })

        # -- AI Recommendation --
        recommendation = ""
        try:
            trend = ""
            if len(score_history) >= 2:
                delta = score_history[-1] - score_history[-2]
                trend = f"Last attempt was {score_history[-2]:.1f}%, this attempt is {accuracy:.1f}% ({'+' if delta >= 0 else ''}{delta:.1f}%)."
            else:
                trend = f"This is attempt #{attempt_count}. Score: {accuracy:.1f}%."

            rec_prompt = f"""You are an academic coach. A student just completed a practice assessment.
{trend}
Score history (most recent last): {score_history}
Weak topics this attempt: {list(set(weak_topics))[:5] if weak_topics else 'None'}

In exactly 1-2 sentences, tell the student:
1. Whether they should retake the test now or move on.
2. One specific action they should take next.
Be direct, encouraging, and concise. Do not use markdown."""

            rec_response = llm.invoke(rec_prompt)
            recommendation = rec_response.content.strip()
        except Exception as e:
            print(f"Recommendation generation failed: {e}")
            if accuracy >= 80:
                recommendation = "Great score! You're ready to move on to harder topics. Consider reviewing any weak areas before your exam."
            elif accuracy >= 60:
                recommendation = "You're making progress. Review your incorrect answers and retake the test once to reinforce the concepts."
            else:
                recommendation = "Focus on the weak topics highlighted below and retake this test after some review sessions."

        # Log to Timeline
        if weak_topics:
            await log_timeline_event(
                uid=request.uid,
                type="detection",
                title="Weak Topics Identified",
                description=f"Assessment revealed {len(weak_topics)} weak areas",
                icon="AlertTriangle",
                details=[f"Topics: {', '.join(list(set(weak_topics))[:3])}", f"Score: {int(accuracy)}%"]
            )
        else:
             await log_timeline_event(
                uid=request.uid,
                type="insight",
                title="Assessment Completed",
                description=f"Strong performance on {request.exam_id}",
                icon="Trophy",
                details=[f"Score: {int(accuracy)}%", "No weak areas detected"]
            )

        return {
            "score": correct_count,
            "total": total,
            "accuracy": accuracy,
            "readiness": accuracy,
            "weak_areas": list(set(weak_topics)),
            "attempt_count": attempt_count,
            "score_history": score_history,
            "recommendation": recommendation
        }

    except Exception as e:
        raise handle_error(e, "Assessment Submission")


def create_fallback_questions(subject: str, topics: List[str]) -> List[Question]:
    """Create fallback questions if LLM fails"""
    questions = []
    for i in range(10):
        topic = topics[i % len(topics)]
        questions.append({
            "id": str(uuid.uuid4()),
            "question": f"Sample question {i+1} about {topic} in {subject}?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0,
            "topic_tag": topic,
            "difficulty": "Medium"
        })
    return questions


# ==========================================
# exams.py
# ==========================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from db.firebase import db
from datetime import datetime
import uuid

exams_router = APIRouter(prefix="/exams", tags=["exams"])

class SyllabusItem(BaseModel):
    name: str
    completed: bool = False

class Exam(BaseModel):
    uid: str
    subject: str
    title: str
    date: str
    syllabus: List[SyllabusItem]
    total_topics: Optional[int] = 0
    completed_topics: Optional[int] = 0

class ExamResponse(Exam):
    id: str
    created_at: str

@exams_router.post("/create", response_model=ExamResponse)
async def create_exam(exam: Exam):
    try:
        exam_data = exam.model_dump()
        exam_data['created_at'] = datetime.utcnow().isoformat()
        exam_data['total_topics'] = len(exam.syllabus)
        exam_data['completed_topics'] = sum(1 for item in exam.syllabus if item.completed)
        
        # Save to subcollection
        doc_ref = db.collection("user_profiles").document(exam.uid).collection("exams").add(exam_data)
        doc_id = doc_ref[1].id

        # Log to timeline
        try:
            await log_timeline_event(
                uid=exam.uid,
                type="schedule",
                title="Exam Added",
                description=f"Added exam: {exam.subject}",
                icon="BookOpen",
                details=[
                    f"Subject: {exam.subject}",
                    f"Date: {exam.date}",
                    f"Topics: {len(exam.syllabus)}"
                ],
                mode="academic"
            )
        except Exception as e:
            print(f"Timeline log failed (exam create): {e}")

        return {**exam_data, "id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ToggleTopicRequest(BaseModel):
    topic_index: int
    completed: bool

@exams_router.patch("/{uid}/{exam_id}/toggle", response_model=ExamResponse)
async def toggle_topic(uid: str, exam_id: str, request: ToggleTopicRequest):
    try:
        doc_ref = db.collection("user_profiles").document(uid).collection("exams").document(exam_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        data = doc.to_dict()
        syllabus = data.get('syllabus', [])
        
        # Check if syllabus needs migration (contains strings)
        migrated = False
        if syllabus and isinstance(syllabus[0], str):
            syllabus = [{"name": item, "completed": False} for item in syllabus]
            migrated = True

        if 0 <= request.topic_index < len(syllabus):
             syllabus[request.topic_index]['completed'] = request.completed
             
             # Recalculate totals
             total = len(syllabus)
             completed = sum(1 for item in syllabus if item['completed'])
             
             update_data = {
                 'syllabus': syllabus, # Save the migrated/updated structure
                 'total_topics': total,
                 'completed_topics': completed
             }
             
             doc_ref.update(update_data)
             
             # Return updated exam
             return {**data, **update_data, "id": doc.id}
        else:
             raise HTTPException(status_code=400, detail="Invalid topic index")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@exams_router.get("/list/{uid}", response_model=List[dict])
async def list_exams(uid: str, category: Optional[str] = None):
    try:
        # 1. Fetch Exams
        exams_ref = db.collection("user_profiles").document(uid).collection("exams")
        exams_docs = exams_ref.stream()
        
        all_items = []
        
        for doc in exams_docs:
            data = doc.to_dict()
            # Handle legacy syllabus format (list of strings)
            if 'syllabus' in data and isinstance(data['syllabus'], list):
                new_syllabus = []
                for item in data['syllabus']:
                    if isinstance(item, str):
                        new_syllabus.append({"name": item, "completed": False})
                    else:
                        new_syllabus.append(item)
                data['syllabus'] = new_syllabus

            all_items.append({
                **data, 
                "id": doc.id,
                "category": "exam",
                # ensure date field exists for sorting
                "date": data.get("date", "") 
            })
            
        # 2. Fetch General Deadlines (from chat/assistant)
        deadlines_ref = db.collection("user_profiles").document(uid).collection("deadlines")
        # Filter partially if needed, but for now get all active ones
        deadlines_docs = deadlines_ref.where("completed", "==", False).stream()
        
        for doc in deadlines_docs:
            data = doc.to_dict()
            # Map deadline fields to match exam fields where possible
            # 'due_date' -> 'date'
            
            all_items.append({
                "id": doc.id,
                "title": data.get("title", "Untitled"),
                "subject": data.get("subject", "General"),
                "date": data.get("due_date", ""), # Map to 'date' so frontend can sort/display
                "category": "assignment", # Default category for these
                "progress": 0, # No granular progress for simple deadlines yet
                "syllabus": [], # No syllabus
                "total_topics": 0,
                "completed_topics": 0,
                "created_at": data.get("created_at", "")
            })

            
        # Filter by category if requested
        if category:
            all_items = [item for item in all_items if item["category"] == category]

        # Sort by date
        all_items.sort(key=lambda x: x.get('date', ''))
        
        return all_items
    except Exception as e:
        print(f"Error fetching exams/deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@exams_router.delete("/{uid}/{exam_id}")
async def delete_exam(uid: str, exam_id: str):
    try:
        db.collection("user_profiles").document(uid).collection("exams").document(exam_id).delete()
        return {"message": "Exam deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# assignments.py
# ==========================================

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from utils.llm import llm
from firebase_admin import firestore
import pypdf
import io
import uuid
from datetime import datetime

assignments_router = APIRouter(prefix="/assignments", tags=["assignments"])
db = firestore.client()

class TodoItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task: str = Field(description="Actionable task created from the assignment")
    estimated_time: str = Field(description="Estimated time to complete (e.g., '30 mins')")
    priority: str = Field(description="Priority level: High, Medium, or Low")
    completed: bool = Field(default=False, description="Whether the task is completed")

class AssignmentResponse(BaseModel):
    id: Optional[str] = None
    title: str = Field(description="Title of the assignment derived from content")
    summary: str = Field(description="Brief summary of what the assignment entails")
    todos: List[TodoItem] = Field(description="List of actionable todos")
    created_at: Optional[datetime] = None

@assignments_router.post("/upload", response_model=AssignmentResponse)
async def upload_assignment(
    file: UploadFile = File(...),
    uid: str = Form(...)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read file content
        content = await file.read()
        pdf_file = io.BytesIO(content)
        
        # Extract text using pypdf
        reader = pypdf.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
            
        # Truncate text if too long (to fit context window)
        if len(text) > 20000:
            text = text[:20000] + "...(truncated)"
            
        # Process with LLM
        prompt = f"""
        Analyze the following assignment text and break it down into a clear, actionable checklist of todos.
        
        ASSIGNMENT TEXT:
        {text}
        
        Return the result as a JSON object with the following structure:
        {{
            "title": "Assignment Title",
            "summary": "Brief summary...",
            "todos": [
                {{
                    "task": "Specific actionable task",
                    "estimated_time": "30 mins",
                    "priority": "High"
                }}
            ]
        }}
        """
        
        structured_llm = llm.with_structured_output(AssignmentResponse)
        response = structured_llm.invoke(prompt)
        
        # Add metadata and IDs
        assignment_id = str(uuid.uuid4())
        response.id = assignment_id
        response.created_at = datetime.now()
        
        # Ensure completion status is set (LLM might omit it)
        for todo in response.todos:
            if not getattr(todo, 'id', None):
                todo.id = str(uuid.uuid4())
            todo.completed = False
            
        # Save to Firestore
        assignment_dict = response.model_dump()
        assignment_dict['created_at'] = datetime.now() # ensure datetime is preserved
        
        user_ref = db.collection('user_profiles').document(uid)
        assignment_ref = user_ref.collection('assignments').document(assignment_id)
        assignment_ref.set(assignment_dict)
        
        return response
        
    except Exception as e:
        print(f"Error processing assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process assignment: {str(e)}")

@assignments_router.get("/{uid}", response_model=List[AssignmentResponse])
async def get_assignments(uid: str):
    try:
        assignments_ref = db.collection('user_profiles').document(uid).collection('assignments')
        docs = assignments_ref.order_by('created_at', direction=firestore.Query.DESCENDING).get()
        
        assignments = []
        for doc in docs:
            data = doc.to_dict()
            assignments.append(AssignmentResponse(**data))
            
        return assignments
    except Exception as e:
        print(f"Error fetching assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")

@assignments_router.patch("/{uid}/{assignment_id}/todo/{todo_id}")
async def update_todo_status(
    uid: str,
    assignment_id: str,
    todo_id: str,
    completed: bool = Body(..., embed=True)
):
    try:
        assignment_ref = db.collection('user_profiles').document(uid).collection('assignments').document(assignment_id)
        doc = assignment_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Assignment not found")
            
        data = doc.to_dict()
        updated = False
        
        # Find and update the specific todo
        for todo in data.get('todos', []):
            if todo.get('id') == todo_id:
                todo['completed'] = completed
                updated = True
                break
                
        if not updated:
            raise HTTPException(status_code=404, detail="Todo item not found")
            
        assignment_ref.update({'todos': data['todos']})
        return {"status": "success", "message": "Todo updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating todo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update todo: {str(e)}")


# ==========================================
# college.py
# ==========================================

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from agents.schemas import ExamInfo, StudyPlan
from agents.college.exam_parser import parse_exam_info
from agents.college.planner_agent import create_study_plan
from utils.route_utils import handle_error

college_router = APIRouter(prefix="/study", tags=["study-planner"])

# Request/Response Models
class StudyPlanRequest(BaseModel):
    user_id: str
    input_text: str

class StudyPlanResponse(BaseModel):
    exam: Optional[dict]
    days_left: Optional[int]
    urgency: Optional[str]
    plan: Optional[dict]
    strategy: Optional[str]
    message: str

@college_router.post("/create-plan", response_model=StudyPlanResponse)
async def create_study_plan_route(request: StudyPlanRequest):
    """
    Create a personalized study plan using AI agents with structured output
    """
    try:
        # Step 1: Parse exam info using structured output agent
        exam_info: ExamInfo = parse_exam_info(request.input_text)
        
        # Step 2: Create study plan using structured output agent
        study_plan: StudyPlan = create_study_plan(exam_info)
        
        # Step 3: Format response
        return StudyPlanResponse(
            exam={
                "subject": exam_info.subject,
                "exam_date": exam_info.exam_date,
                "topics": exam_info.topics
            },
            days_left=exam_info.days_until_exam,
            urgency=exam_info.urgency,
            plan={
                "daily_plan": [
                    {"day": day.day_number, "tasks": day.tasks}
                    for day in study_plan.daily_breakdown
                ],
                "total_hours": study_plan.total_study_hours,
                "priority_topics": study_plan.priority_topics
            },
            strategy=study_plan.strategy,
            message="Study plan created successfully using AI agents"
        )
    
    except Exception as e:
        print(f"Study Plan Error: {str(e)}")
        # Return fallback plan
        return create_fallback_plan(request.input_text)


@college_router.get("/health")
async def health_check():
    """Check if the study planner service is running"""
    return {
        "status": "healthy",
        "service": "Study Planner (AI Agents with Structured Output)",
        "model": "gemini-1.5-flash",
        "features": [
            "AI-powered exam parsing",
            "Intelligent study planning",
            "Personalized recommendations",
            "Structured output validation"
        ]
    }


def create_fallback_plan(input_text: str) -> StudyPlanResponse:
    """Create a simple fallback plan if agents fail"""
    fallback_date = datetime.now() + timedelta(days=7)
    
    return StudyPlanResponse(
        exam={
            "subject": "Subject",
            "exam_date": fallback_date.strftime("%Y-%m-%d"),
            "topics": ["Topic 1", "Topic 2", "Topic 3"]
        },
        days_left=7,
        urgency="high",
        plan={
            "daily_plan": [
                {"day": i+1, "tasks": [f"Study session {i+1}", "Practice problems", "Review notes"]}
                for i in range(7)
            ],
            "total_hours": 28,
            "priority_topics": ["Topic 1", "Topic 2", "Topic 3"]
        },
        strategy="intensify",
        message="Study plan created (using fallback due to agent error)"
    )
