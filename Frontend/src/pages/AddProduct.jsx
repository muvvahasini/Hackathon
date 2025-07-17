import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AddProduct.css';

const AddProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    totalKgs: '',
    totalPrice: '',
    pricePerKg: '',
    growingMethod: 'organic',
    minimumOrder: 1,
    maximumOrder: '',
    deliveryOptions: {
      pickup: true,
      delivery: false,
      deliveryRadius: 10,
      deliveryFee: 0
    },
    tags: []
  });

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Check if user is a farmer
  console.log('AddProduct: User data:', user);
  console.log('AddProduct: User role:', user?.role);

  if (user?.role !== 'farmer') {
    return (
      <div className="add-product-page">
        <div className="container">
          <div className="error-message">
            <h2>Access Denied</h2>
            <p>Only farmers can add products. Please contact support if you believe this is an error.</p>
            <p>Debug info: User role is "{user?.role}"</p>
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'herbs', label: 'Herbs' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'eggs', label: 'Eggs' },
    { value: 'meat', label: 'Meat' },
    { value: 'poultry', label: 'Poultry' },
    { value: 'fish', label: 'Fish' },
    { value: 'honey', label: 'Honey' },
    { value: 'flowers', label: 'Flowers' },
    { value: 'seeds', label: 'Seeds' },
    { value: 'plants', label: 'Plants' },
    { value: 'other', label: 'Other' }
  ];

  const growingMethods = [
    { value: 'organic', label: 'Organic' },
    { value: 'inorganic', label: 'Inorganic' },
    { value: 'permaculture', label: 'Permaculture' },
    { value: 'hydroponics', label: 'Hydroponics' },
    { value: 'aquaponics', label: 'Aquaponics' },
    { value: 'vertical-farming', label: 'Vertical Farming' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDeliveryOptionChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      deliveryOptions: {
        ...prev.deliveryOptions,
        [name]: checked
      }
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length + images.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (videoFiles.length + videos.length > 3) {
      alert('Maximum 3 videos allowed');
      return;
    }

    const newVideos = videoFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setVideos(prev => [...prev, ...newVideos]);
  };

  const removeImage = (index) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      return newImages;
    });
  };

  const removeVideo = (index) => {
    setVideos(prev => {
      const newVideos = prev.filter((_, i) => i !== index);
      return newVideos;
    });
  };

  const calculatePricePerKg = () => {
    if (formData.totalKgs && formData.totalPrice) {
      const pricePerKg = (parseFloat(formData.totalPrice) / parseFloat(formData.totalKgs)).toFixed(2);
      setFormData(prev => ({
        ...prev,
        pricePerKg: pricePerKg
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Product description is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.totalKgs || formData.totalKgs <= 0) newErrors.totalKgs = 'Valid quantity is required';
    if (!formData.totalPrice || formData.totalPrice <= 0) newErrors.totalPrice = 'Valid total price is required';
    if (images.length === 0) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file uploads
      const submitData = new FormData();

      // Add basic product data
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('subcategory', formData.subcategory);
      submitData.append('growingMethod', formData.growingMethod);
      submitData.append('minimumOrder', formData.minimumOrder);
      submitData.append('maximumOrder', formData.maximumOrder);

      // Add pricing data
      submitData.append('price[amount]', formData.pricePerKg);
      submitData.append('price[unit]', 'kg');

      // Add quantity data
      submitData.append('quantity[available]', formData.totalKgs);
      submitData.append('quantity[unit]', 'kg');

      // Add delivery options
      submitData.append('deliveryOptions[pickup]', formData.deliveryOptions.pickup);
      submitData.append('deliveryOptions[delivery]', formData.deliveryOptions.delivery);
      submitData.append('deliveryOptions[deliveryRadius]', formData.deliveryOptions.deliveryRadius);
      submitData.append('deliveryOptions[deliveryFee]', formData.deliveryOptions.deliveryFee);

      // Add certifications based on growing method
      if (formData.growingMethod === 'organic') {
        submitData.append('certifications[]', 'organic');
      }

      // Add images
      images.forEach((image, index) => {
        submitData.append('images', image.file);
        submitData.append(`imageCaptions[${index}]`, image.caption || '');
        submitData.append(`imagePrimary[${index}]`, index === 0); // First image is primary
      });

      // Add videos
      videos.forEach((video, index) => {
        submitData.append('videos', video.file);
      });

      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        alert('Product added successfully!');
        navigate('/dashboard');
      } else {
        throw new Error(data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.message || 'Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-product-page">
      <div className="container">
        <div className="add-product-header">
          <h1>Add New Product</h1>
          <p>Share your fresh produce with customers</p>
        </div>

        <form onSubmit={handleSubmit} className="add-product-form">
          {/* Basic Information */}
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Fresh Organic Tomatoes"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={errors.category ? 'error' : ''}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <span className="error-message">{errors.category}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Product Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your product, growing methods, taste, etc."
                rows="4"
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="subcategory">Subcategory (Optional)</label>
              <input
                type="text"
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                placeholder="e.g., Cherry Tomatoes, Heirloom"
              />
            </div>
          </div>

          {/* Quantity and Pricing */}
          <div className="form-section">
            <h2>Quantity & Pricing</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="totalKgs">Total Quantity (kg) *</label>
                <input
                  type="number"
                  id="totalKgs"
                  name="totalKgs"
                  value={formData.totalKgs}
                  onChange={handleInputChange}
                  placeholder="e.g., 50"
                  min="0"
                  step="0.1"
                  className={errors.totalKgs ? 'error' : ''}
                />
                {errors.totalKgs && <span className="error-message">{errors.totalKgs}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="totalPrice">Total Price ($) *</label>
                <input
                  type="number"
                  id="totalPrice"
                  name="totalPrice"
                  value={formData.totalPrice}
                  onChange={handleInputChange}
                  placeholder="e.g., 200"
                  min="0"
                  step="0.01"
                  className={errors.totalPrice ? 'error' : ''}
                />
                {errors.totalPrice && <span className="error-message">{errors.totalPrice}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="pricePerKg">Price per kg ($) *</label>
                <input
                  type="number"
                  id="pricePerKg"
                  name="pricePerKg"
                  value={formData.pricePerKg}
                  onChange={handleInputChange}
                  placeholder="Auto-calculated"
                  min="0"
                  step="0.01"
                  readOnly
                />
                <button
                  type="button"
                  onClick={calculatePricePerKg}
                  className="calculate-btn"
                >
                  Calculate
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="minimumOrder">Minimum Order (kg)</label>
                <input
                  type="number"
                  id="minimumOrder"
                  name="minimumOrder"
                  value={formData.minimumOrder}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maximumOrder">Maximum Order (kg)</label>
                <input
                  type="number"
                  id="maximumOrder"
                  name="maximumOrder"
                  value={formData.maximumOrder}
                  onChange={handleInputChange}
                  placeholder="No limit"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Growing Method */}
          <div className="form-section">
            <h2>Growing Method</h2>

            <div className="form-group">
              <label htmlFor="growingMethod">Growing Method *</label>
              <select
                id="growingMethod"
                name="growingMethod"
                value={formData.growingMethod}
                onChange={handleInputChange}
              >
                {growingMethods.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="form-section">
            <h2>Delivery Options</h2>

            <div className="delivery-options">
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="pickup"
                    checked={formData.deliveryOptions.pickup}
                    onChange={handleDeliveryOptionChange}
                  />
                  Pickup Available
                </label>
              </div>

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="delivery"
                    checked={formData.deliveryOptions.delivery}
                    onChange={handleDeliveryOptionChange}
                  />
                  Delivery Available
                </label>
              </div>

              {formData.deliveryOptions.delivery && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="deliveryRadius">Delivery Radius (km)</label>
                    <input
                      type="number"
                      id="deliveryRadius"
                      name="deliveryRadius"
                      value={formData.deliveryOptions.deliveryRadius}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        deliveryOptions: {
                          ...prev.deliveryOptions,
                          deliveryRadius: parseFloat(e.target.value)
                        }
                      }))}
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="deliveryFee">Delivery Fee ($)</label>
                    <input
                      type="number"
                      id="deliveryFee"
                      name="deliveryFee"
                      value={formData.deliveryOptions.deliveryFee}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        deliveryOptions: {
                          ...prev.deliveryOptions,
                          deliveryFee: parseFloat(e.target.value)
                        }
                      }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Upload */}
          <div className="form-section">
            <h2>Product Media</h2>

            {/* Images */}
            <div className="media-upload">
              <h3>Product Images *</h3>
              <p>Upload up to 5 images (first image will be the main image)</p>

              <div className="upload-area">
                <input
                  type="file"
                  id="images"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
                <label htmlFor="images" className="upload-label">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Choose Images</span>
                </label>
              </div>

              {errors.images && <span className="error-message">{errors.images}</span>}

              {images.length > 0 && (
                <div className="media-preview">
                  <h4>Uploaded Images ({images.length}/5)</h4>
                  <div className="image-grid">
                    {images.map((image, index) => (
                      <div key={index} className="image-item">
                        <img src={image.preview} alt={`Product ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="remove-btn"
                        >
                          ×
                        </button>
                        {index === 0 && <span className="primary-badge">Primary</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Videos */}
            <div className="media-upload">
              <h3>Product Videos (Optional)</h3>
              <p>Upload up to 3 videos to showcase your product</p>

              <div className="upload-area">
                <input
                  type="file"
                  id="videos"
                  multiple
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="file-input"
                />
                <label htmlFor="videos" className="upload-label">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Choose Videos</span>
                </label>
              </div>

              {videos.length > 0 && (
                <div className="media-preview">
                  <h4>Uploaded Videos ({videos.length}/3)</h4>
                  <div className="video-grid">
                    {videos.map((video, index) => (
                      <div key={index} className="video-item">
                        <video controls>
                          <source src={video.preview} type={video.file.type} />
                          Your browser does not support the video tag.
                        </video>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="remove-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct; 