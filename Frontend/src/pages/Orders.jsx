import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Orders.css';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockOrders = [
      {
        id: 'ORD001',
        productName: 'Organic Tomatoes',
        price: 45.99,
        status: 'pending',
        date: '2024-01-15',
        quantity: 2,
        farmer: 'John Smith',
        customer: 'Alice Johnson'
      },
      {
        id: 'ORD002',
        productName: 'Fresh Carrots',
        price: 32.50,
        status: 'confirmed',
        date: '2024-01-14',
        quantity: 3,
        farmer: 'Sarah Wilson',
        customer: 'Bob Brown'
      },
      {
        id: 'ORD003',
        productName: 'Green Lettuce',
        price: 28.75,
        status: 'processing',
        date: '2024-01-13',
        quantity: 1,
        farmer: 'Mike Davis',
        customer: 'Carol White'
      },
      {
        id: 'ORD004',
        productName: 'Red Bell Peppers',
        price: 55.00,
        status: 'shipped',
        date: '2024-01-12',
        quantity: 4,
        farmer: 'Emma Taylor',
        customer: 'David Lee'
      },
      {
        id: 'ORD005',
        productName: 'Organic Spinach',
        price: 38.25,
        status: 'delivered',
        date: '2024-01-11',
        quantity: 2,
        farmer: 'Lisa Anderson',
        customer: 'Frank Miller'
      }
    ];

    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Confirmed' },
      processing: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Processing' },
      shipped: { bg: 'bg-green-100', text: 'text-green-800', label: 'Shipped' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    
    return (
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const handleCancelOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' }
        : order
    ));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="header">
        <h1>My Orders</h1>
        <p>Track and manage your farm-to-table orders</p>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed
        </button>
        <button 
          className={`filter-btn ${filter === 'processing' ? 'active' : ''}`}
          onClick={() => setFilter('processing')}
        >
          Processing
        </button>
        <button 
          className={`filter-btn ${filter === 'shipped' ? 'active' : ''}`}
          onClick={() => setFilter('shipped')}
        >
          Shipped
        </button>
        <button 
          className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
          onClick={() => setFilter('delivered')}
        >
          Delivered
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h3>No orders found</h3>
          <p>You haven't placed any orders yet. Start shopping for fresh farm products!</p>
          <Link to="/products" className="browse-btn">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <h3>{order.productName}</h3>
                <div className="order-price-status">
                  <div className="price">${order.price}</div>
                  {getStatusBadge(order.status)}
                </div>
              </div>

              <div className="order-details">
                <div className="detail">
                  <span>Order ID</span>
                  <span>{order.id}</span>
                </div>
                <div className="detail">
                  <span>Date</span>
                  <span>{new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div className="detail">
                  <span>Quantity</span>
                  <span>{order.quantity} items</span>
                </div>
                <div className="detail">
                  <span>Farmer</span>
                  <span>{order.farmer}</span>
                </div>
                <div className="detail">
                  <span>Customer</span>
                  <span>{order.customer}</span>
                </div>
              </div>

              <div className="order-actions">
                <Link to={`/orders/${order.id}`} className="view-btn">
                  View Details
                </Link>
                {order.status === 'pending' && (
                  <button 
                    className="cancel-btn"
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders; 