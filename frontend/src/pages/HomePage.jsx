import HeroSection from '../components/home/HeroSection'
import SignatureSection from '../components/home/SignatureSection'
import CategorySection from '../components/home/CategorySection'
import VideoSection from '../components/home/VideoSection'
import FavouritesSection from '../components/home/FavouritesSection'
import BrandCraftSection from '../components/home/BrandCraftSection'
import RoyaltyPreview from '../components/home/RoyaltyPreview'
import BrandStatement from '../components/home/BrandStatement'
import InstagramSection from '../components/home/InstagramSection'
import OrderCTA from '../components/home/OrderCTA'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <SignatureSection />
      <CategorySection />
      <VideoSection />
      <FavouritesSection />
      <BrandCraftSection />
      <RoyaltyPreview />
      <BrandStatement />
      <InstagramSection />
      <OrderCTA />
    </main>
  )
}
