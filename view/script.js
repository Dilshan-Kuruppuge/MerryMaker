// --- 1. FIREBASE CONFIG (Kept from original) ---
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

// --- 2. CANVAS SETUP ---
const wrapper = document.getElementById('wrapper');
const canvas = new fabric.StaticCanvas('viewCanvas', {
    width: wrapper.clientWidth,
    height: wrapper.clientHeight,
    backgroundColor: 'white'
});

// --- 3. CINEMATIC LOGIC ---
async function preFetchDesign() {
    const designId = new URLSearchParams(window.location.search).get('id');
    if (!designId) return;

    try {
        const doc = await db.collection("designs").doc(designId).get();
        if (doc.exists) {
            canvas.loadFromJSON(doc.data().data, function() {
                canvas.renderAll();
                console.log("Card ready in background..."); // Clever Trick: Pre-renders here
            });
        }
    } catch (e) { console.error("Load failed", e); }
}

function animateOpen() {
    const overlay = document.getElementById('openingOverlay');
    const envelope = document.getElementById('envelopeWrapper');
    const stage = document.getElementById('cardStage');

    // Step 1: Open the flap and slide letter
    envelope.classList.add('env-open');

    // Step 2: Fade the entire overlay and reveal the card
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transform = 'scale(1.2)';

        setTimeout(() => {
            overlay.style.display = 'none';
            stage.classList.remove('hidden');
            
            // Re-sync canvas dimensions for mobile
            canvas.setDimensions({
                width: wrapper.clientWidth,
                height: wrapper.clientHeight
            });
            canvas.renderAll();
            
            // Final fade in
            setTimeout(() => { stage.style.opacity = '1'; }, 50);
        }, 800);
    }, 1600); // Wait for flap/slide animation to finish
}

window.addEventListener('load', preFetchDesign);