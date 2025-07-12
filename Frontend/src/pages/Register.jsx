import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'buyer',
        phone: '',
        farmName: '',
        farmDescription: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()

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

    const validateForm = () => {
        const newErrors = {}

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required'
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters'
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores'
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required'
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required'
        }

        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid'
        }

        if (!formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required'
        }

        // Farmer-specific validation
        if (formData.role === 'farmer') {
            if (!formData.farmName.trim()) {
                newErrors.farmName = 'Farm name is required for farmers'
            }
            if (!formData.address.trim()) {
                newErrors.address = 'Address is required for farmers'
            }
            if (!formData.city.trim()) {
                newErrors.city = 'City is required for farmers'
            }
            if (!formData.state.trim()) {
                newErrors.state = 'State is required for farmers'
            }
            if (!formData.zipCode.trim()) {
                newErrors.zipCode = 'Zip code is required for farmers'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) return

        setLoading(true)
        try {
            const userData = {
                username: formData.username,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                phone: formData.phone
            }

            // Add farmer-specific fields
            if (formData.role === 'farmer') {
                userData.farmName = formData.farmName
                userData.farmDescription = formData.farmDescription
                userData.location = {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    coordinates: {
                        lat: 0, // Default coordinates - should be set by geocoding
                        lng: 0
                    }
                }
            }

            await register(userData)
        } catch (error) {
            console.error('Registration error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
                    <p className="text-gray-600 mt-2">
                        Join GreenFarm and start your sustainable journey
                    </p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="form-group">
                            <label htmlFor="username" className="form-label">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={`form-input ${errors.username ? 'error' : ''}`}
                                placeholder="Choose a username"
                            />
                            {errors.username && (
                                <p className="form-error">{errors.username}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label htmlFor="firstName" className="form-label">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                                    placeholder="First name"
                                />
                                {errors.firstName && (
                                    <p className="form-error">{errors.firstName}</p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName" className="form-label">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                                    placeholder="Last name"
                                />
                                {errors.lastName && (
                                    <p className="form-error">{errors.lastName}</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="Enter your email"
                            />
                            {errors.email && (
                                <p className="form-error">{errors.email}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="role" className="form-label">
                                I want to join as
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="buyer">Customer</option>
                                <option value="farmer">Farmer</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone" className="form-label">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`form-input ${errors.phone ? 'error' : ''}`}
                                placeholder="Enter your phone number"
                            />
                            {errors.phone && (
                                <p className="form-error">{errors.phone}</p>
                            )}
                        </div>

                        {/* Farmer-specific fields */}
                        {formData.role === 'farmer' && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="farmName" className="form-label">
                                        Farm Name
                                    </label>
                                    <input
                                        type="text"
                                        id="farmName"
                                        name="farmName"
                                        value={formData.farmName}
                                        onChange={handleChange}
                                        className={`form-input ${errors.farmName ? 'error' : ''}`}
                                        placeholder="Enter your farm name"
                                    />
                                    {errors.farmName && (
                                        <p className="form-error">{errors.farmName}</p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="farmDescription" className="form-label">
                                        Farm Description
                                    </label>
                                    <textarea
                                        id="farmDescription"
                                        name="farmDescription"
                                        value={formData.farmDescription}
                                        onChange={handleChange}
                                        rows="3"
                                        className="form-input"
                                        placeholder="Tell us about your farm"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="address" className="form-label">
                                        Farm Address
                                    </label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className={`form-input ${errors.address ? 'error' : ''}`}
                                        placeholder="Street address"
                                    />
                                    {errors.address && (
                                        <p className="form-error">{errors.address}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="form-group">
                                        <label htmlFor="city" className="form-label">City</label>
                                        <input
                                            type="text"
                                            id="city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className={`form-input ${errors.city ? 'error' : ''}`}
                                            placeholder="City"
                                        />
                                        {errors.city && (
                                            <p className="form-error">{errors.city}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="state" className="form-label">State</label>
                                        <input
                                            type="text"
                                            id="state"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            className={`form-input ${errors.state ? 'error' : ''}`}
                                            placeholder="State"
                                        />
                                        {errors.state && (
                                            <p className="form-error">{errors.state}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="zipCode" className="form-label">Zip Code</label>
                                        <input
                                            type="text"
                                            id="zipCode"
                                            name="zipCode"
                                            value={formData.zipCode}
                                            onChange={handleChange}
                                            className={`form-input ${errors.zipCode ? 'error' : ''}`}
                                            placeholder="Zip code"
                                        />
                                        {errors.zipCode && (
                                            <p className="form-error">{errors.zipCode}</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Create a password"
                            />
                            {errors.password && (
                                <p className="form-error">{errors.password}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Confirm your password"
                            />
                            {errors.confirmPassword && (
                                <p className="form-error">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <div className="flex items-center">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                required
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                                I agree to the{' '}
                                <a href="#" className="text-primary-600 hover:text-primary-500">
                                    Terms of Service
                                </a>{' '}
                                and{' '}
                                <a href="#" className="text-primary-600 hover:text-primary-500">
                                    Privacy Policy
                                </a>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="spinner"></div>
                                    Creating account...
                                </div>
                            ) : (
                                'Create account'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register 