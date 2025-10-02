// Transaction History Page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        alert('Please login to view your transaction history.');
        window.location.href = 'login.html';
        return;
    }
    
    loadTransactionHistory();
});

function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('username');
}

async function loadTransactionHistory() {
    const loading = document.getElementById('loading');
    const ordersContainer = document.getElementById('orders-container');
    const noOrders = document.getElementById('no-orders');
    
    try {
        const username = localStorage.getItem('username');
        const response = await fetch(`/api/order-history?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        loading.style.display = 'none';
        
        if (data.success && data.orders && data.orders.length > 0) {
            displayOrders(data.orders);
            ordersContainer.style.display = 'block';
        } else {
            noOrders.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading transaction history:', error);
        loading.style.display = 'none';
        noOrders.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error loading transactions</h3>
            <p>There was an error loading your transaction history. Please try again later.</p>
        `;
        noOrders.style.display = 'block';
    }
}

function displayOrders(orders) {
    const ordersContainer = document.getElementById('orders-container');
    
    ordersContainer.innerHTML = orders.map(order => {
        const statusClass = getStatusClass(order.payment_status);
        const statusText = getStatusText(order.payment_status);
        const formattedDate = formatDate(order.created_at);
        const formattedAmount = formatCurrency(order.gross_amount || order.room_price || 0);
        
        return `
            <div class="order-card ${statusClass}">
                <div class="order-header">
                    <div class="order-id">${order.midtrans_order_id || `Order #${order.id}`}</div>
                    <div class="order-status status-${statusClass}">${statusText}</div>
                </div>
                
                <div class="order-details">
                    <div class="detail-item">
                        <div class="detail-label">Room Type</div>
                        <div class="detail-value">${formatRoomType(order.room_type)}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Check In</div>
                        <div class="detail-value">${formatDate(order.check_in)}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Check Out</div>
                        <div class="detail-value">${formatDate(order.check_out)}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Guests</div>
                        <div class="detail-value">${order.adults} Adults${order.childrens > 0 ? `, ${order.childrens} Children` : ''}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Booking Date</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Payment Method</div>
                        <div class="detail-value">${order.payment_type ? formatPaymentType(order.payment_type) : 'Midtrans'}</div>
                    </div>
                </div>
                
                <div class="order-amount">
                    ${formattedAmount}
                </div>
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    switch (status) {
        case 'completed':
        case 'paid':
            return 'completed';
        case 'pending':
        case 'challenged':
            return 'pending';
        case 'failed':
        case 'cancel':
        case 'deny':
        case 'expire':
            return 'failed';
        default:
            return 'pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'completed':
            return 'Completed';
        case 'paid':
            return 'Paid';
        case 'pending':
            return 'Pending';
        case 'challenged':
            return 'Challenged';
        case 'failed':
            return 'Failed';
        case 'cancel':
            return 'Cancelled';
        case 'deny':
            return 'Denied';
        case 'expire':
            return 'Expired';
        default:
            return 'Unknown';
    }
}

function formatRoomType(roomType) {
    if (!roomType) return 'Unknown Room';
    return roomType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    if (!amount) return 'Rp 0';
    return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
}

function formatPaymentType(paymentType) {
    if (!paymentType) return 'Midtrans';
    
    const typeMap = {
        'credit_card': 'Credit Card',
        'bank_transfer': 'Bank Transfer',
        'bca_klikbca': 'BCA KlikBCA',
        'bca_klikpay': 'BCA KlikPay',
        'bri_epay': 'BRI e-Pay',
        'cimb_clicks': 'CIMB Clicks',
        'danamon_online': 'Danamon Online Banking',
        'mandiri_clickpay': 'Mandiri ClickPay',
        'mandiri_ecash': 'Mandiri e-Cash',
        'permata_va': 'Permata VA',
        'bca_va': 'BCA VA',
        'bni_va': 'BNI VA',
        'bri_va': 'BRI VA',
        'other_va': 'Other VA',
        'gopay': 'GoPay',
        'kredivo': 'Kredivo',
        'shopeepay': 'ShopeePay',
        'indomaret': 'Indomaret',
        'alfamart': 'Alfamart',
        'akulaku': 'Akulaku'
    };
    
    return typeMap[paymentType] || paymentType.replace(/_/g, ' ').toUpperCase();
}

