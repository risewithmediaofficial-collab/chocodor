import { useEffect } from 'react'

/**
 * Custom hook to lock body & html scrolling when a modal or drawer is open.
 * Restores original overflow upon closing.
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalTouchAction = document.body.style.touchAction
    const originalPaddingRight = document.body.style.paddingRight

    // Prevent layout shift from scrollbar disappearing on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.body.classList.add('modal-open')
    document.documentElement.classList.add('modal-open')

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.touchAction = originalTouchAction
      document.body.style.paddingRight = originalPaddingRight
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('modal-open')
    }
  }, [isLocked])
}
