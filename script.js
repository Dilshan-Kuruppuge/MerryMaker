// 1. CANVAS INIT
// Use a fixed 'card' size (shorter, even dimensions)
const canvasW = 320;
const canvasH = 480;

const canvas = new fabric.Canvas('c', {
    width: canvasW,
    height: canvasH,
    backgroundColor: '#ffffff',
    selection: true,
});

// Responsive fitting: keep a logical canvas size (canvasW x canvasH)
// and scale the rendered view to fit the available container without scrolling.
let baseScale = 1;     // scale determined by container size
let userScale = 1;     // extra user-controlled scale (pinch zoom)
const MAX_TOTAL_SCALE = 2.5;
const MIN_USER_SCALE = 0.5;
const MIN_BASE_SCALE = 0.4; // prevent canvas becoming unusably small

function fitCanvasToViewport() {
    const container = document.getElementById('canvas-container');
    if (!container || !canvas) return;
    // Use clientWidth to get width; compute available height by
    // reserving space for the top bar and bottom toolbar so those
    // UI elements remain visible and the canvas doesn't shrink under them.
    const availW = Math.max(1, container.clientWidth - 20); // account for padding
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const topBar = document.getElementById('top-bar');
    const bottomBar = document.getElementById('bottom-toolbar');
    const drawer = document.getElementById('sticker-drawer');
    const topH = topBar ? topBar.getBoundingClientRect().height : 0;
    const bottomH = bottomBar ? bottomBar.getBoundingClientRect().height : 0;
    // If drawer is visible (not hidden), subtract its visible height so canvas isn't covered
    let drawerH = 0;
    if (drawer && !drawer.classList.contains('hidden')) {
        // Prefer bounding height but cap to 60% of viewport
        const dh = drawer.getBoundingClientRect().height || Math.round(viewportH * 0.5);
        drawerH = Math.min(dh, Math.round(viewportH * 0.6));
    }
    const extraReserve = 12; // small breathing room
    const availH = Math.max(100, viewportH - topH - bottomH - drawerH - extraReserve);
    // Compute a base scale that fits the logical canvas into available space
    baseScale = Math.min(availW / canvasW, availH / canvasH);
    // avoid extremely large base scales; leave room for userScale to increase
    baseScale = Math.min(baseScale, MAX_TOTAL_SCALE);
    // avoid making the base scale too small which hides controls; clamp to a minimum
    baseScale = Math.max(baseScale, MIN_BASE_SCALE);
    // Update element size to match base scale
    canvas.setWidth(Math.round(canvasW * baseScale));
    canvas.setHeight(Math.round(canvasH * baseScale));
    // Apply combined zoom (baseScale * userScale), capped to MAX_TOTAL_SCALE
    const totalZoom = Math.min(baseScale * userScale, MAX_TOTAL_SCALE);
    canvas.setZoom(totalZoom);
    canvas.calcOffset();
    canvas.requestRenderAll();
}

window.addEventListener('resize', fitCanvasToViewport);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitCanvasToViewport);
    window.visualViewport.addEventListener('scroll', fitCanvasToViewport);
}
window.addEventListener('orientationchange', fitCanvasToViewport);

// Use ResizeObserver on the container to reliably detect height/width changes
try {
    const containerEl = document.getElementById('canvas-container');
    if (containerEl && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => fitCanvasToViewport());
        ro.observe(containerEl);
    }
} catch (e) { /* ignore if ResizeObserver unavailable */ }

// --- Undo/Redo history & autosave ---
const history = [];
let historyIndex = -1;
const HISTORY_LIMIT = 80;
let historyTimer = null;
let isRestoring = false;

function pushHistory() {
    if (isRestoring) return;
    try {
        const snapshot = canvas.toJSON(['animateType']);
        // drop forward history if we are mid-stack
        if (historyIndex < history.length - 1) history.splice(historyIndex + 1);
        history.push(snapshot);
        if (history.length > HISTORY_LIMIT) history.shift();
        historyIndex = history.length - 1;
        updateUndoRedoButtons();
        // also save draft immediately
        localStorage.setItem('merrymaker-draft', JSON.stringify(snapshot));
    } catch (e) { console.warn('pushHistory failed', e); }
}

function schedulePushHistory(delay = 600) {
    // Don't schedule history pushes while restoring a snapshot
    if (isRestoring) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(() => pushHistory(), delay);
}

function loadHistoryState(idx) {
    if (idx < 0 || idx >= history.length) return;
    // Prevent any scheduled history pushes during restore
    clearTimeout(historyTimer);
    isRestoring = true;
    const snapshot = history[idx];
    historyIndex = idx;
    // load JSON state without triggering history snapshots
    canvas.loadFromJSON(snapshot, () => {
        canvas.renderAll();
        isRestoring = false;
        updateUndoRedoButtons();
    });
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) loadHistoryState(historyIndex - 1);
}

function redo() {
    if (historyIndex < history.length - 1) loadHistoryState(historyIndex + 1);
}

function updateUndoRedoButtons() {
    const gu = document.getElementById('global-undo');
    const gr = document.getElementById('global-redo');
    if (gu) {
        const enable = historyIndex > 0;
        gu.disabled = !enable;
        gu.classList.toggle('inactive', !enable);
        gu.classList.toggle('active', enable);
    }
    if (gr) {
        const enable = historyIndex < history.length - 1;
        gr.disabled = !enable;
        gr.classList.toggle('inactive', !enable);
        gr.classList.toggle('active', enable);
    }
}

// Autosave interval - save current JSON to localStorage every 5s if changed
setInterval(() => {
    try { if (!isRestoring) localStorage.setItem('merrymaker-draft', JSON.stringify(canvas.toJSON(['animateType']))); } catch(e){}
}, 5000);

function loadDraftIfAny() {
    const raw = localStorage.getItem('merrymaker-draft');
    if (!raw) return false;
    try {
        const json = JSON.parse(raw);
        isRestoring = true;
        canvas.loadFromJSON(json, () => {
            canvas.renderAll();
            isRestoring = false;
            // prime history with loaded draft
            history.length = 0; historyIndex = -1;
            pushHistory();
        });
        return true;
    } catch (e) { console.warn('failed to load draft', e); return false; }
}

// 2. ASSETS (Your list)
// Stickers are now external files; put them in a `stickers/` folder next to this HTML.
// Each entry: { type: 'static'|'animated', url: 'relative-or-absolute-url', anim: 'rotate' }
const stickers = [
    { type: 'static', url: 'stickers/star.svg' },
    { type: 'animated', url: 'stickers/blue-circle.svg', anim: 'rotate' }
];

window.onload = function() {
    // Try to restore a draft; otherwise start fresh
    const restored = loadDraftIfAny();
    // Always populate sticker drawer
    populateDrawer();
    // Wire canvas selection events for text toolbar
    setupTextToolbar();
    // wire change events to push history
    canvas.on('object:added', () => schedulePushHistory(300));
    canvas.on('object:removed', () => schedulePushHistory(300));
    canvas.on('object:modified', () => schedulePushHistory(300));
    // wire global undo/redo header buttons
    const gu = document.getElementById('global-undo');
    const gr = document.getElementById('global-redo');
    if (gu) gu.addEventListener('click', undo);
    if (gr) gr.addEventListener('click', redo);
    // wire delete button
    const delBtn = document.getElementById('delete-btn');
    if (delBtn) delBtn.addEventListener('click', deleteSelected);
    // keybinding for Delete/Backspace to remove selected objects (when not editing inputs)
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return;
        // if nothing selected, ignore
        const objs = canvas.getActiveObjects ? canvas.getActiveObjects() : (activeObj ? [activeObj] : []);
        if (!objs || objs.length === 0) return;
        deleteSelected();
        e.preventDefault();
    });
    // If we didn't restore, push initial state
    if (!restored) pushHistory();
    // Ensure canvas is sized to the viewport container
    setTimeout(fitCanvasToViewport, 0);
};

// ------------------ Text toolbar logic ------------------
function setupTextToolbar() {
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => { hideTextToolbar(); });
    canvas.on('object:modified', (e) => { if (canvas.getActiveObject()) updateToolbarPosition(canvas.getActiveObject()); });

    // DOM bindings
    const contentInput = document.getElementById('text-content');
    const fontSelect = document.getElementById('font-family');
    const colorInput = document.getElementById('font-color');
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const alignSelect = document.getElementById('text-align');
    const closeBtn = document.getElementById('toolbar-close');
    const fontPreview = document.getElementById('font-preview');

    function applyToActive(cb) {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        // Accept any object with a `text` property (IText, Textbox, Text)
        if (typeof obj.text === 'undefined') return;
        cb(obj);
        obj.setCoords();
        canvas.requestRenderAll();
    }

    // Use both input and change so updates are immediate on mobile
    contentInput.addEventListener('input', () => { applyToActive(o => { o.set('text', contentInput.value); }); schedulePushHistory(); });
    fontSelect.addEventListener('change', () => { applyToActive(o => { o.set('fontFamily', fontSelect.value); }); updateFontPreview(); schedulePushHistory(); });
    colorInput.addEventListener('input', () => { applyToActive(o => { o.set('fill', colorInput.value); }); });
    colorInput.addEventListener('change', () => { applyToActive(o => { o.set('fill', colorInput.value); }); schedulePushHistory(); });
    boldBtn.addEventListener('click', () => { applyToActive(o => {
        const current = (o.fontWeight === 'bold' || (o.fontWeight && parseInt(o.fontWeight,10) >= 700));
        o.set('fontWeight', current ? 'normal' : 'bold');
        updateBoldToggle();
    }); schedulePushHistory(); });
    italicBtn.addEventListener('click', () => { applyToActive(o => {
        const current = (o.fontStyle === 'italic');
        o.set('fontStyle', current ? 'normal' : 'italic');
        updateItalicToggle();
    }); schedulePushHistory(); });
    alignSelect.addEventListener('change', () => applyToActive(o => { o.set('textAlign', alignSelect.value); }));
    closeBtn.addEventListener('click', hideTextToolbar);

    // helpers
    function updateBoldToggle() {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        const isBold = (obj.fontWeight === 'bold' || (obj.fontWeight && parseInt(obj.fontWeight, 10) >= 700));
        boldBtn.setAttribute('aria-pressed', isBold);
    }
    function updateItalicToggle() {
        const obj = canvas.getActiveObject();
        if (!obj) return; italicBtn.setAttribute('aria-pressed', obj.fontStyle === 'italic');
    }

    // when object enters editing state (double-click), keep toolbar in sync
    canvas.on('mouse:dblclick', (ev) => {
        const obj = canvas.findTarget(ev.e);
        if (obj && (obj instanceof fabric.IText || obj.type === 'i-text')) {
            obj.enterEditing();
            showTextToolbarFor(obj);
        }
    });

    // (size controls and toolbar-local undo/redo removed)

    // font preview update
    function updateFontPreview() {
        fontPreview.style.fontFamily = fontSelect.value;
        fontSelect.style.fontFamily = fontSelect.value;
    }
    updateFontPreview();

    function handleSelection(e) {
        const obj = e.selected && e.selected[0] ? e.selected[0] : e.target;
        if (!obj) return hideTextToolbar();
        // Show toolbar for any object that exposes `text`
        if (typeof obj.text !== 'undefined') {
            showTextToolbarFor(obj);
        } else {
            hideTextToolbar();
        }
    }

    function showTextToolbarFor(obj) {
        const toolbar = document.getElementById('text-toolbar');
        toolbar.classList.remove('hidden');
        toolbar.setAttribute('aria-hidden', 'false');
        toolbar.classList.add('active');
        toolbar.classList.remove('inactive');
        // populate
        contentInput.value = obj.text || '';
        fontSelect.value = obj.fontFamily || 'Arial';
        updateFontPreview();
        colorInput.value = obj.fill || '#000000';
        updateBoldToggle(); updateItalicToggle();
        alignSelect.value = obj.textAlign || 'left';
        updateToolbarPosition(obj);
    }

    function updateToolbarPosition(obj) {
        const toolbar = document.getElementById('text-toolbar');
        if (!toolbar || !obj) return;
        // Keep toolbar fixed in the top-right (outside canvas); no dynamic follow
        toolbar.style.right = '12px';
        toolbar.style.top = '72px';
    }

    function hideTextToolbar() {
        const toolbar = document.getElementById('text-toolbar');
        if (!toolbar) return; toolbar.classList.add('hidden'); toolbar.setAttribute('aria-hidden', 'true');
        if (toolbar) { toolbar.classList.remove('active'); toolbar.classList.add('inactive'); }
    }
}

// --- CORE FUNCTIONS ---

function addText() {
    const text = new fabric.IText('Merry Xmas', {
        left: 50, top: 50,
        fontFamily: 'Arial', fill: '#d60000'
    });
    canvas.add(text);
}

function addSticker(url) {
    fabric.loadSVGFromURL(url, function(objects, options) {
        const obj = fabric.util.groupSVGElements(objects, options);
        obj.scaleToWidth(100);
        canvas.add(obj).renderAll();
    });
}

// Static sticker helper
function addStaticSticker(url) {
    fabric.loadSVGFromURL(url, function(objects, options) {
        const obj = fabric.util.groupSVGElements(objects, options);
        obj.scaleToWidth(120);
        obj.left = 60; obj.top = 60;
        canvas.add(obj).setActiveObject(obj);
        canvas.requestRenderAll();
    });
}

// Animated sticker (from SVG) - simple property animation applied on the object.
function addAnimatedStickerFromSVG(url, animType) {
    fabric.loadSVGFromURL(url, function(objects, options) {
        const obj = fabric.util.groupSVGElements(objects, options);
        obj.scaleToWidth(120);
        obj.left = 80; obj.top = 120;
        obj.animateType = animType || 'rotate';
        obj._anim = { t: 0 };
        canvas.add(obj).setActiveObject(obj);
        canvas.requestRenderAll();
    });
}

function populateDrawer() {
    const grid = document.getElementById('sticker-grid');
    // clear any existing
    grid.innerHTML = '';
    stickers.forEach(item => {
        const img = document.createElement('img');
        img.src = item.url;
        img.className = 'sticker-thumb';
        img.onclick = () => {
            if (item.type === 'static') addStaticSticker(item.url);
            else if (item.type === 'animated') addAnimatedStickerFromSVG(item.url, item.anim);
            toggleDrawer();
        };
        grid.appendChild(img);
    });
}

function toggleDrawer() {
    document.getElementById('sticker-drawer').classList.toggle('hidden');
    // Re-fit canvas when drawer visibility changes (container space may change)
    setTimeout(fitCanvasToViewport, 220);
}

// --------- Touch pinch-to-zoom support (two-finger gestures) ---------
let isTouchScaling = false;
let touchStartDistance = 0;
let initialUserScale = 1;
// object-transform state (two-finger on selected object)
let isObjectTransforming = false;
let objectStartDistance = 0;
let objectStartAngle = 0;
let initialObjScaleX = 1;
let initialObjScaleY = 1;
let initialObjAngle = 0;

function getTouchDistance(t0, t1) {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(t0, t1) {
    return { clientX: (t0.clientX + t1.clientX) / 2, clientY: (t0.clientY + t1.clientY) / 2 };
}

// Attach touch handlers to the upper canvas element
const upperEl = canvas.upperCanvasEl;
if (upperEl) {
    upperEl.addEventListener('touchstart', (ev) => {
        if (!ev.touches || ev.touches.length < 2) return;
        const t0 = ev.touches[0], t1 = ev.touches[1];
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            // Start object transform (scale + rotate)
            isObjectTransforming = true;
            isTouchScaling = false;
            objectStartDistance = getTouchDistance(t0, t1);
            objectStartAngle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);
            initialObjScaleX = activeObj.scaleX || 1;
            initialObjScaleY = activeObj.scaleY || 1;
            initialObjAngle = activeObj.angle || 0;
        } else {
            // Start canvas pinch-zoom
            isTouchScaling = true;
            isObjectTransforming = false;
            touchStartDistance = getTouchDistance(t0, t1);
            initialUserScale = userScale;
        }
    }, { passive: true });

    upperEl.addEventListener('touchmove', (ev) => {
        if (!ev.touches || ev.touches.length < 2) return;
        const t0 = ev.touches[0], t1 = ev.touches[1];
        if (isObjectTransforming) {
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;
            const d = getTouchDistance(t0, t1);
            if (objectStartDistance <= 0) return;
            const factor = d / objectStartDistance;
            // Apply uniform scale based on factor
            activeObj.set({ scaleX: initialObjScaleX * factor, scaleY: initialObjScaleY * factor });
            // Rotation: compute angle delta
            const ang = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);
            const deltaRad = ang - objectStartAngle;
            const deltaDeg = deltaRad * 180 / Math.PI;
            activeObj.set('angle', initialObjAngle + deltaDeg);
            activeObj.setCoords();
            canvas.requestRenderAll();
            ev.preventDefault();
            return;
        }
        if (!isTouchScaling) return;
        const d = getTouchDistance(t0, t1);
        if (touchStartDistance <= 0) return;
        const factor = d / touchStartDistance;
        // compute a candidate userScale, clamped so totalZoom won't exceed MAX_TOTAL_SCALE
        const maxUser = Math.max(MIN_USER_SCALE, MAX_TOTAL_SCALE / Math.max(baseScale, 0.0001));
        let candidate = initialUserScale * factor;
        candidate = Math.max(MIN_USER_SCALE, Math.min(candidate, maxUser));
        // compute total zoom and zoom to midpoint
        const midpoint = getTouchMidpoint(t0, t1);
        const rect = upperEl.getBoundingClientRect();
        const canvasPoint = new fabric.Point(midpoint.clientX - rect.left, midpoint.clientY - rect.top);
        const totalZoom = Math.min(baseScale * candidate, MAX_TOTAL_SCALE);
        userScale = candidate;
        canvas.zoomToPoint(canvasPoint, totalZoom);
        canvas.requestRenderAll();
        ev.preventDefault();
    }, { passive: false });

    upperEl.addEventListener('touchend', (ev) => {
        if (isObjectTransforming) {
            if (!ev.touches || ev.touches.length < 2) {
                isObjectTransforming = false;
                objectStartDistance = 0;
                // record history for the object transform
                schedulePushHistory(120);
            }
            return;
        }
        if (!isTouchScaling) return;
        if (!ev.touches || ev.touches.length < 2) {
            isTouchScaling = false;
            touchStartDistance = 0;
        }
    }, { passive: true });
}

// Delete selected object(s) from the canvas
function deleteSelected() {
    const active = canvas.getActiveObjects ? canvas.getActiveObjects() : (canvas.getActiveObject() ? [canvas.getActiveObject()] : []);
    if (!active || active.length === 0) return;
    active.forEach(o => { canvas.remove(o); });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    schedulePushHistory();
}

// --- THE NEW SAVE LOGIC (No Database) ---

document.getElementById('save-btn').onclick = function() {
    // 1. Convert canvas to JSON
    const json = JSON.stringify(canvas.toJSON());
    
    // 2. Compress the string to keep the URL "shorter"
    const compressed = LZString.compressToEncodedURIComponent(json);
    
    // 3. Generate the Link
    const shareLink = window.location.origin + window.location.pathname + '?card=' + compressed;
    
    // 4. Show the Link
    document.getElementById('share-link').value = shareLink;
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// Export canvas as a JSON file for other viewers to load.
function exportJSONFile() {
    // Include custom properties like 'animateType' so viewers can reconstruct animations
    const json = canvas.toJSON(['animateType']);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'card.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// Wire export button if present
const exportBtn = document.getElementById('export-btn');
if (exportBtn) exportBtn.onclick = exportJSONFile;

// Animation loop: simple property-based animations for objects that declare `animateType`.
setInterval(() => {
    const now = Date.now();
    let need = false;
    canvas.getObjects().forEach(o => {
        if (!o.animateType) return;
        need = true;
        if (o.animateType === 'rotate') {
            o.angle = (o.angle || 0) + 3;
        } else if (o.animateType === 'pulse') {
            const s = 1 + 0.06 * Math.sin(now / 150);
            o.scaleX = o.scaleY = s;
        }
    });
    if (need) canvas.requestRenderAll();
}, 1000 / 30);

function copyLink() {
    const copyText = document.getElementById("share-link");
    copyText.select();
    document.execCommand("copy");
    alert("Link copied to clipboard!");
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}