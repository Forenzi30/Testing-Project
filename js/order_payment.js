// Midtrans Payment Integration
const MIDTRANS_CLIENT_KEY = 'Mid-client-lfiFN7YapXT9V7ze'; // This will be loaded from .env in production

// Load Midtrans Snap SDK
function loadMidtransSDK() {
    return new Promise((resolve, reject) => {
        if (window.snap) {
            resolve(window.snap);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
        script.onload = () => {
            console.log('Midtrans Snap SDK loaded successfully');
            resolve(window.snap);
        };
        script.onerror = (error) => {
            console.error('Failed to load Midtrans SDK:', error);
            reject(new Error('Failed to load Midtrans SDK'));
        };
        document.head.appendChild(script);
    });
}

// Create Midtrans payment
async function createMidtransPayment(orderData) {
    try {
        // Calculate total amount (you can customize this based on room type and duration)
        const roomPrices = {
            'Standard Room': 500000,
            'Deluxe Room': 750000,
            'Executive Suite': 1000000
        };
        
        const grossAmount = roomPrices[orderData.roomType] || 500000;
        
        // Get order ID from the order creation response
        const orderId = orderData.midtrans_order_id || `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const paymentData = {
            order_id: orderId,
            gross_amount: grossAmount,
            customer_details: {
                first_name: orderData.name,
                email: orderData.email,
                phone: orderData.mobile_number || orderData.phone_number
            },
            item_details: [{
                id: orderData.roomType,
                price: grossAmount,
                quantity: 1,
                name: `${orderData.roomType.replace('_', ' ')} - ${orderData.check_in} to ${orderData.check_out}`,
                category: 'Accommodation'
            }]
        };

        // Create payment token
        const response = await fetch('/api/midtrans/create-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();
        
        if (result.success) {
            // Load Midtrans SDK and open payment popup
            const snap = await loadMidtransSDK();
            snap.pay(result.token, {
                onSuccess: function(result) {
                    console.log('Payment success:', result);
                    // Update payment status in database
                    updatePaymentStatusInDB(orderData.midtrans_order_id, 'completed');
                    // Update UI to show success
                    updatePaymentStatus('success', result);
                    // Redirect to history page after 2 seconds
                    setTimeout(() => {
                        window.location.href = 'history.html';
                    }, 2000);
                },
                onPending: function(result) {
                    console.log('Payment pending:', result);
                    // Update payment status in database
                    updatePaymentStatusInDB(orderData.midtrans_order_id, 'pending');
                    // Update UI to show pending
                    updatePaymentStatus('pending', result);
                    // Redirect to history page to check status
                    setTimeout(() => {
                        window.location.href = 'history.html';
                    }, 2000);
                },
                onError: function(result) {
                    console.log('Payment error:', result);
                    // Update payment status in database
                    updatePaymentStatusInDB(orderData.midtrans_order_id, 'failed');
                    // Update UI to show error
                    updatePaymentStatus('error', result);
                    // Stay on current page for retry
                },
                onClose: function() {
                    console.log('Payment popup closed');
                    // User closed the payment popup - no action needed
                }
            });
        } else {
            throw new Error(result.message || 'Failed to create payment token');
        }
    } catch (error) {
        console.error('Payment creation error:', error);
        alert('Failed to initiate payment: ' + error.message);
    }
}

// Update payment status UI
function updatePaymentStatus(status, result) {
    const orderBtn = document.querySelector('.order-btn');
    const priceInfo = document.getElementById('price-info');
    
    if (status === 'success') {
        orderBtn.textContent = '✓ Payment Successful!';
        orderBtn.style.background = '#27ae60';
        orderBtn.disabled = true;
        
        if (priceInfo) {
            priceInfo.innerHTML = `
                <h4 style="color: #27ae60;">
                    <i class="fas fa-check-circle"></i> Payment Successful!
                </h4>
                <p>Redirecting to transaction history...</p>
            `;
        }
        
        // Show success message
        showNotification('Payment successful! Redirecting to history...', 'success');
        
    } else if (status === 'pending') {
        orderBtn.textContent = '⏳ Payment Pending';
        orderBtn.style.background = '#f39c12';
        orderBtn.disabled = true;
        
        if (priceInfo) {
            priceInfo.innerHTML = `
                <h4 style="color: #f39c12;">
                    <i class="fas fa-clock"></i> Payment Pending
                </h4>
                <p>Please complete your payment. Redirecting to history...</p>
            `;
        }
        
        // Show pending message
        showNotification('Payment is pending. Please complete your payment.', 'warning');
        
    } else if (status === 'error') {
        orderBtn.textContent = '❌ Payment Failed - Try Again';
        orderBtn.style.background = '#e74c3c';
        orderBtn.disabled = false;
        
        if (priceInfo) {
            priceInfo.innerHTML = `
                <h4 style="color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i> Payment Failed
                </h4>
                <p>Please try again or contact support.</p>
            `;
        }
        
        // Show error message
        showNotification('Payment failed. Please try again.', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease;
    `;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#27ae60';
            break;
        case 'warning':
            notification.style.background = '#f39c12';
            break;
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        default:
            notification.style.background = '#3498db';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Legacy payment redirect function (for backward compatibility)
function redirectToPayment(orderId) {
    // This function is now replaced by createMidtransPayment
    console.log('Legacy payment redirect called for order:', orderId);
    alert('Please use the new Midtrans payment system.');
}

// Update payment status in database
async function updatePaymentStatusInDB(orderId, status) {
    try {
        const response = await fetch('/api/update-payment-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                status: status
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Payment status updated in database:', status);
        } else {
            console.error('Failed to update payment status:', result.message);
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
    }
}

// Example usage: call createMidtransPayment(orderData) after order is successful
// You may need to integrate this with your order form's .then() logic in room_availability.js or similar
