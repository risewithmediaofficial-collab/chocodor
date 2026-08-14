import { useRef, useCallback } from 'react'

export function useMouseTilt(intensity = 12) {
  const ref = useRef(null)

  const handleMove = useCallback(
    (e) => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateX = ((y - centerY) / centerY) * -intensity
      const rotateY = ((x - centerX) / centerX) * intensity

      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    },
    [intensity],
  )

  const handleLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform =
      'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  }, [])

  return { ref, handleMove, handleLeave }
}
