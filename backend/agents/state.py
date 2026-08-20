from typing import TypedDict, List, Optional

class CollegeAgentState(TypedDict, total=False):
    """State for college learning assistant"""
    user_id: str
    input: str
    exam: Optional[dict]
    days_left: Optional[int]
    urgency: Optional[str]
    degree: Optional[str]
    branch: Optional[str]
    semester: Optional[str]
    subjects: List[str]
    plan: Optional[dict]
    progress_history: List[dict]
    behind: bool
    strategy: Optional[str]
