<?php
header('Content-Type: application/json');

// Dummy data stok kamar (bisa diganti query ke database MySQL)
$roomStock = [
    "Standard" => 2,
    "Deluxe" => 0,
    "Executive" => 1
];

$roomType = isset($_GET['roomType']) ? $_GET['roomType'] : '';
$available = isset($roomStock[$roomType]) && $roomStock[$roomType] > 0;

echo json_encode(['available' => $available]);
?>
