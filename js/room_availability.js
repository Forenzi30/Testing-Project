// --- Room availability check ---
document.querySelectorAll('input[name="room"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        const roomType = this.value;
        const statusDiv = document.getElementById('room-availability-status');
        statusDiv.textContent = 'Checking availability...';
        fetch(`/api/room-availability?roomType=${encodeURIComponent(roomType)}`)
            .then(res => res.json())
            .then(data => {
                if (data.available) {
                    statusDiv.textContent = 'Room available!';
                    statusDiv.style.color = 'green';
                    document.querySelector('.order-btn').disabled = false;
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
// Optional: Disable order button by default until room checked
document.querySelector('.order-btn').disabled = true;
