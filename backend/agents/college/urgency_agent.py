from agents.state import CollegeAgentState
from agents.tools.date_tool import calculate_days_left

def urgency_agent(state: CollegeAgentState) -> CollegeAgentState:
    days = calculate_days_left(state["exam"]["exam_date"])

    urgency = (
        "critical" if days <= 3 else
        "high" if days <= 10 else
        "medium" if days <= 20 else
        "low"
    )

    return { **state, "days_left": days, "urgency": urgency }
