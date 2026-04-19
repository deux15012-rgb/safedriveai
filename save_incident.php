<?php
header('Content-Type: application/json'); // Tell the browser we are sending JSON
$conn = new mysqli("localhost", "root", "", "safedriveai");

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed"]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Use null coalescing to prevent "Undefined index" errors
    $type = $_POST['type'] ?? 'Unknown';
    $duration = isset($_POST['duration']) ? (float)$_POST['duration'] : 0.0;
    $user = "Dexter"; 

    $stmt = $conn->prepare("INSERT INTO driver_incidents (user_id, incident_type, duration) VALUES (?, ?, ?)");
    $stmt->bind_param("ssd", $user, $type, $duration);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
}
?>