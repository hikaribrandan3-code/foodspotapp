/**
 * BurgerLoader.jsx
 * Global loading component — bouncing smiling burger.
 * Use `inline` prop for embedded loading states (e.g. inside a card).
 * Use without props for full-screen loading.
 */
import './BurgerLoader.css'

const BurgerLoader = ({ inline = false }) => (
  <div className={`burger-loader${inline ? ' burger-loader--inline' : ''}`}>
    <div className="burger-loader__visual">
      <div className="burger-loader__shadow" />
      <div className="burger-loader__icon">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top Bun */}
          <path d="M15 45C15 25 30 15 50 15C70 15 85 25 85 45H15Z" fill="#FF9800" stroke="#E65100" strokeWidth="3"/>
          {/* Lettuce */}
          <rect x="12" y="48" width="76" height="6" rx="3" fill="#4CAF50"/>
          {/* Patty */}
          <rect x="15" y="57" width="70" height="8" rx="4" fill="#6D4C41"/>
          {/* Bottom Bun */}
          <path d="M15 68H85V73C85 80 75 85 50 85C25 85 15 80 15 73V68Z" fill="#FF9800" stroke="#E65100" strokeWidth="3"/>
          {/* Eyes */}
          <circle cx="38" cy="35" r="3.5" fill="white"/>
          <circle cx="62" cy="35" r="3.5" fill="white"/>
          {/* Smile */}
          <path d="M42 40C45 44 55 44 58 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
    <p className="burger-loader__text">Loading...</p>
  </div>
)

export default BurgerLoader
