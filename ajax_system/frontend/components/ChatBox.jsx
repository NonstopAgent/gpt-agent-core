import React, { useState, useEffect } from 'react';

/**
 * ChatBox renders a simple chat interface between the user and AJAX.  It
 * fetches the current mode from the backend to style AI messages and
 * sends user messages to the `/respond` endpoint.  Responses are appended
 * to the conversation history.
 */
export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Ajax');

  // Fetch current mode on mount and whenever it may change
  const fetchMode = () => {
    fetch('/mode')
      .then((res) => res.json())
      .then((data) => setMode(data.mode || 'Ajax'));
  };

  useEffect(() => {
    fetchMode();
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg = { text: trimmed, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Post to backend and await reply
    const res = await fetch('/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed }),
    });
    const data = await res.json();
    const aiMsg = { text: data.reply, sender: 'ai' };
    setMessages((prev) => [...prev, aiMsg]);
    // Refresh mode in case it changed
    fetchMode();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 chat-container bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const bubbleClass = isUser
            ? 'user'
            : mode === 'Logan'
            ? 'ai-logan'
            : 'ai-ajax';
          return (
            <div key={idx} className={`message ${bubbleClass}`}>
              {msg.text}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded resize-none"
          rows={2}
          placeholder="Type your message and press Enter..."
        ></textarea>
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}