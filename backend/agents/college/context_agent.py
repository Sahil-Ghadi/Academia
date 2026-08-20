from agents.state import CollegeAgentState
from agents.tools.firestore_tool import get_user_profile

def academic_context_agent(state: CollegeAgentState) -> CollegeAgentState:
    profile = get_user_profile(state["userId"])

    return {
        **state,
        "degree": profile.get("degree"),
        "branch": profile.get("branch"),
        "semester": profile.get("semester"),
        "subjects": profile.get("subjects", [])
    }
