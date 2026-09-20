"""AI Assistant (PRD 5.22): question -> intent -> approved report function -> answer.

The flow, and why it is safe:

    question ─▶ intent detection (words, or the AI provider if one is switched on)
             ─▶ ONE approved function from report_functions.REPORT_FUNCTIONS
             ─▶ fixed, parameterised query over the real tables
             ─▶ answer written from those numbers, saved with the function's name

The assistant never writes SQL, never changes a record, and every answer it saves records
which function produced it.
"""
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import AIConversation, AIMessage, User
from app.schemas.store_setting import CURRENCY_SYMBOLS
from app.services.ai import answers, intents, llm
from app.services.ai.report_functions import REPORT_FUNCTIONS, run_report_function
from app.services.store_setting_service import get_store_settings

logger = logging.getLogger(__name__)

MAX_QUESTION_LENGTH = 500


def ask(db: Session, current_user: User, question: str, conversation_id: int | None = None) -> dict:
    """Answers one question and saves it to the user's chat. Does not commit - the router does."""
    question = (question or "").strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please type a question.")
    if len(question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please keep the question under {MAX_QUESTION_LENGTH} characters.",
        )

    intent_name, function_name, arguments = _choose_function(question)
    answer, data = _run_and_describe(db, function_name, arguments, question)

    conversation = _conversation_for(db, current_user, conversation_id, question)
    conversation.messages.append(AIMessage(role="user", content=question))
    conversation.messages.append(
        AIMessage(role="assistant", content=answer[:4000], intent=intent_name, report_function=function_name)
    )
    db.flush()

    return {
        "conversation_id": conversation.ai_conversation_id,
        "answer": answer,
        "intent": intent_name,
        "report_function": function_name,
        "data": data,
    }


def list_conversations(db: Session, current_user: User, limit: int = 30) -> list[AIConversation]:
    """The user's own chats, newest first. Nobody sees anyone else's."""
    return list(
        db.scalars(
            select(AIConversation)
            .where(AIConversation.user_id == current_user.user_id)
            .order_by(AIConversation.ai_conversation_id.desc())
            .limit(limit)
        )
    )


def get_conversation(db: Session, current_user: User, conversation_id: int) -> AIConversation:
    conversation = db.get(AIConversation, conversation_id)
    if conversation is None or conversation.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return conversation


def delete_conversation(db: Session, current_user: User, conversation_id: int) -> None:
    db.delete(get_conversation(db, current_user, conversation_id))


def assistant_info() -> dict:
    """What the page shows before the first question."""
    return {
        "ai_provider_enabled": llm.is_enabled(),
        "examples": intents.EXAMPLE_QUESTIONS,
        "report_functions": [{"name": name, "answers": description} for name, (_, description) in REPORT_FUNCTIONS.items()],
    }


# ---------- internals ----------
def _choose_function(question: str) -> tuple[str | None, str | None, dict]:
    """Words first; the AI provider (if switched on) only gets a say when they find nothing."""
    match = intents.detect_intent(question)
    if match:
        return match

    if llm.is_enabled():
        descriptions = {name: description for name, (_, description) in REPORT_FUNCTIONS.items()}
        chosen = llm.choose_function(question, descriptions)
        if chosen:
            name, arguments = chosen
            return name, name, _clean_arguments(arguments)

    return None, None, {}


def _clean_arguments(arguments: dict) -> dict:
    """Keeps only arguments the report functions accept, with sane values."""
    allowed = {}
    period = arguments.get("period")
    if isinstance(period, str) and period in ("today", "yesterday", "week", "month", "all"):
        allowed["period"] = period
    for name in ("days", "limit"):
        value = arguments.get(name)
        if isinstance(value, int) and 0 < value <= 365:
            allowed[name] = value
    name = arguments.get("name")
    if isinstance(name, str) and name.strip():
        allowed["name"] = name.strip()[:100]
    return allowed


def _run_and_describe(db: Session, function_name: str | None, arguments: dict, question: str) -> tuple[str, dict | None]:
    if function_name is None:
        return answers.write_not_understood(), None

    try:
        data = run_report_function(db, function_name, arguments)
    except ValueError:  # a name that isn't approved - the safety gate
        logger.warning("Refused a report function that isn't approved: %r", function_name)
        return answers.write_not_understood(), None
    except TypeError:  # arguments that don't fit the function
        data = run_report_function(db, function_name, {})
    except SQLAlchemyError as error:
        logger.error("Report function %s failed: %s", function_name, error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="I couldn't read the data just now. Please try again.",
        ) from error

    draft = answers.write_answer(function_name, data, _currency_symbol(db))
    return (llm.polish_answer(question, draft) or draft), data


def _currency_symbol(db: Session) -> str:
    try:
        store = get_store_settings(db)
        return CURRENCY_SYMBOLS.get(store.currency_code, store.currency_code)
    except HTTPException:  # settings row missing - the answer still works
        return "৳"


def _conversation_for(db: Session, current_user: User, conversation_id: int | None, question: str) -> AIConversation:
    if conversation_id is not None:
        return get_conversation(db, current_user, conversation_id)

    conversation = AIConversation(user_id=current_user.user_id, title=question[:150])
    db.add(conversation)
    return conversation
