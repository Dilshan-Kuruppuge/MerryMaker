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

    if (!designId) {
        console.error("Design ID not found in URL.");
        return;
    }

    try {
        const doc = await db.collection("designs").doc(designId).get();
        
        if (doc.exists) {
            const rawData = doc.data().data;

            // Correct asset paths from 'assets/' to '../assets/' for subfolder viewing
            let jsonString = JSON.stringify(rawData);
            jsonString = jsonString.split('assets/').join('../assets/');
            const finalData = JSON.parse(jsonString);

            // Load and render
            canvas.loadFromJSON(finalData, function() {
                canvas.renderAll();
                console.log("Design rendered successfully.");
            });
        } else {
            console.error("No design found with ID:", designId);
        }
    } catch (error) {
        console.error("Error fetching from Firebase:", error);
    }
}

// Trigger load when the window is fully ready
window.addEventListener('load', loadDesign);