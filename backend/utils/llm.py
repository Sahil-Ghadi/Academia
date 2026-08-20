from langchain_ollama import ChatOllama

# All AI powered by local Ollama — no API keys, no quotas
llm = ChatOllama(
    model="qwen2.5:3b",
    base_url="http://localhost:11434",
    temperature=0.7,
)

# Alias for assessment — same model
assessment_llm = llm