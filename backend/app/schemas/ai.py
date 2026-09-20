"""Shapes of the AI Assistant API's requests and responses."""
from pydantic import BaseModel, Field

from app.schemas.common import UtcDateTime


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    # Leave out to start a new chat
    conversation_id: int | None = None


class AnswerOut(BaseModel):
    conversation_id: int
    answer: str
    # Which approved report function produced the answer (PRD 5.22). Empty = nothing matched.
    intent: str | None
    report_function: str | None
    # The numbers the answer was built from, so the page can show them if it wants
    data: dict | None


class MessageOut(BaseModel):
    ai_message_id: int
    role: str
    content: str
    report_function: str | None
    created_at: UtcDateTime


class ConversationOut(BaseModel):
    ai_conversation_id: int
    title: str
    created_at: UtcDateTime
    updated_at: UtcDateTime | None


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class ReportFunctionOut(BaseModel):
    name: str
    answers: str


class AssistantInfo(BaseModel):
    """What the assistant can do - shown on the empty chat screen."""

    ai_provider_enabled: bool
    examples: list[str]
    report_functions: list[ReportFunctionOut]
