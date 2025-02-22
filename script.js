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

navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
});

async function startCapture() {
    captureCount = 0;
    resetPlaceholders();
    startButton.disabled = true;
    proceedButton.style.display = "none";
    await countdownAndCapture(5);
}

async function countdownAndCapture(seconds) {
    if (captureCount >= 3) return;
    startButton.innerText = `Capturing in ${seconds}...`;
    
    for (let i = seconds; i > 0; i--) {
        if (i > 1) {
            beepSound.currentTime = 0;
            beepSound.play();
        } else {
            countdownHigh.currentTime = 0;
            countdownHigh.play();
        }
        startButton.innerText = `Capturing in ${i}...`;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    captureImage();
}

function captureImage() {
    flashEffect();
    shutterSound.currentTime = 0;
    shutterSound.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    capturedImages.replaceChild(img, capturedImages.children[captureCount]);
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