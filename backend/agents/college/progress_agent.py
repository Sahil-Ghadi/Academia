from agents.state import CollegeAgentState
from agents.tools.firestore_tool import get_user_progress

def progress_agent(state: CollegeAgentState) -> CollegeAgentState:
    history = get_user_progress(state["userId"])

    completion_rate = len(history) / max(state["days_left"], 1)
    behind = completion_rate < 0.6

    return { **state, "progress_history": history, "behind": behind }
