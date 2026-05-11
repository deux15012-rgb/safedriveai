const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const earDisplay = document.getElementById('ear-val');

// 1. Setup MediaPipe Face Mesh
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true, 
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

// 2. Start Camera with specific constraints
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            predict();
        };
    } catch (err) {
        console.error("Camera access denied or not found:", err);
    }
}

// Remove setupCamera(); from the bottom!

async function predict() {
    try {
        if (videoElement.readyState >= 2) {
            await faceMesh.send({image: videoElement});
        }
    } catch (err) {
        console.error("MediaPipe Loop Error:", err);
    }
    // This ensures the loop continues even if one frame has an error
    requestAnimationFrame(predict);
}

// Ensure earDisplay is globally defined or fetched inside the function
function onResults(results) {
    const earDisplay = document.getElementById('ear-val'); 
    canvasCtx.save();
    
    // Clear and draw background frame
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // --- 1. BOX & FACE DETECTION BOUNDS ---
        let minX = canvasElement.width, minY = canvasElement.height, maxX = 0, maxY = 0;
        for (const lm of landmarks) {
            const x = lm.x * canvasElement.width;
            const y = lm.y * canvasElement.height;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }

        canvasCtx.strokeStyle = "#00FF00";
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(minX - 10, minY - 10, (maxX - minX) + 20, (maxY - minY) + 20);

        // --- 2. EAR LOGIC & LIVE CHART ---
        const leftEyePoints = [landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144]];
        const rawEar = calculateEAR(leftEyePoints);
        const smoothedEar = getSmoothedEAR(rawEar); 
        
        if (earDisplay) earDisplay.innerText = smoothedEar.toFixed(3);
        
        // Update the Live Telemetry Chart
        updateLiveChart(smoothedEar);

        // --- 3. HEAD POSE & DISTRACTION ---
        const pose = detectHeadPose(landmarks); // Saved as 'pose' to match checkDistraction
        
        // Run Alert Logic
        checkDrowsiness(smoothedEar);
        checkDistraction(pose, smoothedEar); 

        // Update Attention UI
        const attnDisplay = document.getElementById('attention-val');
        if (attnDisplay) {
            attnDisplay.innerText = pose === "FORWARD" ? "Focused" : pose;
            attnDisplay.className = pose === "FORWARD" ? "status-safe" : "status-warning";
        }

        // Draw Directional Arrow if looking away
        if (pose !== "FORWARD") {
            drawDirectionalArrow(landmarks, pose, canvasCtx);
        }

        // --- 4. EXPRESSION & OVERLAYS ---
        const expression = detectExpression(landmarks);
        const expDisplay = document.getElementById('expression-val');

        // Dynamic Text Placement
        let textY = minY - 25; 
        if (textY < 25) textY = minY + 40; 

        // Draw HUD Text
        canvasCtx.fillStyle = (expression === "YAWNING" || expression === "EYES CLOSED") ? "#ff4d4d" : (expression === "TIRED" ? "#fbff00" : "#00FF00");
        canvasCtx.font = "bold 22px Arial";
        canvasCtx.fillText(expression, minX, textY);

        // Visual Critical Warning Glow
        if (smoothedEar < 0.20) {
            drawEyeHighlight(landmarks, [33, 133], canvasCtx); 
            drawEyeHighlight(landmarks, [362, 263], canvasCtx); 
            
            canvasCtx.fillStyle = "#FF0000";
            canvasCtx.font = "bold 20px Arial";
            canvasCtx.fillText("DROWSINESS DETECTED", minX, minY - 50);
        }

        // Update Dashboard Expression Card
       // Update Dashboard Expression Card & Status Badge
if (expDisplay) {
    expDisplay.innerText = expression;

    // 1. Target the other elements we need to change
    const driveStatus = document.getElementById('drive-status');
    const mainBadge = document.getElementById('status-badge');

    // 2. Define our "Danger" conditions
    const isDanger = (expression === "YAWNING" || expression === "EYES CLOSED" || expression === "TIRED");

    if (isDanger) {
        // SWAP TO RED: Remove safe class, add danger class
        expDisplay.classList.remove('status-safe');
        expDisplay.classList.add('status-danger');

        if (driveStatus) {
            driveStatus.innerText = (expression === "EYES CLOSED") ? "CRITICAL" : "DROWSY";
            driveStatus.classList.replace('status-safe', 'status-danger');
        }

        if (mainBadge) {
            mainBadge.innerText = "WARNING";
            mainBadge.classList.replace('status-safe', 'status-danger');
        }
    } else {
        // SWAP TO GREEN: Remove danger class, add safe class
        expDisplay.classList.remove('status-danger');
        expDisplay.classList.add('status-safe');

        if (driveStatus) {
            driveStatus.innerText = "Active";
            driveStatus.classList.replace('status-danger', 'status-safe');
        }

        if (mainBadge) {
            mainBadge.innerText = "System Ready";
            mainBadge.classList.replace('status-danger', 'status-safe');
        }
    }
}

        // --- 5. MESH CONNECTORS ---
        if (window.drawConnectors) {
            drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#00FF00', lineWidth: 1});
            drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#00FF00', lineWidth: 1});
        }
    }
    canvasCtx.restore();
}
// Audio Priming: Browsers require a user click to play sound.
// This listener 'unlocks' both the alarm and the distraction voice.
document.addEventListener('click', function() {
    const alarm = document.getElementById('alarm-sound');
    const distraction = document.getElementById('distraction-sound');
    
    const sounds = [alarm, distraction];
    
    sounds.forEach(sound => {
        if (sound) {
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
            }).catch(e => console.log("Audio waiting for user interaction..."));
        }
    });
    
    console.log("SafeDrive AI Audio Systems Armed.");
}, { once: true });

// Global variable to store the chart instance
let incidentChart;
const MAX_DATA_POINTS = 30; // How many "frames" to show on the graph at once

function initChart() {
    const ctx = document.getElementById('incidentChart').getContext('2d');
    incidentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(MAX_DATA_POINTS).fill(''), // Empty labels for a clean look
            datasets: [{
                label: 'Live EAR (Eye Openness)',
                data: Array(MAX_DATA_POINTS).fill(0.3), // Start with a default "Neutral" line
                borderColor: '#00d4ff', // Cyan blue to match your header
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0 // Hides the dots for a smoother line
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // DISABLE animations for real-time performance
            scales: {
                y: { 
                    min: 0.1, 
                    max: 0.5, 
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                },
                x: { display: false } // Hide time labels to keep it clean
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}



// Update your existing updateIncidentTable function to also refresh the chart
function updateIncidentTable() {
    fetch('./get_incidents.php')
        .then(response => response.json())
        .then(data => {
            const dashBody = document.getElementById('incident-log-body');
            const overlayBody = document.getElementById('overlay-incident-body');
            
            const fillTable = (tbody) => {
                if (!tbody) {
                    console.warn("Table body not found!"); // Debugging line
                    return;
                }
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Clean driving record!</td></tr>";
                    return;
                }
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="color: #ff4d4d;">${row.incident_type}</td>
                        <td>${row.duration}s</td>
                        <td style="color: #888;">${row.timestamp}</td>
                    `;
                    tbody.appendChild(tr);
                });
            };

            fillTable(dashBody);    // Updates the main dashboard
            fillTable(overlayBody); // Updates the reaction test overlay
        });
}
let sessionData = []; // This stores EVERYTHING for the average calculation

function updateLiveChart(newValue) {
    if (!incidentChart) return;

    // Store for average calculation
    sessionData.push(newValue);

    // Existing rolling window logic
    incidentChart.data.datasets[0].data.push(newValue);
    incidentChart.data.datasets[0].data.shift();

    // Color logic
    if (newValue < 0.20) {
        incidentChart.data.datasets[0].borderColor = '#ff4d4d';
    } else {
        incidentChart.data.datasets[0].borderColor = '#00d4ff';
    }

    incidentChart.update('none');
}

// Modify your window.onload to trigger the chart setup
window.addEventListener('load', () => {
    initChart();
    updateIncidentTable();
});
// --- Function 1: Export Chart as PNG ---
function exportPNG() {
    if (!incidentChart) return;
    
    // Convert the canvas to a base64 image link
    const imageLink = document.createElement('a');
    imageLink.download = 'SafeDrive_Incident_Graph.png';
    imageLink.href = incidentChart.toBase64Image();
    imageLink.click();
}

// --- Function 2: Export Data as CSV ---
function exportCSV() {
    fetch('./get_incidents.php')
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert("No incident data available to export.");
                return;
            }

            // Expanded Headers: Type, Duration, Timestamp, EAR Value
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Incident Type,Duration (s),Timestamp,EAR Value\n";

            data.forEach(row => {
                // We use '??' to provide a fallback if a value is missing
                const type = row.incident_type || "N/A";
                const dur = row.duration || "0";
                const time = row.timestamp || "N/A";
                const ear = row.ear_value || row.avg_ear || "0.000";

                csvContent += `${type},${dur},${time},${ear}\n`;
            });

            // Trigger the download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `SafeDrive_Report_${new Date().toLocaleDateString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
}
function exportDailyCSV() {
    // Notice the ?filter=today added to the URL
    fetch('./get_incidents.php?filter=today')
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert("No incidents recorded for today yet!");
                return;
            }
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Type,Duration (s),Timestamp,EAR Value\n";

            data.forEach(row => {
                // Formatting for Excel compatibility
                const type = row.incident_type;
                const dur = row.duration;
                const time = `"${row.timestamp}"`; // Quotes prevent the ####### error
                const ear = row.ear_value || "0.000";

                csvContent += `${type},${dur},${time},${ear}\n`;
            });

            // Filename includes the current date
            const today = new Date().toISOString().split('T')[0];
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `SafeDrive_Daily_${today}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
}
function exportGraphWithAverage() {
    // Look for the canvas. Change 'earChart' if your ID is different!
    const chartCanvas = document.querySelector('canvas'); 
    
    if (!chartCanvas) {
        console.error("DEBUG: No canvas element found on this page at all.");
        alert("System Error: Canvas not found. Check your index.php for a <canvas> tag.");
        return;
    }

    console.log("DEBUG: Found canvas with ID:", chartCanvas.id);

    // 1. Calculate Average
    const sum = sessionData.reduce((a, b) => a + b, 0);
    const avg = sessionData.length > 0 ? (sum / sessionData.length).toFixed(3) : "0.000";

    // 2. Create Temp Canvas for the export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = chartCanvas.width;
    tempCanvas.height = chartCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 3. Draw original chart to temp
    tempCtx.drawImage(chartCanvas, 0, 0);

    // 4. Draw the Average Box
    tempCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
    tempCtx.fillRect(10, 10, 200, 40);
    tempCtx.fillStyle = "#00d4ff";
    tempCtx.font = "bold 18px Arial";
    tempCtx.fillText(`Avg EAR: ${avg}`, 25, 37);

    // 5. Trigger Download
    const link = document.createElement('a');
    link.download = `SafeDrive_Session_${new Date().getHours()}h.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
}