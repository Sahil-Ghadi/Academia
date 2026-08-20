"""
LLM utilities with retry logic and error handling for structured output
"""
from typing import TypeVar, Type, Optional, Callable
from pydantic import BaseModel
from utils.llm import llm

T = TypeVar('T', bound=BaseModel)


def invoke_with_retry(
    schema: Type[T],
    prompt: str,
    max_retries: int = 3,
    validation_func: Optional[Callable[[T], bool]] = None
) -> T:
    """
    Invoke LLM with structured output and automatic retry on failure.
    
    Args:
        schema: Pydantic model class for structured output
        prompt: The prompt to send to the LLM
        max_retries: Maximum number of retry attempts
        validation_func: Optional function to validate the output (returns True if valid)
    
    Returns:
        Validated structured output
        
    Raises:
        Exception: If all retries fail
    """
    for attempt in range(max_retries):
        try:
            # Create structured LLM with include_raw for better error handling
            structured_llm = llm.with_structured_output(schema, include_raw=True)
            
            # Get output
            result = structured_llm.invoke(prompt)
            
            # Extract parsed object
            if isinstance(result, dict) and 'parsed' in result:
                output = result['parsed']
            else:
                output = result
            
            # Validate if validation function provided
            if validation_func and not validation_func(output):
                print(f"Attempt {attempt + 1}: Validation failed, retrying...")
                continue
            
            print(f"Successfully generated output on attempt {attempt + 1}")
            return output
        
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:
                raise Exception(f"All {max_retries} attempts failed. Last error: {str(e)}")
            continue
    
    raise Exception(f"Failed after {max_retries} attempts")


def create_explicit_prompt(base_prompt: str, schema_name: str, requirements: list) -> str:
    """
    Create an explicit prompt that emphasizes completion and structure.
    
    Args:
        base_prompt: The base prompt text
        schema_name: Name of the schema being generated
        requirements: List of specific requirements
    
    Returns:
        Enhanced prompt with explicit instructions
    """
    requirements_text = "\n".join([f"{i+1}. {req}" for i, req in enumerate(requirements)])
    
    return f"""{base_prompt}

CRITICAL REQUIREMENTS for {schema_name}:
{requirements_text}

IMPORTANT: 
- Complete ALL fields for EVERY item
- DO NOT truncate or leave anything incomplete
- Ensure all data is valid and properly formatted
- Double-check before finishing!"""
