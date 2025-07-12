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
        bio: ''
    });
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
    });
    const [farmImages, setFarmImages] = useState([]);
    const [farmVideos, setFarmVideos] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const { register, user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

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
        else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!searchParams.get('joinAsFarmer')) {
            if (!formData.password) newErrors.password = 'Password is required';
            else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
            else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
            if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
            else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (formData.role === 'farmer') {
            if (!formData.bio.trim()) newErrors.bio = 'Bio is required for farmers';
            if (!farmData.name.trim()) newErrors.farmName = 'Farm name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
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
            if (!searchParams.get('joinAsFarmer')) userData.password = formData.password;
            if (formData.role === 'farmer') {
                userData.location = { ...farmData.location };
            }
            const result = await register(userData);
            if (result.success) {
                if (formData.role === 'farmer') {
                    console.log('Farmer registered successfully, redirecting to add farm...');
                }
            } else {
                console.error('Registration failed:', result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-content">
                <div className="signup-card">
                    <div className="logo">
                        <h1>GreenFarm</h1>
                        <p>Join GreenFarm and start your sustainable journey</p>
                    </div>
                    <form className="signup-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input className="form-input" type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a username" />
                            {errors.username && <p className="form-error">{errors.username}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="firstName">First Name</label>
                            <input className="form-input" type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" />
                            {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="lastName">Last Name</label>
                            <input className="form-input" type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" />
                            {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email address</label>
                            <input className="form-input" type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" />
                            {errors.email && <p className="form-error">{errors.email}</p>}
                        </div>
                        {!searchParams.get('joinAsFarmer') && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="role">I want to join as</label>
                                <select className="form-input" id="role" name="role" value={formData.role} onChange={handleChange}>
                                    <option value="buyer">Customer</option>
                                    <option value="farmer">Farmer</option>
                                </select>
                            </div>
                        )}
                        {searchParams.get('joinAsFarmer') && (
                            <div className="form-group">
                                <label className="form-label">Joining as Farmer</label>
                                <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                                    <p className="text-sm text-primary-800">
                                        You're joining GreenFarm as a farmer. You'll be able to list your farms, crops, and connect with customers.
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label" htmlFor="phone">Phone Number</label>
                            <input className="form-input" type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" />
                            {errors.phone && <p className="form-error">{errors.phone}</p>}
                        </div>
                        {!searchParams.get('joinAsFarmer') && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="password">Password</label>
                                    <input className="form-input" type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" />
                                    {errors.password && <p className="form-error">{errors.password}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                                    <input className="form-input" type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" />
                                    {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                                </div>
                            </>
                        )}
                        <div className="form-group">
                            <label className="form-label" htmlFor="bio">Tell us about yourself</label>
                            <textarea className="form-input" id="bio" name="bio" value={formData.bio} onChange={handleChange} rows="3" placeholder={formData.role === 'farmer' ? "Share your farming experience, methods, and what makes your farm special..." : "Tell us about yourself..."} />
                            {errors.bio && <p className="form-error">{errors.bio}</p>}
                        </div>
                        <div className="form-group remember-me">
                            <input type="checkbox" id="terms" name="terms" required />
                            <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
                        </div>
                        <button type="submit" className="signup-button" disabled={loading}>
                            {loading ? 'Creating account...' : (searchParams.get('joinAsFarmer') ? 'Join as Farmer' : 'Create account')}
                        </button>
                    </form>
                    <div className="login-footer">
                        <p>Already have an account? <Link to="/login">Login</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register; 