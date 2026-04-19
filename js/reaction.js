let startTime, endTime;
let reactionTimes = [];
const target = document.getElementById('target');
const resultText = document.getElementById('reaction-result');

document.getElementById('start-test-btn').addEventListener('click', startReactionTest);

function startReactionTest() {
    reactionTimes = [];
    resultText.innerText = "Get ready...";
    document.getElementById('start-test-btn').style.display = 'none';
    runTrial();
}

function runTrial() {
    if (reactionTimes.length >= 3) {
        finishTest();
        return;
    }

    const delay = Math.random() * 3000 + 1000;
    
    setTimeout(() => {
        // Double check we haven't finished the test during the timeout
        if (reactionTimes.length < 3) {
            const x = Math.random() * 240;
            const y = Math.random() * 240;
            target.style.left = x + "px";
            target.style.top = y + "px";
            target.style.display = "block";
            startTime = Date.now();
        }
    }, delay);
}

target.addEventListener('click', () => {
    endTime = Date.now();
    const duration = endTime - startTime;
    reactionTimes.push(duration);
    target.style.display = "none";
    
    resultText.innerText = `Trial ${reactionTimes.length}: ${duration}ms`;
    runTrial();
});

function finishTest() {
    const average = reactionTimes.reduce((a, b) => a + b) / reactionTimes.length;
    const avgSec = (average / 1000); 
    
    let classification = "";
    let color = "";
    let canDrive = false;

    if (avgSec < 0.5) {
        classification = "OPTIMAL: You are highly alert and ready.";
        color = "#2ecc71";
        canDrive = true;
    } else if (avgSec <= 1.0) {
        classification = "AVERAGE: Normal response time.";
        color = "#2ecc71";
        canDrive = true;
    } else if (avgSec <= 1.5) {
        classification = "CAUTION: Slightly slow. Focus required.";
        color = "#f1c40f";
        canDrive = true;
    } else {
        classification = "FATIGUED: Reaction time dangerously slow.";
        color = "#e74c3c";
        canDrive = false;
    }

    resultText.innerHTML = `
        <div style="margin-bottom: 10px;">Average Reaction: <strong>${average.toFixed(0)}ms</strong></div>
        <div style="color: ${color}; font-weight: bold;">${classification}</div>
    `;

    if (canDrive) {
        setTimeout(() => {
            // Ensure target is hidden
            target.style.display = "none";
            // Hide overlay
            document.getElementById('reaction-overlay').style.display = 'none';
            
            // Critical: Trigger the AI system
            if (typeof setupCamera === "function") {
                console.log("Starting SafeDrive AI Engine...");
                setupCamera(); 
            } else {
                console.error("setupCamera function not found in main.js!");
            }
        }, 3000);
    } else {
        const startBtn = document.getElementById('start-test-btn');
        startBtn.style.display = 'inline-block';
        startBtn.innerText = "Re-Test Fitness";
    }
}