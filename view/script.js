// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyACiwtOKlf5E02_7gk4tOjJr6gvqcPD7qw",
    authDomain: "merrymaker-d166c.firebaseapp.com",
    projectId: "merrymaker-d166c",
    storageBucket: "merrymaker-d166c.firebasestorage.app",
    messagingSenderId: "Y248467205664",
    appId: "Y1:248467205664:web:5976ce50704ed93dd09645"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. CANVAS INITIALIZATION ---
const wrapper = document.getElementById('wrapper');
const canvas = new fabric.StaticCanvas('viewCanvas', {
    width: wrapper.clientWidth,
    height: wrapper.clientHeight,
    backgroundColor: 'white'
});

// --- 3. LOADING LOGIC ---
async function loadDesign() {
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('id');

    if (!designId) return;

    try {
        const doc = await db.collection("designs").doc(designId).get();
        if (doc.exists) {
            const finalData = doc.data().data; // Data now contains absolute paths

            canvas.loadFromJSON(finalData, function() {
                canvas.renderAll();
                console.log("Design rendered with absolute paths!");
            });
        }
    } catch (error) {
        console.error("Error loading design:", error);
    }
}
// Trigger load when the window is fully ready
window.addEventListener('load', loadDesign);