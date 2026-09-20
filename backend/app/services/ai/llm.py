"""Optional AI provider (Google Gemini).

The assistant works without it: intents.py understands the question and answers.py writes
the answer. When AI_API_KEY is set in backend/.env, the provider is used for two things only:

1. picking the intent when the word matching found nothing
2. rewriting the finished answer in friendlier language

**The provider never touches the database.** It only ever sees the question, the list of
approved function names, and the numbers a report function already returned - so PRD 5.22
holds either way: no raw SQL, no writes, and every answer stays traceable to one function.

Turning it on:
  1. get a key from Google AI Studio (https://aistudio.google.com/apikey)
  2. put AI_API_KEY=... in backend/.env
  3. pip install -r requirements.txt   (installs google-genai)
  4. restart the backend
"""
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_INTENT_PROMPT = """You route questions for a shop's reporting assistant.
Choose the ONE function that answers the question, from this list:
{functions}

Answer with JSON only: {{"function": "<name>", "arguments": {{...}}}}
Allowed arguments: period (today, yesterday, week, month, all), days (number),
limit (number), name (product name text). Use {{}} when none are needed.
If no function fits, answer {{"function": null, "arguments": {{}}}}.

Question: {question}"""

_ANSWER_PROMPT = """You are the assistant of a small shop's POS system.
Rewrite the draft answer below so it reads naturally for a shop manager.

Rules:
- Use ONLY the numbers in the draft. Never add, guess or round differently.
- Keep every figure, name and currency symbol exactly as written.
- 1-3 short sentences, or keep the list if the draft has one. Plain language.
- No greetings, no questions back, no advice that isn't in the numbers.

Question: {question}
Draft answer: {draft}"""


def is_enabled() -> bool:
    return bool(settings.ai_api_key)


def _generate(prompt: str) -> str | None:
    """Sends one prompt to the provider. Returns None if it is off or anything goes wrong."""
    if not is_enabled():
        return None
    try:
        from google import genai  # imported here so the app runs without the package
    except ImportError:
        logger.warning("AI_API_KEY is set but google-genai isn't installed. Run: pip install -r requirements.txt")
        return None

    try:
        client = genai.Client(api_key=settings.ai_api_key)
        response = client.models.generate_content(model=settings.ai_model, contents=prompt)
        return (response.text or "").strip() or None
    except Exception as error:  # a provider problem must never break the answer
        logger.warning("AI provider call failed (%s). Falling back to the built-in answer.", error)
        return None


def choose_function(question: str, functions: dict[str, str]) -> tuple[str, dict] | None:
    """Asks the provider which approved function fits. The caller checks the name is allowed."""
    listed = "\n".join(f"- {name}: {description}" for name, description in functions.items())
    raw = _generate(_INTENT_PROMPT.format(functions=listed, question=question))
    if not raw:
        return None

    text = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
        name = parsed.get("function")
        arguments = parsed.get("arguments") or {}
    except (json.JSONDecodeError, AttributeError):
        logger.warning("AI provider returned something that isn't JSON: %r", raw[:200])
        return None

    if not isinstance(name, str) or name not in functions or not isinstance(arguments, dict):
        return None
    return name, arguments


def polish_answer(question: str, draft: str) -> str | None:
    """Rewrites a finished answer. Returns None to keep the draft."""
    return _generate(_ANSWER_PROMPT.format(question=question, draft=draft))
