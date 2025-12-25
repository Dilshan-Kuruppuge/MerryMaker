// --- 1. FIREBASE CONFIG ---
if (typeof firebaseInitialized === 'undefined') {
    var firebaseConfig = {
        apiKey: "AIzaSyACiwtOKlf5E02_7gk4tOjJr6gvqcPD7qw",
        authDomain: "merrymaker-d166c.firebaseapp.com",
        projectId: "merrymaker-d166c",
        storageBucket: "merrymaker-d166c.firebasestorage.app",
        messagingSenderId: "Y248467205664",
        appId: "Y1:248467205664:web:5976ce50704ed93dd09645"
    };
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    var firebaseInitialized = true;
}

var canvas;

// --- 2. INITIALIZATION ---
window.onload = function() {
    const wrapper = document.getElementById('wrapper');
    if (wrapper) {
        canvas = new fabric.StaticCanvas('viewCanvas', {
            width: wrapper.clientWidth,
            height: wrapper.clientHeight,
            backgroundColor: 'white'
        });
        loadDesign(); 
    }
    initSnow();
};

// --- 3. UI INTERACTION ---
function openEnvelope() {
    const env = document.getElementById('envelope');
    const envContainer = document.getElementById('envelopeContainer');
    const designWrapper = document.getElementById('wrapper');

    if (env) env.classList.add('is-open');
    
    setTimeout(() => {
        if (envContainer) envContainer.classList.add('is-faded');
        if (designWrapper) designWrapper.classList.add('canvas-visible');
        
        // This starts the global refresh
        renderLoop();
    }, 600);
}

// --- 4. PRE-LOADING & GIF ENGINE ---
async function loadDesign() {
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('id');
    if (!designId) return;

    try {
        const doc = await db.collection("designs").doc(designId).get();
        if (doc.exists) {
            const finalData = doc.data().data;

            // Use the callback to ensure objects exist before we animate them
            canvas.loadFromJSON(finalData, function() {
                canvas.getObjects().forEach(obj => {
                    if (obj.type === 'image' && obj.src && obj.src.toLowerCase().endsWith('.gif')) {
                        playGifOnCanvas(obj);
                    }
                });
                canvas.renderAll();
            });
        }
    } catch (e) { console.error("Firebase Load Error:", e); }
}

function playGifOnCanvas(fabricObj) {
    // Create a virtual canvas for this specific GIF
    const gifCanvas = document.createElement('canvas');
    
    // gifler creates an animator instance
    gifler(fabricObj.src).frames(gifCanvas, (ctx, frame) => {
        // Set dimensions to match the GIF frame
        gifCanvas.width = frame.width;
        gifCanvas.height = frame.height;
        
        // Draw the current frame
        ctx.drawImage(frame.buffer, 0, 0);
        
        // Update the Fabric object to use this virtual canvas as its source
        fabricObj.setElement(gifCanvas);
        
        // IMPORTANT: Tell Fabric this object needs to be repainted
        fabricObj.dirty = true;
    });
}

// Global loop: This is what makes the "StaticCanvas" actually animate
function renderLoop() {
    if (canvas) {
        canvas.renderAll();
        requestAnimationFrame(renderLoop);
    }
}

// --- 5. SNOW ENGINE (Unchanged) ---
var snowCanvas, sCtx, particles = [];
function initSnow() {
    snowCanvas = document.getElementById('snowCanvas');
    if (!snowCanvas) return;
    sCtx = snowCanvas.getContext('2d');
    resizeSnow();
    for(let i = 0; i < 100; i++) particles.push(new Snowflake());
    animateSnow();
}
function resizeSnow() {
    if (snowCanvas) {
        snowCanvas.width = window.innerWidth;
        snowCanvas.height = window.innerHeight;
    }
}
class Snowflake {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * (snowCanvas ? snowCanvas.width : 500);
        this.y = Math.random() * -50;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.velX = Math.random() * 0.5 - 0.25;
    }
    update() {
        this.y += this.speed;
        this.x += this.velX;
        if (snowCanvas && this.y > snowCanvas.height) this.reset();
    }
    draw() {
        if (!sCtx) return;
        sCtx.fillStyle = "white";
        sCtx.beginPath();
        sCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        sCtx.fill();
    }
}
function animateSnow() {
    if (sCtx && snowCanvas) {
        sCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
    }
    requestAnimationFrame(animateSnow);
}