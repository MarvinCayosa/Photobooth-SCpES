const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const capturedImages = document.getElementById('capturedImages');
const startButton = document.getElementById('startButton');
const proceedButton = document.getElementById('proceedButton');
const flash = document.getElementById('flash');
const shutterSound = document.getElementById('shutterSound');
const beepSound = document.getElementById('beepSound');
const countdownHigh = document.getElementById('countdownHigh');
let captureCount = 0;

let isMirrored = false;

function toggleMirror() {
    isMirrored = !isMirrored;

    // Flip the video preview
    const video = document.getElementById("video");
    video.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";

    // Flip all captured images
    document.querySelectorAll("#capturedImages img").forEach(img => {
        img.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
    });

    // Flip the mirror button icon
    const mirrorIcon = document.querySelector("#mirrorButton .icon");
    mirrorIcon.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
}
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
});





let isCapturing = false;
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
    console.log("Start Capture Clicked! Capture Delay:", captureDelay); // Debugging
    // Change button appearance
    startButton.classList.add("capturing");
    startButton.innerText = "Capturing...";
    captureCount = 0;
    cancelCaptureFlag = false;
    resetPlaceholders();
    startButton.disabled = true;
    proceedButton.style.display = "none";
    cancelButton.style.display = "block"; // Show Cancel button
    isCapturing = true;
    await countdownAndCapture(captureDelay);
}

// Use `captureDelay` in the countdown function
async function countdownAndCapture(seconds) {
    if (!isCapturing || cancelCaptureFlag || captureCount >= 3) return;
    startButton.innerText = `Capturing...`;

    const countdownOverlay = document.getElementById("countdownOverlay");
    countdownOverlay.style.display = "block";

    for (let i = seconds; i > 0; i--) {
        if (cancelCaptureFlag) {
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
    captureImage();
}

// Ensure the next capture uses the updated delay
if (captureCount < 3) {
    setTimeout(() => countdownAndCapture(captureDelay), 1000);
}


function captureImage() {
    if (cancelCaptureFlag) return;

    flashEffect();
    shutterSound.currentTime = 0;
    shutterSound.play();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (isMirrored) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (isMirrored) {
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.classList.add("captured-thumbnail");
    img.style.opacity = "0";
    img.style.transform = "scale(0.8)";

    img.onclick = function() {
        document.getElementById("modalImage").src = img.src;
        new bootstrap.Modal(document.getElementById("imagePreviewModal")).show();
    };

    capturedImages.replaceChild(img, capturedImages.children[captureCount]);

    setTimeout(() => {
        img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out";
        img.style.opacity = "1";
        img.style.transform = "scale(1)";
    }, 100);

    captureCount++;

    if (captureCount < 3) {
        setTimeout(() => countdownAndCapture(captureDelay), 1000);
    } else {
        isCapturing = false;
        startButton.innerHTML = `
            <svg class="icon icon-reset" fill="currentColor">
                <use xlink:href="icons.svg#icon-reset"></use>
            </svg> Retake Photos
        `;
        startButton.classList.remove("capturing");
        startButton.disabled = false;
        cancelButton.style.display = "none";
        proceedButton.style.display = "block";
    }
}

function cancelCapture() {
    cancelCaptureFlag = true;
    isCapturing = false;
    
    startButton.innerHTML = `
        <svg class="icon icon-start" fill="currentColor">
            <use xlink:href="icons.svg#icon-start"></use>
        </svg> Start Capture
    `;
    startButton.classList.remove("capturing");
    startButton.classList.add("btn-start"); // Ensure it keeps original styling
    startButton.disabled = false;
    
    cancelButton.style.display = "none";
    proceedButton.style.display = "none";
    resetPlaceholders();
}


function resetPlaceholders() {
    capturedImages.innerHTML = `
        <div class="placeholder p-4 text-center">1</div>
        <div class="placeholder p-4 text-center">2</div>
        <div class="placeholder p-4 text-center">3</div>
    `;
}


function flashEffect() {
    flash.style.opacity = "1";
    setTimeout(() => {
        flash.style.opacity = "0";
    }, 100);
}

function resetPlaceholders() {
    for (let i = 0; i < 3; i++) {
        let placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.innerText = i + 1;
        capturedImages.replaceChild(placeholder, capturedImages.children[i]);
    }
}

function proceedToTemplate() {
    const capturedData = [];
    for (let i = 0; i < 3; i++) {
        if (capturedImages.children[i].tagName === 'IMG') {
            capturedData.push(capturedImages.children[i].src);
        }
    }
    localStorage.setItem("capturedPhotos", JSON.stringify(capturedData));
    window.location.href = "template.html";
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
    } catch (error) {
        console.error("Error starting camera:", error);
    }
}

// Initialize camera selection on page load
navigator.mediaDevices.getUserMedia({ video: true })
    .then(getCameras)
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