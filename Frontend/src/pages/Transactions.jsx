import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import PayPalCheckout from '../components/PayPalCheckout.jsx';
import './Transactions.css';

const Transactions = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const orderData = location.state?.orderData;

    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        startDate: '',
        endDate: ''
    });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Checkout form state
    const [checkoutForm, setCheckoutForm] = useState({
        paymentMethod: 'card',
        cardNumber: '',
        cardName: '',
        cardExpiry: '',
        cardCvv: '',
        // PhonePe fields
        phonepePhone: '',
        phonepeUpi: '',
        // PayPal fields
        paypalEmail: '',
        paypalPassword: '',
        deliveryAddress: '',
        deliveryCity: '',
        deliveryState: '',
        deliveryZipCode: '',
        notes: ''
    });
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        console.log('Transactions useEffect triggered:', { orderData, user });
        if (!orderData) {
            console.log('Fetching transactions and stats...');
            fetchTransactions();
            fetchStats();
        } else {
            console.log('Order data present, showing checkout form');
            setLoading(false);
        }
    }, [currentPage, filters, orderData]);

    const fetchTransactions = async () => {
        try {
            console.log('Fetching transactions...');
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                ...filters
            });

            const response = await api.get(`/transactions?${params}`);
            console.log('Transactions response:', response.data);
            setTransactions(response.data.transactions);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/transactions/stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setCurrentPage(1);
    };

    const handleTransactionClick = (transaction) => {
        setSelectedTransaction(transaction);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedTransaction(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            case 'cancelled': return 'secondary';
            default: return 'info';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'payment': return '💳';
            case 'refund': return '↩️';
            case 'commission': return '💰';
            case 'delivery_fee': return '🚚';
            case 'tax': return '📊';
            default: return '💱';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportTransactions = async () => {
        try {
            const params = new URLSearchParams({
                format: 'csv',
                ...filters
            });

            const response = await api.get(`/transactions/export?${params}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'transactions.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting transactions:', error);
        }
    };

    const handleCheckoutFormChange = (e) => {
        const { name, value } = e.target;
        setCheckoutForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const processPayment = async (e) => {
        e.preventDefault();
        setProcessingPayment(true);

        // Validate payment method specific fields
        let isValid = true;
        const errors = {};

        if (checkoutForm.paymentMethod === 'phonepe') {
            if (!checkoutForm.phonepePhone) {
                errors.phonepePhone = 'Phone number is required for PhonePe';
                isValid = false;
            }
        } else if (checkoutForm.paymentMethod === 'paypal') {
            // PayPal validation is handled by the PayPal SDK
            // No additional validation needed here
        } else if (checkoutForm.paymentMethod === 'card') {
            if (!checkoutForm.cardNumber) {
                errors.cardNumber = 'Card number is required';
                isValid = false;
            }
            if (!checkoutForm.cardName) {
                errors.cardName = 'Cardholder name is required';
                isValid = false;
            }
            if (!checkoutForm.cardExpiry) {
                errors.cardExpiry = 'Expiry date is required';
                isValid = false;
            }
            if (!checkoutForm.cardCvv) {
                errors.cardCvv = 'CVV is required';
                isValid = false;
            }
        }

        if (!isValid) {
            alert('Please fill in all required fields for the selected payment method.');
            setProcessingPayment(false);
            return;
        }

        // Skip processing for PayPal as it's handled by PayPal SDK
        if (checkoutForm.paymentMethod === 'paypal') {
            setProcessingPayment(false);
            return;
        }

        try {
            // Create order first
            const orderResponse = await api.post('/orders', {
                items: orderData.items.map(item => ({
                    product: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: orderData.subtotal,
                deliveryFee: orderData.shipping,
                tax: 0, // You can calculate tax based on your requirements
                total: orderData.total,
                paymentMethod: checkoutForm.paymentMethod,
                deliveryMethod: 'delivery',
                deliveryAddress: {
                    address: checkoutForm.deliveryAddress,
                    city: checkoutForm.deliveryCity,
                    state: checkoutForm.deliveryState,
                    zipCode: checkoutForm.deliveryZipCode
                },
                scheduledDate: new Date(),
                scheduledTime: 'ASAP',
                notes: {
                    buyer: checkoutForm.notes
                }
            });

            // Prepare payment details based on payment method
            const paymentDetails = {};
            if (checkoutForm.paymentMethod === 'phonepe') {
                paymentDetails.phonepePhone = checkoutForm.phonepePhone;
                paymentDetails.phonepeUpi = checkoutForm.phonepeUpi;
            } else if (checkoutForm.paymentMethod === 'paypal') {
                paymentDetails.paypalEmail = checkoutForm.paypalEmail;
            } else if (checkoutForm.paymentMethod === 'card') {
                paymentDetails.cardNumber = checkoutForm.cardNumber;
                paymentDetails.cardName = checkoutForm.cardName;
                paymentDetails.cardExpiry = checkoutForm.cardExpiry;
                paymentDetails.cardCvv = checkoutForm.cardCvv;
            }

            // Create transaction
            const transactionResponse = await api.post('/transactions', {
                orderId: orderResponse.data._id,
                type: 'payment',
                amount: orderData.total,
                paymentMethod: checkoutForm.paymentMethod,
                paymentProvider: checkoutForm.paymentMethod === 'phonepe' ? 'phonepe' :
                    checkoutForm.paymentMethod === 'paypal' ? 'paypal' : 'other',
                description: `Payment for order ${orderResponse.data.orderNumber}`,
                notes: checkoutForm.notes,
                paymentDetails
            });

            // Process the transaction
            await api.put(`/transactions/${transactionResponse.data._id}/process`);

            alert('Payment processed successfully!');
            navigate('/orders');
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setProcessingPayment(false);
        }
    };

    console.log('Transactions render state:', { loading, transactions: transactions.length, orderData, user });

    if (loading && transactions.length === 0) {
        return (
            <div className="transactions-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading transactions...</p>
                    <p>Debug: User: {user ? 'Authenticated' : 'Not authenticated'}</p>
                    <p>Debug: OrderData: {orderData ? 'Present' : 'Not present'}</p>
                </div>
            </div>
        );
    }

    // Show checkout form if orderData is present
    if (orderData) {
        return (
            <div className="transactions-page">
                <div className="transactions-container">
                    {/* Checkout Header */}
                    <div className="transactions-header">
                        <div className="header-content">
                            <h1>Checkout</h1>
                            <p>Complete your purchase securely</p>
                        </div>
                        <button className="back-btn" onClick={() => navigate('/cart')}>
                            ← Back to Cart
                        </button>
                    </div>

                    <div className="checkout-content">
                        <div className="order-summary">
                            <h2>Order Summary</h2>
                            <div className="order-items">
                                {orderData.items.map((item, index) => (
                                    <div key={index} className="order-item">
                                        <div className="item-info">
                                            <h4>{item.name}</h4>
                                            <p className="item-category">{item.category}</p>
                                        </div>
                                        <div className="item-details">
                                            <span className="quantity">Qty: {item.quantity}</span>
                                            <span className="price">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="order-totals">
                                <div className="total-line">
                                    <span>Subtotal:</span>
                                    <span>${orderData.subtotal.toFixed(2)}</span>
                                </div>
                                {orderData.discount > 0 && (
                                    <div className="total-line discount">
                                        <span>Discount:</span>
                                        <span>-${orderData.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="total-line">
                                    <span>Shipping:</span>
                                    <span>{orderData.shipping === 0 ? 'Free' : `$${orderData.shipping.toFixed(2)}`}</span>
                                </div>
                                <div className="total-line total">
                                    <span>Total:</span>
                                    <span>${orderData.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="checkout-form">
                            <h2>Payment Information</h2>
                            <form onSubmit={processPayment}>
                                <div className="form-section">
                                    <h3>Payment Method</h3>
                                    <div className="payment-methods">
                                        <label className="payment-method">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="card"
                                                checked={checkoutForm.paymentMethod === 'card'}
                                                onChange={handleCheckoutFormChange}
                                            />
                                            <span>💳 Credit/Debit Card</span>
                                        </label>
                                        <label className="payment-method">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="phonepe"
                                                checked={checkoutForm.paymentMethod === 'phonepe'}
                                                onChange={handleCheckoutFormChange}
                                            />
                                            <span>📱 PhonePe</span>
                                        </label>
                                        <label className="payment-method">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="paypal"
                                                checked={checkoutForm.paymentMethod === 'paypal'}
                                                onChange={handleCheckoutFormChange}
                                            />
                                            <span>💳 PayPal (In-App Payment)</span>
                                        </label>
                                        <label className="payment-method">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="cash"
                                                checked={checkoutForm.paymentMethod === 'cash'}
                                                onChange={handleCheckoutFormChange}
                                            />
                                            <span>💵 Cash on Delivery</span>
                                        </label>
                                    </div>
                                </div>

                                {checkoutForm.paymentMethod === 'card' && (
                                    <div className="form-section">
                                        <h3>Card Details</h3>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Card Number</label>
                                                <input
                                                    type="text"
                                                    name="cardNumber"
                                                    value={checkoutForm.cardNumber}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="1234 5678 9012 3456"
                                                    maxLength="19"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Cardholder Name</label>
                                                <input
                                                    type="text"
                                                    name="cardName"
                                                    value={checkoutForm.cardName}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Expiry Date</label>
                                                <input
                                                    type="text"
                                                    name="cardExpiry"
                                                    value={checkoutForm.cardExpiry}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="MM/YY"
                                                    maxLength="5"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>CVV</label>
                                                <input
                                                    type="text"
                                                    name="cardCvv"
                                                    value={checkoutForm.cardCvv}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="123"
                                                    maxLength="4"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {checkoutForm.paymentMethod === 'phonepe' && (
                                    <div className="form-section">
                                        <h3>PhonePe Details</h3>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    name="phonepePhone"
                                                    value={checkoutForm.phonepePhone}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="+91 98765 43210"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>UPI ID (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="phonepeUpi"
                                                    value={checkoutForm.phonepeUpi}
                                                    onChange={handleCheckoutFormChange}
                                                    placeholder="username@upi"
                                                />
                                            </div>
                                        </div>
                                        <div className="payment-info">
                                            <p>📱 You'll receive a payment link on your phone number</p>
                                            <p>💳 Complete the payment using PhonePe app</p>
                                        </div>
                                    </div>
                                )}

                                {checkoutForm.paymentMethod === 'paypal' && (
                                    <div className="form-section">
                                        <h3>PayPal In-App Payment</h3>
                                        <div className="payment-info">
                                            <p>💳 Click the PayPal button below to pay securely within this app</p>
                                            <p>🔒 Your payment will be processed instantly without leaving this page</p>
                                        </div>
                                        <PayPalCheckout
                                            amount={orderData.total}
                                            orderData={{
                                                orderId: null, // Will be set after order creation
                                                orderNumber: null, // Will be set after order creation
                                                farmerId: null // Will be set after order creation
                                            }}
                                            onSuccess={async (orderDetails) => {
                                                console.log('PayPal payment successful:', orderDetails);

                                                // Create order in your system
                                                try {
                                                    const orderResponse = await api.post('/orders', {
                                                        items: orderData.items.map(item => ({
                                                            product: item.id,
                                                            quantity: item.quantity,
                                                            price: item.price
                                                        })),
                                                        subtotal: orderData.subtotal,
                                                        deliveryFee: orderData.shipping,
                                                        tax: 0,
                                                        total: orderData.total,
                                                        paymentMethod: 'paypal',
                                                        deliveryMethod: 'delivery',
                                                        deliveryAddress: {
                                                            address: checkoutForm.deliveryAddress,
                                                            city: checkoutForm.deliveryCity,
                                                            state: checkoutForm.deliveryState,
                                                            zipCode: checkoutForm.deliveryZipCode
                                                        },
                                                        scheduledDate: new Date(),
                                                        scheduledTime: 'ASAP',
                                                        notes: {
                                                            buyer: checkoutForm.notes
                                                        }
                                                    });

                                                    // Update the transaction with order details
                                                    if (orderDetails.transactionId) {
                                                        await api.put(`/paypal/update-transaction/${orderDetails.transactionId}`, {
                                                            orderId: orderResponse.data._id,
                                                            orderNumber: orderResponse.data.orderNumber,
                                                            farmerId: orderResponse.data.farmer
                                                        });
                                                    }

                                                    alert('Payment successful! Your order has been placed.');
                                                    navigate('/orders');
                                                } catch (error) {
                                                    console.error('Error creating order:', error);
                                                    alert('Payment successful but there was an issue creating your order. Please contact support.');
                                                }
                                            }}
                                            onError={(error) => {
                                                console.error('PayPal payment failed:', error);
                                                alert('Payment failed. Please try again.');
                                            }}
                                            onProcessing={(processing) => {
                                                setProcessingPayment(processing);
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="form-section">
                                    <h3>Delivery Information</h3>
                                    <div className="form-group">
                                        <label>Delivery Address</label>
                                        <input
                                            type="text"
                                            name="deliveryAddress"
                                            value={checkoutForm.deliveryAddress}
                                            onChange={handleCheckoutFormChange}
                                            placeholder="123 Main Street"
                                            required
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>City</label>
                                            <input
                                                type="text"
                                                name="deliveryCity"
                                                value={checkoutForm.deliveryCity}
                                                onChange={handleCheckoutFormChange}
                                                placeholder="New York"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>State</label>
                                            <input
                                                type="text"
                                                name="deliveryState"
                                                value={checkoutForm.deliveryState}
                                                onChange={handleCheckoutFormChange}
                                                placeholder="NY"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>ZIP Code</label>
                                        <input
                                            type="text"
                                            name="deliveryZipCode"
                                            value={checkoutForm.deliveryZipCode}
                                            onChange={handleCheckoutFormChange}
                                            placeholder="10001"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h3>Additional Notes</h3>
                                    <div className="form-group">
                                        <textarea
                                            name="notes"
                                            value={checkoutForm.notes}
                                            onChange={handleCheckoutFormChange}
                                            placeholder="Any special instructions for delivery..."
                                            rows="3"
                                        />
                                    </div>
                                </div>

                                {checkoutForm.paymentMethod !== 'paypal' && (
                                    <button
                                        type="submit"
                                        className="checkout-submit-btn"
                                        disabled={processingPayment}
                                    >
                                        {processingPayment ? 'Processing Payment...' : `Pay $${orderData.total.toFixed(2)}`}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show regular transactions page
    return (
        <div className="transactions-page">
            <div className="transactions-container">
                {/* Header */}
                <div className="transactions-header">
                    <div className="header-content">
                        <h1>Transactions</h1>
                        <p>Track your financial activities and payment history</p>
                    </div>
                    <button className="export-btn" onClick={exportTransactions}>
                        📊 Export CSV
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <h3>Total Amount</h3>
                            <p>{formatCurrency(stats.totalAmount || 0)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-content">
                            <h3>Total Transactions</h3>
                            <p>{stats.totalTransactions || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <h3>Completed</h3>
                            <p>{stats.completedTransactions || 0}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-content">
                            <h3>Pending</h3>
                            <p>{stats.pendingTransactions || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters-section">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Status</label>
                            <select name="status" value={filters.status} onChange={handleFilterChange}>
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Type</label>
                            <select name="type" value={filters.type} onChange={handleFilterChange}>
                                <option value="">All Types</option>
                                <option value="payment">Payment</option>
                                <option value="refund">Refund</option>
                                <option value="commission">Commission</option>
                                <option value="delivery_fee">Delivery Fee</option>
                                <option value="tax">Tax</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className="filter-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="transactions-list">
                    {transactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No transactions found</h3>
                            <p>Your transaction history will appear here</p>
                        </div>
                    ) : (
                        <>
                            {transactions.map((transaction) => (
                                <div
                                    key={transaction._id}
                                    className="transaction-card"
                                    onClick={() => handleTransactionClick(transaction)}
                                >
                                    <div className="transaction-icon">
                                        {getTypeIcon(transaction.type)}
                                    </div>
                                    <div className="transaction-details">
                                        <div className="transaction-header">
                                            <h4>{transaction.description}</h4>
                                            <span className={`status-badge ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </div>
                                        <div className="transaction-info">
                                            <p className="transaction-id">ID: {transaction.transactionId}</p>
                                            <p className="transaction-date">{formatDate(transaction.createdAt)}</p>
                                        </div>
                                        <div className="transaction-meta">
                                            <span className="transaction-type">{transaction.type}</span>
                                            <span className="transaction-method">{transaction.paymentMethod}</span>
                                        </div>
                                    </div>
                                    <div className="transaction-amount">
                                        <h3>{formatCurrency(transaction.amount)}</h3>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        ← Previous
                                    </button>
                                    <span className="pagination-info">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Transaction Details Modal */}
            {showDetails && selectedTransaction && (
                <div className="modal-overlay" onClick={closeDetails}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Transaction Details</h2>
                            <button className="close-btn" onClick={closeDetails}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h3>Basic Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Transaction ID:</label>
                                        <span>{selectedTransaction.transactionId}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Type:</label>
                                        <span>{selectedTransaction.type}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Amount:</label>
                                        <span>{formatCurrency(selectedTransaction.amount)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Status:</label>
                                        <span className={`status-badge ${getStatusColor(selectedTransaction.status)}`}>
                                            {selectedTransaction.status}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Payment Method:</label>
                                        <span>{selectedTransaction.paymentMethod}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Created:</label>
                                        <span>{formatDate(selectedTransaction.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Order Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Order Number:</label>
                                        <span>{selectedTransaction.order?.orderNumber || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Order Status:</label>
                                        <span>{selectedTransaction.order?.status || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h3>Description</h3>
                                <p>{selectedTransaction.description}</p>
                            </div>

                            {selectedTransaction.notes && (
                                <div className="detail-section">
                                    <h3>Notes</h3>
                                    <p>{selectedTransaction.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions; 