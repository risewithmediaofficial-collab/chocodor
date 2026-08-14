import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [visible, setVisible] = useState(false)
  const [label, setLabel] = useState('VIEW')
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (isTouch) return
    setEnabled(true)

    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY })

      const target = e.target.closest('[data-cursor]')
      if (target) {
        setVisible(true)
        setLabel(target.dataset.cursor === 'shop' ? 'SHOP NOW →' : 'VIEW')
      } else {
        setVisible(false)
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!enabled) return null

  return (
    <div
      className={`custom-cursor ${visible ? 'custom-cursor--visible' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
    >
      {label}
    </div>
  )
}
