import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import './Profile.css'

const Profile = () => {
  const { user, updateProfile, changeRole } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [roleChangeData, setRoleChangeData] = useState({
    location: '',
    city: '',
    pincode: '',
    acres: ''
  })
  const [errors, setErrors] = useState({})
  const [roleErrors, setRoleErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showRoleChange, setShowRoleChange] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleRoleChange = (e) => {
    const { name, value } = e.target
    setRoleChangeData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (roleErrors[name]) {
      setRoleErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleLocationChange = (e) => {
    const { name, value } = e.target
    setRoleChangeData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (roleErrors[name]) {
      setRoleErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }



  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateRoleChange = () => {
    const newErrors = {}

    if (!roleChangeData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    if (!roleChangeData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!roleChangeData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required'
    } else if (!/^\d{6}$/.test(roleChangeData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits'
    }

    if (!roleChangeData.acres.trim()) {
      newErrors.acres = 'Number of acres is required'
    } else if (isNaN(roleChangeData.acres) || parseFloat(roleChangeData.acres) <= 0) {
      newErrors.acres = 'Please enter a valid number of acres'
    }

    setRoleErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRoleSubmit = async (e) => {
    e.preventDefault()

    if (!validateRoleChange()) return

    setRoleLoading(true)
    try {
      const result = await changeRole({
        role: 'farmer',
        location: roleChangeData.location,
        city: roleChangeData.city,
        pincode: roleChangeData.pincode,
        acres: roleChangeData.acres
      })

      if (result.success) {
        setShowRoleChange(false)
        setRoleChangeData({
          location: '',
          city: '',
          pincode: '',
          acres: ''
        })
      }
    } catch (error) {
      console.error('Role change error:', error)
    } finally {
      setRoleLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || ''
    })
    setErrors({})
    setIsEditing(false)
  }

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  return (
    <div className="profile-container">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="profile-header">
            <h1 className="profile-title">Profile</h1>
            <p className="profile-subtitle">
              Manage your account information and preferences
            </p>
          </div>

          <div className="profile-card">
            {/* Profile Header */}
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <span>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="profile-info">
                <h2>{user?.name}</h2>
                <p>{user?.email}</p>
                <span className={`profile-role-badge ${user?.role === 'farmer' ? 'farmer' : ''}`}>
                  {user?.role === 'farmer' ? '🌾 Farmer' : '🛒 Customer'}
                </span>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label required">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="form-error">{errors.name}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label required">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label required">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <p className="form-error">{errors.phone}</p>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address" className="form-label required">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                    rows="3"
                    className={`form-input ${errors.address ? 'error' : ''}`}
                    placeholder="Enter your complete address"
                  />
                  {errors.address && (
                    <p className="form-error">{errors.address}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="profile-actions">
                {isEditing ? (
                  <>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-save"
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn-edit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Account Information */}
          <div className="account-info">
            <h3>Account Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <p className="info-label">Account Type</p>
                <p className="info-value">{user?.role === 'farmer' ? '🌾 Farmer' : '🛒 Customer'}</p>
              </div>
              <div className="info-item">
                <p className="info-label">Member Since</p>
                <p className="info-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Role Change Section - Only show for buyers */}
            {user?.role === 'buyer' && (
              <div className="role-change-section">
                <div className="role-change-header">
                  <div className="role-change-info">
                    <div className="role-change-icon">
                      🌾
                    </div>
                    <div className="role-change-text">
                      <h4>Become a Farmer</h4>
                      <p>Start selling your fresh produce and connect with customers directly</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRoleChange(!showRoleChange)}
                    className={`btn-start-farming ${showRoleChange ? 'cancel' : ''}`}
                  >
                    {showRoleChange ? 'Cancel' : 'Start Farming'}
                  </button>
                </div>

                {showRoleChange && (
                  <div className="farmer-application">
                    <div className="mb-6">
                      <h5>Become a Farmer</h5>
                      <p>
                        Please provide your farm location details to complete your farmer profile. You can enter your current location or select from the dropdown.
                      </p>
                    </div>

                    <form onSubmit={handleRoleSubmit} className="application-form">
                      <div className="form-section">
                        <h6>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Farm Details
                        </h6>

                        <div className="location-grid">
                          <div className="form-group">
                            <label htmlFor="location" className="form-label required">
                              State
                            </label>
                            <select
                              id="location"
                              name="location"
                              value={roleChangeData.location}
                              onChange={handleRoleChange}
                              className={`form-input ${roleErrors.location ? 'error' : ''}`}
                            >
                              <option value="">Select your state</option>
                              {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                            {roleErrors.location && (
                              <p className="form-error">{roleErrors.location}</p>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="city" className="form-label required">
                              City
                            </label>
                            <input
                              type="text"
                              id="city"
                              name="city"
                              value={roleChangeData.city}
                              onChange={handleRoleChange}
                              placeholder="Enter your city"
                              className={`form-input ${roleErrors.city ? 'error' : ''}`}
                            />
                            {roleErrors.city && (
                              <p className="form-error">{roleErrors.city}</p>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="pincode" className="form-label required">
                              Pincode
                            </label>
                            <input
                              type="text"
                              id="pincode"
                              name="pincode"
                              value={roleChangeData.pincode}
                              onChange={handleRoleChange}
                              placeholder="Enter 6-digit pincode"
                              maxLength="6"
                              className={`form-input ${roleErrors.pincode ? 'error' : ''}`}
                            />
                            {roleErrors.pincode && (
                              <p className="form-error">{roleErrors.pincode}</p>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="acres" className="form-label required">
                              Number of Acres
                            </label>
                            <input
                              type="number"
                              id="acres"
                              name="acres"
                              value={roleChangeData.acres}
                              onChange={handleRoleChange}
                              placeholder="Enter number of acres"
                              min="0.1"
                              step="0.1"
                              className={`form-input ${roleErrors.acres ? 'error' : ''}`}
                            />
                            {roleErrors.acres && (
                              <p className="form-error">{roleErrors.acres}</p>
                            )}
                          </div>
                        </div>
                      </div>



                      {/* Action Buttons */}
                      <div className="application-actions">
                        <button
                          type="submit"
                          disabled={roleLoading}
                          className="btn-complete"
                        >
                          {roleLoading ? (
                            <>
                              <div className="loading-spinner"></div>
                              Becoming a Farmer...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete Application
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRoleChange(false)}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Success message for farmers */}
            {user?.role === 'farmer' && (
              <div className="success-message">
                <div className="success-icon">
                  ✓
                </div>
                <div className="success-content">
                  <h4>You're a Farmer!</h4>
                  <p>
                    You can now add farms, list products, and connect with customers. Visit your dashboard to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 