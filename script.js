// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, query, where, getDocs, updateDoc, onSnapshot, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence - keeps user logged in
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("Persistence set"))
    .catch(console.error);

let currentUser = null;
let currentUserData = null;

// Get base URL
function getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/';
    }
    return '/eeeesh-malawi/';
}

// Get live URL
function getLiveUrl() {
    return `https://septemberdesignz.github.io${getBaseUrl()}`;
}

// Tab switching
window.switchTab = function(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginBtn = document.querySelector('.tab-btn:first-child');
    const signupBtn = document.querySelector('.tab-btn:last-child');
    
    if (tab === 'login') {
        loginBtn.classList.add('active');
        signupBtn.classList.remove('active');
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        loginBtn.classList.remove('active');
        signupBtn.classList.add('active');
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
    }
};

// Email Login
window.handleLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = getBaseUrl() + 'dashboard.html';
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
};

// Signup
window.handleSignup = async function() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password || password.length < 6) {
        alert('Email and password (min 6 characters) required');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const baseSlug = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
        const slug = baseSlug + '_' + Date.now();
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name || email.split('@')[0],
            email: email,
            slug: slug,
            createdAt: new Date().toISOString()
        });
        
        alert('Account created successfully!');
        window.location.href = getBaseUrl() + 'dashboard.html';
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
};

// Google Sign-In
window.handleGoogleSignIn = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            const baseSlug = (user.displayName || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
            const slug = baseSlug + '_' + Date.now();
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                slug: slug,
                createdAt: new Date().toISOString()
            });
        }
        
        window.location.href = getBaseUrl() + 'dashboard.html';
    } catch (error) {
        alert('Google sign-in failed: ' + error.message);
    }
};

// Logout
window.logout = async function() {
    await signOut(auth);
    window.location.href = getBaseUrl() + 'index.html';
};

// Copy link
window.copyLink = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        navigator.clipboard.writeText(liveLink);
        alert('✅ Link copied!');
    }
};

// Share to WhatsApp
window.shareToWhatsApp = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        const message = `🇲🇼 Eeeesh Malawi: Ask me anything anonymously! ${liveLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
};

// Delete question
window.deleteQuestion = async function(questionId) {
    if (!confirm('Delete this question?')) return;
    try {
        await deleteDoc(doc(db, 'questions', questionId));
        alert('✅ Deleted');
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

// Load dashboard
async function loadDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = getBaseUrl() + 'index.html';
            return;
        }
        
        currentUser = user;
        
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                const slug = user.email.split('@')[0] + '_' + Date.now();
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: user.email.split('@')[0],
                    email: user.email,
                    slug: slug,
                    createdAt: new Date().toISOString()
                });
                currentUserData = { name: user.email.split('@')[0], email: user.email, slug: slug };
            } else {
                currentUserData = userSnap.data();
            }
            
            document.getElementById('userName').innerHTML = currentUserData.name;
            document.getElementById('userEmail').innerHTML = currentUserData.email;
            
            const anonymousLink = `${getLiveUrl()}ask.html?to=${currentUserData.slug}`;
            const linkElement = document.getElementById('anonymousLink');
            linkElement.innerHTML = anonymousLink;
            linkElement.setAttribute('data-live-link', anonymousLink);
            
            const q = query(collection(db, 'questions'), where('toUid', '==', user.uid));
            onSnapshot(q, (snapshot) => {
                const questions = [];
                snapshot.forEach(doc => {
                    questions.push({ id: doc.id, ...doc.data() });
                });
                renderQuestions(questions);
            });
            
        } catch (error) {
            console.error(error);
        }
    });
}

function renderQuestions(questions) {
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    const badge = document.getElementById('questionCount');
    if (badge) badge.textContent = questions.length;
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><br>🤫 No anonymous questions yet.</div>';
        return;
    }
    
    questions.sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt));
    
    container.innerHTML = questions.map(q => `
        <div class="question-card">
            <div class="question-header">
                <div class="question-text">
                    <i class="fas fa-question-circle" style="color: #ff3b30;"></i>
                    ${escapeHtml(q.question)}
                </div>
                <button onclick="deleteQuestion('${q.id}')" class="delete-btn" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="vote-buttons">
                <button class="vote-btn" onclick="voteQuestion('${q.id}', 'upvote', this)">
                    <i class="fas fa-thumbs-up"></i> ${q.upvotes || 0}
                </button>
                <button class="vote-btn" onclick="voteQuestion('${q.id}', 'downvote', this)">
                    <i class="fas fa-thumbs-down"></i> ${q.downvotes || 0}
                </button>
            </div>
        </div>
    `).join('');
}

window.voteQuestion = async function(questionId, voteType) {
    if (!currentUser) {
        alert('Please login to vote');
        return;
    }
    
    const questionRef = doc(db, 'questions', questionId);
    try {
        if (voteType === 'upvote') {
            await updateDoc(questionRef, { upvotes: increment(1) });
        } else {
            await updateDoc(questionRef, { downvotes: increment(1) });
        }
    } catch (error) {
        alert('Vote failed: ' + error.message);
    }
};

window.sendAnonymousQuestion = async function() {
    const question = document.getElementById('anonymousQuestion').value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const toSlug = urlParams.get('to');
    
    if (!question) {
        alert('Please write a question');
        return;
    }
    if (question.length < 5) {
        alert('Question must be at least 5 characters');
        return;
    }
    if (!toSlug) {
        alert('Invalid link');
        return;
    }
    
    const statusDiv = document.getElementById('messageStatus');
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending...';
    
    try {
        const q = query(collection(db, 'users'), where('slug', '==', toSlug));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            statusDiv.innerHTML = 'User not found';
            return;
        }
        
        const recipient = querySnapshot.docs[0];
        
        await addDoc(collection(db, 'questions'), {
            toUid: recipient.data().uid,
            toSlug: toSlug,
            question: question,
            upvotes: 0,
            downvotes: 0,
            askedAt: new Date().toISOString()
        });
        
        document.getElementById('anonymousQuestion').value = '';
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Sent anonymously!';
        setTimeout(() => { statusDiv.innerHTML = ''; }, 3000);
        
    } catch (error) {
        statusDiv.innerHTML = 'Failed to send';
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function loadAskPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const toSlug = urlParams.get('to');
    
    if (toSlug) {
        try {
            const q = query(collection(db, 'users'), where('slug', '==', toSlug));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const recipient = querySnapshot.docs[0].data();
                document.getElementById('recipientName').innerHTML = recipient.name || recipient.email.split('@')[0];
            }
        } catch (error) {}
    }
    
    const textarea = document.getElementById('anonymousQuestion');
    const charCount = document.getElementById('charCount');
    if (textarea && charCount) {
        textarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/eeeesh-malawi/');
    
    if (isLoginPage) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                window.location.href = getBaseUrl() + 'dashboard.html';
            }
        });
    } else if (path.includes('dashboard.html')) {
        loadDashboard();
    } else if (path.includes('ask.html')) {
        loadAskPage();
    }
});