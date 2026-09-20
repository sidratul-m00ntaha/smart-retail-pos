import type { AiAnswer, AiAssistantInfo, AiConversation, AiConversationDetail } from '../types/ai.ts'
import { apiRequest } from './api.ts'

export function getAssistantInfo(): Promise<AiAssistantInfo> {
  return apiRequest<AiAssistantInfo>('/api/ai/info')
}

/** Asks a question. Leave out conversationId to start a new chat. */
export function askAssistant(question: string, conversationId?: number): Promise<AiAnswer> {
  return apiRequest<AiAnswer>('/api/ai/ask', {
    method: 'POST',
    body: { question, conversation_id: conversationId ?? null },
  })
}

export function getConversations(): Promise<AiConversation[]> {
  return apiRequest<AiConversation[]>('/api/ai/conversations')
}

export function getConversation(conversationId: number): Promise<AiConversationDetail> {
  return apiRequest<AiConversationDetail>(`/api/ai/conversations/${conversationId}`)
}

export function deleteConversation(conversationId: number): Promise<null> {
  return apiRequest<null>(`/api/ai/conversations/${conversationId}`, { method: 'DELETE' })
}
