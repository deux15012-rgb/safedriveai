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
    
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // --- 1. BOX & FACE DETECTION ---
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

        // --- 2. SMOOTHED EAR LOGIC ---
        const leftEyePoints = [landmarks[33], landmarks[160], landmarks[158], landmarks[133], landmarks[153], landmarks[144]];
        const rawEar = calculateEAR(leftEyePoints);
        
        // Apply the smoothing filter
        const smoothedEar = getSmoothedEAR(rawEar); 
        
        if (earDisplay) earDisplay.innerText = smoothedEar.toFixed(2);
        
        // Use SMOOTHED ear for drowsiness logic
        checkDrowsiness(smoothedEar);

        // Visual Overlay: Red Glow if smoothed EAR is low
        if (smoothedEar < 0.20) {
            drawEyeHighlight(landmarks, [33, 133], canvasCtx); 
            drawEyeHighlight(landmarks, [362, 263], canvasCtx); 
            
            canvasCtx.fillStyle = "#FF0000";
            canvasCtx.font = "bold 20px Arial";
            canvasCtx.fillText("DROWSINESS DETECTED", minX, minY - 50);
        }

        // --- 3. HEAD POSE & DISTRACTION OVERLAY ---
        const headPose = detectHeadPose(landmarks);
        checkDistraction(headPose);

        if (headPose !== "FORWARD") {
            drawDirectionalArrow(landmarks, headPose, canvasCtx);
        }

        const attnDisplay = document.getElementById('attention-val');
        if (attnDisplay) {
            attnDisplay.innerText = headPose === "FORWARD" ? "Focused" : headPose;
            attnDisplay.className = headPose === "FORWARD" ? "status-safe" : "status-warning";
        }

        // --- 4. EXPRESSION & CONNECTORS ---
        // --- 4. EXPRESSION & UI UPDATES ---
        const expression = detectExpression(landmarks);
        const expDisplay = document.getElementById('expression-val');

        // 1. Logic to keep the text on the screen (Safety Check)
        let textY = minY - 25; 
        if (textY < 25) {
            textY = minY + 40; // If face is at the top, move text inside the box
        }

        // 2. Draw the text on the Camera Canvas
        canvasCtx.fillStyle = (expression === "YAWNING" || expression === "EYES CLOSED") ? "#ff4d4d" : "#00FF00";
        canvasCtx.font = "bold 22px Arial";
        canvasCtx.fillText(expression, minX, textY);

        // 3. Update the Dashboard Card (Your current logic)
        if (expDisplay) {
            expDisplay.innerText = expression;
            expDisplay.classList.remove('status-safe', 'status-warning', 'status-danger');

            if (expression === "YAWNING" || expression === "EYES CLOSED") {
                expDisplay.classList.add('status-warning'); 
                expDisplay.style.color = "#ff4d4d"; 
            } else if (expression === "TIRED") {
                expDisplay.classList.add('status-warning'); 
                expDisplay.style.color = "#fbff00";
            } else {
                expDisplay.classList.add('status-safe'); 
                expDisplay.style.color = "#00FF00";
            }
        }

        // --- 5. CONNECTORS ---
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

function updateIncidentTable() {
    fetch('./get_incidents.php')
        .then(response => response.json())
        .then(data => {
            // Target both the dashboard body and the overlay body
            const dashBody = document.getElementById('incident-log-body');
            const overlayBody = document.getElementById('overlay-incident-body');
            
            // Helper to fill a table body
            const fillTable = (tbody) => {
                if (!tbody) return;
                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Clean driving record!</td></tr>";
                    return;
                }
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 5px; color: #ff4d4d;">${row.incident_type}</td>
                        <td style="padding: 5px;">${row.duration}s</td>
                        <td style="padding: 5px; color: #888;">${row.timestamp}</td>
                    `;
                    tbody.appendChild(tr);
                });
            };

            fillTable(dashBody);
            fillTable(overlayBody);
        });
}
// This forces the table to check the database the moment the page opens
window.onload = () => {
    updateIncidentTable();
};