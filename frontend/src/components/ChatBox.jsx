import { useEffect, useRef, useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { from: 'agent', text: 'How can I help?' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { from: 'user', text }])
    setInput('')
    // simulate loading indicator
    setTyping(true)
    setTimeout(() => {
      setMessages(m => [...m, { from: 'agent', text: 'Received: ' + text }])
      setTyping(false)
    }, 800)
  }

  return (
    <div className="h-full flex flex-col border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
        {messages.map((m, i) => {
          const match =
            m.from === 'agent' && m.text.match(/https?:\/\/\S+\.(?:png|jpg)/i)
          return (
            <div
              key={i}
              className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex flex-col ${
                  m.from === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`${
                    m.from === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  } px-4 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap`}
                >
                  {m.text}
                </div>
                {match && (
                  <img
                    src={match[0]}
                    alt="image preview"
                    className="mt-2 max-w-[75%] rounded-lg"
                  />
                )}
              </div>
            </div>
          )
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg max-w-[75%]">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2 bg-white dark:bg-gray-900">
        <textarea
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none resize-none overflow-hidden"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Send a message"
        />
        <button onClick={send} className="bg-blue-500 text-white p-2 rounded-lg shadow-sm self-end">
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
