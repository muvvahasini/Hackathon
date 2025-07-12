import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-container">
          <a href="/" className="navbar-logo">
            <img src="https://i.pinimg.com/736x/54/7b/dd/547bdd12d3e3d673a0ad7edea712f8e1.jpg" alt="Ecoland Logo" className="logo-img" />
            GreenFarm
          </a>
          <ul className="nav-menu nav-menu-right">
            <li className="nav-item"><Link to="/home" className="nav-link active">Home</Link></li>
            <li className="nav-item"><Link to="/about" className="nav-link">About</Link></li>
            <li className="nav-item"><Link to="/cart" className="nav-link">🛒 Cart</Link></li>
            <li className='nav-item'><Link to="/dashboard" className='nav-link'>Dashboard</Link></li>
            <li className='nav-item'><Link to="/orders" className='nav-link'>Orders</Link></li>
            
            {isAuthenticated ? (
              <>
                {/* Show Dashboard button for farmers */}
                {user?.role === 'farmer' && (
                  <li className="nav-item">
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                  </li>
                )}
                <li className="nav-item">
                  <Link to="/profile" className="nav-link">Profile</Link>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="nav-link nav-logout">Logout</button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
                <li className="nav-item"><Link to="/register" className="nav-link nav-get-started">Sign Up</Link></li>
              </>
            )}
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default Navbar