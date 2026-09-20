"""AI Assistant tables (PRD 5.22): saved chats and their messages.

Every assistant answer records which approved report function produced it,
so any answer can be traced back to verified data.
"""
from datetime import datetime

from sqlalchemy import ForeignKey, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AIConversation(Base):
    __tablename__ = "AIConversations"

    ai_conversation_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("Users.user_id"), index=True)
    # The first question, shortened - shown in the chat list
    title: Mapped[str] = mapped_column(Unicode(150))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())
    updated_at: Mapped[datetime | None] = mapped_column(onupdate=func.sysutcdatetime())

    messages: Mapped[list["AIMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.ai_message_id"
    )


class AIMessage(Base):
    __tablename__ = "AIMessages"

    ai_message_id: Mapped[int] = mapped_column(primary_key=True)
    ai_conversation_id: Mapped[int] = mapped_column(ForeignKey("AIConversations.ai_conversation_id"), index=True)
    role: Mapped[str] = mapped_column(Unicode(10))  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Unicode(4000))
    # Filled in for assistant messages only (PRD 5.22: every answer is traceable)
    intent: Mapped[str | None] = mapped_column(Unicode(50))
    report_function: Mapped[str | None] = mapped_column(Unicode(100))
    created_at: Mapped[datetime] = mapped_column(server_default=func.sysutcdatetime())

    conversation: Mapped["AIConversation"] = relationship(back_populates="messages")
