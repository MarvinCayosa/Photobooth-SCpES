<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script>
    let accessToken = localStorage.getItem("googleAccessToken") || "";
    let currentTemplate = localStorage.getItem("selectedTemplate") || "template1.png"; // ✅ Load last selected template

    // ✅ Google OAuth Login
    function signInWithGoogle() {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: "1050323234175-b5apn028urg40cqvmavnefprcfbfbqp6.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/drive.file",
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

    // ✅ Hide sign-in button if already logged in
    function checkLoginStatus() {
        if (accessToken) {
            document.getElementById("googleSignIn").classList.add("hidden");
            document.getElementById("userInfo").innerText = "✅ Signed in!";
            console.log("🔄 Auto-logged in with saved token.");
        }
    }

    // ✅ Load Photos (Fix: Ensure they appear correctly)
    function loadPhotos() {
        const images = JSON.parse(localStorage.getItem("capturedPhotos")) || [];
        if (images.length === 3) {
            document.getElementById("photo1").style.backgroundImage = `url('${images[0]}')`;
            document.getElementById("photo2").style.backgroundImage = `url('${images[1]}')`;
            document.getElementById("photo3").style.backgroundImage = `url('${images[2]}')`;
        }
    }

    // ✅ Fix: Change Template
    function changeTemplate(templateSrc) {
        console.log("Template changed to:", templateSrc);
        currentTemplate = templateSrc;
        localStorage.setItem("selectedTemplate", templateSrc);

        document.getElementById("template-image").style.backgroundImage = `url('${templateSrc}')`;

        // ✅ Highlight selected template button
        document.querySelectorAll(".template-btn").forEach((btn) => btn.classList.remove("active-template"));
        document.querySelector(`.template-btn[data-template='${templateSrc}']`)?.classList.add("active-template");
    }

    // ✅ Ensure template is loaded on page refresh
    function loadSelectedTemplate() {
        let savedTemplate = localStorage.getItem("selectedTemplate") || "template1.png";
        document.getElementById("template-image").style.backgroundImage = `url('${savedTemplate}')`;
    }

    // ✅ Process & Upload Image
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

                // ✅ Convert canvas to Blob
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], "photobooth.png", { type: "image/png" });

                    // ✅ Save locally
                    let link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = "photobooth.png";
                    link.click();

                    // ✅ Upload after saving
                    setTimeout(async () => {
                        await uploadToGoogleDrive(file);
                    }, 1000);
                }, "image/png");
            };
        }
    }

    // ✅ Upload "photobooth.png" to Google Drive
    async function uploadToGoogleDrive(imageFile) {
        const folderId = "11EwrjP7y9yRxVGcxW_we20zI4Q-5vCSW";

        const metadata = {
            name: "photobooth.png",
            mimeType: "image/png",
            parents: [folderId]
        };

        const formData = new FormData();
        formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        formData.append("file", imageFile);

        try {
            console.log("📤 Uploading photobooth.png to Google Drive...");
            const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/json"
                },
                body: formData
            });

            const result = await response.json();
            console.log("🔍 Upload Response:", result);

            if (result.id) {
                console.log("✅ Upload successful:", result);
                showQRModal(`https://drive.google.com/uc?id=${result.id}`);
            } else {
                console.error("❌ Upload failed:", result);
            }
        } catch (error) {
            console.error("⚠ Error uploading to Google Drive:", error);
        }
    }

    function showQRModal(url) {
        document.getElementById("qrCodeContainer").innerHTML = "";
        new QRCode(document.getElementById("qrCodeContainer"), { text: url, width: 128, height: 128 });
        document.getElementById("qrModal").style.display = "flex";
    }

    function closeQRModal() {
        document.getElementById("qrModal").style.display = "none";
    }

    window.onload = function () {
        checkLoginStatus();
        loadPhotos();
        loadSelectedTemplate();
    };

    document.getElementById("googleSignIn").addEventListener("click", signInWithGoogle);
</script>