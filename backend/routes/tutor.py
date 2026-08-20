from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from firebase_admin import firestore
from datetime import datetime, timezone
from langchain_core.messages import SystemMessage, HumanMessage
from utils.llm import llm
from routes.ai_features import search_my_notes, _load_history, _save_turn
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from utils.timeline_logger import log_timeline_event
import os

# Gemini 2.5 Flash — used exclusively for visualization generation
from langchain_google_genai import ChatGoogleGenerativeAI
gemini_flash = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
)

tutor_router = APIRouter(prefix="/tutor", tags=["tutor"])
db = firestore.client()

class TutorRequest(BaseModel):
    uid: str
    message: str
    mode: str = "explain" # explain, socratic, exam_prep
    session_id: Optional[str] = "tutor_default"

@tool
def update_elo_score(uid: str, topic: str, is_correct: bool) -> str:
    """
    Update the user's Elo rating for a given topic based on their answer.
    Call this when testing the student's understanding.
    """
    try:
        from utils.learner_model import EloSystem, calculate_actual_score
        
        user_ref = db.collection("user_profiles").document(uid)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return "User not found."
            
        data = user_doc.to_dict()
        mastery_profile = data.get("mastery_profile", {})
        
        # Initialize if topic doesn't exist
        if topic not in mastery_profile:
            mastery_profile[topic] = {"elo_rating": 1200.0, "assessments_taken": 0}
            
        current_rating = mastery_profile[topic]["elo_rating"]
        
        # Standard question difficulty rating
        question_rating = 1200.0 
        
        elo_sys = EloSystem()
        actual_score = calculate_actual_score(is_correct=is_correct, attempts=1)
        new_learner_rating, _ = elo_sys.update_rating(current_rating, question_rating, actual_score)
        
        mastery_profile[topic]["elo_rating"] = round(new_learner_rating, 1)
        mastery_profile[topic]["assessments_taken"] += 1
        
        user_ref.update({"mastery_profile": mastery_profile})
        
        return f"Elo rating for '{topic}' updated successfully from {current_rating} to {mastery_profile[topic]['elo_rating']}. (Correct: {is_correct})"
    except Exception as e:
        return f"Failed to update Elo: {str(e)}"

tutor_tools = [search_my_notes, update_elo_score]
tutor_agent = create_react_agent(llm, tutor_tools)

@tutor_router.post("/message")
async def tutor_message(request: TutorRequest):
    try:
        now = datetime.now().isoformat()

        # 1. Fetch user profile for subjects and mastery
        user_ref = db.collection("user_profiles").document(request.uid).get()
        subjects_list = []
        mastery_data = {}
        if user_ref.exists:
            user_data = user_ref.to_dict()
            subjects_list = user_data.get("academic_subjects", [])
            mastery_data = user_data.get("mastery_profile", {})

        subjects_str = ", ".join(subjects_list) if subjects_list else "General"
        
        mastery_str = ""
        for topic, info in mastery_data.items():
            rating = info.get("elo_rating", 1200)
            level = "Beginner" if rating < 1100 else "Advanced" if rating > 1300 else "Intermediate"
            mastery_str += f"- {topic}: {rating} ({level})\n"

        system_prompt = f"""You are an expert academic tutor for a college student studying {subjects_str}.
User ID: {request.uid} (IMPORTANT: Use this exact uid when calling tools).

The student's current mastery levels are:
{mastery_str if mastery_str else "No mastery data yet. Assume Beginner."}

"""

        if request.mode == "explain":
            system_prompt += """Your job is to:
1. Teach concepts using simple analogies first
2. Ask follow-up questions to check understanding
3. Automatically adjust explanation depth based on mastery (Use simple analogies for Beginners, deep dives for Advanced)
4. Reference their uploaded notes when relevant using search_my_notes tool
5. End every explanation with a quick 1-2 question verbal check. If they answer, evaluate it and call update_elo_score tool.
"""
        elif request.mode == "socratic":
            system_prompt += """Your job is to:
1. Instead of explaining directly, ask guiding questions to help the student discover the answer themselves.
2. Never give the direct answer immediately. Guide them step-by-step.
3. Reference their uploaded notes when relevant using search_my_notes tool.
4. When they successfully reach the answer, call update_elo_score tool with is_correct=True.
"""
        elif request.mode == "exam_prep":
            system_prompt += """Your job is to:
1. Simulate a viva/oral exam. Fire rapid questions on selected topics.
2. Keep your questions short. Do not explain unless they fail multiple times.
3. Evaluate the user's answer immediately.
4. IMPORTANT: Always call update_elo_score tool to log their correctness for every answer they give.
"""

        system_prompt += "\nRespond playfully but concisely. Do not output massive walls of text."

        # 2. Load conversation history
        history = _load_history(request.uid, request.session_id)

        inputs = {
            "messages": [
                SystemMessage(content=system_prompt),
                *history,
                HumanMessage(content=request.message),
            ]
        }

        # 4. Run agent
        result = await tutor_agent.ainvoke(inputs)

        last_message = result["messages"][-1]
        response_text = last_message.content

        # Fallback if agent stopped after tool without a final message
        if not response_text or response_text.strip() == "":
            for m in reversed(result["messages"]):
                if m.type == "tool":
                    response_text = f"Action completed: {m.name} -> {str(m.content)[:50]}..."
                    break

        if not response_text:
            response_text = "I encountered an error understanding that request."

        # 5. Save history
        _save_turn(request.uid, request.session_id, request.message, response_text)

        # 6. Log to timeline (fire-and-forget, first message of each session only)
        try:
            await log_timeline_event(
                uid=request.uid,
                type="insight",
                title="AI Tutor Session",
                description=f"Mode: {request.mode.replace('_', ' ').title()}",
                icon="Bot",
                details=[
                    f"Topic: {request.message[:60]}...",
                    f"Mode: {request.mode}"
                ],
                mode="academic"
            )
        except Exception:
            pass

        return {"response": response_text}

    except Exception as e:
        print(f"Error in tutor_message: {str(e)}")
        return {"response": f"Sorry, I encountered an internal error: {str(e)}"}


# ─────────────────────────────────────────────────────────
# History endpoint — restores chat on page refresh
# ─────────────────────────────────────────────────────────

@tutor_router.get("/history/{uid}")
async def get_tutor_history(uid: str, session_id: str = "tutor_session", limit: int = 40):
    """Return the last N messages for the given tutor session as plain dicts."""
    try:
        from routes.ai_features import _history_ref
        ref = _history_ref(uid, session_id)
        docs = (
            ref.order_by("ts", direction=firestore.Query.ASCENDING)
            .limit_to_last(limit)
            .get()
        )
        messages = []
        for doc in docs:
            d = doc.to_dict()
            role = d.get("role")
            content = d.get("content", "")
            ts = d.get("ts")
            # Convert Firestore timestamp to ISO string if present
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts) if ts else None
            if role in ("human", "ai"):
                messages.append({
                    "id": doc.id,
                    "role": "user" if role == "human" else "assistant",
                    "content": content,
                    "ts": ts_str,
                })
        return {"messages": messages}
    except Exception as e:
        print(f"Error loading tutor history: {e}")
        return {"messages": []}


# ─────────────────────────────────────────────────────────
# MCQ endpoint — generates a structured question from recent chat topics
# ─────────────────────────────────────────────────────────

class MCQRequest(BaseModel):
    uid: str
    session_id: Optional[str] = "tutor_session"
    topic_hint: Optional[str] = None  # if we know the topic, pass it directly

class MCQResponse(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    topic: str
    explanation: str

@tutor_router.post("/mcq", response_model=MCQResponse)
async def generate_tutor_mcq(request: MCQRequest):
    """
    Derives the most recently discussed topic from chat history and returns
    a single structured MCQ question with 4 options for the Exam Simulator.
    """
    import json, re
    try:
        topic = request.topic_hint

        # If no hint, extract topic from last few chat turns
        if not topic:
            from routes.ai_features import _history_ref
            ref = _history_ref(request.uid, request.session_id)
            docs = (
                ref.order_by("ts", direction=firestore.Query.DESCENDING)
                .limit(6)
                .get()
            )
            recent_content = " ".join(
                d.to_dict().get("content", "") for d in docs
                if d.to_dict().get("role") == "human"
            )
            if not recent_content.strip():
                recent_content = "general knowledge"
            
            # Ask LLM to extract the topic cleanly
            topic_res = llm.invoke(
                f"In 1-5 words, what is the MAIN academic topic being discussed here? Reply ONLY the topic name, nothing else.\n\nChat: {recent_content[:600]}"
            )
            topic = topic_res.content.strip().strip('"').strip("'")

        # Get user mastery for this topic to calibrate difficulty
        user_ref = db.collection("user_profiles").document(request.uid).get()
        mastery_data = {}
        if user_ref.exists:
            mastery_data = user_ref.to_dict().get("mastery_profile", {})
        topic_elo = mastery_data.get(topic, {}).get("elo_rating", 1200.0)

        if topic_elo < 1100:
            difficulty = "Easy (foundational, definitional)"
        elif topic_elo < 1350:
            difficulty = "Medium (applied understanding)"
        else:
            difficulty = "Hard (edge cases, analysis)"

        prompt = f"""You are an exam question generator. Generate exactly ONE multiple-choice question about "{topic}".
Difficulty: {difficulty} (Learner Elo: {topic_elo:.0f})

Return ONLY a raw JSON object with this exact schema, no markdown:
{{
  "question": "<the question text>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correct_index": <0-3>,
  "topic": "{topic}",
  "explanation": "<one sentence explaining why the correct answer is right>"
}}"""

        raw = llm.invoke(prompt).content.strip()
        # Strip markdown fences if present
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        data = json.loads(raw)

        return MCQResponse(
            question=data["question"],
            options=data["options"],
            correct_index=int(data["correct_index"]),
            topic=data.get("topic", topic),
            explanation=data.get("explanation", "")
        )
    except Exception as e:
        print(f"[tutor/mcq] Error: {e}")
        # Fallback generic question
        t = topic or "General Knowledge"
        return MCQResponse(
            question=f"Which of the following best describes a key concept in {t}?",
            options=["Option A", "Option B", "Option C", "Option D"],
            correct_index=0,
            topic=t,
            explanation="This is a fallback question. Please try again."
        )


# ─────────────────────────────────────────────────────────

class VisualizeRequest(BaseModel):
    topic: str
    subject: str = "General"
    uid: Optional[str] = None   # for DB persistence

VISUALIZE_PROMPT = """You are an expert educational visualization engineer.

Given an academic or computer science topic, produce a highly accurate, logically sequenced, and engaging visual breakdown formatted as a JSON object.
Return ONLY valid JSON, no markdown fences, no extra text.

Schema Guidelines & Constraints:
{
  "topic": "Exact topic name",
  "summary": "One sentence summary",
  "steps": [
    {
      "id": 1,
      "title": "Introduction",
      "description": "Explanation of the concept. You MAY use **Markdown**.",
      "type": "concept",
      "icon": "🧠", // CRITICAL: MUST be a SINGLE unicode emoji, NEVER text
      "points": ["Key point 1", "**Bold** point 2"]
    },
    {
      "id": 2,
      "title": "Array Representation",
      "description": "What is happening",
      "type": "array_op",
      "arrays": [
        { "label": "DATA", "values": ["4","2","7","1"], "highlight": [0,2], "colors": {"0":"green","2":"orange"} }
      ],
      "action": "Swapping elements"
    },
    {
      "id": 3,
      "title": "Graph/Tree View",
      "description": "Structure of the data",
      "type": "tree_op",
      "nodes": [{"id":1,"val":"10"},{"id":2,"val":"5"},{"id":3,"val":"15"}], // Node 'val' must be short, max 5 chars
      "edges": [{"from":1,"to":2},{"from":1,"to":3}],
      "highlight_nodes": [2],
      "action": "Found target at node 5"
    },
    {
      "id": 4,
      "title": "Implementation",
      "description": "Step-by-step execution",
      "type": "code",
      "language": "python",
      "code": ["def search(arr, target):", "    for i, v in enumerate(arr):", "        if v == target:", "            return i", "    return -1"],
      "highlight": [2,3],
      "explanation": "Markdown is supported here too."
    },
    {
      "id": 5,
      "title": "Trade-offs",
      "description": "Comparing approaches",
      "type": "comparison",
      "col_a": "Approach A",
      "col_b": "Approach B",
      "rows": [
        // For text data:
        {"label":"Time Complexity","a":"O(n)","b":"O(log n)","winner":"b"},
        // CRITICAL: To render the visual Radar Chart, provide at least 3 rows with pure NUMERIC scores (0-100)
        {"label":"Speed Score","a":"40","b":"90","winner":"b"},
        {"label":"Memory Score","a":"80","b":"80","winner":"none"}
      ]
    }
  ]
}

Strict Rules:
1. Generate 4 to 6 logical steps showing progression (e.g., Concept -> Data Structure -> Execution -> Code -> Trade-offs).
2. "icon" in concept steps MUST be a single emoji (e.g., 🚀, 💻). NEVER a word.
3. For "tree_op", DO NOT provide x/y coordinates. They are auto-layouted. Ensure "val" strings are short (1-5 chars).
4. For "comparison", if you want the Radar Chart to appear, YOU MUST provide numeric rows (e.g., "a":"85", "b":"40").
5. You may use rich Markdown formatting (like `**bold**`, `*italic*`) in "description", "points", and "explanation".
6. Return ONLY the raw JSON object."""


@tutor_router.post("/visualize")
async def get_visualization(request: VisualizeRequest):
    import json, re

    search_topic = request.topic.strip().lower()

    # ── Check Cache First ───────────────────────────────
    if request.uid:
        try:
            user_ref = db.collection("user_profiles").document(request.uid)
            viz_ref = user_ref.collection("tutor_visualizations")
            existing = viz_ref.where("topic_lower", "==", search_topic).limit(1).get()
            if existing:
                print(f"[tutor] Visualization cache hit for: {request.topic}")
                cached_data = existing[0].to_dict()
                cached_data.pop("created_at", None)
                cached_data.pop("topic_lower", None)
                return cached_data
        except Exception as e:
            print(f"[tutor] Error checking cache: {e}")

    async def _invoke_and_parse(model) -> dict:
        """Call a model and robustly extract the JSON object from its response."""
        messages = [
            SystemMessage(content=VISUALIZE_PROMPT),
            HumanMessage(content=f"Topic: {request.topic}\nSubject: {request.subject}\n\nGenerate the JSON now."),
        ]
        response = await model.ainvoke(messages)
        raw = response.content.strip()
        # Find the first '{' and last '}' — handles preamble/postamble text
        start = raw.find('{')
        end   = raw.rfind('}')
        if start != -1 and end != -1 and end > start:
            raw = raw[start:end + 1]
        else:
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw.strip())
        return json.loads(raw)

    try:
        try:
            data = await _invoke_and_parse(gemini_flash)
        except Exception as gemini_err:
            # Quota exhausted or any Gemini error → fall back to local Ollama
            err_str = str(gemini_err)
            if "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower() or "429" in err_str:
                print(f"[tutor] Gemini quota hit — falling back to Ollama: {err_str[:120]}")
                data = await _invoke_and_parse(llm)
            else:
                raise

        # ── Persist to Firestore if uid provided ────────────
        if request.uid and data.get("steps"):
            try:
                user_ref = db.collection("user_profiles").document(request.uid)
                user_ref.collection("tutor_visualizations").add({
                    "topic":   data.get("topic", request.topic),
                    "topic_lower": search_topic,
                    "summary": data.get("summary", ""),
                    "subject": request.subject,
                    "steps":   data.get("steps", []),
                    "created_at": firestore.SERVER_TIMESTAMP,
                })
            except Exception as db_err:
                # Non-fatal — still return the data
                print(f"[tutor] Firestore save error: {db_err}")

        return data

    except Exception as e:
        print(f"Visualization error: {e}")
        import traceback; traceback.print_exc()
        return {
            "topic": request.topic,
            "summary": f"Step-by-step breakdown of {request.topic}",
            "steps": [
                {
                    "id": 1,
                    "title": f"Understanding {request.topic}",
                    "description": f"Error generating visualization: {str(e)[:120]}",
                    "type": "concept",
                    "icon": "📚",
                    "points": ["Check the backend logs for details."]
                }
            ]
        }
