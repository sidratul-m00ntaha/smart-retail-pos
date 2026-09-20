import { useEffect, useRef, useState, type FormEvent } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import {
  askAssistant,
  deleteConversation,
  getAssistantInfo,
  getConversation,
  getConversations,
} from '../../services/ai.service.ts'
import type { AiAssistantInfo, AiConversation, AiMessage } from '../../types/ai.ts'
import styles from './ai-assistant.module.css'

const NO_INFO: AiAssistantInfo = { ai_provider_enabled: false, examples: [], report_functions: [] }

/** A message shown in the chat. Ones not saved yet (the question being sent) have no id. */
type ChatLine = Omit<AiMessage, 'ai_message_id' | 'created_at'> & { key: string; pending?: boolean }

/** AI Assistant (PRD 5.22): answers questions from the shop's own data, never raw database access. */
export default function AiAssistantPage() {
  const [info, setInfo] = useState<AiAssistantInfo>(NO_INFO)
  const [chats, setChats] = useState<AiConversation[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [lines, setLines] = useState<ChatLine[]>([])
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endOfChat = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isCurrent = true
    Promise.all([getAssistantInfo(), getConversations()])
      .then(([assistantInfo, conversations]) => {
        if (!isCurrent) return
        setInfo(assistantInfo)
        setChats(conversations)
      })
      .catch((err) => {
        if (isCurrent) setLoadError(err instanceof ApiError ? err.message : 'Could not open the assistant.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  // Keep the newest message in view
  useEffect(() => {
    endOfChat.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  async function ask(text: string) {
    const asked = text.trim()
    if (!asked || isAsking) return

    setQuestion('')
    setError(null)
    setIsAsking(true)
    setLines((current) => [
      ...current,
      { key: `q-${Date.now()}`, role: 'user', content: asked, report_function: null },
      { key: `a-${Date.now()}`, role: 'assistant', content: 'Looking at your data…', report_function: null, pending: true },
    ])

    try {
      const result = await askAssistant(asked, conversationId ?? undefined)
      setLines((current) => [
        ...current.filter((line) => !line.pending),
        {
          key: `a-${result.conversation_id}-${current.length}`,
          role: 'assistant',
          content: result.answer,
          report_function: result.report_function,
        },
      ])
      if (conversationId === null) {
        setConversationId(result.conversation_id)
        setChats(await getConversations())
      }
    } catch (err) {
      setLines((current) => current.filter((line) => !line.pending))
      setError(err instanceof ApiError ? err.message : 'The assistant could not answer that. Please try again.')
    } finally {
      setIsAsking(false)
    }
  }

  function startNewChat() {
    setConversationId(null)
    setLines([])
    setError(null)
  }

  async function openChat(chat: AiConversation) {
    setError(null)
    try {
      const detail = await getConversation(chat.ai_conversation_id)
      setConversationId(detail.ai_conversation_id)
      setLines(
        detail.messages.map((message) => ({
          key: `m-${message.ai_message_id}`,
          role: message.role,
          content: message.content,
          report_function: message.report_function,
        })),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open that chat.')
    }
  }

  async function removeChat(chat: AiConversation) {
    if (!window.confirm(`Delete this chat?\n\n“${chat.title}”`)) return
    try {
      await deleteConversation(chat.ai_conversation_id)
      setChats(await getConversations())
      if (chat.ai_conversation_id === conversationId) startNewChat()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that chat.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(question)
  }

  if (isLoading) return <MessagePanel title="Opening the assistant…" />
  if (loadError) return <MessagePanel title="Could not open the assistant">{loadError}</MessagePanel>

  return (
    <div className={styles.page}>
      <aside className={styles.chatRail}>
        <button type="button" className={styles.newChatButton} onClick={startNewChat}>
          + New chat
        </button>
        <div className={styles.chatList}>
          {chats.length === 0 && <p className={styles.railEmpty}>Your questions are saved here.</p>}
          {chats.map((chat) => (
            <div
              key={chat.ai_conversation_id}
              className={chat.ai_conversation_id === conversationId ? `${styles.chatItem} ${styles.chatItemActive}` : styles.chatItem}
            >
              <button type="button" className={styles.chatTitle} onClick={() => openChat(chat)} title={chat.title}>
                {chat.title}
              </button>
              <button
                type="button"
                className={styles.chatDelete}
                onClick={() => removeChat(chat)}
                aria-label={`Delete chat: ${chat.title}`}
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className={styles.chatCard}>
        <header className={styles.chatHead}>
          <div>
            <h2 className={styles.chatHeading}>Ask about your business</h2>
            <p className={styles.chatSub}>
              Answers come from your own sales, stock, customer and supplier records — the assistant can't reach the
              database directly and never changes anything.
            </p>
          </div>
          <span className={info.ai_provider_enabled ? `${styles.modePill} ${styles.modePillAi}` : styles.modePill}>
            {info.ai_provider_enabled ? 'AI wording on' : 'Built-in answers'}
          </span>
        </header>

        <div className={styles.messages}>
          {lines.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>What would you like to know?</p>
              <div className={styles.examples}>
                {info.examples.map((example) => (
                  <button key={example} type="button" className={styles.exampleChip} onClick={() => void ask(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {lines.map((line) => (
            <div
              key={line.key}
              className={line.role === 'user' ? `${styles.bubbleRow} ${styles.bubbleRowUser}` : styles.bubbleRow}
            >
              <div
                className={
                  line.role === 'user'
                    ? `${styles.bubble} ${styles.bubbleUser}`
                    : line.pending
                      ? `${styles.bubble} ${styles.bubblePending}`
                      : styles.bubble
                }
              >
                {line.content}
                {line.report_function && (
                  <span className={styles.source} title="The report this answer was built from">
                    from {line.report_function.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={endOfChat} />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form className={styles.composer} onSubmit={handleSubmit}>
          <label className={styles.visuallyHidden} htmlFor="ai-question">
            Your question
          </label>
          <input
            id="ai-question"
            type="text"
            placeholder="Ask something, e.g. how much did we sell today?"
            maxLength={500}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" className={styles.sendButton} disabled={isAsking || question.trim() === ''}>
            {isAsking ? 'Asking…' : 'Ask'}
          </button>
        </form>
        <p className={styles.composerNote}>Admins and managers only · every answer names the report it came from</p>
      </section>
    </div>
  )
}
