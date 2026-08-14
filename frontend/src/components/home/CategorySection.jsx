import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScrollReveal, StaggerContainer, StaggerItem } from '../ScrollReveal'
import { categories } from '../../data/content'

export default function CategorySection() {
  const [activeCategory, setActiveCategory] = useState('ALL')

  return (
    <section className="categories" id="categories">
      <div className="container">
        <ScrollReveal className="section-head section-head--center">
          <span className="section-label">EXPLORE CATALOGUE</span>
          <h2 className="section-title">Find Your Kind of Sweet.</h2>
        </ScrollReveal>

        <StaggerContainer className="category-pills">
          <StaggerItem>
            <button
              type="button"
              className={`category-pill ${activeCategory === 'ALL' ? 'category-pill--active' : ''}`}
              style={{ background: '#E8D5BD' }}
              onClick={() => setActiveCategory('ALL')}
            >
              <span className="category-pill__label">ALL</span>
              <span className="category-pill__badge">45</span>
            </button>
          </StaggerItem>

          {categories.map((cat) => (
            <StaggerItem key={cat.name}>
              <Link
                to="/shop"
                className={`category-pill ${activeCategory === cat.name ? 'category-pill--active' : ''}`}
                style={{ background: cat.color }}
                onClick={() => setActiveCategory(cat.name)}
              >
                <span className="category-pill__label">{cat.name.toUpperCase()}</span>
                <span className="category-pill__badge">{String(cat.count).padStart(2, '0')}</span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
