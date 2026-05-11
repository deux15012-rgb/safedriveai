<?php
$conn = new mysqli("localhost", "root", "", "safedriveai");

if ($conn->connect_error) { 
    header('Content-Type: application/json');
    die(json_encode(["error" => "Connection failed"])); 
}

// Check for the filter in the URL
$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';

// LOGIC CHECK: 
// We use DATE(timestamp) = CURDATE() to strip the time and compare only the date
if ($filter === 'today') {
    $sql = "SELECT id, user_id, incident_type, duration, ear_value, timestamp 
            FROM driver_incidents 
            WHERE DATE(timestamp) = CURDATE() 
            ORDER BY timestamp DESC";
} else {
    $sql = "SELECT id, user_id, incident_type, duration, ear_value, timestamp 
            FROM driver_incidents 
            ORDER BY timestamp DESC";
}

$result = $conn->query($sql);
$incidents = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        $incidents[] = $row;
    }
}

header('Content-Type: application/json');
echo json_encode($incidents);
exit();
?>