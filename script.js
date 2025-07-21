const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const context = canvas.getContext("2d")
const capturedImages = document.getElementById("capturedImages")
const startButton = document.getElementById("startButton")
const proceedButton = document.getElementById("proceedButton")
const cancelButton = document.getElementById("cancelButton")
const flash = document.getElementById("flash")
const shutterSound = document.getElementById("shutterSound")
const beepSound = document.getElementById("beepSound")
const countdownHigh = document.getElementById("countdownHigh")
const logoutButton = document.getElementById("logoutButton")

let captureCount = 0
let currentFilter = "none"
let isMirrored = false
let currentPhotoIndex = -1 // Track which photo is being viewed in the modal
let photoSlots = [null, null, null] // Track which slots have photos (null = empty/placeholder)
let retakeMode = false // Flag to indicate we're in retake mode
let retakeIndices = [] // Indices of photos to retake

// Apply filter to video preview
function applyFilter(filterType) {
  currentFilter = filterType

  // Reset all filters first
  video.style.filter = "none"

  // Apply the selected filter
  switch (filterType) {
    case "grayscale":
      video.style.filter = "grayscale(100%)"
      break
    case "sepia":
      video.style.filter = "sepia(100%)"
      break
    case "invert":
      video.style.filter = "invert(100%)"
      break
    case "blur":
      video.style.filter = "blur(5px)"
      break
    case "brightness":
      video.style.filter = "brightness(150%)"
      break
    default:
      video.style.filter = "none"
  }
}

function toggleMirror() {
  isMirrored = !isMirrored

  // Flip the video preview
  video.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)"

  // Flip all captured images
  document.querySelectorAll("#capturedImages img").forEach((img) => {
    img.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)"
  })

  // Flip the mirror button icon
  const mirrorIcon = document.querySelector("#mirrorButton .icon")
  mirrorIcon.style.transform = isMirrored ? "scaleX(-1)" : "scaleX(1)"
}

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream
})

let isCapturing = false
let cancelCaptureFlag = false // Flag to track cancellation

// Get slider and map values
const timerSlider = document.getElementById("timerSlider")
const timerValues = { 1: 2, 2: 5, 3: 10 }
let captureDelay = 5 // Default to 5 seconds

// Update the timer value when the slider changes
timerSlider.addEventListener("input", function () {
  captureDelay = timerValues[this.value] // Update global capture delay
  console.log("Capture delay set to:", captureDelay, "seconds")
})

// Modify the capture function to use the selected timer
async function startCapture() {
  console.log("Start Capture Clicked! Capture Delay:", captureDelay)

  // If we're in retake mode, handle it differently
  if (retakeMode && retakeIndices.length > 0) {
    startRetakeSequence()
    return
  }

  // Normal capture mode (first time)
  startButton.classList.add("capturing")
  startButton.innerText = "Capturing..."
  captureCount = 0
  cancelCaptureFlag = false
  resetPlaceholders()
  startButton.disabled = true
  proceedButton.style.display = "none"
  cancelButton.style.display = "block" // Show Cancel button
  isCapturing = true
  photoSlots = [null, null, null] // Reset photo slots
  await countdownAndCapture(captureDelay)
}

// Start the retake sequence for deleted photos
function startRetakeSequence() {
  if (retakeIndices.length === 0) return

  startButton.classList.add("capturing")
  startButton.innerText = "Retaking..."
  startButton.disabled = true
  cancelButton.style.display = "block"
  isCapturing = true

  // Start with the first photo to retake
  currentPhotoIndex = retakeIndices[0]
  retakeCountdownAndCapture(captureDelay, currentPhotoIndex)
}

// Use `captureDelay` in the countdown function
async function countdownAndCapture(seconds) {
  if (!isCapturing || cancelCaptureFlag || captureCount >= 3) return
  startButton.innerText = `Capturing...`

  const countdownOverlay = document.getElementById("countdownOverlay")
  countdownOverlay.style.display = "block"

  for (let i = seconds; i > 0; i--) {
    if (cancelCaptureFlag) {
      countdownOverlay.style.display = "none"
      return
    }

    countdownOverlay.innerText = i
    countdownOverlay.style.opacity = "1"
    countdownOverlay.style.transform = "translate(-50%, -50%) scale(1.2)"

    if (i > 1) {
      beepSound.currentTime = 0
      beepSound.play()
    } else {
      countdownHigh.currentTime = 0
      countdownHigh.play()
    }

    await new Promise((resolve) => setTimeout(resolve, 800))
    countdownOverlay.style.transform = "translate(-50%, -50%) scale(1)"
    countdownOverlay.style.opacity = "0.5"

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  countdownOverlay.style.display = "none"
  captureImage()
}

// Ensure the next capture uses the updated delay
if (captureCount < 3) {
  setTimeout(() => countdownAndCapture(captureDelay), 1000)
}

function captureImage() {
  if (cancelCaptureFlag) return

  flashEffect()
  shutterSound.currentTime = 0
  shutterSound.play()

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  if (isMirrored) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Apply the current filter to the captured image
  if (currentFilter !== "none") {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    applyFilterToImageData(imageData, currentFilter)
    context.putImageData(imageData, 0, 0)
  }

  if (isMirrored) {
    context.setTransform(1, 0, 0, 1, 0, 0)
  }

  const img = document.createElement("img")
  img.src = canvas.toDataURL("image/png")
  img.classList.add("captured-thumbnail")
  img.style.opacity = "0"
  img.style.transform = "scale(0.8)"
  img.dataset.index = captureCount // Store the index for reference

  img.onclick = () => {
    openPhotoModal(img.src, Number.parseInt(img.dataset.index))
  }

  capturedImages.replaceChild(img, capturedImages.children[captureCount])
  photoSlots[captureCount] = img.src // Store the image in the slot

  setTimeout(() => {
    img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out"
    img.style.opacity = "1"
    img.style.transform = "scale(1)"
  }, 100)

  captureCount++

  if (captureCount < 3) {
    setTimeout(() => countdownAndCapture(captureDelay), 1000)
  } else {
    isCapturing = false
    startButton.innerHTML = `
            <svg class="icon icon-reset" fill="currentColor">
                <use xlink:href="icons.svg#icon-reset"></use>
            </svg> Retake Photos
        `
    startButton.classList.remove("capturing")
    startButton.disabled = false
    cancelButton.style.display = "none"
    proceedButton.style.display = "block"
  }
}

// Apply filter to image data
function applyFilterToImageData(imageData, filterType) {
  const data = imageData.data

  switch (filterType) {
    case "grayscale":
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
        data[i] = avg // red
        data[i + 1] = avg // green
        data[i + 2] = avg // blue
      }
      break
    case "sepia":
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
      }
      break
    case "invert":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i] // red
        data[i + 1] = 255 - data[i + 1] // green
        data[i + 2] = 255 - data[i + 2] // blue
      }
      break
    case "brightness":
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.5)
        data[i + 1] = Math.min(255, data[i + 1] * 1.5)
        data[i + 2] = Math.min(255, data[i + 2] * 1.5)
      }
      break
    case "blur":
      // Blur is applied via CSS, not directly to image data
      break
  }
}

// Variables for image manipulation in the modal
let currentScale = 1
let currentOffsetX = 0
let currentOffsetY = 0
let isDragging = false
let startX, startY
let originalImageSrc = null

// Open photo in modal with enhanced functionality
function openPhotoModal(imageSrc, index) {
  currentPhotoIndex = index
  originalImageSrc = imageSrc

  // Reset transformation values
  currentScale = 1
  currentOffsetX = 0
  currentOffsetY = 0

  const modalImage = document.getElementById("modalImage")
  modalImage.src = imageSrc
  modalImage.style.transform = `scale(${currentScale}) translate(${currentOffsetX}px, ${currentOffsetY}px)`

  // Update zoom slider value
  const zoomSlider = document.getElementById("zoomSlider")
  zoomSlider.value = currentScale * 100
  document.getElementById("zoomValue").textContent = `${Math.round(currentScale * 100)}%`

  // Set up the delete button
  document.getElementById("deletePhotoBtn").onclick = () => {
    // Show confirmation modal
    const deleteConfirmModalElement = document.getElementById("deleteConfirmModal")
    const deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalElement)
    deleteConfirmModal.show()
  }

  // Set up the save button to apply the current transformations
  document.getElementById("savePhotoBtn").onclick = () => {
    applyImageTransformations()
    const imagePreviewModalElement = document.getElementById("imagePreviewModal")
    const imagePreviewModal = bootstrap.Modal.getInstance(imagePreviewModalElement)
    imagePreviewModal.hide()
  }

  // Set up the confirm delete button
  document.getElementById("confirmDeleteBtn").onclick = () => {
    deletePhoto(currentPhotoIndex)
    const deleteConfirmModalElement = document.getElementById("deleteConfirmModal")
    const deleteConfirmModal = bootstrap.Modal.getInstance(deleteConfirmModalElement)
    deleteConfirmModal.hide()
    const imagePreviewModalElement = document.getElementById("imagePreviewModal")
    const imagePreviewModal = bootstrap.Modal.getInstance(imagePreviewModalElement)
    imagePreviewModal.hide()
  }

  // Show the modal
  const previewModalElement = document.getElementById("imagePreviewModal")
  const previewModal = new bootstrap.Modal(previewModalElement)
  previewModal.show()

  // Set up image manipulation events
  setupImageManipulation()
}

// Update the setupImageManipulation function to constrain dragging within bounds
function setupImageManipulation() {
  const modalImage = document.getElementById("modalImage")
  const zoomSlider = document.getElementById("zoomSlider")
  const imageFrame = document.querySelector(".image-frame")

  // Zoom slider
  zoomSlider.oninput = function () {
    currentScale = this.value / 100
    document.getElementById("zoomValue").textContent = `${this.value}%`
    updateImageTransform()
  }

  // Mouse events for dragging
  modalImage.onmousedown = startDrag
  document.onmousemove = moveDrag
  document.onmouseup = endDrag

  // Touch events for mobile
  modalImage.ontouchstart = startDrag
  document.ontouchmove = moveDrag
  document.ontouchend = endDrag

  function startDrag(e) {
    e.preventDefault() // Prevent default behavior
    isDragging = true
    modalImage.classList.add("dragging")

    // Get current position from transform or default to 0
    const transform = modalImage.style.transform
    const translateMatch = transform.match(/translate$$([^,]+)px,\s*([^)]+)px$$/)

    if (translateMatch) {
      currentOffsetX = Number.parseFloat(translateMatch[1]) * currentScale
      currentOffsetY = Number.parseFloat(translateMatch[2]) * currentScale
    }

    // Get start position for both mouse and touch events
    if (e.type === "touchstart") {
      startX = e.touches[0].clientX - currentOffsetX
      startY = e.touches[0].clientY - currentOffsetY
    } else {
      startX = e.clientX - currentOffsetX
      startY = e.clientY - currentOffsetY
    }
  }

  function moveDrag(e) {
    if (!isDragging) return
    e.preventDefault() // Prevent scrolling on touch devices

    // Calculate new position based on event type
    let clientX, clientY
    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Calculate new position
    const newX = clientX - startX
    const newY = clientY - startY

    // Get frame and image dimensions for boundary calculation
    const frameRect = imageFrame.getBoundingClientRect()
    const imgRect = modalImage.getBoundingClientRect()

    // Calculate boundaries based on current scale
    const scaledImgWidth = imgRect.width
    const scaledImgHeight = imgRect.height

    // Calculate maximum allowed movement in each direction
    const maxX = (scaledImgWidth - frameRect.width) / 2 / currentScale
    const maxY = (scaledImgHeight - frameRect.height) / 2 / currentScale

    // Constrain movement within boundaries
    // Only allow movement if image is larger than frame in that dimension
    if (scaledImgWidth > frameRect.width) {
      currentOffsetX = Math.max(-maxX, Math.min(maxX, newX / currentScale))
    } else {
      currentOffsetX = 0 // Center if image is smaller than frame
    }

    if (scaledImgHeight > frameRect.height) {
      currentOffsetY = Math.max(-maxY, Math.min(maxY, newY / currentScale))
    } else {
      currentOffsetY = 0 // Center if image is smaller than frame
    }

    updateImageTransform()
  }

  function endDrag() {
    isDragging = false
    modalImage.classList.remove("dragging")
  }

  // Double-click to reset
  modalImage.ondblclick = () => {
    currentScale = 1
    currentOffsetX = 0
    currentOffsetY = 0
    zoomSlider.value = 100
    document.getElementById("zoomValue").textContent = "100%"
    updateImageTransform()
  }
}

// Update the image transform based on current values
function updateImageTransform() {
  const modalImage = document.getElementById("modalImage")
  modalImage.style.transform = `scale(${currentScale}) translate(${currentOffsetX}px, ${currentOffsetY}px)`
}

// Apply the current transformations to the image
function applyImageTransformations() {
  // Create a canvas to apply the transformations
  const tempCanvas = document.createElement("canvas")
  const tempContext = tempCanvas.getContext("2d")

  // Load the original image
  const img = new Image()
  img.crossOrigin = "anonymous" // Prevent CORS issues
  img.onload = () => {
    // Set canvas size to match the original image
    tempCanvas.width = img.width
    tempCanvas.height = img.height

    // Calculate the center point
    const centerX = tempCanvas.width / 2
    const centerY = tempCanvas.height / 2

    // Clear the canvas
    tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height)

    // Apply transformations
    tempContext.save()
    tempContext.translate(centerX, centerY)
    tempContext.scale(currentScale, currentScale)
    tempContext.translate(-centerX + currentOffsetX / currentScale, -centerY + currentOffsetY / currentScale)
    tempContext.drawImage(img, 0, 0)
    tempContext.restore()

    // Get the transformed image
    const transformedImageSrc = tempCanvas.toDataURL("image/png")

    // Update the image in the UI and storage
    const imgElement = capturedImages.children[currentPhotoIndex]
    if (imgElement && imgElement.tagName === "IMG") {
      imgElement.src = transformedImageSrc
    }

    // Update in photoSlots array
    photoSlots[currentPhotoIndex] = transformedImageSrc

    // Update localStorage
    updateCapturedPhotos()
  }

  img.src = originalImageSrc
}

// Delete photo and replace with placeholder
function deletePhoto(index) {
  // Create a placeholder
  const placeholder = document.createElement("div")
  placeholder.className = "placeholder"
  placeholder.innerText = index + 1
  placeholder.onclick = () => {
    // Add this index to the retake list
    if (!retakeIndices.includes(index)) {
      retakeIndices.push(index)
    }
  }

  // Replace the image with the placeholder
  capturedImages.replaceChild(placeholder, capturedImages.children[index])

  // Update the photo slots
  photoSlots[index] = null

  // Update the captured photos in localStorage
  updateCapturedPhotos()

  // Update capture count
  captureCount--

  // Enable retake mode
  retakeMode = true

  // Add this index to the retake list if not already there
  if (!retakeIndices.includes(index)) {
    retakeIndices.push(index)
  }

  // Update the start button
  startButton.disabled = false
  startButton.innerHTML = `
        <svg class="icon icon-start" fill="currentColor">
            <use xlink:href="icons.svg#icon-start"></use>
        </svg> Retake Selected
    `

  // Hide proceed button if not all photos are captured
  if (captureCount < 3) {
    proceedButton.style.display = "none"
  }
}

// Countdown and capture for retaking a specific photo
async function retakeCountdownAndCapture(seconds, index) {
  if (!isCapturing || cancelCaptureFlag) return

  const countdownOverlay = document.getElementById("countdownOverlay")
  countdownOverlay.style.display = "block"

  for (let i = seconds; i > 0; i--) {
    if (cancelCaptureFlag) {
      countdownOverlay.style.display = "none"
      return
    }

    countdownOverlay.innerText = i
    countdownOverlay.style.opacity = "1"
    countdownOverlay.style.transform = "translate(-50%, -50%) scale(1.2)"

    if (i > 1) {
      beepSound.currentTime = 0
      beepSound.play()
    } else {
      countdownHigh.currentTime = 0
      countdownHigh.play()
    }

    await new Promise((resolve) => setTimeout(resolve, 800))
    countdownOverlay.style.transform = "translate(-50%, -50%) scale(1)"
    countdownOverlay.style.opacity = "0.5"

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  countdownOverlay.style.display = "none"
  captureSpecificImage(index)
}

// Capture a specific image
function captureSpecificImage(index) {
  if (cancelCaptureFlag) return

  flashEffect()
  shutterSound.currentTime = 0
  shutterSound.play()

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  if (isMirrored) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Apply the current filter to the captured image
  if (currentFilter !== "none") {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    applyFilterToImageData(imageData, currentFilter)
    context.putImageData(imageData, 0, 0)
  }

  if (isMirrored) {
    context.setTransform(1, 0, 0, 1, 0, 0)
  }

  const img = document.createElement("img")
  img.src = canvas.toDataURL("image/png")
  img.classList.add("captured-thumbnail")
  img.style.opacity = "0"
  img.style.transform = "scale(0.8)"
  img.dataset.index = index // Store the index for reference

  img.onclick = () => {
    openPhotoModal(img.src, Number.parseInt(img.dataset.index))
  }

  capturedImages.replaceChild(img, capturedImages.children[index])
  photoSlots[index] = img.src // Store the image in the slot

  setTimeout(() => {
    img.style.transition = "opacity 0.5s ease-in-out, transform 0.3s ease-in-out"
    img.style.opacity = "1"
    img.style.transform = "scale(1)"
  }, 100)

  captureCount++

  // Remove this index from the retake list
  retakeIndices = retakeIndices.filter((i) => i !== index)

  // If there are more photos to retake, continue with the next one
  if (retakeIndices.length > 0) {
    currentPhotoIndex = retakeIndices[0]
    setTimeout(() => retakeCountdownAndCapture(captureDelay, currentPhotoIndex), 1000)
  } else {
    // All photos have been retaken
    isCapturing = false
    retakeMode = false
    startButton.innerHTML = `
            <svg class="icon icon-reset" fill="currentColor">
                <use xlink:href="icons.svg#icon-reset"></use>
            </svg> Retake Photos
        `
    startButton.classList.remove("capturing")
    startButton.disabled = false
    cancelButton.style.display = "none"

    // Show proceed button if all photos are captured
    if (captureCount === 3) {
      proceedButton.style.display = "block"
    }
  }

  // Update captured photos in localStorage
  updateCapturedPhotos()
}

// Update captured photos in localStorage
function updateCapturedPhotos() {
  localStorage.setItem("capturedPhotos", JSON.stringify(photoSlots))
}

function cancelCapture() {
  cancelCaptureFlag = true
  isCapturing = false
  retakeMode = false
  retakeIndices = []

  startButton.innerHTML = `
        <svg class="icon icon-start" fill="currentColor">
            <use xlink:href="icons.svg#icon-start"></use>
        </svg> Start Capture
    `
  startButton.classList.remove("capturing")
  startButton.classList.add("btn-start") // Ensure it keeps original styling
  startButton.disabled = false

  cancelButton.style.display = "none"
  proceedButton.style.display = "none"
  resetPlaceholders()
}

function resetPlaceholders() {
  capturedImages.innerHTML = `
        <div class="placeholder p-4 text-center">1</div>
        <div class="placeholder p-4 text-center">2</div>
        <div class="placeholder p-4 text-center">3</div>
    `
  captureCount = 0
  photoSlots = [null, null, null]
  retakeIndices = []
  retakeMode = false
}

function flashEffect() {
  flash.style.opacity = "1"
  setTimeout(() => {
    flash.style.opacity = "0"
  }, 100)
}

function proceedToTemplate() {
  // Check if all photos are captured
  if (captureCount < 3) {
    alert("Please capture all 3 photos before proceeding.")
    return
  }

  // Update localStorage with the final photo slots
  localStorage.setItem("capturedPhotos", JSON.stringify(photoSlots))
  window.location.href = "template.html"
}

const cameraDropdown = document.getElementById("cameraDropdown")
const cameraList = document.getElementById("cameraList")
let currentStream = null
let currentDeviceId = null

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter((device) => device.kind === "videoinput")

    cameraList.innerHTML = "" // Clear existing options

    videoDevices.forEach((device, index) => {
      const listItem = document.createElement("li")
      const button = document.createElement("button")
      button.className = "dropdown-item"
      button.innerText = device.label || `Camera ${index + 1}`
      button.dataset.deviceId = device.deviceId
      button.onclick = () => selectCamera(device.deviceId, button)

      listItem.appendChild(button)
      cameraList.appendChild(listItem)

      // Auto-select first camera if none is set
      if (index === 0) {
        selectCamera(device.deviceId, button)
      }
    })
  } catch (error) {
    console.error("Error fetching cameras:", error)
  }
}

async function selectCamera(deviceId, button) {
  if (currentDeviceId === deviceId) return // Prevent unnecessary updates

  currentDeviceId = deviceId
  cameraDropdown.innerText = button.innerText // Update button text

  // Remove active class from all buttons
  document.querySelectorAll("#cameraList .dropdown-item").forEach((btn) => {
    btn.classList.remove("active", "btn-primary")
  })

  // Highlight selected button
  button.classList.add("active", "btn-primary")

  // Start selected camera
  startCamera(deviceId)
}

async function startCamera(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop()) // Stop previous stream
  }

  try {
    const constraints = {
      video: { deviceId: { exact: deviceId } },
    }
    currentStream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = currentStream
  } catch (error) {
    console.error("Error starting camera:", error)
  }
}

// Initialize camera selection on page load
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then(getCameras)
  .catch((error) => console.error("Error accessing camera:", error))

function toggleTimerSlider() {
  const sliderWrapper = document.getElementById("timerSliderWrapper")
  sliderWrapper.classList.toggle("active")
}

// Map slider values to actual timer seconds
timerSlider.addEventListener("input", function () {
  const selectedTime = timerValues[this.value]
  // Check if timerDuration exists before setting its value
  const timerDuration = document.getElementById("timerDuration")
  if (timerDuration) {
    timerDuration.value = selectedTime
  }
})

document.addEventListener("DOMContentLoaded", () => {
  const gridOverlay = document.querySelector(".grid-overlay")

  if (!localStorage.getItem("userLoggedIn")) {
    window.location.href = "index.html" // Redirect to login page
  }

  function logout() {
    alert("Logging out...")
    localStorage.clear() // Clear stored session data
    window.location.href = "index.html" // Redirect to login page
  }

  // Manual Logout Button
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout()
    })
  }

  setTimeout(() => {
    if (document.readyState !== "complete") {
      alert("System encountered an issue. Logging out...")
      logout()
    }
  }, 5000) // Checks after 5 seconds

  if (gridOverlay) {
    for (let i = 0; i < 2; i++) {
      const line = document.createElement("div")
      gridOverlay.appendChild(line)
    }
  }
})

document.addEventListener("DOMContentLoaded", () => {
  const gridOverlay = document.querySelector(".grid-overlay")
  const gridToggleButton = document.getElementById("gridToggleButton")

  if (gridOverlay && gridToggleButton) {
    // Ensure grid is OFF at start
    gridOverlay.style.display = "none"
    gridToggleButton.classList.remove("active")

    gridToggleButton.addEventListener("click", () => {
      const isGridVisible = gridOverlay.style.display !== "none"
      gridOverlay.style.display = isGridVisible ? "none" : "block"
      gridToggleButton.classList.toggle("active", !isGridVisible)
    })
  }
})

const themeLink = document.getElementById("theme-link")
const themeButton = document.getElementById("themeButton")
const themeIcon = themeButton ? themeButton.querySelector("use") : null // Avoid errors

function toggleTheme() {
  const currentTheme = themeLink.getAttribute("href")

  if (currentTheme === "style.css") {
    themeLink.setAttribute("href", "dark-style.css")
    localStorage.setItem("theme", "dark")
    if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-sun")
  } else {
    themeLink.setAttribute("href", "style.css")
    localStorage.setItem("theme", "light")
    if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-moon")
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "dark") {
    themeLink.setAttribute("href", "dark-style.css")
    if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-sun")
  } else {
    themeLink.setAttribute("href", "style.css")
    if (themeIcon) themeIcon.setAttribute("xlink:href", "icons.svg#icon-moon")
  }
})

// Initialize Bootstrap modals
document.addEventListener("DOMContentLoaded", () => {
  // Get all elements with class 'modal'
  const modalElements = document.querySelectorAll(".modal")

  // Loop through each modal element
  modalElements.forEach((modalElement) => {
    // Create a new Bootstrap modal instance for each element
    const bootstrap = window.bootstrap
    new bootstrap.Modal(modalElement)
  })
})
