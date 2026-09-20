"""AI Assistant endpoints: /api/ai (PRD 5.22). Needs the `ai.use` permission (Admin, Manager)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.database import get_db
from app.models import User
from app.schemas.ai import AnswerOut, AskRequest, AssistantInfo, ConversationDetail, ConversationOut
from app.services import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.get("/info", response_model=AssistantInfo)
def assistant_info(current_user: User = Depends(require_permission("ai.use"))):
    """Example questions, the approved report functions, and whether an AI provider is switched on."""
    return ai_service.assistant_info()


@router.post("/ask", response_model=AnswerOut)
def ask(
    data: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai.use")),
):
    """Answers a question from the shop's own data and saves it to the user's chat."""
    result = ai_service.ask(db, current_user, data.question, data.conversation_id)
    db.commit()
    return result


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(require_permission("ai.use"))):
    """The chats of the logged-in user, newest first."""
    return ai_service.list_conversations(db, current_user)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai.use")),
):
    """One chat with all its messages. Users can only open their own chats."""
    return ai_service.get_conversation(db, current_user, conversation_id)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai.use")),
):
    ai_service.delete_conversation(db, current_user, conversation_id)
    db.commit()
