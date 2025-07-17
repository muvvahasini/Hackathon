/**
 * Utility functions for transaction operations
 */

/**
 * Generate a unique transaction ID
 * Format: TXN + YYMMDD + 6-digit timestamp
 * Example: TXN231201123456
 */
// backend/utils/transactionUtils.js

function generateTransactionId() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `TXN${year}${month}${day}${timestamp}`;
  }
  
module.exports = {
    generateTransactionId, // ✅ make sure this is exported
  };
  

/**
 * Validate transaction data
 */
function validateTransactionData(data) {
    const required = ['buyer', 'farmer', 'type', 'amount', 'paymentMethod', 'description'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    
    return true;
}

module.exports = {
    generateTransactionId,
    validateTransactionData
}; 