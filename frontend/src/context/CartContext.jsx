import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { customer, openRegister } = useAuth()
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('chocodor_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [appliedRewardCode, setAppliedRewardCode] = useState('')
  const [orderType, setOrderType] = useState('DELIVERY')
  const [quote, setQuote] = useState({
    subtotal: 0,
    deliveryFee: 0,
    rewardDiscount: 0,
    grandTotal: 0,
    totalRoyaltyPoints: 0,
    rewardError: null,
    eligibleForFreeDelivery: false,
  })
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('chocodor_cart', JSON.stringify(items))
  }, [items])

  // Fetch live server quote whenever items, applied code or order type changes
  const fetchQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote({
        subtotal: 0,
        deliveryFee: 0,
        rewardDiscount: 0,
        grandTotal: 0,
        totalRoyaltyPoints: 0,
        rewardError: null,
        eligibleForFreeDelivery: false,
      })
      return
    }

    setQuoteLoading(true)
    try {
      const res = await apiRequest('/orders/quote', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ productId: i.productId || i.id, quantity: i.quantity })),
          appliedRewardCode: appliedRewardCode || null,
          orderType,
        },
      })
      setQuote(res)
    } catch (err) {
      console.error('Quote fetch failed:', err)
      const fallbackSubtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
      const fallbackPoints = items.reduce((sum, item) => sum + (item.royaltyPoints || item.royalty_points || 0) * (item.quantity || 1), 0)
      const fallbackDelivery = orderType === 'DELIVERY' ? (fallbackSubtotal >= 500 ? 0 : 40) : 0
      setQuote((prev) => ({
        ...prev,
        subtotal: fallbackSubtotal,
        deliveryFee: fallbackDelivery,
        rewardDiscount: 0,
        rewardError: err.message || 'Could not verify coupon',
        grandTotal: fallbackSubtotal + fallbackDelivery,
        totalRoyaltyPoints: fallbackPoints,
        eligibleForFreeDelivery: fallbackDelivery === 0,
      }))
    } finally {
      setQuoteLoading(false)
    }
  }, [items, appliedRewardCode, orderType])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  const executeAddToCart = (product, quantity = 1) => {
    const pId = product.productId || product.id
    setItems((prev) => {
      const existing = prev.find((i) => (i.productId || i.id) === pId)
      if (existing) {
        return prev.map((i) =>
          (i.productId || i.id) === pId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [
        ...prev,
        {
          productId: pId,
          id: pId,
          name: product.name,
          price: product.price,
          royaltyPoints: product.royaltyPoints || product.royalty_points || 0,
          image: product.image,
          quantity,
        },
      ]
    })
  }

  const addToCart = (product, quantity = 1) => {
    if (!customer) {
      openRegister(
        'Please create an account or sign in to add items to your cart & collect Royalty points ✨',
        () => {
          executeAddToCart(product, quantity)
          setCartDrawerOpen(true)
        }
      )
      return false
    }

    executeAddToCart(product, quantity)
    return true
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) => ((i.productId || i.id) === productId ? { ...i, quantity } : i))
    )
  }

  const removeFromCart = (productId) => {
    setItems((prev) => prev.filter((i) => (i.productId || i.id) !== productId))
  }

  const clearCart = () => {
    setItems([])
    setAppliedRewardCode('')
  }

  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        appliedRewardCode,
        setAppliedRewardCode,
        orderType,
        setOrderType,
        quote,
        quoteLoading,
        cartDrawerOpen,
        setCartDrawerOpen,
        refreshQuote: fetchQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
