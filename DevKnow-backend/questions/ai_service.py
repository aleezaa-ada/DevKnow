import logging
import os

from openai import OpenAI

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Raised when AI generation cannot produce a usable response."""


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise AIServiceError(f'Missing required environment variable: {name}')
    return value
 
 
def generate_ai_response(question_title: str, question_description: str) -> str:
    """
    Sends a question to the Deloitte AI gateway and returns the answer.
    Uses the OpenAI SDK format with a custom base_url.
    Raises an exception if the API call fails — caller must handle this.
    """
    client = OpenAI(
        api_key=_required_env('DELOITTE_API_KEY'),
        base_url=_required_env('DELOITTE_BASE_URL'),
    )
 
    system_prompt = (
        'You are a senior software engineer at Deloitte answering an internal '
        'technical question. Your answer will be reviewed by a senior developer '
        'before it is published. Be clear, accurate and practical. '
        'Use markdown code blocks for code examples. Note that specific '
        'configurations may need verifying against Deloitte internal standards.'
    )
 
    user_prompt = (
        f'Question title: {question_title}\n\n'
        f'Question details: {question_description}'
    )
 
    try:
        response = client.chat.completions.create(
            model=os.getenv('DELOITTE_MODEL', 'gpt-4o'),
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            max_tokens=1500,
        )
    except Exception as exc:
        logger.exception('AI API call failed')
        raise AIServiceError('AI provider call failed') from exc

    content = None
    try:
        content = response.choices[0].message.content
    except Exception as exc:
        logger.exception('AI API returned unexpected response format')
        raise AIServiceError('AI provider returned malformed response') from exc

    if not isinstance(content, str) or not content.strip():
        raise AIServiceError('AI provider returned empty response')

    return content.strip()
