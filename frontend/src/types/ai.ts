// Same shapes as backend/app/schemas/ai.py
export type AiMessage = {
  ai_message_id: number
  role: 'user' | 'assistant'
  content: string
  /** Which approved report function produced the answer (assistant messages only) */
  report_function: string | null
  created_at: string
}

export type AiConversation = {
  ai_conversation_id: number
  title: string
  created_at: string
  updated_at: string | null
}

export type AiConversationDetail = AiConversation & {
  messages: AiMessage[]
}

export type AiAnswer = {
  conversation_id: number
  answer: string
  intent: string | null
  report_function: string | null
  data: Record<string, unknown> | null
}

export type AiAssistantInfo = {
  /** true when an AI provider key is set in backend/.env */
  ai_provider_enabled: boolean
  examples: string[]
  report_functions: { name: string; answers: string }[]
}
