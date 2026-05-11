<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "safedriveai");

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Connection failed"]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = $_POST['type'] ?? 'Unknown';
    $duration = isset($_POST['duration']) ? (float)$_POST['duration'] : 0.0;
    
    // NEW: Catch the EAR value sent from detection.js
    $ear_value = isset($_POST['ear_value']) ? (float)$_POST['ear_value'] : 0.0;
    
    $user = "Dexter"; 

    // Updated Query to include ear_value
    $stmt = $conn->prepare("INSERT INTO driver_incidents (user_id, incident_type, duration, ear_value) VALUES (?, ?, ?, ?)");
    
    // Updated bind_param: "ssdd" 
    // (s = string, s = string, d = double/float, d = double/float)
    $stmt->bind_param("ssdd", $user, $type, $duration, $ear_value);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "received_ear" => $ear_value]);
    } else {
        echo json_encode(["status" => "error", "message" => $stmt->error]);
    }
}
?>