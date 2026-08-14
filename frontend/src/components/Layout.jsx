import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBanner from './TopBanner'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileOrderBar from './MobileOrderBar'
import CustomCursor from './CustomCursor'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <TopBanner />
      <Navbar />
      <Outlet />
      <Footer />
      <MobileOrderBar />
    </>
  )
}

