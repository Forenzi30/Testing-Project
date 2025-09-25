// --- Room availability check ---
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('username');
}

let currentStock = 0;

document.querySelectorAll('input[name="room"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        const roomType = this.value;
        const statusDiv = document.getElementById('room-availability-status');
        statusDiv.textContent = 'Checking availability...';
        fetch(`/api/room-availability?roomType=${encodeURIComponent(roomType)}`)
            .then(res => res.json())
            .then(data => {
                currentStock = data.stock;
                if (data.available) {
                    statusDiv.textContent = `Room available! Stock: ${data.stock}`;
                    statusDiv.style.color = 'green';
                    document.querySelector('.order-btn').disabled = !isLoggedIn();
                } else {
                    statusDiv.textContent = 'Room not available!';
                    statusDiv.style.color = 'red';
                    document.querySelector('.order-btn').disabled = true;
                }
            })
            .catch(() => {
                statusDiv.textContent = 'Error checking availability';
                statusDiv.style.color = 'orange';
                document.querySelector('.order-btn').disabled = true;
            });
    });
});

// Disable order button by default until room checked
document.querySelector('.order-btn').disabled = true;

// Handle order button click
document.querySelector('.order-btn').addEventListener('click', function() {
    if (!isLoggedIn()) {
        alert('You must login first to order a room.');
        window.location.href = 'login.html';
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
    fetch('/api/order-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, roomType })
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
