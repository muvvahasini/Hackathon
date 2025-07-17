import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productsAPI } from '../services/api'
import './Products.css'

const Products = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      console.log('Fetching products from API...')
      console.log('Current user token:', localStorage.getItem('token') ? 'Present' : 'Not present')
      
      const response = await productsAPI.getProducts()
      console.log('API Response:', response)
      
      // Handle the actual backend response structure
      const productsData = response.data?.data?.products || response.data?.products || []
      console.log('Products data:', productsData)
      
      // If no products from API, use fallback sample products
      if (productsData.length === 0) {
        console.log('No products from API, using fallback data')
        const fallbackProducts = [
          {
            _id: 'sample1',
            name: 'Fresh Organic Tomatoes',
            description: 'Sweet and juicy organic tomatoes, freshly harvested from our sustainable farm.',
            category: 'vegetables',
            price: { amount: 3.50, unit: 'lb' },
            images: [{
              url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
              isPrimary: true
            }],
            certifications: ['organic', 'local'],
            rating: { average: 4.5, count: 12 }
          },
          {
            _id: 'sample2',
            name: 'Organic Strawberries',
            description: 'Plump, red organic strawberries bursting with flavor. Perfect for desserts and smoothies.',
            category: 'fruits',
            price: { amount: 4.50, unit: 'lb' },
            images: [{
              url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
              isPrimary: true
            }],
            certifications: ['organic', 'local'],
            rating: { average: 4.8, count: 15 }
          },
          {
            _id: 'sample3',
            name: 'Farm Fresh Eggs',
            description: 'Large, brown eggs from free-range chickens. Rich in flavor and perfect for any recipe.',
            category: 'eggs',
            price: { amount: 5.00, unit: 'dozen' },
            images: [{
              url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
              isPrimary: true
            }],
            certifications: ['local'],
            rating: { average: 4.6, count: 18 }
          }
        ]
        setProducts(fallbackProducts)
      } else {
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      })
      
      // Use fallback products on error
      console.log('Using fallback products due to API error')
      const fallbackProducts = [
        {
          _id: 'sample1',
          name: 'Fresh Organic Tomatoes',
          description: 'Sweet and juicy organic tomatoes, freshly harvested from our sustainable farm.',
          category: 'vegetables',
          price: { amount: 3.50, unit: 'lb' },
          images: [{
            url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
            isPrimary: true
          }],
          certifications: ['organic', 'local'],
          rating: { average: 4.5, count: 12 }
        },
        {
          _id: 'sample2',
          name: 'Organic Strawberries',
          description: 'Plump, red organic strawberries bursting with flavor. Perfect for desserts and smoothies.',
          category: 'fruits',
          price: { amount: 4.50, unit: 'lb' },
          images: [{
            url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
            isPrimary: true
          }],
          certifications: ['organic', 'local'],
          rating: { average: 4.8, count: 15 }
        },
        {
          _id: 'sample3',
          name: 'Farm Fresh Eggs',
          description: 'Large, brown eggs from free-range chickens. Rich in flavor and perfect for any recipe.',
          category: 'eggs',
          price: { amount: 5.00, unit: 'dozen' },
          images: [{
            url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
            isPrimary: true
          }],
          certifications: ['local'],
          rating: { average: 4.6, count: 18 }
        }
      ]
      setProducts(fallbackProducts)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = category === 'all' || product.category === category
    return matchesSearch && matchesCategory
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      default:
        return 0
    }
  })

  const categories = ['all', 'vegetables', 'fruits', 'dairy', 'grains', 'herbs']

  if (loading) {
    return (
      <div className="products-page">
        <div className="products-container">
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="products-page">
      <div className="products-container">
        {/* Header */}
        <div className="products-header">
          <h1 className="products-title">Fresh Products</h1>
          <p className="products-subtitle">
            Discover fresh, local, and sustainable products from our community of farmers
          </p>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Search</label>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="filter-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">Name</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="empty-title">No products found</h3>
            <p className="empty-description">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="products-grid">
            {sortedProducts.map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="product-card"
              >
                <div className="product-image-container">
                  {(product.primaryImage || (product.images && product.images.length > 0)) ? (
                    <img
                      src={product.primaryImage || product.images[0].url}
                      alt={product.name}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image-placeholder">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="product-info">
                  <h3 className="product-name">
                    {product.name}
                  </h3>
                  <p className="product-description">
                    {product.description}
                  </p>

                  <div className="product-footer">
                    <div className="product-price-section">
                      <p className="product-price">
                        ${product.price?.amount ?? product.price}
                      </p>
                      <p className="product-unit">
                        per {product.price?.unit ?? product.unit}
                      </p>
                    </div>

                    <div className="product-rating">
                      <div className="stars-container">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`star ${star <= (product.rating?.average || product.rating || 0) ? 'filled' : 'empty'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="rating-count">
                        ({product.rating?.count || product.reviewCount || 0})
                      </span>
                    </div>
                  </div>

                  <div className="product-badges">
                    <span className="product-badge badge-primary">
                      {product.category}
                    </span>
                    {(product.certifications?.includes('organic')) && (
                      <span className="product-badge badge-success">
                        Organic
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Products 