import { useEffect, useState } from 'react'

interface TypewriterTextProps {
  text: string
  delay?: number
}

export function TypewriterText({ text, delay = 50 }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    setDisplayText('')
    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, delay)
    return () => clearInterval(timer)
  }, [text, delay])

  return (
    <span>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  )
}
