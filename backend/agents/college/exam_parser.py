from agents.state import CollegeAgentState
from agents.schemas import ExamInfo
from utils.llm import llm


def exam_parser_agent(state: CollegeAgentState) -> CollegeAgentState:
    """Parse exam information from user input using structured output"""
    raw = state.get("input", "")
    
    # Create structured output LLM
    structured_llm = llm.with_structured_output(ExamInfo)
    
    prompt = f"""
    Extract exam information from the following text.
    
    Identify:
    - The subject name
    - The exam date (format as YYYY-MM-DD)
    - The topics to be covered (as a list)
    
    Text: {raw}
    """
    
    try:
        # Get structured output directly as ExamInfo object
        exam_info: ExamInfo = structured_llm.invoke(prompt)
        
        # Convert Pydantic model to dict for state
        parsed = exam_info.model_dump()
        
    except Exception as e:
        print(f"Error parsing exam: {e}")
        # Fallback with default values
        parsed = {
            "subject": "Unknown",
            "exam_date": "2024-12-31",
            "topics": []
        }
    
    return {**state, "exam": parsed}


def parse_exam_info(input_text: str) -> ExamInfo:
    """
    Standalone function to parse exam info from text.
    Used by routes that need direct access without agent state.
    """
    structured_llm = llm.with_structured_output(ExamInfo)
    
    prompt = f"""
    Extract exam information from the following text.
    
    Identify:
    - The subject name
    - The exam date (format as YYYY-MM-DD)
    - The topics to be covered (as a list)
    
    Text: {input_text}
    """
    
    try:
        exam_info: ExamInfo = structured_llm.invoke(prompt)
        return exam_info
    except Exception as e:
        print(f"Error parsing exam: {e}")
        # Return default ExamInfo
        from datetime import datetime, timedelta
        return ExamInfo(
            subject="Unknown",
            exam_date=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            topics=["General Topics"],
            days_until_exam=7,
            urgency="medium"
        )
