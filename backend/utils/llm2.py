from langchain_ollama import ChatOllama

# Secondary LLM — also local Ollama, no quota issues
llm = ChatOllama(
    model="qwen2.5:3b",
    base_url="http://localhost:11434",
    temperature=0.7,
)
