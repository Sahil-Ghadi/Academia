from agents.state import CollegeAgentState

def strategy_agent(state: CollegeAgentState) -> CollegeAgentState:
    if state["urgency"] == "critical":
        strategy = "cram_mode"
    elif state["behind"]:
        strategy = "intensify"
    else:
        strategy = "normal"

    return { **state, "strategy": strategy }
