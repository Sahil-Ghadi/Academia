import random
import string
import io
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from db.firebase import db
from firebase_admin import firestore
from utils.llm import llm  # Local Ollama for AI insights

teacher_router = APIRouter(prefix="/teacher", tags=["teacher"])

# ─── Models ────────────────────────────────────────────────────────────────────

class CreateClassroomReq(BaseModel):
    teacher_uid: str
    name: str
    subject: str

class JoinClassroomReq(BaseModel):
    uid: str
    invite_code: str

class ClassroomResponse(BaseModel):
    id: str
    name: str
    teacher_uid: str
    subject: str
    invite_code: str
    student_count: int
    created_at: str

class SendContentReq(BaseModel):
    teacher_uid: str
    title: str
    body: str
    subject: str

class GenerateTestReq(BaseModel):
    teacher_uid: str
    content_id: str
    num_questions: int = 5
    difficulty: str = "medium"  # easy | medium | hard

# ─── Helpers ───────────────────────────────────────────────────────────────────

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# ─── Classroom CRUD ────────────────────────────────────────────────────────────

@teacher_router.post("/classroom/create", response_model=ClassroomResponse)
async def create_classroom(req: CreateClassroomReq):
    try:
        teacher_ref = db.collection("user_profiles").document(req.teacher_uid)
        teacher_doc = teacher_ref.get()
        if not teacher_doc.exists:
            raise HTTPException(status_code=404, detail="Teacher profile not found")

        code = generate_invite_code()

        classroom_ref = db.collection("classrooms").document()
        classroom_data = {
            "id": classroom_ref.id,
            "name": req.name,
            "teacher_uid": req.teacher_uid,
            "subject": req.subject,
            "invite_code": code,
            "student_uids": [],
            "created_at": datetime.utcnow().isoformat()
        }
        classroom_ref.set(classroom_data)

        # Append to classroom_ids array (supports multiple classrooms per teacher)
        teacher_data = teacher_doc.to_dict()
        existing_ids = teacher_data.get("classroom_ids", [])
        if classroom_ref.id not in existing_ids:
            existing_ids.append(classroom_ref.id)
        teacher_ref.update({"classroom_ids": existing_ids, "classroom_id": classroom_ref.id})

        return ClassroomResponse(
            id=classroom_ref.id,
            name=req.name,
            teacher_uid=req.teacher_uid,
            subject=req.subject,
            invite_code=code,
            student_count=0,
            created_at=classroom_data["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: Specific routes MUST come before parameterised ones to avoid collisions.
@teacher_router.post("/classroom/join")
async def join_classroom(req: JoinClassroomReq):
    try:
        query = db.collection("classrooms").where("invite_code", "==", req.invite_code.upper()).limit(1).get()

        if not query:
            raise HTTPException(status_code=404, detail="Invalid invite code")

        classroom_doc = query[0]
        classroom_ref = classroom_doc.reference

        data = classroom_doc.to_dict()

        # Prevent duplicate join
        if req.uid in data.get("student_uids", []):
            return {"success": True, "classroom_id": classroom_doc.id, "classroom_name": data.get("name"), "already_joined": True}

        # Add student to classroom
        classroom_ref.update({"student_uids": firestore.ArrayUnion([req.uid])})

        # Append to student's classroom_ids array (supports multiple classrooms)
        student_ref = db.collection("user_profiles").document(req.uid)
        student_ref.update({
            "classroom_ids": firestore.ArrayUnion([classroom_doc.id]),
            "classroom_id": classroom_doc.id,  # keep for backwards compat
        })

        return {"success": True, "classroom_id": classroom_doc.id, "classroom_name": data.get("name"), "already_joined": False}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom-by-id/{cid}")
async def get_classroom_by_id(cid: str):
    try:
        doc = db.collection("classrooms").document(cid).get()
        if not doc.exists:
            return {"classroom": None}
        data = doc.to_dict()
        return {
            "classroom": {
                "id": doc.id,
                "name": data.get("name"),
                "subject": data.get("subject"),
                "invite_code": data.get("invite_code"),
                "student_count": len(data.get("student_uids", [])),
                "created_at": data.get("created_at")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Teacher: get ALL classrooms by teacher UID ───────────────────────────────

@teacher_router.get("/my-classroom/{teacher_uid}")
async def get_teacher_classroom(teacher_uid: str):
    """Legacy: Get the first classroom owned by a teacher (backward compat)."""
    try:
        query = db.collection("classrooms").where("teacher_uid", "==", teacher_uid).limit(1).get()
        if not query:
            return {"classroom": None}
        doc = query[0]
        data = doc.to_dict()
        return {
            "classroom": {
                "id": doc.id,
                "name": data.get("name"),
                "subject": data.get("subject"),
                "invite_code": data.get("invite_code"),
                "student_count": len(data.get("student_uids", [])),
                "student_uids": data.get("student_uids", []),
                "created_at": data.get("created_at")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/my-classrooms/teacher/{teacher_uid}")
async def get_all_teacher_classrooms(teacher_uid: str):
    """Get ALL classrooms owned by a teacher."""
    try:
        query = db.collection("classrooms").where("teacher_uid", "==", teacher_uid).get()
        classrooms = []
        for doc in query:
            data = doc.to_dict()
            classrooms.append({
                "id": doc.id,
                "name": data.get("name"),
                "subject": data.get("subject"),
                "invite_code": data.get("invite_code"),
                "student_count": len(data.get("student_uids", [])),
                "created_at": data.get("created_at")
            })
        classrooms.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"classrooms": classrooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/my-classrooms/student/{uid}")
async def get_all_student_classrooms(uid: str):
    """Get ALL classrooms a student has joined."""
    try:
        profile_doc = db.collection("user_profiles").document(uid).get()
        if not profile_doc.exists:
            return {"classrooms": []}

        profile = profile_doc.to_dict()
        classroom_ids: list = profile.get("classroom_ids", [])

        # Backward compat: include legacy classroom_id if not already in list
        legacy_id = profile.get("classroom_id")
        if legacy_id and legacy_id not in classroom_ids:
            classroom_ids.append(legacy_id)

        classrooms = []
        for cid in classroom_ids:
            doc = db.collection("classrooms").document(cid).get()
            if doc.exists:
                data = doc.to_dict()
                classrooms.append({
                    "id": doc.id,
                    "name": data.get("name"),
                    "subject": data.get("subject"),
                    "invite_code": data.get("invite_code"),
                    "student_count": len(data.get("student_uids", [])),
                    "teacher_uid": data.get("teacher_uid"),
                    "created_at": data.get("created_at")
                })

        classrooms.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"classrooms": classrooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Students & progress ──────────────────────────────────────────────────────

@teacher_router.get("/classroom/{cid}/students")
async def get_classroom_students(cid: str):
    """Get all students enrolled in a classroom with their progress data."""
    try:
        # Get classroom to find enrolled student UIDs
        classroom_doc = db.collection("classrooms").document(cid).get()
        if not classroom_doc.exists:
            raise HTTPException(status_code=404, detail="Classroom not found")

        classroom_data = classroom_doc.to_dict()
        student_uids = classroom_data.get("student_uids", [])

        if not student_uids:
            return {"students": []}

        students = []
        for uid in student_uids:
            try:
                profile_doc = db.collection("user_profiles").document(uid).get()
                if not profile_doc.exists:
                    continue

                profile = profile_doc.to_dict()

                # Try to fetch progress from sub-collection
                progress_doc = db.collection("classrooms").document(cid).collection("student_progress").document(uid).get()
                progress = progress_doc.to_dict() if progress_doc.exists else {}

                mastery = profile.get("mastery_profile", {})
                progress_avg = progress.get("avg_accuracy")  # None if no progress doc

                # has_progress = student has submitted at least one test in THIS classroom
                has_progress = progress_doc.exists and progress_avg is not None

                if has_progress:
                    avg_acc = progress_avg  # exact score (may be 0)
                else:
                    avg_acc = None  # null → "test not given"

                weak_areas = progress.get("weak_areas", [])
                last_active = progress.get("last_active", profile.get("updated_at", None))

                students.append({
                    "uid": uid,
                    "name": profile.get("name", "Unknown Student"),
                    "email": profile.get("email", ""),
                    "avg_accuracy": round(avg_acc, 1) if avg_acc is not None else None,
                    "has_progress": has_progress,
                    "weak_areas": weak_areas,
                    "last_active": last_active,
                })
            except Exception:
                continue

        return {"students": students}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom/{cid}/student/{uid}")
async def get_student_detail(cid: str, uid: str):
    try:
        student_doc = db.collection("user_profiles").document(uid).get()
        if not student_doc.exists:
            raise HTTPException(status_code=404, detail="Student not found")

        data = student_doc.to_dict()

        return {
            "name": data.get("name"),
            "email": data.get("email"),
            "mastery_profile": data.get("mastery_profile", {}),
            "wrong_questions_by_topic": data.get("wrong_questions_by_topic", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── AI Insight ───────────────────────────────────────────────────────────────

@teacher_router.post("/classroom/{cid}/ai-insight")
async def get_ai_insight(cid: str):
    try:
        classroom_doc = db.collection("classrooms").document(cid).get()
        if not classroom_doc.exists:
            raise HTTPException(status_code=404, detail="Classroom not found")

        classroom_data = classroom_doc.to_dict()
        student_uids = classroom_data.get("student_uids", [])

        if not student_uids:
            return {"insight": "No students have joined this classroom yet. Share your invite code to get started!"}

        weak_topics_freq: Dict[str, int] = {}
        total_score = 0
        valid_scores = 0
        at_risk_count = 0
        student_count = len(student_uids)

        for uid in student_uids:
            try:
                profile_doc = db.collection("user_profiles").document(uid).get()
                if not profile_doc.exists:
                    continue
                profile = profile_doc.to_dict()

                progress_doc = db.collection("classrooms").document(cid).collection("student_progress").document(uid).get()
                progress = progress_doc.to_dict() if progress_doc.exists else {}

                mastery = profile.get("mastery_profile", {})
                avg = progress.get("avg_accuracy", 0)
                if not avg and mastery:
                    scores = [v for v in mastery.values() if isinstance(v, (int, float))]
                    avg = sum(scores) / len(scores) if scores else 0

                if avg > 0:
                    total_score += avg
                    valid_scores += 1
                    if avg < 50:
                        at_risk_count += 1

                for topic in progress.get("weak_areas", []):
                    weak_topics_freq[topic] = weak_topics_freq.get(topic, 0) + 1
            except Exception:
                continue

        top_weak = sorted(weak_topics_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        top_weak_str = ", ".join([f"{t[0]} ({t[1]} students)" for t in top_weak]) if top_weak else "No data yet"
        avg_class_score = (total_score / valid_scores) if valid_scores > 0 else 0

        prompt = f"""You are an expert academic coach analyzing a class of {student_count} students.

Class Metrics:
- Average Class Score: {avg_class_score:.1f}%
- Students At Risk (<50%): {at_risk_count}
- Top Weak Topics across class: {top_weak_str}

Provide a 3-4 sentence concise insight for the teacher. Focus on:
1. What specific topic needs to be re-taught to the whole class.
2. A pedagogical strategy to improve the top weak area.
3. A quick note on whether they should focus on 1-on-1 interventions or class-wide review.

Do NOT use markdown bolding or bullet points. Just output a clean paragraph."""

        insight = llm.invoke(prompt)

        return {"insight": insight.content.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Content Sending ──────────────────────────────────────────────────────────

@teacher_router.post("/classroom/{cid}/content/send")
async def send_content(cid: str, req: SendContentReq):
    """Send a content piece (notes, article, summary) to all students in the classroom."""
    try:
        classroom_doc = db.collection("classrooms").document(cid).get()
        if not classroom_doc.exists:
            raise HTTPException(status_code=404, detail="Classroom not found")

        classroom_data = classroom_doc.to_dict()
        if classroom_data.get("teacher_uid") != req.teacher_uid:
            raise HTTPException(status_code=403, detail="Not authorized to post in this classroom")

        # Store the content post
        content_ref = db.collection("classrooms").document(cid).collection("content").document()
        content_data = {
            "id": content_ref.id,
            "title": req.title,
            "body": req.body,
            "subject": req.subject,
            "teacher_uid": req.teacher_uid,
            "created_at": datetime.utcnow().isoformat(),
            "has_test": False,
        }
        content_ref.set(content_data)

        return {"success": True, "content_id": content_ref.id, "message": "Content sent to all students!"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom/{cid}/content")
async def get_classroom_content(cid: str, uid: Optional[str] = None):
    """
    Get all content posts for a classroom, ordered by newest first.
    If uid is provided, each post with a test will include the student's submission score
    (score_pct) so the frontend knows the test was already completed.
    """
    try:
        content_ref = db.collection("classrooms").document(cid).collection("content")
        docs = content_ref.get()

        posts = []
        for doc in docs:
            data = doc.to_dict()
            posts.append(data)

        # Sort newest first in Python
        posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        # If a student uid is given, attach their submission score to each post that has a test
        if uid:
            for post in posts:
                post["my_score"] = None  # default: not submitted
                test_id = post.get("test_id")
                if test_id:
                    sub_doc = (
                        db.collection("classrooms")
                        .document(cid)
                        .collection("tests")
                        .document(test_id)
                        .collection("submissions")
                        .document(uid)
                        .get()
                    )
                    if sub_doc.exists:
                        post["my_score"] = sub_doc.to_dict().get("score_pct")

        return {"posts": posts}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── AI Test Generation ───────────────────────────────────────────────────────

@teacher_router.post("/classroom/{cid}/content/{content_id}/generate-test")
async def generate_test_from_content(cid: str, content_id: str, req: GenerateTestReq):
    """Generate an AI-powered MCQ test from a given content post."""
    try:
        # Fetch the content
        content_doc = db.collection("classrooms").document(cid).collection("content").document(content_id).get()
        if not content_doc.exists:
            raise HTTPException(status_code=404, detail="Content not found")

        content_data = content_doc.to_dict()

        if content_data.get("teacher_uid") != req.teacher_uid:
            raise HTTPException(status_code=403, detail="Not authorized")

        title = content_data.get("title", "")
        body = content_data.get("body", "")
        num_q = max(1, min(req.num_questions, 15))
        difficulty = req.difficulty if req.difficulty in ["easy", "medium", "hard"] else "medium"

        prompt = f"""You are an expert educator. Create exactly {num_q} multiple-choice questions based on the following content.
Difficulty level: {difficulty.upper()}

CONTENT TITLE: {title}
CONTENT:
{body[:3000]}

OUTPUT FORMAT (strict JSON array, no extra text):
[
  {{
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Brief explanation why this is correct."
  }}
]

Rules:
- Each question must have exactly 4 options labeled A, B, C, D.
- "correct" must be one of: A, B, C, or D.
- Questions must directly test understanding of the provided content.
- {difficulty} difficulty means: {"factual recall" if difficulty == "easy" else "conceptual understanding" if difficulty == "medium" else "critical analysis and application"}.
- Output ONLY the JSON array. No preamble, no markdown code fences."""

        response = llm.invoke(prompt)
        raw = response.content.strip()

        # Try to parse JSON
        import json
        import re
        # Extract JSON array if model added extra text
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            raise ValueError("Model did not return valid JSON array")

        questions = json.loads(match.group())

        # Validate structure
        validated = []
        for q in questions[:num_q]:
            if not all(k in q for k in ["question", "options", "correct", "explanation"]):
                continue
            if len(q["options"]) != 4:
                continue
            validated.append(q)

        if not validated:
            raise ValueError("No valid questions generated")

        # Store the test
        test_ref = db.collection("classrooms").document(cid).collection("tests").document()
        test_data = {
            "id": test_ref.id,
            "content_id": content_id,
            "title": f"Test: {title}",
            "questions": validated,
            "difficulty": difficulty,
            "num_questions": len(validated),
            "teacher_uid": req.teacher_uid,
            "created_at": datetime.utcnow().isoformat(),
        }
        test_ref.set(test_data)

        # Mark the content as having a test
        db.collection("classrooms").document(cid).collection("content").document(content_id).update({
            "has_test": True,
            "test_id": test_ref.id
        })

        return {"success": True, "test_id": test_ref.id, "questions": validated, "num_questions": len(validated)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom/{cid}/tests")
async def get_classroom_tests(cid: str):
    """Get all tests for a classroom."""
    try:
        tests_ref = db.collection("classrooms").document(cid).collection("tests")
        docs = tests_ref.get()

        tests = []
        for doc in docs:
            data = doc.to_dict()
            tests.append({
                "id": data.get("id"),
                "title": data.get("title"),
                "content_id": data.get("content_id"),
                "difficulty": data.get("difficulty"),
                "num_questions": data.get("num_questions"),
                "created_at": data.get("created_at"),
            })

        tests.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"tests": tests}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom/{cid}/tests/{test_id}")
async def get_test_detail(cid: str, test_id: str):
    """Get full test details including questions."""
    try:
        test_doc = db.collection("classrooms").document(cid).collection("tests").document(test_id).get()
        if not test_doc.exists:
            raise HTTPException(status_code=404, detail="Test not found")

        return test_doc.to_dict()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SubmitTestReq(BaseModel):
    uid: str
    score_pct: float
    correct: int
    total: int


@teacher_router.post("/classroom/{cid}/tests/{test_id}/submit")
async def submit_test_result(cid: str, test_id: str, req: SubmitTestReq):
    """Record a student's test result and update their progress in the classroom."""
    try:
        now = datetime.utcnow().isoformat()

        # Store result under the test's submissions sub-collection
        sub_ref = (
            db.collection("classrooms")
            .document(cid)
            .collection("tests")
            .document(test_id)
            .collection("submissions")
            .document(req.uid)
        )
        sub_ref.set({
            "uid": req.uid,
            "score_pct": req.score_pct,
            "correct": req.correct,
            "total": req.total,
            "submitted_at": now,
        }, merge=True)

        # Update / create the student_progress summary used by the teacher dashboard
        progress_ref = (
            db.collection("classrooms")
            .document(cid)
            .collection("student_progress")
            .document(req.uid)
        )
        existing = progress_ref.get()

        if existing.exists:
            data = existing.to_dict()
            prev_attempts = data.get("total_attempts", 0)
            prev_avg = data.get("avg_accuracy", 0.0)
            new_attempts = prev_attempts + 1
            new_avg = ((prev_avg * prev_attempts) + req.score_pct) / new_attempts
            progress_ref.update({
                "total_attempts": new_attempts,
                "avg_accuracy": round(new_avg, 1),
                "last_active": now,
            })
        else:
            # Get student name from profile
            profile_doc = db.collection("user_profiles").document(req.uid).get()
            name = profile_doc.to_dict().get("name", "Unknown") if profile_doc.exists else "Unknown"
            progress_ref.set({
                "uid": req.uid,
                "name": name,
                "total_attempts": 1,
                "avg_accuracy": round(req.score_pct, 1),
                "weak_areas": [],
                "last_active": now,
            })

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@teacher_router.get("/classroom/{cid}/my-submissions")
async def get_student_submissions(cid: str, uid: str):
    """
    Return all test submissions for a specific student in a classroom.
    Used by the student frontend to restore completed-test state after a page refresh.
    Returns: { submissions: { [test_id]: score_pct } }
    """
    try:
        # Fetch all tests in the classroom
        tests_ref = db.collection("classrooms").document(cid).collection("tests").stream()

        submissions: dict = {}
        for test_doc in tests_ref:
            sub_ref = (
                db.collection("classrooms")
                .document(cid)
                .collection("tests")
                .document(test_doc.id)
                .collection("submissions")
                .document(uid)
                .get()
            )
            if sub_ref.exists:
                sub_data = sub_ref.to_dict()
                submissions[test_doc.id] = sub_data.get("score_pct", 0)

        return {"submissions": submissions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── PDF Upload → Parse → AI Notes ────────────────────────────────────────────

@teacher_router.post("/classroom/{cid}/content/upload-pdf")
async def upload_pdf_and_generate_notes(
    cid: str,
    teacher_uid: str = Form(...),
    subject: str = Form("General"),
    file: UploadFile = File(...),
):
    """
    Accept a PDF upload, extract its text with PyMuPDF, then use the LLM
    to produce clean structured notes, and save them as a classroom content post.
    Returns the created post so the frontend can display it immediately.
    """
    # ── Validate file type ────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="pymupdf is not installed. Run: pip install pymupdf"
        )

    # ── Read and parse PDF ────────────────────────────────────────────────────
    try:
        raw_bytes = await file.read()
        pdf = fitz.open(stream=raw_bytes, filetype="pdf")

        pages_text: list[str] = []
        for page in pdf:
            text = page.get_text("text").strip()
            if text:
                pages_text.append(text)
        pdf.close()

        if not pages_text:
            raise HTTPException(status_code=422, detail="PDF contains no extractable text (may be scanned image).")

        raw_text = "\n\n".join(pages_text)
        # Limit to 6000 chars to stay within LLM context
        truncated = raw_text[:6000]
        title_hint = file.filename.replace(".pdf", "").replace("_", " ").replace("-", " ").title()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")

    # ── Ask LLM to generate structured notes ─────────────────────────────────
    prompt = f"""You are an expert educational content writer. A teacher has uploaded a PDF document.
Your task: Convert the raw extracted text into clean, well-structured student notes.

PDF TITLE HINT: {title_hint}
SUBJECT: {subject}

RAW EXTRACTED TEXT:
{truncated}

OUTPUT REQUIREMENTS:
- Write clear, concise notes suitable for students
- Use a logical structure: Overview → Key Concepts → Important Details → Summary
- Use plain text only (no markdown symbols like ** or ##)
- Keep it educational, accurate, and well-organized
- Maximum 800 words
- Start directly with the notes content, no preamble

Write the notes now:"""

    try:
        response = llm.invoke(prompt)
        notes_body = response.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {e}")

    # ── Save to Firestore as a content post ───────────────────────────────────
    try:
        classroom_doc = db.collection("classrooms").document(cid).get()
        if not classroom_doc.exists:
            raise HTTPException(status_code=404, detail="Classroom not found")

        content_ref = db.collection("classrooms").document(cid).collection("content").document()
        now = datetime.utcnow().isoformat()
        post_data = {
            "id": content_ref.id,
            "title": title_hint,
            "body": notes_body,
            "subject": subject,
            "teacher_uid": teacher_uid,
            "created_at": now,
            "has_test": False,
            "source": "pdf_upload",
            "original_filename": file.filename,
        }
        content_ref.set(post_data)

        return {
            "success": True,
            "post": post_data,
            "pages_extracted": len(pages_text),
            "chars_extracted": len(raw_text),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
