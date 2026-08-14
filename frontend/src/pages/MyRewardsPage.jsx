import { Link } from 'react-router-dom'
import { formatPrice } from '../data/content'

const rewardsCatalog = [
  {
    id: 'rew-1',
    name: 'Artisan Hazelnut Truffle Box (4 pcs)',
    points: 500,
    worth: 350,
    image: '/images/chocolate_truffles_stack.jpg',
  },
  {
    id: 'rew-2',
    name: 'Single-Origin 75% Dark Chocolate Slab',
    points: 800,
    worth: 650,
    image: '/images/chocolate_bar.jpg',
  },
  {
    id: 'rew-3',
    name: 'Royal Assortment Velvet Casket',
    points: 1800,
    worth: 1450,
    image: '/images/chocolate_gift_box.jpg',
  },
]

export default function MyRewardsPage() {
  return (
    <main className="page page--royalty-sub">
      <div className="container">
        <header className="page-header page-header--center">
          <span className="section-label section-label--eyebrow">ROYALTY REWARDS</span>
          <h1 className="page-title">REDEEM YOUR REWARDS</h1>
          <p className="page-desc">
            Use your earned Royalty points for complimentary chocolate creations and gift boxes.
          </p>
        </header>

        <div className="signatures__grid" style={{ marginBottom: '80px' }}>
          {rewardsCatalog.map((reward) => (
            <article key={reward.id} className="signature-card" style={{ background: '#FFFFFF' }}>
              <div className="signature-card__tag-wrap">
                <span className="signature-card__tag">👑 {reward.points} Points</span>
              </div>
              <div className="signature-card__image-wrap">
                <img src={reward.image} alt={reward.name} />
              </div>
              <div className="signature-card__body">
                <h3 className="signature-card__name">{reward.name}</h3>
                <p className="signature-card__desc">Worth {formatPrice(reward.worth)}</p>
                <div className="signature-card__footer">
                  <span className="signature-card__price" style={{ color: 'var(--caramel)' }}>
                    {reward.points} PTS
                  </span>
                  <button type="button" className="btn btn--gold btn--sm">
                    Claim Reward
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
