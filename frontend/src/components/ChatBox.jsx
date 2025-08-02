import { useEffect, useRef, useState } from 'react'
import TypingDots from './TypingDots.jsx'

/**
 * ChatBox renders conversation bubbles and a sticky input field.
 * It accepts a function to send messages to the server.  Messages
 * alternate alignment based on sender and display a simple typing
 * animation while awaiting a response.
 */
export default function ChatBox({ messages, setMessages, sendMessage }) {
  const [input, setInput] = useState('')
  const pendingRef = useRef(null)
  const endRef = useRef(null)

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    // Add placeholder for typing indicator
    const placeholder = { role: 'assistant', content: '', pending: true }
    setMessages(m => {
      const arr = [...m, placeholder]
      pendingRef.current = arr.length - 1
      return arr
    })
    try {
      const res = await sendMessage(text)
      setMessages(m => {
        const arr = [...m]
        const idx = pendingRef.current
        if (idx != null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: res.response, timestamp: res.timestamp }
        }
        pendingRef.current = null
        return arr
      })
    } catch (e) {
      setMessages(m => {
        const arr = [...m]
        const idx = pendingRef.current
        if (idx != null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: 'Error: ' + e.message }
        }
        pendingRef.current = null
        return arr
      })
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400">What’s up, Logan?</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={
                (m.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100') +
                ' px-4 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap'
              }
            >
              {m.pending ? <TypingDots /> : m.content}
              {m.timestamp && (
                <div className="text-xs text-right opacity-50 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {/* Input area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Send a message"
          className="flex-1 resize-none bg-transparent focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}