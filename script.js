
// 1. Initialize the Canvas
const container = document.querySelector('.canvas-container');
const canvas = new fabric.Canvas('c', {
    width: container.clientWidth,
    height: container.clientHeight,
    backgroundColor: 'white'
});

// Handle window resizing (optional, keeps canvas 1:1 with container)
window.addEventListener('resize', () => {
    canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight
    });
});

// 2. Buttons
const textBtn = document.querySelectorAll('.add_buttons')[0];
const stickerBtn = document.querySelectorAll('.add_buttons')[1];

textBtn.addEventListener('click', addText);


// ============================================
// CORE FUNCTIONS (User Requested)
// ============================================

// A. Function to add ANY Image by file path
function addImgObject(filePath) {
    fabric.Image.fromURL(filePath, function(img) {
        img.scaleToWidth(100);
        img.set({
            left: canvas.width / 2 - 50,
            top: canvas.height / 2 - 50,
            // Add these to help with hosting/CORS
            crossOrigin: 'anonymous' 
        });
        canvas.add(img);
        canvas.setActiveObject(img);
    }, { crossOrigin: 'anonymous' }); // Critical for hosted environments
}


// B. Function to add Text
function addText() {
    const text = new fabric.IText('Merry Xmas', {
        left: canvas.width / 2 - 50,
        top: canvas.height / 2,
        fontFamily: "'Mountains of Christmas', cursive",
        fill: '#000000',
        fontSize: 40,
        // Styling the handles
        cornerColor: 'white',
        cornerStrokeColor: 'gray',
        borderColor: 'gray',
        transparentCorners: false,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
}

// ============================================
// STYLING FUNCTIONS (Call these from anywhere)
// ============================================

// 1. Change Font Family
function changeFont(fontName) {
    const activeObj = canvas.getActiveObject();
    
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
        
        // Use WebFont to load the font before applying it to the canvas
        WebFont.load({
            google: {
                families: [fontName]
            },
            fontactive: function() {
                // This runs once the font is actually downloaded and ready
                activeObj.set("fontFamily", fontName);
                canvas.requestRenderAll();
            },
            fontinactive: function() {
                // Fallback if the font fails to load
                console.warn("Font " + fontName + " could not be loaded.");
                activeObj.set("fontFamily", fontName);
                canvas.requestRenderAll();
            }
        });
    }
}

// 2. Change Color
function changeColor(colorHex) {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        // Works for text fill or SVG image filters
        activeObj.set("fill", colorHex);
        canvas.requestRenderAll();
    }
}

// Toggle Bold, Italic, Underline
//________________________________
//---------------------------------



function toggleBold() {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
        const isBold = activeObj.fontWeight === 'bold';
        activeObj.set("fontWeight", isBold ? 'normal' : 'bold');
        canvas.renderAll();
        updateUI(); // Manually trigger UI update after change
    }
}

function toggleItalic() {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
        const isItalic = activeObj.fontStyle === 'italic';
        activeObj.set("fontStyle", isItalic ? 'normal' : 'italic');
        canvas.renderAll();
        updateUI();
    }
}

function toggleUnderline() {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
        activeObj.set("underline", !activeObj.underline);
        canvas.renderAll();
        updateUI();
    }
}


// Connect the color picker input to the canvas
document.getElementById('fontColorPicker').oninput = function() {
    changeColor(this.value);
};



// 4. Delete Selected Item
function deleteSelected() {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        canvas.remove(activeObj);
    }
}




// test

// Listen for selection events
canvas.on('selection:created', updateUI);
canvas.on('selection:updated', updateUI);
canvas.on('selection:cleared', resetUI);

function updateUI() {
    const activeObj = canvas.getActiveObject();
    const toolbar = document.querySelector('.toolbar');
    const textEditor = document.querySelector('.text_editor');

    // Check if the selected object exists and is text
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
        // Show Text Editor, Hide Main Toolbar
        textEditor.style.display = 'flex';
        toolbar.style.display = 'none';

        // --- Extraction Logic ---
        // 1. Bold
        const isBold = activeObj.fontWeight === 'bold';
        document.getElementById('toggle-b').style.backgroundColor = isBold ? '#444' : 'transparent';

        // 2. Italic
        const isItalic = activeObj.fontStyle === 'italic';
        document.querySelector('.i.toggle').style.backgroundColor = isItalic ? '#444' : 'transparent';

        // 3. Underline
        const isUnderlined = activeObj.underline === true;
        document.querySelector('.u.toggle').style.backgroundColor = isUnderlined ? '#444' : 'transparent';

        // 4. Font Family
        document.getElementById('Font_Style').value = activeObj.fontFamily;

        // 5. Color
        document.getElementById('fontColorPicker').value = activeObj.fill;
        
    } else {
        // If it's a sticker or nothing is selected, show Main Toolbar
        resetUI();
    }
}

function resetUI() {
    const toolbar = document.querySelector('.toolbar');
    const textEditor = document.querySelector('.text_editor');

    // Show Main Toolbar, Hide Text Editor
    textEditor.style.display = 'none';
    toolbar.style.display = 'flex';
}

// --- Custom Delete Control ---

// 1. Load the delete icon image
const deleteIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ff3b30' width='24px' height='24px'%3E%3Cpath d='M0 0h24v24H0z' fill='none'/%3E%3Cpath d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/%3E%3C/svg%3E";

const img = document.createElement('img');
img.src = deleteIcon;

// 2. Add the control to the Object prototype (applies to Text and Images)
fabric.Object.prototype.controls.deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: -16,
    offsetX: 16,
    cursorStyle: 'pointer',
    mouseUpHandler: deleteObject,
    render: renderIcon,
    cornerSize: 24
});

// Function to handle the actual deletion
function deleteObject(eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;
    canvas.remove(target);
    canvas.requestRenderAll();
}

// Function to draw the icon on the canvas
function renderIcon(ctx, left, top, styleOverride, fabricObject) {
    // Hide icon while dragging or transforming
    if (fabricObject.isMoving || fabricObject.isScaling) return;

    const size = this.cornerSize;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
}




// This will hold the filenames once we get them from GitHub
let STICKER_FILES = [];

async function openStickerModal() {
    const modal = document.getElementById("stickerModal");
    const stickerGrid = document.getElementById("stickerGrid");
    
    modal.style.display = "block";
    stickerGrid.innerHTML = '<p style="color:white; text-align:center;">Scanning assets folder...</p>';

    try {
        // We fetch the list of files directly from your GitHub repository
        const response = await fetch('https://api.github.com/repos/Dilshan-Kuruppuge/MerryMaker/contents/assets');
        const files = await response.json();

        // We only want images (png, jpg, svg) and we ignore everything else
        STICKER_FILES = files
            .filter(file => file.name.match(/\.(png|jpg|jpeg|svg|webp)$/i))
            .map(file => file.name);

        renderStickers(STICKER_FILES);
    } catch (error) {
        console.error("GitHub API Error:", error);
        stickerGrid.innerHTML = '<p style="color:red;">Error: Could not list files from GitHub assets folder.</p>';
    }
}

function renderStickers(list) {
    const stickerGrid = document.getElementById("stickerGrid");
    stickerGrid.innerHTML = ''; 

    if (list.length === 0) {
        stickerGrid.innerHTML = '<p style="color:white;">No images found in /assets</p>';
        return;
    }

    list.forEach(fileName => {
        const img = document.createElement('img');
        // Point to the relative path in your repo
        img.src = `assets/${fileName}`; 
        img.className = 'sticker-item';
        img.title = fileName; // Shows name on hover
        
        img.onclick = () => {
            addImgObject(`assets/${fileName}`);
            document.getElementById("stickerModal").style.display = "none";
        };
        stickerGrid.appendChild(img);
    });
}


document.getElementById('stickerSearch').oninput = function() {
    const query = this.value.toLowerCase();
    const filtered = STICKER_FILES.filter(name => name.toLowerCase().includes(query));
    renderStickers(filtered);
};


// Function to close the modal
function closeStickerModal() {
    const modal = document.getElementById("stickerModal");
    modal.style.display = "none";
}

// Attach listeners once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("stickerModal");
    const closeBtn = document.querySelector(".close-modal");

    // 1. Click the X button
    if (closeBtn) {
        closeBtn.onclick = closeStickerModal;
    }

    // 2. Click outside the modal content
    window.onclick = (event) => {
        if (event.target == modal) {
            closeStickerModal();
        }
    };
});




// --- Firebase Configuration ---
const firebaseConfig = {


  apiKey: "AIzaSyACiwtOKlf5E02_7gk4tOjJr6gvqcPD7qw",
  authDomain: "ymerrymaker-d166c.firebaseapp.com",
  projectId: "merrymaker-d166c",
  storageBucket: "merrymaker-d166c.firebasestorage.app",
  messagingSenderId: "248467205664",
  appId: "1:248467205664:web:5976ce50704ed93dd09645"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Share / Upload Logic ---

async function shareDesign() {
    const canvasJSON = canvas.toJSON();
    const shareModal = document.getElementById("shareModal");
    const shareInput = document.getElementById("shareURLInput");
    
    try {
        // 1. Save to Firebase
        const docRef = await db.collection("designs").add({
            data: canvasJSON,
            createdAt: new Date()
        });

        // 2. Generate the URL
        const shareURL = window.location.origin + window.location.pathname + "?id=" + docRef.id;

        // 3. Show the Popup
        shareInput.value = shareURL;
        shareModal.style.display = "block";
        
    } catch (error) {
        console.error("Error saving design: ", error);
        alert("Failed to save design.");
    }
}

// Logic for the Copy Button and closing the modal
document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById("copyLinkBtn");
    const shareInput = document.getElementById("shareURLInput");
    const successMsg = document.getElementById("copySuccessMsg");
    const shareModal = document.getElementById("shareModal");
    const closeBtn = document.querySelector(".close-share-modal");

    copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(shareInput.value);
        
        // Show success feedback
        copyBtn.innerText = "Copied!";
        successMsg.style.display = "block";
        
        setTimeout(() => {
            copyBtn.innerText = "Copy";
            successMsg.style.display = "none";
        }, 2000);
    };

    closeBtn.onclick = () => shareModal.style.display = "none";
    
    // Close if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target == shareModal) shareModal.style.display = "none";
    });
});

// --- Loading Logic (Run on Page Load) ---

async function loadSharedDesign() {
    const urlParams = new URLSearchParams(window.location.search);
    const designId = urlParams.get('id');

    if (designId) {
        try {
            const doc = await db.collection("designs").doc(designId).get();
            if (doc.exists) {
                const designData = doc.data().data;
                canvas.loadFromJSON(designData, function() {
                    canvas.renderAll();
                    console.log("Shared design loaded!");
                });
            } else {
                console.log("No such design found.");
            }
        } catch (error) {
            console.error("Error loading shared design:", error);
        }
    }
}

// Call this at the very bottom of your script.js
loadSharedDesign();