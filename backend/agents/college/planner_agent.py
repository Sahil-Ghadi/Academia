from agents.state import CollegeAgentState
from agents.schemas import StudyPlan
from utils.llm import llm


def planner_agent(state: CollegeAgentState) -> CollegeAgentState:
    """Create a study plan based on exam details and urgency using structured output"""
    
    urgency = state.get("urgency", "medium")
    topics = state.get("exam", {}).get("topics", [])
    days_left = state.get("days_left", 7)
    
    # Create structured output LLM
    structured_llm = llm.with_structured_output(StudyPlan)
    
    prompt = f"""
    Create a structured study plan for the following context:
    
    - Urgency level: {urgency}
    - Topics to cover: {', '.join(topics) if topics else 'General review'}
    - Days remaining: {days_left}
    
    Requirements:
    - Create a day-by-day plan with specific tasks for each day
    - Estimate the total hours needed
    - Identify priority topics that need the most focus
    - Make the plan realistic and achievable based on the urgency level
    
    For {urgency} urgency:
    - critical: Intensive study sessions, focus on key concepts
    - high: Structured daily sessions with clear goals
    - medium: Balanced approach with regular review
    - low: Comprehensive coverage with practice time
    """
    
    try:
        # Get structured output directly as StudyPlan object
        study_plan: StudyPlan = structured_llm.invoke(prompt)
        
        # Convert Pydantic model to dict for state
        plan = study_plan.model_dump()
        
    except Exception as e:
        print(f"Error creating plan: {e}")
        # Fallback plan
        plan = {
            "daily_plan": [
                {"day": i+1, "tasks": [f"Study session {i+1}"]}
                for i in range(min(days_left, 7))
            ],
            "total_hours": days_left * 3,
            "priority_topics": topics[:3] if topics else []
        }
    
    return {**state, "plan": plan}


def create_study_plan(exam_info) -> StudyPlan:
    """
    Standalone function to create a study plan from exam info.
    Used by routes that need direct access without agent state.
    """
    structured_llm = llm.with_structured_output(StudyPlan)
    
    # Extract info from ExamInfo object
    if hasattr(exam_info, 'topics'):
        topics = exam_info.topics
        days_left = exam_info.days_until_exam
        urgency = exam_info.urgency
    else:
        # Handle dict format
        topics = exam_info.get('topics', [])
        days_left = exam_info.get('days_until_exam', 7)
        urgency = exam_info.get('urgency', 'medium')
    
    prompt = f"""
    Create a structured study plan for the following context:
    
    - Urgency level: {urgency}
    - Topics to cover: {', '.join(topics) if topics else 'General review'}
    - Days remaining: {days_left}
    
    Requirements:
    - Create a day-by-day plan with specific tasks for each day
    - Estimate the total hours needed
    - Identify priority topics that need the most focus
    - Make the plan realistic and achievable based on the urgency level
    
    For {urgency} urgency:
    - critical: Intensive study sessions, focus on key concepts
    - high: Structured daily sessions with clear goals
    - medium: Balanced approach with regular review
    - low: Comprehensive coverage with practice time
    """
    
    try:
        study_plan: StudyPlan = structured_llm.invoke(prompt)
        return study_plan
    except Exception as e:
        print(f"Error creating plan: {e}")
        # Return fallback plan
        from agents.schemas import DailyPlan
        return StudyPlan(
            daily_breakdown=[
                DailyPlan(day_number=i+1, tasks=[f"Study session {i+1}", "Practice problems", "Review notes"])
                for i in range(min(days_left, 7))
            ],
            total_study_hours=days_left * 3,
            priority_topics=topics[:3] if topics else ["General Topics"],
            strategy="normal"
        )
