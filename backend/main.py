from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import os

load_dotenv()

from routes.users import auth_router, profile_router
from routes.academic import learning_router, assessment_router, exams_router, assignments_router, college_router
from routes.career import jobs_router, resume_router, projects_router, roadmap_router
from routes.ai_features import chat_router, suggestions_router, planner_router
from routes.analytics import dashboard_router, stats_router, timeline_router
from routes.resources import documents_router
from routes.teacher import teacher_router
from routes.tutor import tutor_router
from routes.gamification import gamification_router


app = FastAPI(
    title="AdaptIQ Backend",
    description="Backend API for AdaptIQ - College Learning Assistant",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(college_router)
app.include_router(suggestions_router)
app.include_router(planner_router)
app.include_router(exams_router)
app.include_router(learning_router)
app.include_router(assessment_router)
app.include_router(stats_router)
app.include_router(timeline_router)
app.include_router(teacher_router)

app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(tutor_router)
app.include_router(roadmap_router)
app.include_router(projects_router)
app.include_router(resume_router)
app.include_router(assignments_router)
app.include_router(jobs_router)
app.include_router(documents_router)
app.include_router(gamification_router)

@app.get("/")
def read_root():
    return {
        "message": "AdaptIQ Backend API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth",
            "profile": "/profile",
            "study": "/study",
            "suggestions": "/suggestions",
            "docs": "/docs"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "AdaptIQ Backend"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
