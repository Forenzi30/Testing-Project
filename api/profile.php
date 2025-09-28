<?php
header('Content-Type: application/json');

// Database config
$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'hotel';
$port = 3306;

// Connect to MySQL
$conn = new mysqli($host, $user, $pass, $dbname, $port);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// GET: fetch user profile
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $username = isset($_GET['username']) ? $_GET['username'] : '';
    if (!$username) {
        echo json_encode(['success' => false, 'message' => 'No username provided']);
        exit;
    }
    $stmt = $conn->prepare("SELECT username, name, email, phone_number, address FROM pelanggan WHERE username = ?");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($user = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
    $stmt->close();
    $conn->close();
    exit;
}

// POST: update user profile
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = isset($data['username']) ? $data['username'] : '';
    $name = isset($data['name']) ? $data['name'] : '';
    $email = isset($data['email']) ? $data['email'] : '';
    $phone = isset($data['phone_number']) ? $data['phone_number'] : '';
    $address = isset($data['address']) ? $data['address'] : '';
    $password = isset($data['password']) ? $data['password'] : '';

    if (!$username || !$name || !$email || !$phone) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // If password is provided, update it (hashed)
    if ($password) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE pelanggan SET name=?, email=?, phone_number=?, address=?, password=? WHERE username=?");
        $stmt->bind_param('ssssss', $name, $email, $phone, $address, $hashed, $username);
    } else {
        $stmt = $conn->prepare("UPDATE pelanggan SET name=?, email=?, phone_number=?, address=? WHERE username=?");
        $stmt->bind_param('sssss', $name, $email, $phone, $address, $username);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
    }
    $stmt->close();
    $conn->close();
    exit;
}

// If not GET or POST
echo json_encode(['success' => false, 'message' => 'Invalid request']);
$conn->close();
exit;
