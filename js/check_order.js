// Check Order Status Logic

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('checkOrderForm');
    const checkBtn = document.getElementById('checkBtn');
    const errorMessage = document.getElementById('errorMessage');
    const orderResult = document.getElementById('orderResult');
    const resultDetails = document.getElementById('resultDetails');

    // Check if there's a pending order from sessionStorage (after payment)
    const pendingOrderId = sessionStorage.getItem('pendingOrderId');
    const pendingOrderName = sessionStorage.getItem('pendingOrderName');
    const pendingOrderEmail = sessionStorage.getItem('pendingOrderEmail');

    if (pendingOrderId && pendingOrderEmail) {
        // Show welcome modal with Order ID
        showOrderConfirmationModal(pendingOrderId, pendingOrderName, pendingOrderEmail);

        // Clear sessionStorage
        sessionStorage.removeItem('pendingOrderId');
        sessionStorage.removeItem('pendingOrderName');
        sessionStorage.removeItem('pendingOrderEmail');

        // Auto-fill and submit form after modal closes
        document.getElementById('orderId').value = pendingOrderId;
        document.getElementById('email').value = pendingOrderEmail;
    }

    // Check if order ID is passed via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get('orderId');
    const emailParam = urlParams.get('email');

    if (orderIdParam && emailParam && !pendingOrderId) {
        // Auto-fill form from URL parameters (if not already filled from sessionStorage)
        document.getElementById('orderId').value = orderIdParam;
        document.getElementById('email').value = emailParam;

        // Auto-submit form
        setTimeout(() => {
            form.dispatchEvent(new Event('submit'));
        }, 500);
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const orderId = document.getElementById('orderId').value.trim();
        const email = document.getElementById('email').value.trim();

        // Hide previous results
        errorMessage.classList.remove('show');
        orderResult.classList.remove('show');

        // Validate inputs
        if (!orderId || !email) {
            showError('Please fill in both Order ID and Email');
            return;
        }

        // Disable button and show loading
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        try {
            // Call API to check order status
            const response = await fetch('/api/check-order-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order_id: orderId,
                    email: email
                })
            });

            const data = await response.json();

            if (data.success && data.order) {
                // Display order details
                displayOrderDetails(data.order);
            } else {
                showError(data.message || 'Order not found. Please check your Order ID and Email.');
            }

        } catch (error) {
            console.error('Check order error:', error);
            showError('Failed to check order. Please try again later.');
        } finally {
            // Re-enable button
            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-search"></i> Check Order Status';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        orderResult.classList.remove('show');
    }

    function displayOrderDetails(order) {
        // Format dates
        const checkIn = new Date(order.check_in).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const checkOut = new Date(order.check_out).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const bookingDate = new Date(order.created_at).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format price
        const totalPrice = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(order.gross_amount || order.room_price || 0);

        // Get status badge
        const statusBadge = getStatusBadge(order.payment_status);

        // Build details HTML
        const detailsHTML = `
            <div class="detail-row">
                <div class="detail-label">Order ID:</div>
                <div class="detail-value" style="font-family: monospace; font-weight: bold;">${order.midtrans_order_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Room Type:</div>
                <div class="detail-value"><strong>${order.roomType}</strong></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Check-in:</div>
                <div class="detail-value">${checkIn}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Check-out:</div>
                <div class="detail-value">${checkOut}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Guests:</div>
                <div class="detail-value">${order.adults} Adult(s)${order.childrens > 0 ? `, ${order.childrens} Child(ren)` : ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Total Price:</div>
                <div class="detail-value" style="font-size: 18px; font-weight: bold; color: #27ae60;">${totalPrice}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Payment Status:</div>
                <div class="detail-value">${statusBadge}</div>
            </div>
            ${order.payment_type ? `
            <div class="detail-row">
                <div class="detail-label">Payment Method:</div>
                <div class="detail-value">${formatPaymentType(order.payment_type)}</div>
            </div>
            ` : ''}
            <div class="detail-row">
                <div class="detail-label">Booking Date:</div>
                <div class="detail-value">${bookingDate}</div>
            </div>
            ${order.phone_number ? `
            <div class="detail-row">
                <div class="detail-label">Contact:</div>
                <div class="detail-value">${order.phone_number}</div>
            </div>
            ` : ''}
        `;

        resultDetails.innerHTML = detailsHTML;
        orderResult.classList.add('show');
        errorMessage.classList.remove('show');

        // Scroll to result
        setTimeout(() => {
            orderResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
    }

    function getStatusBadge(status) {
        const statusMap = {
            'completed': { class: 'status-completed', icon: 'check-circle', text: 'Payment Completed' },
            'paid': { class: 'status-paid', icon: 'check', text: 'Paid' },
            'pending': { class: 'status-pending', icon: 'clock', text: 'Payment Pending' },
            'failed': { class: 'status-failed', icon: 'times-circle', text: 'Payment Failed' },
            'challenged': { class: 'status-pending', icon: 'exclamation-triangle', text: 'Under Review' }
        };

        const statusInfo = statusMap[status] || { class: 'status-pending', icon: 'question-circle', text: status };

        return `<span class="status-badge ${statusInfo.class}">
            <i class="fas fa-${statusInfo.icon}"></i> ${statusInfo.text}
        </span>`;
    }

    function formatPaymentType(paymentType) {
        const typeMap = {
            'credit_card': 'Credit Card',
            'bank_transfer': 'Bank Transfer',
            'gopay': 'GoPay',
            'shopeepay': 'ShopeePay',
            'qris': 'QRIS',
            'cstore': 'Convenience Store',
            'akulaku': 'Akulaku'
        };

        return typeMap[paymentType] || paymentType;
    }

    // Show Order Confirmation Modal (after payment redirect)
    function showOrderConfirmationModal(orderId, customerName, customerEmail) {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.3s ease;
        `;

        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #27ae60; margin: 10px 0;">Payment Successful!</h2>
            <p style="color: #666; margin: 10px 0;">Thank you <strong>${customerName}</strong>, your payment has been processed.</p>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0 0 5px 0; color: #856404; font-weight: bold;">📋 Your Order ID:</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px;">
                    <input
                        type="text"
                        value="${orderId}"
                        id="modalOrderIdInput"
                        readonly
                        style="font-family: monospace; font-size: 16px; font-weight: bold; padding: 10px; border: 2px solid #ffc107; border-radius: 5px; text-align: center; width: 100%; max-width: 350px; background: white;"
                    />
                </div>
                <button
                    onclick="copyModalOrderId('${orderId}')"
                    id="modalCopyBtn"
                    style="margin-top: 10px; background: #ffc107; color: #856404; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.3s;"
                    onmouseover="this.style.background='#e0a800'"
                    onmouseout="this.style.background='#ffc107'"
                >
                    📋 Copy Order ID
                </button>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #856404;">⚠️ Save this Order ID to track your booking!</p>
            </div>

            <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: left;">
                <p style="margin: 0 0 10px 0; color: #0c5460; font-weight: bold;">📧 Confirmation Email</p>
                <p style="margin: 0; font-size: 14px; color: #0c5460;">
                    We sent a confirmation email to:<br>
                    <strong>${customerEmail}</strong>
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #0c5460;">
                    (Check your Spam folder if you don't see it)
                </p>
            </div>

            <p style="color: #666; font-size: 14px; margin: 20px 0;">Your order details will be displayed below...</p>

            <button
                onclick="closeModalAndShowOrder()"
                style="background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 10px; transition: all 0.3s;"
                onmouseover="this.style.background='#5568d3'"
                onmouseout="this.style.background='#667eea'"
            >
                OK, View Order Details
            </button>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        // Global function to copy Order ID
        window.copyModalOrderId = function(orderId) {
            const input = document.getElementById('modalOrderIdInput');
            input.select();
            input.setSelectionRange(0, 99999); // For mobile devices

            try {
                document.execCommand('copy');
                const btn = document.getElementById('modalCopyBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.background = '#27ae60';
                btn.style.color = 'white';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '#ffc107';
                    btn.style.color = '#856404';
                }, 2000);
            } catch (err) {
                alert('Order ID: ' + orderId);
            }
        };

        // Global function to close modal and show order details
        window.closeModalAndShowOrder = function() {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
            // Auto-submit form to show order details
            setTimeout(() => {
                form.dispatchEvent(new Event('submit'));
            }, 300);
        };

        // Auto close after 15 seconds
        setTimeout(() => {
            closeModalAndShowOrder();
        }, 15000);
    }
});
