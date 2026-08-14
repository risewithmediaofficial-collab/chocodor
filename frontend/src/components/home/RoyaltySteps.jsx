import { ScrollReveal, StaggerContainer, StaggerItem } from '../ScrollReveal'
import { royaltySteps } from '../../data/content'

export default function RoyaltySteps() {
  return (
    <section className="royalty-steps">
      <div className="container">
        <ScrollReveal className="section-head section-head--center">
          <h2 className="section-title">Earn. Redeem. Enjoy.</h2>
        </ScrollReveal>

        <StaggerContainer className="royalty-steps__grid">
          {royaltySteps.map((item) => (
            <StaggerItem key={item.step}>
              <article className="step-card">
                <span className="step-card__num">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
