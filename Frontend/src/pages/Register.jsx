import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

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
        bio: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        landArea: '',
        farmType: ''
    });
    // Farm data will be collected after registration
    // const [farmData, setFarmData] = useState({
    //     name: '',
    //     description: '',
    //     farmType: 'mixed',
    //     totalArea: { value: '', unit: 'acres' },
    //     location: {
    //         address: '',
    //         city: '',
    //         state: '',
    //         zipCode: '',
    //         coordinates: { lat: 0, lng: 0 }
    //     },
    //     certifications: [],
    //     farmingMethods: []
    // });
    // const [farmImages, setFarmImages] = useState([]);
    // const [farmVideos, setFarmVideos] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register, user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // const imageInputRef = useRef(null);
    // const videoInputRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate('/dashboard');
            return;
        }
        const joinAsFarmer = searchParams.get('joinAsFarmer');
        if (joinAsFarmer === 'true') {
            setFormData(prev => ({ ...prev, role: 'farmer' }));
        }
    }, [isAuthenticated, user, navigate, searchParams]);

    if (isAuthenticated && user) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!searchParams.get('joinAsFarmer')) {
            if (!formData.password) newErrors.password = 'Password is required';
            if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
            else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submission started');

        if (!validateForm()) {
            console.log('Form validation failed');
            return;
        }

        setLoading(true);
        console.log('Sending registration data:', {
            username: formData.username,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            role: formData.role,
            phone: formData.phone,
            bio: formData.bio
        });

        try {
            const userData = {
                username: formData.username,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                role: formData.role,
                phone: formData.phone,
                bio: formData.bio
            };

            if (!searchParams.get('joinAsFarmer')) {
                userData.password = formData.password;
            }

            // Farm data will be collected after registration
            if (formData.role === 'farmer') {
                userData.location = {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode
                };
                userData.landArea = formData.landArea;
                userData.farmType = formData.farmType;
            }

            console.log('Calling register function with data:', userData);
            const result = await register(userData);
            console.log('Register result:', result);

            if (result.success) {
                console.log('Registration successful');
                if (formData.role === 'farmer') {
                    console.log('Farmer registered successfully, redirecting to add farm...');
                }
            } else {
                console.error('Registration failed:', result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
        } finally {
            setLoading(false);
            console.log('Form submission completed');
        }
    };

    // Farm type options
    const FARM_TYPES = [
        'mixed', 'organic', 'hydroponic', 'aquaponic', 'vertical', 'traditional'
    ];

    return (
        <div className="register-page-bg">
            <div className="register-container">
                <div className="register-card">
                    <div className="logo">
                        <h1>GreenFarm</h1>
                        <p>Join GreenFarm and start your sustainable journey</p>
                    </div>
                    <form className="register-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                                className={errors.username ? 'error' : ''}
                            />
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="First name"
                                className={errors.firstName ? 'error' : ''}
                            />
                            {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Last name"
                                className={errors.lastName ? 'error' : ''}
                            />
                            {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                className={errors.email ? 'error' : ''}
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>
                        {!searchParams.get('joinAsFarmer') && (
                            <div className="form-group">
                                <label htmlFor="role">I want to join as</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className={errors.role ? 'error' : ''}
                                >
                                    <option value="buyer">Customer</option>
                                    <option value="farmer">Farmer</option>
                                </select>
                                {errors.role && <span className="error-message">{errors.role}</span>}
                            </div>
                        )}
                        {searchParams.get('joinAsFarmer') && (
                            <div className="form-group">
                                <label>Joining as Farmer</label>
                                <div className="farmer-notice">
                                    <p>
                                        You're joining GreenFarm as a farmer. You'll be able to list your farms, crops, and connect with customers.
                                    </p>
                                </div>
                            </div>
                        )}
                        {formData.role === 'farmer' && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="address">Farm Address</label>
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter your farm address"
                                        className={errors.address ? 'error' : ''}
                                    />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="city">City</label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Enter your city"
                                        className={errors.city ? 'error' : ''}
                                    />
                                    {errors.city && <span className="error-message">{errors.city}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="state">State</label>
                                    <input
                                        type="text"
                                        id="state"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="Enter your state"
                                        className={errors.state ? 'error' : ''}
                                    />
                                    {errors.state && <span className="error-message">{errors.state}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="zipCode">Zip Code</label>
                                    <input
                                        type="text"
                                        id="zipCode"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleChange}
                                        placeholder="Enter your zip code"
                                        className={errors.zipCode ? 'error' : ''}
                                    />
                                    {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="landArea">Land Area (in acres)</label>
                                    <input
                                        type="number"
                                        id="landArea"
                                        name="landArea"
                                        value={formData.landArea}
                                        onChange={handleChange}
                                        placeholder="Enter your land area"
                                        className={errors.landArea ? 'error' : ''}
                                    />
                                    {errors.landArea && <span className="error-message">{errors.landArea}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="farmType">Farm Type</label>
                                    <select
                                        id="farmType"
                                        name="farmType"
                                        value={formData.farmType}
                                        onChange={handleChange}
                                        className={errors.farmType ? 'error' : ''}
                                    >
                                        <option value="">Select farm type</option>
                                        {FARM_TYPES.map(type => (
                                            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                        ))}
                                    </select>
                                    {errors.farmType && <span className="error-message">{errors.farmType}</span>}
                                </div>
                            </>
                        )}
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Enter your phone number"
                                className={errors.phone ? 'error' : ''}
                            />
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>
                        {!searchParams.get('joinAsFarmer') && (
                            <>
                                <div className="form-group password-group">
                                    <label htmlFor="password">Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Create a password"
                                            className={errors.password ? 'error' : ''}
                                        />
                                        <button
                                            type="button"
                                            className="show-password-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                    {errors.password && <span className="error-message">{errors.password}</span>}
                                </div>
                                <div className="form-group password-group">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Confirm your password"
                                            className={errors.confirmPassword ? 'error' : ''}
                                        />
                                        <button
                                            type="button"
                                            className="show-password-btn"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                                </div>
                            </>
                        )}
                        <div className="form-group">
                            <label htmlFor="bio">Tell us about yourself</label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                rows="3"
                                placeholder={formData.role === 'farmer' ? "Share your farming experience, methods, and what makes your farm special..." : "Tell us about yourself..."}
                                className={errors.bio ? 'error' : ''}
                            />
                            {errors.bio && <span className="error-message">{errors.bio}</span>}
                        </div>
                        <div className="remember-me">
                            <input type="checkbox" id="terms" name="terms" required />
                            <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
                        </div>
                        <button type="submit" className="register-button" disabled={loading}>
                            {loading ? 'Creating account...' : (searchParams.get('joinAsFarmer') ? 'Join as Farmer' : 'Create account')}
                        </button>
                    </form>
                    <div className="register-footer">
                        <p>Already have an account? <Link to="/login">Login</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register; 