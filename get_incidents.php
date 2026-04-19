
<?php
$conn = new mysqli("localhost", "root", "", "safedriveai");

// Check connection
if ($conn->connect_error) { die("Connection failed"); }

$result = $conn->query("SELECT incident_type, duration, timestamp FROM driver_incidents ORDER BY timestamp DESC LIMIT 5");

$incidents = [];
while($row = $result->fetch_assoc()) {
    $incidents[] = $row;
}

// Ensure NO other text has been echoed before this point
header('Content-Type: application/json');
echo json_encode($incidents);
exit(); // Add exit to stop any trailing spaces from being sent
?>