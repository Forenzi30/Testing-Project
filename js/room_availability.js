// --- Room availability check ---
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('username');
}

let currentStock = 0;

// Map radio value to DB tipe value
function mapRoomType(value) {
    switch (value) {
        case 'Standard': return 'Standard Room';
        case 'Deluxe': return 'Deluxe Room';
        case 'Executive': return 'Executive Suite';
        default: return value;
    }
}

// Room prices mapping
const roomPrices = {
    'Standard Room': 500000,
    'Deluxe Room': 750000,
    'Executive Suite': 1000000
};

// Update price display
function updatePriceDisplay(roomType) {
    const priceInfo = document.getElementById('price-info');
    const totalPrice = document.getElementById('total-price');
    
    if (priceInfo && totalPrice) {
        const price = roomPrices[roomType] || 0;
        totalPrice.textContent = `Rp ${price.toLocaleString('id-ID')}`;
        priceInfo.style.display = price > 0 ? 'block' : 'none';
    }
}

function updateOrderButtonState() {
    const orderBtn = document.querySelector('.order-btn');
    // Only enable if logged in and room is available
    orderBtn.disabled = !isLoggedIn() || currentStock <= 0;
}

// Call this after checking availability and on page load
document.querySelectorAll('input[name="room"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        const roomType = mapRoomType(this.value);
        const statusDiv = document.getElementById('room-availability-status');
        statusDiv.textContent = 'Checking availability...';
        fetch(`/api/room-availability?roomType=${encodeURIComponent(roomType)}`)
            .then(res => res.json())
            .then(data => {
                currentStock = data.stock;
                if (data.available) {
                    statusDiv.textContent = `Room available! Stock: ${data.stock}`;
                    statusDiv.style.color = 'green';
                } else {
                    statusDiv.textContent = 'Room not available!';
                    statusDiv.style.color = 'red';
                }
                updateOrderButtonState();
                updatePriceDisplay(roomType);
            })
            .catch(() => {
                statusDiv.textContent = 'Error checking availability';
                statusDiv.style.color = 'orange';
                currentStock = 0;
                updateOrderButtonState();
            });
    });
});

// Initialize order button state
document.addEventListener('DOMContentLoaded', function() {
    const orderBtn = document.querySelector('.order-btn');
    if (orderBtn) {
        orderBtn.disabled = !isLoggedIn();
        updateOrderButtonState();
    }
});


// Handle order button click
document.querySelector('.order-btn').addEventListener('click', function(event) {
    // Always prevent form submission (if button is inside a form)
    event.preventDefault();

    // Check login status first
    if (!isLoggedIn()) {
        alert('You must login first to order a room.');
        return;
    }

    if (currentStock <= 0) {
        alert('Room not available!');
        return;
    }
    const selectedRoom = document.querySelector('input[name="room"]:checked');
    if (!selectedRoom) {
        alert('Please select a room type.');
        return;
    }
    const roomType = selectedRoom.value;
    const username = localStorage.getItem('username');

    // Collect order form data
    const form = document.getElementById('order-form');
    const formData = new FormData(form);

    const orderData = {
        username,
        roomType: mapRoomType(roomType),
        name: formData.get('name'),
        email: formData.get('email'),
        check_in: formData.get('check_in'),
        check_out: formData.get('check_out'),
        adults: formData.get('adults'),
        childrens: formData.get('childrens'),
    };

    fetch('/api/order-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Order successful, now initiate payment
            alert('Order created successfully! Redirecting to payment...');
            
            // Add mobile_number and order ID to orderData for payment
            orderData.mobile_number = formData.get('mobile_number');
            orderData.midtrans_order_id = data.order_id; // Get order ID from response
            
            // Call Midtrans payment function
            if (typeof createMidtransPayment === 'function') {
                createMidtransPayment(orderData);
            } else {
                alert('Payment system not available. Please contact support.');
            }
            
            // Refresh availability after order
            selectedRoom.dispatchEvent(new Event('change'));
        } else {
            alert('Order failed: ' + data.message);
        }
    })
    .catch(() => {
        alert('Error ordering room.');
    });
});

document.addEventListener('DOMContentLoaded', function () {
    if (isLoggedIn()) {
        const username = localStorage.getItem('username');
        fetch(`/api/profile?username=${encodeURIComponent(username)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Autofill order form fields
                    const form = document.getElementById('order-form');
                    if (form) {
                        form.elements['name'].value = data.user.name || '';
                        form.elements['email'].value = data.user.email || '';
                        // Fix: set mobile_number field from phone_number
                        if (form.elements['mobile_number']) {
                            form.elements['mobile_number'].value = data.user.phone_number || '';
                        }
                    }
                }
            });
    }
});
