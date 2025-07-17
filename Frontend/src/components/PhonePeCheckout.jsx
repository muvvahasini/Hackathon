import React, { useState, useEffect, useRef } from 'react';
import './PhonePeCheckout.css';

const PhonePeCheckout = ({
    amount,
    orderData,
    onSuccess,
    onError,
    onProcessing,
    currency = "INR"
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [upiId, setUpiId] = useState('');
    const [showUpiField, setShowUpiField] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [merchantTransactionId, setMerchantTransactionId] = useState(null);
    const [statusCheckInterval, setStatusCheckInterval] = useState(null);
    const [error, setError] = useState(null);

    // Clear status check interval on unmount
    useEffect(() => {
        return () => {
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
            }
        };
    }, [statusCheckInterval]);

    const handlePhoneNumberChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhoneNumber(value);
    };

    const handleUpiIdChange = (e) => {
        const value = e.target.value.toLowerCase();
        setUpiId(value);
    };

    const validateForm = () => {
        if (!phoneNumber || phoneNumber.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return false;
        }

        if (showUpiField && upiId && !upiId.includes('@')) {
            setError('Please enter a valid UPI ID (e.g., username@upi)');
            return false;
        }

        setError(null);
        return true;
    };

    const createPhonePeOrder = async () => {
        try {
            setIsProcessing(true);
            onProcessing?.(true);
            setError(null);

            const response = await fetch('http://localhost:5000/api/phonepe/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    amount,
                    orderData,
                    phoneNumber,
                    upiId: showUpiField ? upiId : null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create PhonePe order');
            }

            setMerchantTransactionId(data.merchantTransactionId);
            setPaymentStatus('pending');

            // Start status checking
            startStatusCheck(data.merchantTransactionId);

            // Open PhonePe app or redirect
            if (data.deeplink) {
                // For mobile devices - open PhonePe app
                window.location.href = data.deeplink;
            } else if (data.redirectUrl) {
                // For web - redirect to PhonePe payment page
                window.open(data.redirectUrl, '_blank');
            }

        } catch (error) {
            console.error('❌ Error creating PhonePe order:', error);
            setError(error.message);
            onError?.(error);
        } finally {
            setIsProcessing(false);
            onProcessing?.(false);
        }
    };

    const startStatusCheck = (transactionId) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('http://localhost:5000/api/phonepe/check-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        merchantTransactionId: transactionId
                    })
                });

                const data = await response.json();

                if (response.ok && data.phonepeStatus) {
                    if (data.phonepeStatus === 'PAYMENT_SUCCESS') {
                        setPaymentStatus('success');
                        clearInterval(interval);
                        setStatusCheckInterval(null);
                        onSuccess?.(data.transaction);
                    } else if (data.phonepeStatus === 'PAYMENT_ERROR' || data.phonepeStatus === 'PAYMENT_DECLINED') {
                        setPaymentStatus('failed');
                        clearInterval(interval);
                        setStatusCheckInterval(null);
                        setError('Payment failed. Please try again.');
                        onError?.(new Error('Payment failed'));
                    }
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
            }
        }, 3000); // Check every 3 seconds

        setStatusCheckInterval(interval);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        await createPhonePeOrder();
    };

    const handleManualCheck = async () => {
        if (!merchantTransactionId) return;

        try {
            const response = await fetch('http://localhost:5000/api/phonepe/check-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    merchantTransactionId
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.phonepeStatus === 'PAYMENT_SUCCESS') {
                    setPaymentStatus('success');
                    onSuccess?.(data.transaction);
                } else if (data.phonepeStatus === 'PAYMENT_ERROR') {
                    setPaymentStatus('failed');
                    setError('Payment failed. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error checking status:', error);
            setError('Failed to check payment status');
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    return (
        <div className="phonepe-checkout">
            <div className="phonepe-header">
                <div className="phonepe-logo">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#5F259F" />
                        <path d="M2 17L12 22L22 17" stroke="#5F259F" strokeWidth="2" />
                        <path d="M2 12L12 17L22 12" stroke="#5F259F" strokeWidth="2" />
                    </svg>
                    <span>PhonePe</span>
                </div>
                <div className="amount-display">
                    {formatAmount(amount)}
                </div>
            </div>

            {paymentStatus === 'pending' && merchantTransactionId && (
                <div className="payment-status">
                    <div className="status-indicator pending">
                        <div className="spinner"></div>
                        <span>Payment in Progress...</span>
                    </div>
                    <p>Please complete the payment in PhonePe app</p>
                    <button
                        className="check-status-btn"
                        onClick={handleManualCheck}
                        disabled={isProcessing}
                    >
                        Check Payment Status
                    </button>
                </div>
            )}

            {paymentStatus === 'success' && (
                <div className="payment-status">
                    <div className="status-indicator success">
                        <span>✓</span>
                        <span>Payment Successful!</span>
                    </div>
                    <p>Your payment has been processed successfully.</p>
                </div>
            )}

            {paymentStatus === 'failed' && (
                <div className="payment-status">
                    <div className="status-indicator failed">
                        <span>✕</span>
                        <span>Payment Failed</span>
                    </div>
                    <p>Please try again or choose a different payment method.</p>
                    <button
                        className="retry-btn"
                        onClick={() => {
                            setPaymentStatus('pending');
                            setMerchantTransactionId(null);
                            setError(null);
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!merchantTransactionId && (
                <form onSubmit={handleSubmit} className="phonepe-form">
                    <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number *</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            placeholder="Enter 10-digit phone number"
                            maxLength="10"
                            required
                            disabled={isProcessing}
                        />
                        <small>This number should be registered with PhonePe</small>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showUpiField}
                                onChange={(e) => setShowUpiField(e.target.checked)}
                                disabled={isProcessing}
                            />
                            <span>I have a UPI ID</span>
                        </label>
                    </div>

                    {showUpiField && (
                        <div className="form-group">
                            <label htmlFor="upiId">UPI ID (Optional)</label>
                            <input
                                type="text"
                                id="upiId"
                                value={upiId}
                                onChange={handleUpiIdChange}
                                placeholder="username@upi"
                                disabled={isProcessing}
                            />
                            <small>Enter your UPI ID for faster payment</small>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="phonepe-pay-btn"
                        disabled={isProcessing || !phoneNumber}
                    >
                        {isProcessing ? (
                            <>
                                <div className="spinner"></div>
                                Processing...
                            </>
                        ) : (
                            `Pay ${formatAmount(amount)} with PhonePe`
                        )}
                    </button>
                </form>
            )}

            <div className="phonepe-info">
                <h4>How PhonePe works:</h4>
                <ul>
                    <li>Enter your PhonePe registered mobile number</li>
                    <li>Optionally add your UPI ID for faster payment</li>
                    <li>Click "Pay" to open PhonePe app</li>
                    <li>Complete payment in the PhonePe app</li>
                    <li>Payment status will be updated automatically</li>
                </ul>
            </div>
        </div>
    );
};

export default PhonePeCheckout; 