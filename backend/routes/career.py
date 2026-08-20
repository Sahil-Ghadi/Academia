

# ==========================================
# jobs.py
# ==========================================

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
from db.firebase import db
from datetime import datetime
from utils.llm import llm
from firebase_admin import firestore
import json
import os
from utils.timeline_logger import log_timeline_event

jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])

class JobRole(BaseModel):
    title: str
    description: str
    match_score: int
    demand: str = "High"
    avg_salary: str = "₹0"
    url: Optional[str] = None
    company: Optional[str] = None

class SkillGap(BaseModel):
    missing_skill: str
    reason: str
    recommended_resource: str = "Coursera/Udemy"

class GapAnalysisResponse(BaseModel):
    role: str
    missing_skills: List[SkillGap]

class JobAnalysisRequest(BaseModel):
    uid: str

class GapAnalysisRequest(BaseModel):
    uid: str
    role: str

class AddSkillRequest(BaseModel):
    uid: str
    skill_name: str

@jobs_router.get("/{uid}", response_model=List[JobRole])
async def get_jobs(uid: str):
    """
    Get stored job recommendations
    """
    try:
        user_ref = db.collection('user_profiles').document(uid)
        suggestions_ref = user_ref.collection('job_suggestions')
        # Assuming latest suggestion set or just list all? For simplicity let's stick to a single list stored in a main doc or subcollection documents
        # Storing as a single document 'latest' in subcollection 'job_suggestions' for easy overwrite/retrieval
        suggestion_doc = suggestions_ref.document('latest').get()
        
        if suggestion_doc.exists:
            data = suggestion_doc.to_dict()
            jobs_data = data.get('jobs', [])
            return [JobRole(**job) for job in jobs_data]
        return []

    except Exception as e:
         print(f"Get Jobs Error: {e}")
         return []

@jobs_router.post("/analyze", response_model=List[JobRole])
async def analyze_jobs(request: JobAnalysisRequest):
    """
    Analyze profile and suggest job roles
    """
    try:
        # Get user profile
        user_ref = db.collection('user_profiles').document(request.uid)
        profile_doc = user_ref.get()
        
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        profile_data = profile_doc.to_dict()
        interests = profile_data.get('side_hustle_interests', [])
        
        # Get current skills
        skills_ref = user_ref.collection('skills')
        skills = [doc.to_dict().get('name') for doc in skills_ref.stream()]
        
        if not interests and not skills:
             return []

        # LLM Generation
        prompt = f"""
        Based on the following user profile, suggest 3 specific and realistic side hustle job roles or freelance descriptions they could target in the Indian market.
        
        User Interests: {', '.join(interests)}
        Current Skills: {', '.join(skills)}
        
        CRITICAL RULES:
        1. DO NOT suggest overlapping or parent/child skill pairs (e.g., if you suggest "Full Stack Developer", DO NOT also suggest "Frontend Developer"). Make sure all 3 roles are distinct paths.
        2. Pick roles that actually exist in the current job market.
        
        For each role, provide:
        1. Title
        2. Brief description (max 1 sentence)
        3. Match score (0-100) based on current skills
        4. Market Demand (High, Medium, Low)
        5. Estimated Average Salary/Rate in INR (e.g. ₹500/hr or ₹6 LPA)
        
        Return ONLY valid JSON format:
        [
            {{
                "title": "Role Title",
                "description": "Description...",
                "match_score": 85,
                "demand": "High",
                "avg_salary": "₹500/hr"
            }}
        ]
        """
        
        try:
            response = llm.invoke(prompt).content
            
            # Clean response if markdown
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
                
            jobs_data = json.loads(response.strip())
            
            # Save to Firestore
            suggestions_ref = user_ref.collection('job_suggestions')
            suggestions_ref.document('latest').set({
                "jobs": jobs_data,
                "updated_at": datetime.utcnow().isoformat()
            })
            
            # Log to Timeline
            await log_timeline_event(
                uid=request.uid,
                type="insight",
                title="Job Market Analysis",
                description="Analyzed profile for side hustle opportunities",
                icon="Briefcase",
                details=[f"Suggested {len(jobs_data)} roles"],
                mode="side-hustle"
            )

            return [JobRole(**job) for job in jobs_data]
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return [
                JobRole(title="Freelance Developer", description="General web development", match_score=50, avg_salary="₹500/hr"),
                JobRole(title="Content Creator", description="Creating tech content", match_score=40, avg_salary="₹10k/mo")
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@jobs_router.get("/search/")
async def search_jobs(query: str, uid: str):
    """
    Search real jobs using TheirStack API.
    Provides India-specific results and maps them to JobRole.
    """
    api_key = os.getenv("THEIRSTACK_API_KEY")
    if not api_key:
        return []

    try:
        import httpx
        url = "https://api.theirstack.com/v1/jobs/search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # TheirStack POST body requirements:
        # Require at least one filter like job_title_or
        # and we can add country_code_or for India
        payload = {
            "job_title_or": [query],
            "company_country_code_or": ["IN"],
            "posted_at_max_age_days": 30,
            "limit": 3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=15.0)
            
        if response.status_code != 200:
            print(f"TheirStack API Error: {response.text}")
            return []
            
        data = response.json()
        jobs_list = data.get("data", [])
        
        # Prepare data for LLM Enhancement
        extracted_jobs = []
        for job in jobs_list:
            title = job.get("job_title", job.get("title", "Unknown Role"))
            company = job.get("company_name", job.get("company", "Unknown Company"))
            job_url = job.get("url", job.get("link", ""))
            extracted_jobs.append({"title": title, "company": company, "url": job_url})
            
        # Enhance with LLM for salary and description
        results = []
        if extracted_jobs:
            llm_prompt = f"""
            I have {len(extracted_jobs)} job listings from India. 
            For each, provide a 1-sentence engaging description emphasizing the value of this role, and a realistic estimated average salary range in INR (e.g. "₹8-12 LPA" or "₹50k/mo").
            
            Jobs:
            {json.dumps([{"title": j["title"], "company": j["company"]} for j in extracted_jobs])}
            
            Return ONLY valid JSON format as an array of objects matching exactly the input order:
            [
                {{ "description": "...", "salary": "₹8-12 LPA" }}
            ]
            """
            
            try:
                llm_res = llm.invoke(llm_prompt).content
                if "```json" in llm_res:
                    llm_res = llm_res.split("```json")[1].split("```")[0]
                elif "```" in llm_res:
                    llm_res = llm_res.split("```")[1].split("```")[0]
                    
                enhanced_data = json.loads(llm_res.strip())
                
                for idx, job in enumerate(extracted_jobs):
                    enhanced = enhanced_data[idx] if idx < len(enhanced_data) else {}
                    results.append(JobRole(
                        title=job["title"],
                        description=enhanced.get("description", f"Hiring Company: {job['company']}. Click to view details."),
                        match_score=0,
                        demand="Live",
                        avg_salary=enhanced.get("salary", "N/A"),
                        url=job["url"],
                        company=job["company"]
                    ))
            except Exception as e:
                print(f"LLM Enhancement Error: {e}")
                for job in extracted_jobs:
                    results.append(JobRole(
                        title=job["title"],
                        description=f"Hiring Company: {job['company']}. Click to view details.",
                        match_score=0,
                        demand="Live",
                        avg_salary="N/A",
                        url=job["url"],
                        company=job["company"]
                    ))
            
        return results
        
    except Exception as e:
        print(f"Search API Error: {e}")
        return []

@jobs_router.post("/gap", response_model=GapAnalysisResponse)
async def analyze_gap(request: GapAnalysisRequest):
    """
    Analyze skill gap for a specific role
    """
    try:
        user_ref = db.collection('user_profiles').document(request.uid)
        skills_ref = user_ref.collection('skills')
        current_skills = [doc.to_dict().get('name') for doc in skills_ref.stream()]
        
        prompt = f"""
        Target Role: {request.role}
        User's Current Skills: {', '.join(current_skills)}
        
        Identify the top 3-5 critical skills the user is MISSING to be successful in this role.
        For each missing skill, provide a reason why it's needed and a recommended resource type.
        
        Return ONLY valid JSON format:
        {{
            "role": "{request.role}",
            "missing_skills": [
                {{
                    "missing_skill": "Skill Name",
                    "reason": "Why it is needed",
                    "recommended_resource": "e.g. Coursera Specialization"
                }}
            ]
        }}
        """
        
        try:
            response = llm.invoke(prompt).content
            
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
                
            gap_data = json.loads(response.strip())
            
            # Log to Timeline
            await log_timeline_event(
                uid=request.uid,
                type="detection",
                title="Skill Gap Detected",
                description=f"Analysis for {request.role}",
                icon="AlertTriangle",
                details=[f"Missing: {len(gap_data.get('missing_skills', []))} skills"],
                mode="side-hustle"
            )

            return GapAnalysisResponse(**gap_data)
        except Exception as e:
            print(f"LLM Error: {e}")
            return GapAnalysisResponse(role=request.role, missing_skills=[])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@jobs_router.post("/add-skill")
async def add_skill(request: AddSkillRequest):
    """
    Add a skill to user's roadmap
    """
    try:
        user_ref = db.collection('user_profiles').document(request.uid)
        
        # Check if skill already exists
        skills_ref = user_ref.collection('skills')
        existing = skills_ref.where('name', '==', request.skill_name).get()
        
        if len(existing) > 0:
            return {"message": "Skill already exists"}
            
        # Add new skill
        new_skill = {
            "name": request.skill_name,
            "status": "not_started",
            "mastery": 0,
            "created_at": datetime.utcnow().isoformat()
        }
        
        skills_ref.add(new_skill)
        
        # Log to Timeline
        await log_timeline_event(
            uid=request.uid,
            type="roadmap",
            title="Skill Added to Roadmap",
            description=f"Started learning: {request.skill_name}",
            icon="Book",
            details=["Added to skill tracker"],
            mode="side-hustle"
        )
        
        # Sync with Profile Interests
        try:
            user_ref.update({
                "side_hustle_interests": firestore.ArrayUnion([request.skill_name])
            })
        except Exception as e:
            print(f"Failed to sync interest: {e}")

        return {"message": "Skill added successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# resume.py
# ==========================================

from fastapi import APIRouter, HTTPException
from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List
from utils.llm import llm
import os
import json

resume_router = APIRouter(prefix="/resume", tags=["resume"])
db = firestore.client()

@resume_router.post("/generate/{uid}")
async def generate_resume(uid: str):
    """
    Generate a professional resume using AI based on user profile, skills, and projects
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        profile_doc = user_ref.get()
        
        if not profile_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile_data = profile_doc.to_dict()
        
        # Get email from profile or Firebase auth
        email = profile_data.get('email')
        if not email:
            # Try to get from Firebase Auth
            from firebase_admin import auth
            try:
                user = auth.get_user(uid)
                email = user.email or 'Not provided'
            except:
                email = 'Not provided'
        
        # Check if profile is complete (only name, college, course are required)
        required_fields = ['name', 'college', 'course']
        missing_fields = [field for field in required_fields if not profile_data.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Profile incomplete. Missing: {', '.join(missing_fields)}"
            )
        
        # Fetch skills
        skills_ref = user_ref.collection("skills")
        skills = [doc.to_dict() for doc in skills_ref.stream()]
        
        # Fetch completed projects
        projects_ref = user_ref.collection("projects").where("status", "==", "completed")
        projects = [doc.to_dict() for doc in projects_ref.stream()]
        
        # Prepare context for AI
        context = f"""
Generate a professional resume for the following candidate:

**Personal Information:**
- Name: {profile_data.get('name')}
- Email: {email}
- Phone: {profile_data.get('phone', 'Not provided')}
- Website: {profile_data.get('website', 'Not provided')}
- College: {profile_data.get('college')}
- Course/Major: {profile_data.get('course')}

**Skills:**
{chr(10).join([f"- {skill.get('name', 'Unknown')}: {skill.get('mastery', 0)}% mastery" for skill in skills]) if skills else "No skills recorded"}

**Completed Projects:**
{chr(10).join([f"- {proj.get('title', 'Untitled')}: {proj.get('description', 'No description')}" for proj in projects]) if projects else "No completed projects"}

**Side Hustle Interests:**
{', '.join(profile_data.get('side_hustle_interests', [])) if profile_data.get('side_hustle_interests') else 'Not specified'}

Please generate a professional resume with the following sections in JSON format:
1. summary: A compelling professional summary (2-3 sentences)
2. experience: Array of work/project experiences with title, description, and key achievements
3. skills: Categorized skills (technical, soft skills, tools)
4. projects: Detailed project descriptions with technologies used
5. education: Education details

Return ONLY valid JSON with this structure:
{{
  "summary": "string",
  "experience": [
    {{
      "title": "string",
      "organization": "string",
      "duration": "string",
      "description": "string",
      "achievements": ["string"]
    }}
  ],
  "skills": {{
    "technical": ["string"],
    "tools": ["string"],
    "soft": ["string"]
  }},
  "projects": [
    {{
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "highlights": ["string"]
    }}
  ],
  "education": [
    {{
      "degree": "string",
      "institution": "string",
      "duration": "string"
    }}
  ]
}}
"""
        
        # Generate resume using Gemini via langchain
        response = llm.invoke(context)
        
        # Parse the response
        resume_text = response.content.strip()
        
        # Remove markdown code blocks if present
        if resume_text.startswith("```json"):
            resume_text = resume_text[7:]
        if resume_text.startswith("```"):
            resume_text = resume_text[3:]
        if resume_text.endswith("```"):
            resume_text = resume_text[:-3]
        
        resume_data = json.loads(resume_text.strip())
        
        # Add personal info to resume data
        resume_data['personal_info'] = {
            'name': profile_data.get('name'),
            'email': email,
            'phone': profile_data.get('phone', ''),
            'website': profile_data.get('website', ''),
            'location': f"{profile_data.get('college', '')}"
        }
        
        # Store the generated resume
        resume_ref = user_ref.collection("resumes").document()
        resume_data['id'] = resume_ref.id
        resume_data['generated_at'] = datetime.now().isoformat()
        resume_ref.set(resume_data)
        
        return {
            "success": True,
            "resume": resume_data
        }
    
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {str(e)}")
        print(f"Response text: {resume_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        print(f"Resume Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@resume_router.get("/{uid}")
async def get_latest_resume(uid: str):
    """
    Get the most recently generated resume for a user
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        resumes_ref = user_ref.collection("resumes").order_by("generated_at", direction=firestore.Query.DESCENDING).limit(1)
        
        resumes = list(resumes_ref.stream())
        
        if not resumes:
            raise HTTPException(status_code=404, detail="No resume found. Please generate one first.")
        
        resume_data = resumes[0].to_dict()
        return {
            "success": True,
            "resume": resume_data
        }
    
    except Exception as e:
        print(f"Resume Fetch Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# projects.py
# ==========================================

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from utils.llm import llm as vision_llm_fallback  # kept as fallback
from langchain_google_genai import ChatGoogleGenerativeAI as _ChatGemini
import os as _os

# Gemini 2.5 Flash — used for project generation and vision grading
_gemini_flash = _ChatGemini(
    model="gemini-2.5-flash",
    google_api_key=_os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
)
vision_llm = _gemini_flash  # multimodal grading
llm = _gemini_flash          # project generation
from db.firebase import db
from datetime import datetime
import uuid
import base64
from langchain_core.messages import HumanMessage
from utils.timeline_logger import log_timeline_event

projects_router = APIRouter(prefix="/projects", tags=["projects"])

class Project(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    estimated_time: str
    skills: List[str]
    status: str = "assigned"  # assigned, in_progress, completed
    created_at: Optional[str] = None
    xp_reward: int = 100
    grade: Optional[int] = None
    feedback: Optional[str] = None

class GenerateProjectRequest(BaseModel):
    uid: str

class ProjectSubmission(BaseModel):
    uid: str
    project_id: str
    image: str # Base64 encoded image

class GradingResult(BaseModel):
    passed: bool
    grade: int
    feedback: str
    xp_awarded: int

async def generate_project_internal(uid: str, skill_name: str = None, difficulty_override: str = None) -> Project:
    """
    Internal helper to generate a project.
    Can be called by /generate endpoint or automatic triggers.
    """
    try:
        user_ref = db.collection("user_profiles").document(uid)
        
        # Determine context
        skill_context = ""
        if skill_name:
             skill_context = f"Focus primarily on {skill_name}. "
        
        # If no specific skill, look at roadmaps (fallback logic)
        if not skill_name:
            roadmaps_ref = user_ref.collection("roadmaps")
            roadmaps = [doc.to_dict() for doc in roadmaps_ref.stream()]
            if roadmaps:
                 # Simple selection for now
                 skill_context = f"Focus on {roadmaps[0].get('skill')}."
            else:
                 skill_context = "General coding project."

        difficulty = difficulty_override or "Beginner"

        structured_llm = llm.with_structured_output(Project)
        
        prompt = f"""Generate a practical side hustle project.
        Context: {skill_context}
        Difficulty: {difficulty}
        
        The project should:
        1. Be realistic and clearly defined.
        2. Have a clear visual component (UI/Output) that can be verified via screenshot.
        3. Be capable of being completed in 5-20 hours.
        
        Important: The 'description' must be detailed. It should strictly follow this format:
        "Build a [E-commerce Dashboard] that allows users to [manage inventory]. Key Features: 1. [Feature A] 2. [Feature B] 3. [Feature C]. Tech Stack Hint: [React, Tailwind, Charts]."
        
        Output must match Project schema.
        - id: generate a random string
        - status: "assigned"
        - xp_reward: {100 if difficulty == 'Beginner' else 300 if difficulty == 'Intermediate' else 500}
        """
        
        project_data = structured_llm.invoke(prompt)
        
        # Save to Firestore
        new_project = project_data.model_dump()
        new_project['id'] = str(uuid.uuid4())
        new_project['created_at'] = datetime.now().isoformat()
        new_project['in_portfolio'] = False
        
        user_ref.collection("projects").document(new_project['id']).set(new_project)
        
        # Log to Timeline
        await log_timeline_event(
            uid=uid,
            type="project",
            title="New Project Assigned",
            description=f"Generated: {new_project['title']}",
            icon="Rocket",
            details=[f"Difficulty: {difficulty}", f"XP Reward: {new_project['xp_reward']}"],
            mode="side-hustle"
        )
        
        return new_project

    except Exception as e:
        print(f"Internal generation error: {e}")
        raise e

@projects_router.post("/generate")
async def generate_projects(request: GenerateProjectRequest):
    """
    Manual trigger (keeping for fallback/testing).
    """
    try:
        project = await generate_project_internal(request.uid)
        return {"status": "success", "project": project}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@projects_router.post("/submit")
async def submit_project(submission: ProjectSubmission):
    """
    Grade a project submission using Vision AI.
    """
    try:
        # 1. Fetch project details
        project_ref = db.collection("user_profiles").document(submission.uid).collection("projects").document(submission.project_id)
        doc = project_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Project not found")
            
        project_data = doc.to_dict()
        
        # 2. Prepare Vision prompt
        # We need to strip the header if present (e.g. "data:image/jpeg;base64,")
        image_data = submission.image
        if "," in image_data:
            image_data = image_data.split(",")[1]
            
        message = HumanMessage(
            content=[
                {
                    "type": "text", 
                    "text": f"""You are a strict code project grader. 
                    Project Title: {project_data.get('title')}
                    Description: {project_data.get('description')}
                    
                    Grade this submission based on the screenshot provided.
                    1. Does it look like the requested project?
                    2. Is the UI substantial/complete?
                    
                    Return a JSON object ONLY with the following structure:
                    {{
                        "passed": boolean, (true if it looks correct and substantial)
                        "grade": int, (0-100)
                        "feedback": "string (constructive feedback, max 2 sentences)"
                    }}
                    """
                },
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{image_data}"
                }
            ]
        )
        
        # 3. Call Vision LLM
        # Note: We need a structured output, but for Vision input with LangChain, 
        # mixing structured output + image_url can sometimes be tricky depending on the wrapper.
        # We'll try direct invocation processing the json string if needed, or strict prompt.
        
        # Using the json_mode or structured output if supported for multimodal
        # For simplicity/safety, we'll try a standard invoke and parse.
        response = vision_llm.invoke([message])
        content = response.content.replace('```json', '').replace('```', '').strip()
        
        import json
        result = json.loads(content)
        
        # 4. Handle Result
        if result.get('passed'):
            project_ref.update({
                "status": "completed",
                "in_portfolio": True,
                "completed_at": datetime.now().isoformat(),
                "grade": result.get('grade'),
                "feedback": result.get('feedback')
            })
            
            # Log activity
            try:
                db.collection("user_profiles").document(submission.uid).collection("activity_alerts").add({
                    "message": f"Completed project: {project_data.get('title')}",
                    "type": "success",
                    "created_at": datetime.now().isoformat()
                })

                # Log Practice Session (Update Weekly Stats)
                est_time_str = project_data.get('estimated_time', '0')
                import re
                numbers = [int(n) for n in re.findall(r'\d+', str(est_time_str))]
                hours = 0
                if numbers:
                    # If range "5-10 hours", take average. If "8 hours", take 8.
                    hours = sum(numbers) / len(numbers)
                
                if hours > 0:
                    db.collection("user_profiles").document(submission.uid).collection("practice_sessions").add({
                        "date": datetime.now(),
                        "duration": int(hours * 60), # Convert to minutes
                        "type": "project",
                        "description": f"Completed Project: {project_data.get('title')}"
                    })

            except Exception as e:
                print(f"Failed to log project activity/stats: {e}")

            # Log to Timeline
            await log_timeline_event(
                uid=submission.uid,
                type="project",
                title="Project Completed",
                description=f"Submitted: {project_data.get('title')}",
                icon="Check",
                details=[f"Grade: {result.get('grade')}/100", f"XP Earned: {project_data.get('xp_reward', 100)}"],
                mode="side-hustle"
            )

            return {
                "passed": True,
                "grade": result.get('grade'),
                "feedback": result.get('feedback'),
                "xp_awarded": project_data.get('xp_reward', 100)
            }
        else:
            return {
                "passed": False,
                "grade": result.get('grade'),
                "feedback": result.get('feedback'),
                "xp_awarded": 0
            }

    except Exception as e:
        print(f"Grading error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# roadmap.py
# ==========================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI as _RoadmapGemini
import os as _ros

# Gemini 2.5 Flash — roadmap generation
llm = _RoadmapGemini(
    model="gemini-2.5-flash",
    google_api_key=_ros.getenv("GOOGLE_API_KEY"),
    temperature=0.6,
)
from db.firebase import db
from datetime import datetime


roadmap_router = APIRouter(prefix="/roadmap", tags=["roadmap"])

class RoadmapItem(BaseModel):
    id: str
    title: str
    description: str
    estimated_time: str
    resources: List[str] = []
    completed: bool = False

class RoadmapPhase(BaseModel):
    id: str
    title: str
    items: List[RoadmapItem]

class RoadmapResponse(BaseModel):
    skill: str
    phases: List[RoadmapPhase]
    last_updated: Optional[str] = None

class GenerateRoadmapRequest(BaseModel):
    uid: str
    skill: str
    current_level: str = "Beginner" 

class UpdateProgressRequest(BaseModel):
    uid: str
    skill: str
    phase_id: str
    item_id: str
    item_id: str
    completed: bool

class ToggleResponse(BaseModel):
    status: str
    completed: bool
    project_unlocked: bool = False
    new_project: Optional[dict] = None

@roadmap_router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(request: GenerateRoadmapRequest):
    try:
        # Check if exists in DB
        doc_ref = db.collection("user_profiles").document(request.uid).collection("roadmaps").document(request.skill.lower())
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()

        # Generate with LLM
        structured_llm = llm.with_structured_output(RoadmapResponse)
        
        prompt = f"""Create a detailed, step-by-step learning roadmap for "{request.skill}" for a {request.current_level} level learner.
        Break it down into 3-4 distinct phases (e.g., Fundamentals, Core Concepts, Advanced Topics, Projects).
        
        For each phase, provide 3-5 specific topics (RoadmapItems).
        Each Item must have:
        - id: unique string (e.g., "phase1-item1")
        - title: concise topic name
        - description: short explanation of what to learn
        - estimated_time: e.g. "2 hrs"
        - resources: list of 1-2 search terms for finding tutorials (e.g. "React hooks tutorial")
        
        Ensure the output matches the RoadmapResponse schema exactly.
        """
        
        # Invoke LLM
        result = structured_llm.invoke(prompt)
        
        # Prepare data for Firebase
        data = result.model_dump()
        data['skill'] = request.skill # Ensure skill name is correct
        data['last_updated'] = datetime.now().isoformat()
        
        # Ensure completed is False by default
        for phase in data['phases']:
            for item in phase['items']:
                item['completed'] = False
                
        # Save to Firebase
        doc_ref.set(data)

        # Log to timeline
        try:
            await log_timeline_event(
                uid=request.uid,
                type="roadmap",
                title="Roadmap Generated",
                description=f"Created learning roadmap for {request.skill}",
                icon="Map",
                details=[
                    f"Skill: {request.skill}",
                    f"Level: {request.current_level}",
                    f"Phases: {len(data.get('phases', []))}"
                ],
                mode="side-hustle"
            )
        except Exception as e:
            print(f"Timeline log failed (roadmap generate): {e}")

        return data

    except Exception as e:
        print(f"Roadmap generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

        raise HTTPException(status_code=500, detail=str(e))
 
@roadmap_router.post("/toggle", response_model=ToggleResponse)
async def toggle_progress(request: UpdateProgressRequest):
    try:
        doc_ref = db.collection("user_profiles").document(request.uid).collection("roadmaps").document(request.skill.lower())
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Roadmap not found")
            
        data = doc.to_dict()
        
        # Find and toggle
        found = False
        for phase in data['phases']:
            if phase['id'] == request.phase_id:
                for item in phase['items']:
                    if item['id'] == request.item_id:
                        item['completed'] = request.completed
                        found = True
                        break
            if found: break
        
        if found:
            doc_ref.update(data)
            
            # Log activity if completed
            if request.completed:
                try:
                    # Find item title
                    item_title = "Topic"
                    for phase in data['phases']:
                        for item in phase['items']:
                            if item['id'] == request.item_id:
                                item_title = item['title']
                                break
                    
                    db.collection("user_profiles").document(request.uid).collection("activity_alerts").add({
                        "message": f"Completed topic: {item_title} in {request.skill}",
                        "type": "success",
                        "created_at": datetime.now().isoformat()
                    })

                    # Log to timeline
                    await log_timeline_event(
                        uid=request.uid,
                        type="insight",
                        title="Module Completed",
                        description=f"Finished: {item_title} in {request.skill}",
                        icon="CheckCircle",
                        details=[
                            f"Topic: {item_title}",
                            f"Skill: {request.skill}"
                        ],
                        mode="side-hustle"
                    )
                except Exception as e:
                    print(f"Failed to log activity: {e}")

            # Update Skill Mastery
            try:
                total_items = 0
                completed_items = 0
                for phase in data.get('phases', []):
                    items = phase.get('items', [])
                    total_items += len(items)
                    completed_items += sum(1 for i in items if i.get('completed'))
                
                if total_items > 0:
                    mastery = int((completed_items / total_items) * 100)
                    
                    # Update or Create Skill in 'skills' collection
                    skills_ref = db.collection("user_profiles").document(request.uid).collection("skills")
                    
                    # Try to find existing skill
                    # We'll use a query since ID might differ from name
                    query = skills_ref.where("name", "==", request.skill).limit(1)
                    results = list(query.stream())
                    
                    if results:
                        # Update existing
                        results[0].reference.update({"mastery": mastery})
                    else:
                        # Create new
                        skills_ref.add({
                            "name": request.skill,
                            "mastery": mastery,
                            "status": "in_progress",
                            "icon": "Code" 
                        })
            except Exception as e:
                print(f"Failed to update skill mastery: {e}")
            
            # Check if this completion finished a phase
            project_unlocked = False
            new_project = None
            
            if request.completed:
                # Find the phase we just updated
                target_phase = None
                for phase in data['phases']:
                    if phase['id'] == request.phase_id:
                        target_phase = phase
                        break
                
                if target_phase:
                    # Check if all items in this phase are now completed
                    all_completed = all(item['completed'] for item in target_phase['items'])
                    
                    if all_completed:
                        # Determine difficulty based on phase index
                        phase_index = next((i for i, p in enumerate(data['phases']) if p['id'] == request.phase_id), 0)
                        
                        difficulty = "Beginner"
                        if phase_index == 1: difficulty = "Intermediate"
                        elif phase_index >= 2: difficulty = "Advanced"
                        
                        # Generate Project
                        try:
                            new_project = await generate_project_internal(
                                uid=request.uid, 
                                skill_name=request.skill,
                                difficulty_override=difficulty
                            )
                            project_unlocked = True
                        except Exception as e:
                            print(f"Auto-generate project failed: {e}")

            return {
                "status": "success", 
                "completed": request.completed,
                "project_unlocked": project_unlocked,
                "new_project": new_project
            }
        
        raise HTTPException(status_code=404, detail="Item not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
