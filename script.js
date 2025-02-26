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
    const mirrorIcon = document.querySelector("#mirrorButton .icon-mirror");
    mirrorIcon.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)";
}



navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
});

async function startCapture() {
    console.log("Start Capture Clicked!"); // Debugging
    captureCount = 0;
    resetPlaceholders();
    startButton.disabled = true;
    proceedButton.style.display = "none";
    await countdownAndCapture(5);
}

async function countdownAndCapture(seconds) {
    if (captureCount >= 3) return;
    startButton.innerText = `Capturing in ${seconds}...`;

    const countdownOverlay = document.getElementById("countdownOverlay");
    countdownOverlay.style.display = "block"; // Show countdown

    for (let i = seconds; i > 0; i--) {
        countdownOverlay.innerText = i;
        countdownOverlay.style.opacity = "1";
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1.2)"; // Scale up slightly

        if (i > 1) {
            beepSound.currentTime = 0;
            beepSound.play();
        } else {
            countdownHigh.currentTime = 0;
            countdownHigh.play();
        }

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 800));

        // Smooth shrinking animation
        countdownOverlay.style.transform = "translate(-50%, -50%) scale(1)";
        countdownOverlay.style.opacity = "0.5";

        await new Promise(resolve => setTimeout(resolve, 200)); // Small pause
    }

    countdownOverlay.style.display = "none"; // Hide countdown
    captureImage();
}


function captureImage() {
    flashEffect();
    shutterSound.currentTime = 0;
    shutterSound.play();

    // Set canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip context if mirroring is enabled
    if (isMirrored) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
    }

    // Draw the image on the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transformation to avoid affecting future drawings
    if (isMirrored) {
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Create an image element
    // Create an image element
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.opacity = "0"; // Start invisible
    img.style.transform = "scale(0.8)"; // Start slightly smaller
    capturedImages.replaceChild(img, capturedImages.children[captureCount]);

    // Animate the image appearance
    setTimeout(() => {
        img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out";
        img.style.opacity = "1";
        img.style.transform = "scale(1)"; // Scale to normal size
    }, 100);


    captureCount++;

    if (captureCount < 3) {
        setTimeout(() => countdownAndCapture(5), 1000);
    } else {
        startButton.innerText = "Retake Photos";
        startButton.disabled = false;
        proceedButton.style.display = "block";
    }
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
