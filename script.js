// Google Drive integration variables
let accessToken = localStorage.getItem("googleAccessToken") || "";
let currentTemplate = localStorage.getItem("selectedTemplate") || "template1.png";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const capturedImages = document.getElementById('capturedImages');
const startButton = document.getElementById('startButton');
const proceedButton = document.getElementById('proceedButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const resetButton = document.getElementById('resetButton');
const retakeButton = document.getElementById('retakeButton');
const flash = document.getElementById('flash');
const shutterSound = document.getElementById('shutterSound');
const beepSound = document.getElementById('beepSound');
const countdownHigh = document.getElementById('countdownHigh');
let captureCount = 0;
let currentDeleteIndex = -1; // Track which image is being deleted

// Function to get maximum capture count based on selected format
function getMaxCaptureCount() {
    const selectedFormat = localStorage.getItem("selectedFormat");
    if (selectedFormat === "enhanced") {
        return 4; // Enhanced format has 4 shots
    }
    return 3; // Classic and Stories formats have 3 shots
}

// Function to get current captured count
function getCurrentCapturedCount() {
    let count = 0;
    const maxCount = getMaxCaptureCount();
    for (let i = 0; i < maxCount; i++) {
        const child = capturedImages.children[i];
        // Check if it's a captured image wrapper (not a placeholder)
        if (child && child.classList && child.classList.contains('captured-thumbnail-wrapper')) {
            count++;
        }
    }
    return count;
}

// Function to update UI based on current state
function updateUIState() {
    const currentCount = getCurrentCapturedCount();
    const maxCount = getMaxCaptureCount();
    const isAllCaptured = currentCount === maxCount;
    
    // Update proceed button visibility and state
    if (isAllCaptured && !isCapturing) {
        proceedButton.style.display = "block";
        proceedButton.disabled = false;
    } else {
        proceedButton.style.display = "none";
        proceedButton.disabled = true;
    }
    
    // Update start button based on capture state
    if (isAllCaptured && !isCapturing) {
        // When all slots are filled, change start button to RESET
        startButton.innerHTML = `
            <svg class="icon icon-reset" fill="currentColor">
                <use xlink:href="icons.svg#icon-reset"></use>
            </svg>RESET
        `;
        startButton.disabled = false;
        startButton.onclick = resetCapture; // Change the onclick function to reset
    } else if (!isCapturing && currentCount > 0 && currentCount < maxCount) {
        startButton.innerHTML = `
            <svg class="icon icon-start" fill="currentColor">
                <use xlink:href="icons.svg#icon-start"></use>
            </svg>Continue (${currentCount}/${maxCount})
        `;
        startButton.disabled = false;
        startButton.onclick = startCapture; // Ensure it's set to start capture
    } else if (!isCapturing && currentCount === 0) {
        startButton.innerHTML = `
            <svg class="icon icon-start" fill="currentColor">
                <use xlink:href="icons.svg#icon-start"></use>
            </svg>Start
        `;
        startButton.disabled = false;
        startButton.onclick = startCapture; // Ensure it's set to start capture
    }
}

// Delete modal functions
function showDeleteModal(index) {
    console.log("🔥 showDeleteModal called with index:", index);
    currentDeleteIndex = index;
    console.log("🔥 Set currentDeleteIndex to:", currentDeleteIndex);
    document.getElementById("deleteModal").style.display = "flex";
    console.log("🔥 Modal should now be visible");
}

function closeDeleteModal() {
    console.log("🔥 closeDeleteModal called");
    currentDeleteIndex = -1;
    document.getElementById("deleteModal").style.display = "none";
    console.log("🔥 Modal closed, currentDeleteIndex reset to -1");
}

function confirmDelete() {
    console.log("🔥 confirmDelete called! currentDeleteIndex:", currentDeleteIndex);
    if (currentDeleteIndex !== -1) {
        console.log("🔥 About to call deleteImage with index:", currentDeleteIndex);
        deleteImage(currentDeleteIndex);
    } else {
        console.log("⚠️ currentDeleteIndex is -1, cannot delete");
    }
    closeDeleteModal();
}

// Function to delete an image and convert back to placeholder
function deleteImage(index) {
    const maxCount = getMaxCaptureCount();
    console.log(`🗑️ Starting delete for slot ${index + 1}, maxCount: ${maxCount}`);
    
    if (index < 0 || index >= maxCount) {
        console.warn(`⚠️ Invalid index ${index}. Valid range: 0-${maxCount-1}`);
        return;
    }
    
    const selectedFormat = localStorage.getItem("selectedFormat");
    const isEnhancedOnly = index === 3 && selectedFormat !== "enhanced";
    const enhancedClass = index === 3 ? ' enhanced-only' : '';
    
    // Get the current element at this index
    const currentElement = capturedImages.children[index];
    if (!currentElement) {
        console.warn(`⚠️ No element found at index ${index}`);
        return;
    }
    
    console.log(`📋 Current element at index ${index}:`, currentElement.className);
    
    // Create new placeholder with single capture button
    const placeholder = document.createElement('div');
    placeholder.className = `placeholder p-4 text-center${enhancedClass}`;
    
    // Handle enhanced-only visibility
    if (isEnhancedOnly) {
        placeholder.style.display = 'none';
    }
    
    placeholder.innerHTML = `
        <div style="color: #888; font-size: 18px; font-weight: 600; margin-bottom: 8px;">${index + 1}</div>
    `;
    
    // Completely remove the current element first
    currentElement.remove();
    console.log(`🗂️ Removed element at index ${index}`);
    
    // Insert the new placeholder at the correct position
    if (index >= capturedImages.children.length) {
        capturedImages.appendChild(placeholder);
        console.log(`➕ Appended placeholder at end`);
    } else {
        capturedImages.insertBefore(placeholder, capturedImages.children[index]);
        console.log(`➕ Inserted placeholder at index ${index}`);
    }
    
    // Force a repaint to ensure the change is visible
    placeholder.offsetHeight;
    
    // Update UI state
    updateUIState();
    
    console.log(`✅ Delete completed for slot ${index + 1}. Current count: ${getCurrentCapturedCount()}`);
}

// Function to capture a single image for a specific slot
async function captureSingleImage(slotIndex) {
    if (isCapturing) return; // Prevent multiple captures
    
    console.log(`📸 Capturing single image for slot ${slotIndex + 1}`);
    
    // Disable the button temporarily
    const placeholder = capturedImages.children[slotIndex];
    const captureBtn = placeholder.querySelector('.single-capture-btn');
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '⏳';
    }
    
    // Start countdown for single capture
    await singleImageCountdown(slotIndex);
}

// Countdown for single image capture
async function singleImageCountdown(slotIndex) {
    const countdownOverlay = document.getElementById("countdownOverlay");
    countdownOverlay.style.display = "block";

    for (let i = captureDelay; i > 0; i--) {
        countdownOverlay.innerText = i;
        countdownOverlay.style.opacity = "1";
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1.2)";

        if (i > 1) {
            beepSound.currentTime = 0;
            beepSound.play();
        } else {
            countdownHigh.currentTime = 0;
            countdownHigh.play();
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1)";
        countdownOverlay.style.opacity = "0.5";

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    countdownOverlay.style.display = "none";
    captureSingleImageToSlot(slotIndex);
}

// Function to capture and place image in specific slot
function captureSingleImageToSlot(slotIndex) {
    flashEffect();
    shutterSound.currentTime = 0;
    shutterSound.play();

    const selectedFormat = localStorage.getItem("selectedFormat");
    
    // Same capture logic as original captureImage function
    if (selectedFormat === "enhanced") {
        const enhancedOverlay = document.querySelector('.enhanced-template-overlay');
        const videoRect = video.getBoundingClientRect();
        const overlayRect = enhancedOverlay.getBoundingClientRect();
        
        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;
        
        const cropX = (overlayRect.left - videoRect.left) * scaleX;
        const cropY = (overlayRect.top - videoRect.top) * scaleY;
        const cropWidth = overlayRect.width * scaleX;
        const cropHeight = overlayRect.height * scaleY;
        
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        if (isMirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 
                video.videoWidth - cropX - cropWidth, cropY, cropWidth, cropHeight,
                0, 0, canvas.width, canvas.height);
        } else {
            context.drawImage(video, 
                cropX, cropY, cropWidth, cropHeight,
                0, 0, canvas.width, canvas.height);
        }
    } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (isMirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Apply black and white filter if enabled
    if (isBWFilter) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
        }
        
        context.putImageData(imageData, 0, 0);
    }

    if (isMirrored) {
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Create image wrapper with delete button
    const wrapper = document.createElement('div');
    wrapper.className = 'captured-thumbnail-wrapper';
    
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.classList.add("captured-thumbnail");
    img.style.opacity = "0";
    img.style.transform = "scale(0.8)";

    img.onclick = function() {
        document.getElementById("modalImage").src = img.src;
        new bootstrap.Modal(document.getElementById("imagePreviewModal")).show();
    };

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = function(e) {
        console.log("🔥 Delete button clicked! slotIndex:", slotIndex);
        e.stopPropagation();
        showDeleteModal(slotIndex);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);

    // Replace placeholder with image
    capturedImages.replaceChild(wrapper, capturedImages.children[slotIndex]);

    setTimeout(() => {
        img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out";
        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    }, 100);

    // Update UI state
    updateUIState();
    
    console.log(`✅ Captured image for slot ${slotIndex + 1}`);
}

let isMirrored = true; // Default to mirrored

// Google OAuth Login
function signInWithGoogle() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: "1050323234175-b5apn028urg40cqvmavnefprcfbfbqp6.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
        callback: (response) => {
            if (response.access_token) {
                accessToken = response.access_token;
                localStorage.setItem("googleAccessToken", accessToken);
                document.getElementById("userInfo").innerText = "✅ Signed in!";
                document.getElementById("googleSignIn").classList.add("hidden");
                console.log("✅ OAuth Token:", accessToken);
            } else {
                console.error("❌ Login failed!");
            }
        },
    });
    client.requestAccessToken();
}

// Hide sign-in button if already logged in
function checkLoginStatus() {
    if (accessToken) {
        document.getElementById("googleSignIn").classList.add("hidden");
        document.getElementById("userInfo").innerText = "✅ Signed in!";
        console.log("🔄 Auto-logged in with saved token.");
    }
}

// Mirror toggle functionality
function toggleMirror() {
    const mirrorButton = document.getElementById('mirrorButton');
    const mirrorIcon = mirrorButton.querySelector('.icon-mirror');
    
    isMirrored = !isMirrored;
    if (isMirrored) {
        video.style.transform = "scaleX(-1)";
        mirrorIcon.classList.add('flipped');
    } else {
        video.style.transform = "scaleX(1)";
        mirrorIcon.classList.remove('flipped');
    }
}

// Black and white filter toggle functionality
let isBWFilter = false; // Default to no filter
function toggleFilter() {
    const filterButton = document.getElementById('filterButton');
    const filterIcon = filterButton.querySelector('.icon-filter');
    isBWFilter = !isBWFilter;
    
    if (isBWFilter) {
        video.classList.add('bw-filter');
        filterIcon.classList.add('rotated');
    } else {
        video.classList.remove('bw-filter');
        filterIcon.classList.remove('rotated');
    }
}

// Initialize camera with default mirror
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    // Apply mirror effect by default
    video.style.transform = "scaleX(-1)";
});





let isCapturing = false;
let isPaused = false; // Flag to track pause state
let cancelCaptureFlag = false; // Flag to track cancellation

// Get slider and map values
const timerSlider = document.getElementById("timerSlider");
const timerValues = { 1: 2, 2: 5, 3: 10 };
let captureDelay = 5; // Default to 5 seconds

// Update the timer value when the slider changes
timerSlider.addEventListener("input", function () {
    captureDelay = timerValues[this.value]; // Update global capture delay
    console.log("Capture delay set to:", captureDelay, "seconds");
});

// Modify the capture function to use the selected timer
async function startCapture() {
    console.log("Start Capture Clicked! Capture Delay:", captureDelay);
    
    // Find first empty slot to start from
    const maxCount = getMaxCaptureCount();
    let startIndex = 0;
    for (let i = 0; i < maxCount; i++) {
        const child = capturedImages.children[i];
        if (child && child.classList.contains('placeholder')) {
            startIndex = i;
            break;
        }
    }
    
    // Set capture count to the first empty slot
    captureCount = startIndex;
    
    // Change button appearance
    startButton.classList.add("capturing");
    startButton.innerText = "Capturing...";
    cancelCaptureFlag = false;
    isPaused = false;
    startButton.disabled = true;
    proceedButton.style.display = "none";
    
    // Show Pause button instead of Cancel
    const pauseButton = document.getElementById('pauseButton');
    pauseButton.style.display = "block";
    pauseButton.innerHTML = "Pause";
    
    isCapturing = true;
    await countdownAndCapture(captureDelay);
}

// Use `captureDelay` in the countdown function
async function countdownAndCapture(seconds) {
    const maxCount = getMaxCaptureCount();
    
    // Find next empty slot
    while (captureCount < maxCount) {
        const child = capturedImages.children[captureCount];
        if (child && child.classList.contains('placeholder')) {
            break; // Found empty slot
        }
        captureCount++; // Skip filled slot
    }
    
    if (!isCapturing || cancelCaptureFlag || captureCount >= maxCount) return;
    
    const currentCount = getCurrentCapturedCount();
    startButton.innerText = `Capturing... (${currentCount + 1}/${maxCount})`;

    const countdownOverlay = document.getElementById("countdownOverlay");
    countdownOverlay.style.display = "block";

    for (let i = seconds; i > 0; i--) {
        if (cancelCaptureFlag || isPaused) {
            countdownOverlay.style.display = "none";
            return;
        }

        countdownOverlay.innerText = i;
        countdownOverlay.style.opacity = "1";
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1.2)";

        if (i > 1) {
            beepSound.currentTime = 0;
            beepSound.play();
        } else {
            countdownHigh.currentTime = 0;
            countdownHigh.play();
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1)";
        countdownOverlay.style.opacity = "0.5";

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    countdownOverlay.style.display = "none";
    if (!isPaused && !cancelCaptureFlag) {
        captureImage();
    }
}

function captureImage() {
    if (cancelCaptureFlag) return;

    flashEffect();
    shutterSound.currentTime = 0;
    shutterSound.play();

    const selectedFormat = localStorage.getItem("selectedFormat");
    
    // For enhanced format, we need to crop to the overlay area
    if (selectedFormat === "enhanced") {
        const enhancedOverlay = document.querySelector('.enhanced-template-overlay');
        const videoRect = video.getBoundingClientRect();
        const overlayRect = enhancedOverlay.getBoundingClientRect();
        
        // Calculate crop dimensions relative to video
        const scaleX = video.videoWidth / videoRect.width;
        const scaleY = video.videoHeight / videoRect.height;
        
        const cropX = (overlayRect.left - videoRect.left) * scaleX;
        const cropY = (overlayRect.top - videoRect.top) * scaleY;
        const cropWidth = overlayRect.width * scaleX;
        const cropHeight = overlayRect.height * scaleY;
        
        // Set canvas size to the cropped dimensions
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        if (isMirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            // Draw the cropped area from the mirrored video
            context.drawImage(video, 
                video.videoWidth - cropX - cropWidth, cropY, cropWidth, cropHeight,
                0, 0, canvas.width, canvas.height);
        } else {
            // Draw the cropped area
            context.drawImage(video, 
                cropX, cropY, cropWidth, cropHeight,
                0, 0, canvas.width, canvas.height);
        }
    } else {
        // Original behavior for other formats
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (isMirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Apply black and white filter if enabled
    if (isBWFilter) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        `
        for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = brightness;     // Red
            data[i + 1] = brightness; // Green
            data[i + 2] = brightness; // Blue
            // data[i + 3] is alpha, leave unchanged
        }`
        
        context.putImageData(imageData, 0, 0);
    }

    if (isMirrored) {
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Create image wrapper with delete button
    const wrapper = document.createElement('div');
    wrapper.className = 'captured-thumbnail-wrapper';
    
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.classList.add("captured-thumbnail");
    img.style.opacity = "0";
    img.style.transform = "scale(0.8)";

    img.onclick = function() {
        document.getElementById("modalImage").src = img.src;
        new bootstrap.Modal(document.getElementById("imagePreviewModal")).show();
    };

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    
    // Capture the current slot index before captureCount is incremented
    const currentSlotIndex = captureCount;
    deleteBtn.onclick = function(e) {
        console.log("🔥 Delete button clicked! slot index:", currentSlotIndex);
        e.stopPropagation();
        showDeleteModal(currentSlotIndex);
    };

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);

    capturedImages.replaceChild(wrapper, capturedImages.children[captureCount]);

    setTimeout(() => {
        img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out";
        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    }, 100);

    captureCount++; // Increment AFTER using captureCount for the delete button

    const maxCount = getMaxCaptureCount();
    const currentCount = getCurrentCapturedCount();
    
    // Check if there are more empty slots to capture
    let hasEmptySlots = false;
    for (let i = captureCount; i < maxCount; i++) {
        const child = capturedImages.children[i];
        if (child && child.classList.contains('placeholder')) {
            hasEmptySlots = true;
            break;
        }
    }
    
    if (hasEmptySlots && captureCount < maxCount) {
        // Continue capturing remaining empty slots
        setTimeout(() => countdownAndCapture(captureDelay), 1000);
    } else {
        // All available slots captured or reached max count
        isCapturing = false;
        isPaused = false;
        
        const pauseButton = document.getElementById('pauseButton');
        const resetButton = document.getElementById('resetButton');
        
        pauseButton.style.display = "none";
        if (resetButton) resetButton.style.display = "none";
        
        // Update UI state (this will handle button states)
        updateUIState();
    }
}

// Pause/Resume/Reset functions
function pauseCapture() {
    isPaused = true;
    isCapturing = false;
    
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');
    const resetButton = document.getElementById('resetButton');
    
    // Hide start button during pause
    startButton.style.display = "none";
    
    // Hide pause button, show resume and reset buttons
    pauseButton.style.display = "none";
    resumeButton.style.display = "block";
    resetButton.style.display = "block";
    
    // Hide countdown overlay
    const countdownOverlay = document.getElementById("countdownOverlay");
    countdownOverlay.style.display = "none";
}

function resumeCapture() {
    isPaused = false;
    isCapturing = true;
    
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');
    const resetButton = document.getElementById('resetButton');
    
    // Update start button states
    startButton.classList.add("capturing");
    startButton.innerText = `Capturing...`;
    startButton.disabled = true;
    startButton.style.display = "block";
    
    // Show pause button, hide resume and reset buttons
    pauseButton.style.display = "block";
    resumeButton.style.display = "none";
    resetButton.style.display = "none";
    
    // Continue capture process
    setTimeout(() => countdownAndCapture(captureDelay), 500);
}

function resetCapture() {
    cancelCaptureFlag = true;
    isCapturing = false;
    isPaused = false;
    captureCount = 0;
    
    // Get all button elements
    const pauseButton = document.getElementById('pauseButton');
    const resetButton = document.getElementById('resetButton');
    const cancelButton = document.getElementById('cancelButton');
    const resumeButton = document.getElementById('resumeButton');
    const retakeButton = document.getElementById('retakeButton');
    
    // Reset start button to original state
    startButton.innerHTML = `
        <svg class="icon icon-start" fill="currentColor">
            <use xlink:href="icons.svg#icon-start"></use>
        </svg>Start
    `;
    startButton.classList.remove("capturing");
    startButton.disabled = false;
    startButton.style.display = "inline-block";
    startButton.onclick = startCapture; // Reset onclick function to startCapture
    
    // Hide all other control buttons
    if (pauseButton) pauseButton.style.display = "none";
    if (resetButton) resetButton.style.display = "none";
    if (cancelButton) cancelButton.style.display = "none";
    if (resumeButton) resumeButton.style.display = "none";
    if (retakeButton) retakeButton.style.display = "none";
    if (proceedButton) proceedButton.style.display = "none";
    
    // Clear captured images and reset placeholders
    resetPlaceholders();
    
    // Clear any stored captured photos data
    localStorage.removeItem("capturedPhotos");
    
    // Hide countdown overlay
    const countdownOverlay = document.getElementById("countdownOverlay");
    if (countdownOverlay) {
        countdownOverlay.style.display = "none";
    }
    
    // Reset the flag after a brief delay
    setTimeout(() => {
        cancelCaptureFlag = false;
    }, 100);
    
    console.log("🔄 Capture reset - returned to start state");
}

function cancelCapture() {
    cancelCaptureFlag = true;
    isCapturing = false;
    captureCount = 0; // FIX: Reset capture count so resume works
    startButton.innerHTML = `
        <svg class="icon icon-start" fill="currentColor">
            <use xlink:href="icons.svg#icon-start"></use>
        </svg>Start
    `;
    startButton.classList.remove("capturing");
    startButton.classList.add("btn-start"); // Ensure it keeps original styling
    startButton.disabled = false;
    
    cancelButton.style.display = "none";
    proceedButton.style.display = "none";
    resetPlaceholders();
}


function resetPlaceholders() {
    const selectedFormat = localStorage.getItem("selectedFormat");
    const maxCount = getMaxCaptureCount();
    
    // Clear all existing children
    capturedImages.innerHTML = '';
    
    // Create new placeholder elements one by one
    for (let i = 1; i <= maxCount; i++) {
        const isEnhancedOnly = i === 4 && selectedFormat !== "enhanced";
        const enhancedClass = i === 4 ? ' enhanced-only' : '';
        
        const placeholder = document.createElement('div');
        placeholder.className = `placeholder p-4 text-center${enhancedClass}`;
        
        if (isEnhancedOnly) {
            placeholder.style.display = 'none';
        }
        
            placeholder.innerHTML = `
                <div style="color: #888; font-size: 18px; font-weight: 600; margin-bottom: 8px;">${i}</div>
            `;
        
        capturedImages.appendChild(placeholder);
    }
    
    // Update UI state after reset
    updateUIState();
}

function flashEffect() {
    flash.style.opacity = "1";
    setTimeout(() => {
        flash.style.opacity = "0";
    }, 100);
}

function proceedToTemplate() {
    console.log("🚀 Proceeding to template...");
    
    const capturedData = [];
    const maxCount = getMaxCaptureCount();
    const currentCount = getCurrentCapturedCount();
    
    console.log("📸 Checking captured images...");
    console.log("Total children:", capturedImages.children.length);
    console.log("Expected count:", maxCount);
    console.log("Current captured count:", currentCount);
    
    // Check if all slots are filled
    if (currentCount < maxCount) {
        alert(`Please capture all photos first! You have ${currentCount}/${maxCount} photos.`);
        return;
    }
    
    for (let i = 0; i < maxCount; i++) {
        const child = capturedImages.children[i];
        console.log(`Child ${i}:`, child ? child.tagName : "null");
        
        if (child && child.classList.contains('captured-thumbnail-wrapper')) {
            const img = child.querySelector('img');
            if (img && img.src) {
                capturedData.push(img.src);
                console.log(`✅ Added image ${i + 1} to captured data`);
            } else {
                console.warn(`⚠️ Missing image in wrapper at slot ${i + 1}`);
            }
        } else {
            console.warn(`⚠️ Missing or invalid image at slot ${i + 1}`);
        }
    }
    
    console.log("📦 Final captured data:", capturedData);
    console.log("📝 Number of images to save:", capturedData.length);
    
    if (capturedData.length === 0) {
        console.error("❌ No images captured! Cannot proceed to template.");
        alert("No photos captured yet. Please take some photos first!");
        return;
    }
    
    if (capturedData.length < maxCount) {
        console.error(`❌ Only ${capturedData.length} photos captured out of ${maxCount}. Cannot proceed.`);
        alert(`Please capture all ${maxCount} photos before proceeding. Currently have ${capturedData.length}/${maxCount}.`);
        return;
    }
    
    try {
        localStorage.setItem("capturedPhotos", JSON.stringify(capturedData));
        console.log("💾 Saved captured photos to localStorage");
        
        console.log("🔄 Redirecting to template.html...");
        window.location.href = "template.html";
    } catch (error) {
        console.error("❌ Error saving to localStorage or redirecting:", error);
        alert("Error saving photos. Please try again.");
    }
}

// Template management functions
function changeTemplate(templateSrc) {
    console.log("Template changed to:", templateSrc);
    currentTemplate = templateSrc;
    localStorage.setItem("selectedTemplate", templateSrc);

    document.getElementById("template-image").style.backgroundImage = `url('${templateSrc}')`;

    // Highlight selected template button
    document.querySelectorAll(".template-btn").forEach((btn) => btn.classList.remove("active-template"));
    document.querySelector(`.template-btn[data-template='${templateSrc}']`)?.classList.add("active-template");
}

// Ensure template is loaded on page refresh
function loadSelectedTemplate() {
    let savedTemplate = localStorage.getItem("selectedTemplate") || "template1.png";
    document.getElementById("template-image").style.backgroundImage = `url('${savedTemplate}')`;
}

// Load Photos (Fix: Ensure they appear correctly)
function loadPhotos() {
    const images = JSON.parse(localStorage.getItem("capturedPhotos")) || [];
    if (images.length === 3) {
        document.getElementById("photo1").style.backgroundImage = `url('${images[0]}')`;
        document.getElementById("photo2").style.backgroundImage = `url('${images[1]}')`;
        document.getElementById("photo3").style.backgroundImage = `url('${images[2]}')`;
    }
}

// Process & Upload Image
function downloadImage() {
    const originalWidth = 2284;
    const originalHeight = 6458;
    const canvas = document.createElement("canvas");
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    const ctx = canvas.getContext("2d");

    const images = JSON.parse(localStorage.getItem("capturedPhotos")) || [];
    const photoWidth = 2000;
    const photoHeight = 1500;
    const photoPositions = [
        { x: (originalWidth - photoWidth) / 2, y: 450 },
        { x: (originalWidth - photoWidth) / 2, y: 2000 },
        { x: (originalWidth - photoWidth) / 2, y: 3545 }
    ];

    let loadedImages = 0;
    images.forEach((src, index) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            ctx.drawImage(img, photoPositions[index].x, photoPositions[index].y, photoWidth, photoHeight);
            loadedImages++;
            if (loadedImages === images.length) {
                drawTemplate();
            }
        };
    });

    function drawTemplate() {
        const templateImg = new Image();
        templateImg.src = currentTemplate;
        templateImg.onload = () => {
            ctx.drawImage(templateImg, 0, 0, originalWidth, originalHeight);

            // Convert canvas to Blob
            canvas.toBlob(async (blob) => {
                const file = new File([blob], "photobooth.png", { type: "image/png" });

                // Save locally
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "photobooth.png";
                link.click();

                // Upload after saving
                setTimeout(async () => {
                    await uploadToGoogleDrive(file);
                }, 1000);
            }, "image/png");
        };
    }
}

// Upload "photobooth.png" to Google Drive
async function uploadToGoogleDrive(imageFile) {
    const folderId = "11EwrjP7y9yRxVGcxW_we20zI4Q-5vCSW";

    try {
        console.log("📤 Uploading photobooth.png to Google Drive...");
        
        // Show progress dialog if available
        const progressDialog = document.getElementById("progressDialog");
        if (progressDialog) {
            progressDialog.style.display = "block";
            updateProgress(10, "Preparing upload...");
        }
        
        // First, create the file metadata
        const metadata = {
            name: `photobooth-${Date.now()}.png`,
            mimeType: "image/png",
            parents: [folderId]
        };

        updateProgress(20, "Creating file...");

        // Create the file using the Drive API
        const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(metadata)
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create file: ${createResponse.status} ${createResponse.statusText}`);
        }

        const fileData = await createResponse.json();
        const fileId = fileData.id;
        
        console.log("📁 File created with ID:", fileId);

        updateProgress(50, "Uploading image...");

        // Now upload the file content
        const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "image/png"
            },
            body: imageFile
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log("✅ Upload successful:", uploadResult);
        
        updateProgress(80, "Making file public...");
        
        // Make the file publicly accessible and show QR code
        await makeFilePublicAndShowQR(fileId);
        
        updateProgress(90, "Generating QR code...");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateProgress(100, "Complete!");
        
        // Hide progress dialog after a short delay
        setTimeout(() => {
            if (progressDialog) {
                progressDialog.style.display = "none";
            }
        }, 1000);
        
    } catch (error) {
        console.error("⚠ Error uploading to Google Drive:", error);
        
        // Hide progress dialog on error
        const progressDialog = document.getElementById("progressDialog");
        if (progressDialog) {
            progressDialog.style.display = "none";
        }
        
        if (error.message.includes("401") || error.message.includes("403")) {
            // Token expired or invalid
            accessToken = "";
            localStorage.removeItem("googleAccessToken");
            alert("Your Google session has expired. Please sign in again and try uploading.");
        } else {
            alert(`Upload failed: ${error.message}. Please check your connection and try again.`);
        }
    }
}

// Update progress bar and text (for script.js)
function updateProgress(percentage, message) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.querySelector("#progressDialog p");
    
    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
    
    console.log(`📊 Progress: ${percentage}% - ${message}`);
}

// Make uploaded file publicly accessible and show QR code
async function makeFilePublicAndShowQR(fileId) {
    try {
        const permissionData = {
            role: "reader",
            type: "anyone"
        };

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(permissionData)
        });

        if (response.ok) {
            console.log("✅ File made publicly accessible");
            // Generate the public download URL
            const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            showQRModal(publicUrl);
        } else {
            console.error("❌ Failed to make file public:", response.statusText);
            // Still show QR with direct link even if permission setting failed
            showQRModal(`https://drive.google.com/file/d/${fileId}/view`);
        }
    } catch (error) {
        console.error("Error making file public:", error);
        // Fallback to direct Google Drive link
        showQRModal(`https://drive.google.com/file/d/${fileId}/view`);
    }
}

// QR Code Modal functions
function showQRModal(url) {
    document.getElementById("qrCodeContainer").innerHTML = "";
    new QRCode(document.getElementById("qrCodeContainer"), { text: url, width: 128, height: 128 });
    document.getElementById("qrModal").style.display = "flex";
}

function closeQRModal() {
    document.getElementById("qrModal").style.display = "none";
}

let cameraDropdown = document.getElementById("cameraDropdown");
let cameraList = document.getElementById("cameraList");
let currentStream = null;
let currentDeviceId = null;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");

        cameraList.innerHTML = ""; // Clear existing options

        videoDevices.forEach((device, index) => {
            let listItem = document.createElement("li");
            let button = document.createElement("button");
            button.className = "dropdown-item";
            button.innerText = device.label || `Camera ${index + 1}`;
            button.dataset.deviceId = device.deviceId;
            button.onclick = () => selectCamera(device.deviceId, button);

            listItem.appendChild(button);
            cameraList.appendChild(listItem);

            // Auto-select first camera if none is set
            if (index === 0) {
                selectCamera(device.deviceId, button);
            }
        });
    } catch (error) {
        console.error("Error fetching cameras:", error);
    }
}

async function selectCamera(deviceId, button) {
    if (currentDeviceId === deviceId) return; // Prevent unnecessary updates

    currentDeviceId = deviceId;
    cameraDropdown.innerText = button.innerText; // Update button text

    // Remove active class from all buttons
    document.querySelectorAll("#cameraList .dropdown-item").forEach(btn => {
        btn.classList.remove("active", "btn-primary");
    });

    // Highlight selected button
    button.classList.add("active", "btn-primary");

    // Start selected camera
    startCamera(deviceId);
}

async function startCamera(deviceId) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop()); // Stop previous stream
    }

    try {
        const constraints = {
            video: { deviceId: { exact: deviceId } }
        };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        // Apply mirror effect based on current state
        video.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
    } catch (error) {
        console.error("Error starting camera:", error);
    }
}

// Initialize camera selection on page load
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        // Apply mirror effect based on default state (mirrored by default)
        video.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
        return getCameras();
    })
    .catch(error => console.error("Error accessing camera:", error));





    document.addEventListener("DOMContentLoaded", function () {
    const capturedImagesContainer = document.getElementById("capturedImages");
    let images = JSON.parse(localStorage.getItem("capturedPhotos")) || [];
    
    function renderImages() {
        capturedImagesContainer.innerHTML = "";
        images.forEach((src, index) => {
            let imgWrapper = document.createElement("div");
            imgWrapper.classList.add("img-wrapper");
            imgWrapper.setAttribute("draggable", true);
            imgWrapper.dataset.index = index;
            
            let img = document.createElement("img");
            img.src = src;
            img.classList.add("captured-img");
            img.addEventListener("click", () => openModal(src));
            
            imgWrapper.appendChild(img);
            capturedImagesContainer.appendChild(imgWrapper);
            
            addDragEvents(imgWrapper);
        });
    }
    
    function addDragEvents(element) {
        element.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", e.target.dataset.index);
            e.target.classList.add("dragging");
        });
        
        element.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.target.classList.add("drag-over");
        });
        
        element.addEventListener("dragleave", (e) => {
            e.target.classList.remove("drag-over");
        });
        
        element.addEventListener("drop", (e) => {
            e.preventDefault();
            let draggedIndex = e.dataTransfer.getData("text/plain");
            let targetIndex = e.target.closest(".img-wrapper").dataset.index;
            
            let temp = images[draggedIndex];
            images.splice(draggedIndex, 1);
            images.splice(targetIndex, 0, temp);
            
            localStorage.setItem("capturedPhotos", JSON.stringify(images));
            renderImages();
        });
        
        element.addEventListener("dragend", (e) => {
            e.target.classList.remove("dragging");
        });
    }
    
    function openModal(imageSrc) {
        let modal = document.getElementById("imageModal");
        let modalImg = document.getElementById("modalImage");
        modalImg.src = imageSrc;
        modal.style.display = "block";
    }
    
    document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("imageModal").style.display = "none";
    });
    
    renderImages();
});



function toggleTimerSlider() {
    const sliderWrapper = document.getElementById("timerSliderWrapper");
    sliderWrapper.classList.toggle("active");
}

// Close timer slider when clicking outside
document.addEventListener("click", function(event) {
    const timerContainer = document.querySelector(".timer-container");
    const sliderWrapper = document.getElementById("timerSliderWrapper");
    
    if (!timerContainer.contains(event.target) && sliderWrapper.classList.contains("active")) {
        sliderWrapper.classList.remove("active");
    }
});

// Map slider values to actual timer seconds

timerSlider.addEventListener("input", function () {
    const selectedTime = timerValues[this.value];
    document.getElementById("timerDuration").value = selectedTime;
});


document.addEventListener("DOMContentLoaded", function () {
    const gridOverlay = document.querySelector(".grid-overlay");

    if (!localStorage.getItem("userLoggedIn")) {
        window.location.href = "index.html"; // Redirect to login page
    }
    
    function logout() {
        alert("Logging out...");
        localStorage.clear(); // Clear stored session data
        window.location.href = "index.html"; // Redirect to login page
    }
    
    // Manual Logout Button
    logoutButton.addEventListener("click", function () {
        logout();
    });

    setTimeout(function () {
        if (document.readyState !== "complete") {
            alert("System encountered an issue. Logging out...");
            logout();
        }
    }, 5000); // Checks after 5 seconds

    for (let i = 0; i < 2; i++) {
        const line = document.createElement("div");
        gridOverlay.appendChild(line);
    }
    
});


document.addEventListener("DOMContentLoaded", function () {
    const gridOverlay = document.querySelector(".grid-overlay");
    const gridToggleButton = document.getElementById("gridToggleButton");

    // Ensure grid is OFF at start
    gridOverlay.style.display = "none";
    gridToggleButton.classList.remove("active");

    gridToggleButton.addEventListener("click", function () {
        const isGridVisible = gridOverlay.style.display !== "none";
        gridOverlay.style.display = isGridVisible ? "none" : "block";
        gridToggleButton.classList.toggle("active", !isGridVisible);
    });
});



const themeLink = document.getElementById("theme-link");
    const themeButton = document.getElementById("themeButton");
    const themeIcon = themeButton ? themeButton.querySelector("use") : null; // Avoid errors
    const logoutButton = document.getElementById("logoutButton");

    function toggleTheme() {
        const currentTheme = themeLink.getAttribute("href");

        if (currentTheme === "style.css") {
            themeLink.setAttribute("href", "dark-style.css");
            localStorage.setItem("theme", "dark");
            if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-sun");
        } else {
            themeLink.setAttribute("href", "style.css");
            localStorage.setItem("theme", "light");
            if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-moon");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            themeLink.setAttribute("href", "dark-style.css");
            if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-sun");
        } else {
            themeLink.setAttribute("href", "style.css");
            if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-moon");
        }
    });

// Initialize Google Drive functionality
window.onload = function () {
    checkLoginStatus();
    loadPhotos();
    loadSelectedTemplate();
};

// Add event listener for Google Sign In button
document.addEventListener("DOMContentLoaded", function() {
    const googleSignInBtn = document.getElementById("googleSignIn");
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener("click", signInWithGoogle);
    }
});