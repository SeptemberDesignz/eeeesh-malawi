// Firebase configuration for Eeeesh Malawi
const firebaseConfig = {
    apiKey: "AIzaSyCiv3aN9H4EytnFx85rgkG7cCsog56YXUE",
    authDomain: "eeeesh-malawi.firebaseapp.com",
    projectId: "eeeesh-malawi",
    storageBucket: "eeeesh-malawi.firebasestorage.app",
    messagingSenderId: "115080911670",
    appId: "1:115080911670:web:aef1f1d2d94a23262e3197",
    measurementId: "G-MYYN74DLQ7"
};

// reCAPTCHA keys (optional - not being used currently)
const RECAPTCHA_SITE_KEY = "6Lca-BEtAAAAAEbldgoLRgToS5Zs_TW2b3ib3iVw";
const RECAPTCHA_SECRET_KEY = "6Lca-BEtAAAAABSKqgQ1r0gg34T9cGegYLENJPuo";

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY };
}