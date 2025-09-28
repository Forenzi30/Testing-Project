// --- Room availability check ---
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('username');
}

let currentStock = 0;

// Map radio value to DB tipe value
function mapRoomType(value) {
    switch (value) {
        case 'Standard': return 'Standard_Room';
        case 'Deluxe': return 'Deluxe_Room';
        case 'Executive': return 'Executive_Suit';
        default: return value;
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
            })
            .catch(() => {
                statusDiv.textContent = 'Error checking availability';
                statusDiv.style.color = 'orange';
                currentStock = 0;
                updateOrderButtonState();
            });
    });
});

// Disable order button by default until room checked
document.querySelector('.order-btn').disabled = true;

// Optionally, update button state on page load
updateOrderButtonState();

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
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
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
            alert('Order successful!');
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
