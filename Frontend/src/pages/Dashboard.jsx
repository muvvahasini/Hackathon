import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FarmManager from '../components/FarmManager'
import AddProduct from './AddProduct'
import './Dashboard.css'
import { useEffect } from 'react';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'farmer') {
      navigate('/'); // Redirect to home if not authorized
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || user?.role !== 'farmer') {
    return null; // Or return a Not Authorized message if you prefer
  }

  const isFarmer = user?.role === 'farmer'

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="welcome-subtitle">
            {isFarmer 
              ? 'Manage your farms, crops, and track your sales'
              : 'Discover fresh products and track your orders'
            }
          </p>
        </div>

        {/* Farmer-specific content */}
        {isFarmer && (
          <div className="dashboard-card">
            <FarmManager />
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h4>Total Orders</h4>
                <p className="stat-number">24</p>
              </div>
              <div className="stat-icon primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h4>Total Revenue</h4>
                <p className="stat-number">$1,234</p>
              </div>
              <div className="stat-icon success">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h4>{isFarmer ? 'Active Farms' : 'Active Products'}</h4>
                <p className="stat-number">12</p>
              </div>
              <div className="stat-icon info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h4>Messages</h4>
                <p className="stat-number">8</p>
              </div>
              <div className="stat-icon warning">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="content-grid">
          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div>
              <div className="activity-item">
                <div className="activity-icon primary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="activity-content">
                  <p className="activity-title">New order received</p>
                  <p className="activity-description">Order #1234 for Fresh Tomatoes</p>
                </div>
                <span className="activity-time">2 hours ago</span>
              </div>

              <div className="activity-item">
                <div className="activity-icon success">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="activity-content">
                  <p className="activity-title">Order completed</p>
                  <p className="activity-description">Order #1230 delivered successfully</p>
                </div>
                <span className="activity-time">1 day ago</span>
              </div>

              <div className="activity-item">
                <div className="activity-icon info">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="activity-content">
                  <p className="activity-title">New message</p>
                  <p className="activity-description">Message from John Doe about delivery</p>
                </div>
                <span className="activity-time">2 days ago</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="actions-grid">
              <Link to="/add-product" className="action-card primary">
                <div className="action-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="action-title">
                  {isFarmer ? 'Manage Products' : 'MY Products'}
                </p>
              </Link>

              <a href="/orders" className="action-card success">
                <div className="action-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="action-title">View Orders</p>
              </a>

              <a href="/messages" className="action-card info">
                <div className="action-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="action-title">Messages</p>
              </a>

              <a href="/profile" className="action-card warning">
                <div className="action-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="action-title">Profile</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard