import React from 'react'

/**
 * Three-dot typing indicator using Tailwind animations.
 */
export default function TypingDots() {
  return (
    <span className="flex items-center space-x-1">
      <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
      <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
      <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
    </span>
  )
}
