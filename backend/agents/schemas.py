"""
Pydantic schemas for structured LLM outputs across all agents.
All agent output schemas are defined here for centralized management.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


# ============================================================================
# Exam Parser Agent Schemas
# ============================================================================

class ExamInfo(BaseModel):
    """Structured output for exam information extraction"""
    subject: str = Field(description="The name of the subject for the exam")
    exam_date: str = Field(description="Exam date in YYYY-MM-DD format")
    topics: List[str] = Field(
        default_factory=list,
        description="List of topics to be covered in the exam"
    )


# ============================================================================
# Planner Agent Schemas
# ============================================================================

class DailyTask(BaseModel):
    """A single day's tasks in the study plan"""
    day: int = Field(description="Day number in the study plan")
    tasks: List[str] = Field(description="List of tasks for this day")


class StudyPlan(BaseModel):
    """Structured output for study plan generation"""
    daily_plan: List[DailyTask] = Field(
        description="Day-by-day breakdown of study tasks"
    )
    total_hours: int = Field(
        description="Total estimated hours needed for the plan"
    )
    priority_topics: List[str] = Field(
        description="Topics that should be prioritized"
    )


# ============================================================================
# Strategy Agent Schemas (if needed for future LLM-based strategies)
# ============================================================================

class StudyStrategy(BaseModel):
    """Structured output for study strategy recommendations"""
    strategy_type: str = Field(
        description="Type of strategy: 'cram_mode', 'intensify', or 'normal'"
    )
    recommendations: List[str] = Field(
        default_factory=list,
        description="Specific recommendations for the student"
    )
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Areas that need special focus"
    )


# ============================================================================
# Future Agent Schemas (Add as needed)
# ============================================================================

class ProgressAnalysis(BaseModel):
    """Structured output for progress analysis"""
    completion_rate: float = Field(
        description="Percentage of plan completed (0.0 to 1.0)"
    )
    behind_schedule: bool = Field(
        description="Whether the student is behind schedule"
    )
    insights: List[str] = Field(
        default_factory=list,
        description="Insights about the student's progress"
    )


# ============================================================================
# Planner Route Schemas (Detailed Schedule)
# ============================================================================

class Task(BaseModel):
    """Individual task in a schedule"""
    time: str = Field(description="Time slot in HH:MM-HH:MM format, e.g., '09:00-10:00'")
    task: str = Field(description="Description of the task")
    type: str = Field(description="Type of task: 'study', 'break', or 'other'")
    subject: Optional[str] = Field(default=None, description="Subject name if type is 'study'")
    duration: int = Field(description="Duration in minutes")


class DaySchedule(BaseModel):
    """Schedule for a single day"""
    day: str = Field(description="Day of the week, e.g., 'Monday'")
    date: str = Field(description="Date in YYYY-MM-DD format")
    slots: List[Task] = Field(description="List of tasks/slots for this day")


class ScheduleResponse(BaseModel):
    """Complete schedule response"""
    schedule: List[DaySchedule] = Field(description="List of daily schedules")
