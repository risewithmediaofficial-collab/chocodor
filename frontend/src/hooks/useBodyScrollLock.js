import { useEffect } from 'react'

/**
 * Custom hook to lock body scrolling when a modal or drawer is open.
 * Restores original overflow upon closing.
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    
    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      document.body.classList.remove('modal-open')
    }
  }, [isLocked])
}
