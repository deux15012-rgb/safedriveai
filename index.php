<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeDrive AI - Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
    
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="reaction-overlay" class="overlay">
        <div class="test-box">
            <h2>Pre-Drive Fitness Check</h2>
            <p>To ensure road safety, please complete the reaction test.</p>
            <p>Click the <strong style="color:#e74c3c">RED TARGET</strong> as fast as you can.</p>
            
            <div id="target-area">
                <div id="target" style="display: none;"></div>
            </div>

            <p id="reaction-result">Ready when you are.</p>
            <button id="start-test-btn" class="main-btn">Start Test</button>

            <div class="overlay-history" style="margin-top: 30px; border-top: 1px solid #444; padding-top: 20px;">
                <h3 style="font-size: 1em; color: #aaa; margin-bottom: 10px;">Recent Trip Summary</h3>
                <div id="overlay-log-container">
                    <table style="width: 100%; font-size: 0.85em; text-align: left; border-collapse: collapse;">
                        <tbody id="overlay-incident-body">
                            </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <header class="main-header">
    <div class="header-content">
        <div class="branding">
            <img src="assets/my_logo.png" alt="SafeDrive Logo" class="app-logo">
            <div class="title-text">
                <h1>SafeDrive AI</h1>
                <p class="developer-tag">Designed by Dexter Oliver Robilin | BI23110083</p>
            </div>
        </div>
        <div id="status-badge" class="status-safe">System Ready</div>
    </div>
</header>

    <div class="header-right">
    </div>
</header>

           <main class="dashboard">
    <div class="left-col">
    <div class="video-container">
        <video id="webcam" autoplay playsinline></video>
        <canvas id="output_canvas"></canvas>
        <div class="hud-overlay">
            <div id="recording-dot"></div>
            <span id="system-time"></span>
        </div>
    </div>

        <div class="graph-card">
            <div class="card-header">
                <h3>Incident Activity (Duration)</h3>
                 <div class="export-tools">
                    <button onclick="exportGraphWithAverage()" class="btn-export">📷 Export Image</button>
                    <button onclick="exportCSV()" class="btn-export">📊 Export Data (CSV)</button>
                    <button onclick="exportDailyCSV()" class="btn-export">📅 Export Today Only</button>
                </div>
            </div>
            <div class="chart-container">
                 <canvas id="incidentChart"></canvas>
                 <canvas id="earChart"></canvas>
            </div>
        </div>
    </div>

    <div class="right-col">
        <div class="stats-panel">
            <div class="stat-card">
                <span class="label">EAR Value</span>
                <span id="ear-val">0.00</span>
            </div>

            <div class="stat-card">
                <span class="label">Expression</span>
                <span id="expression-val" class="status-safe">Neutral</span>
            </div>

            <div class="stat-card">
                <span class="label">Driving Status</span>
                <span id="drive-status" class="status-safe">Active</span>
            </div>
            
            <div class="stat-card">
                <span class="label">Attention</span>
                <span id="attention-val" class="status-safe">Focused</span>
            </div>

            <div class="stat-card log-card">
                <h3 style="margin-bottom: 10px; font-size: 0.9em; color: #aaa;">Recent Incidents</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8em;">
                    <thead>
                        <tr style="border-bottom: 1px solid #444; text-align: left;">
                            <th style="padding-bottom: 5px;">Type</th>
                            <th style="padding-bottom: 5px;">Dur.</th>
                            <th style="padding-bottom: 5px;">Time</th>
                        </tr>
                    </thead>
                    <tbody id="incident-log-body">
                        <tr><td colspan="3" style="text-align:center; padding-top:10px; color:#666;">No incidents logged</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</main>
    </div>

    <audio id="alarm-sound" src="assets/alarm.mp3" preload="auto"></audio>
    <audio id="distraction-sound" src="assets/distraction_alert.mp3" preload="auto"></audio>

    <script src="js/detection.js"></script>
    <script src="js/reaction.js"></script>
    <script src="js/chart.min.js"></script>
    <script src="js/main.js"></script>
    <link rel="manifest" href="manifest.json">

<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker Registered'))
        .catch(err => console.log('Service Worker Failed', err));
    });
  }
</script>
</body>
</html>