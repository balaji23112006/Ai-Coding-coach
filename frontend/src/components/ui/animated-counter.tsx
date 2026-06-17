import { useState, useEffect } from "react"

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1200,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let animationFrameId: number
    const startTime = performance.now()
    const startValue = 0
    const endValue = value

    if (endValue === 0) {
      setCount(0)
      return
    }

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Quad ease-out function
      const easeProgress = progress * (2 - progress)
      
      setCount(Math.floor(startValue + easeProgress * (endValue - startValue)))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setCount(endValue)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [value, duration])

  return (
    <>
      {prefix}
      {count}
      {suffix}
    </>
  )
}
