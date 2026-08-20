from langgraph.graph import StateGraph
from agents.state import CollegeAgentState

from agents.college.exam_parser import exam_parser_agent
from agents.college.urgency_agent import urgency_agent
from agents.college.context_agent import academic_context_agent
from agents.college.planner_agent import planner_agent
from agents.college.progress_agent import progress_agent
from agents.college.stratergy_agent import strategy_agent  # Note: filename has typo 'stratergy'

builder = StateGraph(CollegeAgentState)

builder.add_node("parse_exam", exam_parser_agent)
builder.add_node("urgency", urgency_agent)
builder.add_node("context", academic_context_agent)
builder.add_node("planner", planner_agent)
builder.add_node("progress", progress_agent)
builder.add_node("strategy", strategy_agent)

builder.set_entry_point("parse_exam")

builder.add_edge("parse_exam", "urgency")
builder.add_edge("urgency", "context")
builder.add_edge("context", "planner")
builder.add_edge("planner", "progress")
builder.add_edge("progress", "strategy")

college_graph = builder.compile()
