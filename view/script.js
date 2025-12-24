// Paste your same Firebase Config here
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Initialize the non-interactive canvas
const canvas = new fabric.StaticCanvas('viewCanvas', {
    width: 350, // Matches your editor container size
    height: 450,
    backgroundColor: 'white'
});

// view/script.js


async function loadDesign() {
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('id');

    if (!designId) return;

    try {
        const doc = await db.collection("designs").doc(designId).get();
        
        if (doc.exists) {
            let designData = doc.data().data;

            // 1. Correct the image paths so the viewer can find the /assets folder
            let jsonString = JSON.stringify(designData);
            jsonString = jsonString.replaceAll('assets/', '../assets/');
            const correctedData = JSON.parse(jsonString);

            // 2. Load with a callback and force a render
            canvas.loadFromJSON(correctedData, function() {
                // This function runs only AFTER the JSON is fully parsed
                
                // Force all images to be requested and rendered
                canvas.renderAll(); 

                // 3. Safety: Wait for image "load" events if any exist
                const objects = canvas.getObjects('image');
                if (objects.length > 0) {
                    let loadedCount = 0;
                    objects.forEach(img => {
                        img.on('load', () => {
                            loadedCount++;
                            if (loadedCount === objects.length) {
                                canvas.renderAll();
                            }
                        });
                    });
                }
                
                console.log("Extraction complete and display forced.");
            });
        }
    } catch (e) {
        console.error("Firebase extraction failed:", e);
    }
}