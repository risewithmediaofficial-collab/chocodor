import { ScrollReveal } from './ScrollReveal'

export default function BrandStory() {
  return (
    <section className="story" id="story">
      <ScrollReveal>
        <div className="story__panel">
          <div className="story__media">
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&q=80"
            >
              <source
                src="https://assets.mixkit.co/videos/preview/mixkit-pouring-melted-chocolate-on-truffles-398-large.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          <div className="story__content">
            <h2>
              Why Is Chocolate
              <br />
              Considered an Art Form?
            </h2>
            <p>
              From tempering to hand-finished bonbons, every piece at Choco D&apos;or
              is shaped with patience, precision, and a deep respect for the craft.
            </p>
            <a href="#" className="btn btn--gold">
              Our Story
            </a>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
