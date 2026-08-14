import { Link } from 'react-router-dom'

export default function MobileOrderBar() {
  return (
    <div className="mobile-order-bar">
      <Link to="/shop" className="mobile-order-bar__btn">
        Order Now
      </Link>
    </div>
  )
}
