import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
        bio: ''
    })
    
    // Farm-specific state
    const [farmData, setFarmData] = useState({
        name: '',
        description: '',
        farmType: 'mixed',
        totalArea: { value: '', unit: 'acres' },
        location: {
            address: '',
            city: '',
            state: '',
            zipCode: '',
            coordinates: { lat: 0, lng: 0 }
        },
        certifications: [],
        farmingMethods: []
    })
    
    const [farmImages, setFarmImages] = useState([])
    const [farmVideos, setFarmVideos] = useState([])
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const { register, user, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    
    // File input refs
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)

    // Check if user is already logged in
    useEffect(() => {
        if (isAuthenticated && user) {
            navigate('/dashboard')
            return
        }
        
        // Check if joining as farmer from URL params
        const joinAsFarmer = searchParams.get('joinAsFarmer')
        if (joinAsFarmer === 'true') {
            setFormData(prev => ({
                ...prev,
                role: 'farmer'
            }))
        }
    }, [isAuthenticated, user, navigate, searchParams])

    // Don't render the form if user is already logged in
    if (isAuthenticated && user) {
        return null
    }

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

    const handleFarmChange = (e) => {
        const { name, value } = e.target
        if (name.includes('.')) {
            const [parent, child] = name.split('.')
            setFarmData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }))
        } else {
            setFarmData(prev => ({
                ...prev,
                [name]: value
            }))
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const handleAreaChange = (e) => {
        const { name, value } = e.target
        setFarmData(prev => ({
            ...prev,
            totalArea: {
                ...prev.totalArea,
                [name]: value
            }
        }))
    }

    const handleCertificationChange = (certification) => {
        setFarmData(prev => ({
            ...prev,
            certifications: prev.certifications.includes(certification)
                ? prev.certifications.filter(c => c !== certification)
                : [...prev.certifications, certification]
        }))
    }

    const handleFarmingMethodChange = (method) => {
        setFarmData(prev => ({
            ...prev,
            farmingMethods: prev.farmingMethods.includes(method)
                ? prev.farmingMethods.filter(m => m !== method)
                : [...prev.farmingMethods, method]
        }))
    }

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))
        
        if (imageFiles.length + farmImages.length > 10) {
            alert('Maximum 10 images allowed')
            return
        }

        const newImages = imageFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }))

        setFarmImages(prev => [...prev, ...newImages])
    }

    const handleVideoUpload = (e) => {
        const files = Array.from(e.target.files)
        const videoFiles = files.filter(file => file.type.startsWith('video/'))
        
        if (videoFiles.length + farmVideos.length > 5) {
            alert('Maximum 5 videos allowed')
            return
        }

        const newVideos = videoFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }))

        setFarmVideos(prev => [...prev, ...newVideos])
    }

    const removeImage = (index) => {
        setFarmImages(prev => {
            const newImages = prev.filter((_, i) => i !== index)
            return newImages
        })
    }

    const removeVideo = (index) => {
        setFarmVideos(prev => {
            const newVideos = prev.filter((_, i) => i !== index)
            return newVideos
        })
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

        // Only validate password if not joining as farmer (logged-in user)
        if (!searchParams.get('joinAsFarmer')) {
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
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required'
        }

        // Farmer-specific validation
        if (formData.role === 'farmer') {
            if (!formData.bio.trim()) {
                newErrors.bio = 'Bio is required for farmers'
            }
            
            // Farm validation - only basic info required
            if (!farmData.name.trim()) {
                newErrors.farmName = 'Farm name is required'
            }
            
            // All other farm fields are now optional
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
                role: formData.role,
                phone: formData.phone,
                bio: formData.bio
            }

            // Only include password if not joining as farmer (logged-in user)
            if (!searchParams.get('joinAsFarmer')) {
                userData.password = formData.password
            }

            // Add location for farmers
            if (formData.role === 'farmer') {
                userData.location = {
                    address: farmData.location.address,
                    city: farmData.location.city,
                    state: farmData.location.state,
                    zipCode: farmData.location.zipCode,
                    coordinates: farmData.location.coordinates
                }
            }

            const result = await register(userData)
            
            if (result.success) {
                // User is now logged in and will be redirected by AuthContext
                // If farmer, they can add their first farm through the FarmManager
                if (formData.role === 'farmer') {
                    // The AuthContext will redirect to dashboard with addFarm=true
                    console.log('Farmer registered successfully, redirecting to add farm...')
                }
            } else {
                // Registration failed, stay on the form
                console.error('Registration failed:', result.error)
            }
        } catch (error) {
            console.error('Registration error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full">
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
                        {/* Basic Information */}
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

                        {/* Only show role selection if not joining as farmer */}
                        {!searchParams.get('joinAsFarmer') && (
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
                        )}

                        {/* Show farmer role info if joining as farmer */}
                        {searchParams.get('joinAsFarmer') && (
                            <div className="form-group">
                                <label className="form-label">
                                    Joining as Farmer
                                </label>
                                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                                    <p className="text-sm text-primary-800">
                                        You're joining GreenFarm as a farmer. You'll be able to list your farms, crops, and connect with customers.
                                    </p>
                                </div>
                            </div>
                        )}

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

                        {/* Only show password fields if not joining as farmer (logged-in user) */}
                        {!searchParams.get('joinAsFarmer') && (
                            <>
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
                            </>
                        )}

                        <div className="form-group">
                            <label htmlFor="bio" className="form-label">
                                Tell us about yourself
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                rows="3"
                                className={`form-input ${errors.bio ? 'error' : ''}`}
                                placeholder={formData.role === 'farmer' ? "Share your farming experience, methods, and what makes your farm special..." : "Tell us about yourself..."}
                            />
                            {errors.bio && (
                                <p className="form-error">{errors.bio}</p>
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
                                    {searchParams.get('joinAsFarmer') ? 'Joining as Farmer...' : 'Creating account...'}
                                </div>
                            ) : (
                                searchParams.get('joinAsFarmer') ? 'Join as Farmer' : 'Create account'
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