// --- Smoothing Variables ---
let earBuffer = [];
const BUFFER_SIZE = 10; // Averaging the last 10 frames

function getSmoothedEAR(newEar) {
    earBuffer.push(newEar);
    if (earBuffer.length > BUFFER_SIZE) {
        earBuffer.shift(); // Remove the oldest value
    }
    // Calculate the average
    const sum = earBuffer.reduce((a, b) => a + b, 0);
    return sum / earBuffer.length;
}
// Landmark indices for the left eye
const LEFT_EYE = [33, 160, 158, 133, 153, 144];

// --- Drowsiness Logic Variables ---
let sleepStart = null;
let isAlarmPlaying = false; 

// Distraction Logic Variables
let distractionStart = null;
let isDistractionAlarmPlaying = false; // Added semicolon here
const SLEEP_THRESHOLD = 0.20; 
const SLEEP_TIME = 5000; 

// Add this missing helper function too!
function stopAlarm(audioElement) {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
}   

function calculateEAR(landmarks) {
    const v1 = Math.hypot(landmarks[1].x - landmarks[5].x, landmarks[1].y - landmarks[5].y);
    const v2 = Math.hypot(landmarks[2].x - landmarks[4].x, landmarks[2].y - landmarks[4].y);
    const h = Math.hypot(landmarks[0].x - landmarks[3].x, landmarks[0].y - landmarks[3].y);
    return (v1 + v2) / (2.0 * h);
}

function detectExpression(landmarks) {
    // 1. Calculate Eye Opening (Average of both eyes)
    const leftEye = calculateEAR([landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144]]);
    const rightEye = calculateEAR([landmarks[362], landmarks[385], landmarks[387], landmarks[263], landmarks[373], landmarks[380]]);
    const avgEAR = (leftEye + rightEye) / 2;

    // 2. Calculate Mouth Opening (Yawn detection)
    // Using landmarks 13 (inner top lip) and 14 (inner bottom lip)
    const mouthDistance = Math.abs(landmarks[13].y - landmarks[14].y);
    
    // Increased threshold slightly to 0.07 to avoid false positives from talking
    const isYawning = mouthDistance > 0.07; 

    // 3. Calculate Brow Heaviness (Tiredness)
    const browDistance = Math.abs(landmarks[52].y - landmarks[159].y);

    // --- LOGIC TREE ---
    // Priority 1: Yawning (Active sign of fatigue)
    if (isYawning) {
        return "YAWNING";
    }

    // Priority 2: Eyes Closed (Critical danger)
    if (avgEAR <= 0.20) {
        return "EYES CLOSED";
    }

    // Priority 3: Tired (Partial closure + heavy brows)
    if (avgEAR < 0.25 && browDistance < 0.04) {
        return "TIRED";
    }

    return "NEUTRAL";
}
function checkDrowsiness(ear) {
    const statusBadge = document.getElementById('drive-status');
    const timerCard = document.getElementById('timer-card');
    const timerVal = document.getElementById('timer-val');
    const alarmSound = document.getElementById('alarm-sound');

    const INTERNAL_THRESHOLD = 0.20; 

    if (ear < INTERNAL_THRESHOLD) {
        if (!sleepStart) sleepStart = Date.now();
        const duration = (Date.now() - sleepStart) / 1000; 

        if (duration >= 1.0) {
            statusBadge.innerText = "EYE IS CLOSED";
            statusBadge.className = "status-warning";
            if(timerCard) timerCard.style.display = "block"; 
            if(timerVal) timerVal.innerText = duration.toFixed(1) + "s";
        }

        if (duration >= 3.0) {
            statusBadge.innerText = "WARNING: DROWSINESS!";
            statusBadge.className = "status-danger";
            
            if (!isAlarmPlaying) {
                playAlarm(alarmSound);
                isAlarmPlaying = true;
                
                // --- LOG TO DATABASE ---
                logIncident("Drowsiness", duration.toFixed(1)); 
            }
        }
    } else {
        sleepStart = null;
        if (isAlarmPlaying) {
            stopAlarm(alarmSound);
            isAlarmPlaying = false;
        }
        
        if (statusBadge.innerText !== "WARNING: DISTRACTED!") {
            statusBadge.innerText = "Active";
            statusBadge.className = "status-safe";
            if(timerCard) timerCard.style.display = "none"; 
        }
    }
}
function detectHeadPose(landmarks) {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    // 1. Calculate Horizontal Turn (Yaw)
    const eyeCenter = (leftEye.x + rightEye.x) / 2;
    const yaw = (nose.x - eyeCenter) * 100; 

    // 2. Calculate Vertical Tilt (Pitch)
    const faceHeight = chin.y - forehead.y;
    const noseRelativePos = (nose.y - forehead.y) / faceHeight;
    const pitch = (noseRelativePos - 0.5) * 100;

    // --- NEW CALIBRATED THRESHOLDS ---
    
    // Increased from 12 to 18 to allow for mirror checks
    if (yaw > 18) return "LOOKING LEFT"; 
    if (yaw < -18) return "LOOKING RIGHT";

    // Pitch: Looking Down (often phone use)
    // Increased from 8 to 15 to allow looking at the dashboard
    if (pitch > 15) return "LOOKING DOWN"; 
    
    // Added Looking Up (checking rearview mirror)
    if (pitch < -15) return "LOOKING UP";

    return "FORWARD";
}
function checkDistraction(headPose) {
    const statusBadge = document.getElementById('drive-status');
    const distractionAudio = document.getElementById('distraction-sound');

    if (headPose !== "FORWARD") {
        if (!distractionStart) distractionStart = Date.now();
        const duration = (Date.now() - distractionStart) / 1000;

        if (duration >= 3.0) {
            statusBadge.innerText = "WARNING: DISTRACTED!";
            statusBadge.className = "status-danger";

            if (!isDistractionAlarmPlaying) {
                playDistractionAlarm();
                isDistractionAlarmPlaying = true;

                // --- LOG TO DATABASE ---
                // We log the incident as soon as the alarm starts playing
                logIncident("Distraction", duration.toFixed(1));
                
                // Optional: Refresh the UI table if you implemented updateIncidentTable()
                if (typeof updateIncidentTable === "function") {
                    updateIncidentTable();
                }
            }
        } else {
            statusBadge.innerText = "LOOK FORWARD";
            statusBadge.className = "status-warning";
        }
    } else {
        // RESET when they look back
        distractionStart = null;
        if (isDistractionAlarmPlaying) {
            stopDistractionAlarm();
            isDistractionAlarmPlaying = false;
        }
        
        if (statusBadge.innerText === "WARNING: DISTRACTED!" || statusBadge.innerText === "LOOK FORWARD") {
            statusBadge.innerText = "Active";
            statusBadge.className = "status-safe";
        }
    }
}
function playDistractionAlarm() {
    const distractionAudio = document.getElementById('distraction-sound');
    if (distractionAudio) {
        distractionAudio.loop = true; // Keep playing until they look back
        distractionAudio.play().catch(e => console.error("Distraction audio failed:", e));
    }
}
// Audio Helpers
function playAlarm(audioElement) {
    if (audioElement) {
        audioElement.play().catch(e => console.log("User interaction required for audio"));
    }
}

function stopDistractionAlarm() {
    const distractionAudio = document.getElementById('distraction-sound');
    if (distractionAudio) {
        distractionAudio.pause();
        distractionAudio.currentTime = 0; // Reset to start
    }
}

// Add this to the bottom of detection.js
function stopAlarm(audioElement) {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0; // Resets the sound to the beginning
    }
}
function logIncident(type, duration) {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('duration', duration);

    fetch('save_incident.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("Incident saved to safedriveai:", data);
        
        // This is the "magic" line that refreshes the UI table
        if (typeof updateIncidentTable === 'function') {
            updateIncidentTable();
        }
    })
    .catch(error => console.error("Error logging incident:", error));
}
function drawEyeHighlight(landmarks, indices, ctx) {
    // MediaPipe uses normalized coordinates (0-1), so we multiply by canvas size
    const p1 = landmarks[indices[0]];
    const p2 = landmarks[indices[1]];
    
    const x = p1.x * canvasElement.width;
    const y = p1.y * canvasElement.height;
    const width = (p2.x - p1.x) * canvasElement.width;
    
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "red";
    // Draw a box around the eye area
    ctx.strokeRect(x - 5, y - 15, width + 10, 30);
    ctx.shadowBlur = 0; // Turn off glow for other drawings
}

function drawDirectionalArrow(landmarks, pose, ctx) {
    const forehead = landmarks[10];
    const startX = forehead.x * canvasElement.width;
    const startY = (forehead.y * canvasElement.height) - 40;
    let endX = startX;
    
    if (pose === "LOOKING RIGHT") endX += 60;
    if (pose === "LOOKING LEFT") endX -= 60;
    if (pose === "LOOKING DOWN") endX = startX; // You could add vertical arrow logic here

    ctx.strokeStyle = "#fbff00";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, startY);
    ctx.stroke();

    // Draw arrow point
    ctx.beginPath();
    ctx.arc(endX, startY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#fbff00";
    ctx.fill();
}

function updateIncidentTable() {
    // We use ./ to ensure it looks in the current folder on your localhost
    fetch('./get_incidents.php')
        .then(response => {
            if (!response.ok) throw new Error("Could not fetch history");
            return response.json();
        })
        .then(data => {
            const tbody = document.getElementById('incident-log-body');
            if (!tbody) return;

            // Clear the "No incidents" message
            tbody.innerHTML = ""; 

            if (data.length === 0) {
                tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No incidents logged</td></tr>";
                return;
            }

            // Create a row for each incident returned by PHP
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #333";
                tr.innerHTML = `
                    <td style="padding: 10px; color: #e74c3c;">${row.incident_type}</td>
                    <td style="padding: 10px;">${row.duration}s</td>
                    <td style="padding: 10px; font-size: 0.8em; color: #888;">${row.timestamp}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error("History UI Error:", error));
}

// Run this once when the script loads so old incidents show up immediately
updateIncidentTable();