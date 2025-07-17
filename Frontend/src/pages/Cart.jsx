import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Organic Tomatoes",
      price: 4.99,
      quantity: 2,
      image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=150&h=150&fit=crop",
      category: "Vegetables"
    },
    {
      id: 2,
      name: "Fresh Strawberries",
      price: 6.99,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=150&h=150&fit=crop",
      category: "Fruits"
    },
    {
      id: 3,
      name: "Organic Carrots",
      price: 3.49,
      quantity: 3,
      image: "https://images.unsplash.com/photo-1447175008436-170170e5e656?w=150&h=150&fit=crop",
      category: "Vegetables"
    }
  ]);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const applyCoupon = () => {
    if (couponCode.toLowerCase() === 'green10') {
      setDiscount(10);
    } else if (couponCode.toLowerCase() === 'organic20') {
      setDiscount(20);
    } else {
      alert('Invalid coupon code');
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal - discountAmount + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <Link to="/products" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <span className="cart-count">{cartItems.length} items</span>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image} alt={item.name} />
                </div>

                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-category">{item.category}</p>
                  <p className="item-price">${item.price.toFixed(2)}</p>
                </div>

                <div className="item-quantity">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>

                <div className="item-total">
                  <p>${(item.price * item.quantity).toFixed(2)}</p>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-item">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="summary-item discount">
                <span>Discount ({discount}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-item">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <div className="coupon-section">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="coupon-input"
              />
              <button onClick={applyCoupon} className="apply-coupon-btn">
                Apply
              </button>
            </div>

            <button
              className="checkout-btn"
              onClick={() => {
                const orderData = {
                  items: cartItems,
                  subtotal: subtotal,
                  discount: discountAmount,
                  shipping: shipping,
                  total: total,
                  couponCode: couponCode
                };
                navigate('/transactions', { state: { orderData } });
              }}
            >
              Proceed to Checkout
            </button>

            <Link to="/products" className="continue-shopping-link">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
