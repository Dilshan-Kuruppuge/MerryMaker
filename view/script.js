// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyACiwtOKlf5E02_7gk4tOjJr6gvqcPD7qw",
    authDomain: "merrymaker-d166c.firebaseapp.com",
    projectId: "merrymaker-d166c",
    storageBucket: "merrymaker-d166c.firebasestorage.app",
    messagingSenderId: "Y248467205664",
    appId: "Y1:248467205664:web:5976ce50704ed93dd09645"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. CANVAS INIT ---
const wrapper = document.getElementById('wrapper');
const canvas = new fabric.StaticCanvas('viewCanvas', {
    width: wrapper.clientWidth,
    height: wrapper.clientHeight,
    backgroundColor: 'white'
});

// --- 3. UI INTERACTION ---
function openEnvelope() {
    const env = document.getElementById('envelope');
    const envContainer = document.getElementById('envelopeContainer');
    const designWrapper = document.getElementById('wrapper');

    // 1. Open the flap
    env.classList.add('is-open');
    
    // 2. Fade envelope and show canvas
    // We reduced the delay here to make it feel more responsive
    setTimeout(() => {
        envContainer.classList.add('is-faded');
        designWrapper.classList.add('canvas-visible');
    }, 600);
}

// --- 4. PRE-LOADING LOGIC ---
async function loadDesign() {
    console.log("Background loading started...");
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('id');
    if (!designId) return;

    try {
        const doc = await db.collection("designs").doc(designId).get();
        if (doc.exists) {
            const finalData = doc.data().data;

            // Render to the hidden canvas in the background
            canvas.loadFromJSON(finalData, function() {
                canvas.renderAll();
                console.log("Design pre-loaded and ready!");
            });
        }
    } catch (e) { 
        console.error("Error pre-loading:", e); 
    }
}

// Start loading assets the moment the script executes
loadDesign();

// --- 5. SNOW ENGINE (Keep existing logic) ---
const snowCanvas = document.getElementById('snowCanvas');
const ctx = snowCanvas.getContext('2d');
let particles = [];

function resizeSnow() {
    snowCanvas.width = window.innerWidth;
    snowCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeSnow);
resizeSnow();

class Snowflake {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * snowCanvas.width;
        this.y = Math.random() * snowCanvas.height;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.velX = Math.random() * 0.5 - 0.25;
    }
    update() {
        this.y += this.speed;
        this.x += this.velX;
        if (this.y > snowCanvas.height) this.y = -10;
    }
    draw() {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

for(let i = 0; i < 100; i++) particles.push(new Snowflake());

function animateSnow() {
    ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateSnow);
}
animateSnow();