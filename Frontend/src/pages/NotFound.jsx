import { Link } from 'react-router-dom'
import './NotFound.css'

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="decorative-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        
        <div className="not-found-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
        </div>
        
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-description">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="action-buttons">
          <Link to="/home" className="home-btn">
            Go Home
          </Link>
          <Link to="/products" className="browse-btn">
            ADD Products
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound 