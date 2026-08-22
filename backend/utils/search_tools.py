from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.tools import tool

def get_wikipedia_tool() -> WikipediaQueryRun:
    """Returns a Wikipedia search tool."""
    api_wrapper = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=1500)
    return WikipediaQueryRun(api_wrapper=api_wrapper)

@tool
def search_textbook_concept(query: str, textbook_name: str) -> str:
    """
    Search Wikipedia for the concept in the context of the textbook name or subject.
    Provides textbook-like context for doubt solving.
    """
    wiki = get_wikipedia_tool()
    
    # Try searching for the specific textbook and concept
    search_query = f"{query} {textbook_name}"
    
    try:
        results = wiki.run(search_query)
        if not results or "No good Wikipedia Search Result" in results:
            # Fallback to general concept search
            results = wiki.run(query)
        return results
    except Exception as e:
        return f"Could not find information: {str(e)}"
