// Shared Login Management for PhotoBooth SCpES
// This file provides consistent login detection across all pages

/**
 * Enhanced login status check function
 * Checks both userLoggedIn flag and googleAccessToken
 * Redirects to login page if not properly authenticated
 */
function checkLoginStatus() {
    console.log("🔍 Checking login status...");
    
    const userLoggedIn = localStorage.getItem("userLoggedIn");
    const googleAccessToken = localStorage.getItem("googleAccessToken");
    
    console.log("🔍 userLoggedIn:", userLoggedIn);
    console.log("🔍 googleAccessToken exists:", !!googleAccessToken);
    console.log("🔍 googleAccessToken value:", googleAccessToken ? googleAccessToken.substring(0, 20) + "..." : "none");
    
    // Check if user is properly logged in
    if (!userLoggedIn || userLoggedIn !== "true") {
        console.log("❌ User not logged in, redirecting to login page");
        window.location.href = "index.html";
        return false;
    }
    
    // Additional check: if we have a Google token, user should be logged in
    if (googleAccessToken && googleAccessToken.length > 0) {
        console.log("✅ User has Google token, login status confirmed");
        return true;
    }
    
    console.log("⚠️ User marked as logged in but no Google token found");
    // Don't redirect immediately, let user continue but warn them
    return true;
}

/**
 * Debug function to check login status
 * Can be called from browser console
 */
window.debugLoginStatus = function() {
    console.log("🔍 Debug login status:");
    console.log("🔍 userLoggedIn:", localStorage.getItem("userLoggedIn"));
    console.log("🔍 googleAccessToken:", localStorage.getItem("googleAccessToken") ? "exists" : "missing");
    console.log("🔍 All localStorage keys:", Object.keys(localStorage));
    console.log("🔍 Current page:", window.location.pathname);
};

/**
 * Force login check function
 * Can be called from browser console
 */
window.forceLoginCheck = function() {
    console.log("🔄 Force checking login status...");
    return checkLoginStatus();
};

/**
 * Clear all login data
 * Can be called from browser console for debugging
 */
window.clearLoginData = function() {
    console.log("🧹 Clearing all login data...");
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("googleAccessToken");
    console.log("✅ Login data cleared");
};

/**
 * Set login data (for debugging)
 * Can be called from browser console
 */
window.setLoginData = function(token) {
    console.log("🔧 Setting login data...");
    localStorage.setItem("userLoggedIn", "true");
    if (token) {
        localStorage.setItem("googleAccessToken", token);
    }
    console.log("✅ Login data set");
};

// Note: Auto-check removed to prevent unwanted redirects
// Each page should call checkLoginStatus() manually when needed
