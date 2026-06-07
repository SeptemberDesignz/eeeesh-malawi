// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, query, where, getDocs, updateDoc, onSnapshot, increment, setDoc } from 'firebase/firestore';

// Initialize Firebase with your config
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

// Get base URL for GitHub Pages
function getBaseUrl() {
    const path = window.location.pathname;
    if (path.includes('/eeeesh-malawi/')) {
        return '/eeeesh-malawi/';
    }
    return '/';
}

// Tab switching
window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('loginTab').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('signupTab').classList.add('active');
    }
};

// Email Login
window.handleLogin = async function() {
    const email = document.getElementById('loginEmail').value;
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

// Signup with Email
window.handleSignup = async function() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password || password.length < 6) {
        alert('Email and password (min 6 characters) required');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save user profile to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name || email.split('@')[0],
            email: email,
            slug: (name || email.split('@')[0]).toLowerCase().replace(/\s/g, '') + '_' + Date.now(),
            createdAt: new Date().toISOString()
        });
        
        alert('Account created successfully! You are now logged in.');
        window.location.href = getBaseUrl() + 'dashboard.html';
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
};

// Google Sign-In
window.handleGoogleSignIn = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        
        // Check if user exists in Firestore
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', result.user.uid)));
        
        if (userDoc.empty) {
            await setDoc(doc(db, 'users', result.user.uid), {
                uid: result.user.uid,
                name: result.user.displayName || result.user.email.split('@')[0],
                email: result.user.email,
                slug: (result.user.displayName || result.user.email.split('@')[0]).toLowerCase().replace(/\s/g, '') + '_' + Date.now(),
                createdAt: new Date().toISOString()
            });
        }
        
        window.location.href = getBaseUrl() + 'dashboard.html';
    } catch (error) {
        alert('Google sign-in failed: ' + error.message);
    }
};

// Logout
window.logout = function() {
    signOut(auth);
    window.location.href = getBaseUrl() + 'index.html';
};

// Copy link
window.copyLink = function(link) {
    // Clean the link text (remove the icon text if any)
    const cleanLink = link.replace('🔗', '').replace('Loading...', '').trim();
    navigator.clipboard.writeText(cleanLink);
    alert('✅ Link copied! Share it on WhatsApp or Facebook.');
};

// Share to WhatsApp
window.shareToWhatsApp = function(link, name) {
    const cleanLink = link.replace('🔗', '').replace('Loading...', '').trim();
    const message = `🇲🇼 Eeeesh Malawi: Ask me anything anonymously! ${cleanLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};

// Load dashboard
async function loadDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = getBaseUrl() + 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Get user profile
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
        if (userDoc.empty) {
            console.error('User profile not found');
            return;
        }
        
        const userData = userDoc.docs[0].data();
        const anonymousLink = `${window.location.origin}${getBaseUrl()}ask.html?to=${userData.slug}`;
        
        document.getElementById('userName').innerHTML = userData.name || user.email.split('@')[0];
        document.getElementById('userEmail').innerHTML = user.email;
        document.getElementById('anonymousLink').innerHTML = anonymousLink;
        
        // Listen to questions in real-time
        const q = query(collection(db, 'questions'), where('toUid', '==', user.uid));
        onSnapshot(q, (snapshot) => {
            const questions = [];
            snapshot.forEach(doc => {
                questions.push({ id: doc.id, ...doc.data() });
            });
            renderQuestions(questions);
        });
    });
}

function renderQuestions(questions) {
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    // Update badge count
    const badge = document.getElementById('questionCount');
    if (badge) {
        badge.textContent = questions.length;
    }
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><br>🤫 No anonymous questions yet. Share your link above!</div>';
        return;
    }
    
    // Sort by newest first
    questions.sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt));
    
    container.innerHTML = questions.map(q => `
        <div class="question-card" data-id="${q.id}">
            <div class="question-text">
                <i class="fas fa-question-circle" style="color: #ff3b30;"></i>
                ${escapeHtml(q.question)}
            </div>
            <div class="vote-buttons">
                <button class="vote-btn" onclick="voteQuestion('${q.id}', 'upvote')">
                    <i class="fas fa-thumbs-up"></i> ${q.upvotes || 0}
                </button>
                <button class="vote-btn" onclick="voteQuestion('${q.id}', 'downvote')">
                    <i class="fas fa-thumbs-down"></i> ${q.downvotes || 0}
                </button>
            </div>
            ${q.reply ? `
                <div class="reply-text">
                    <i class="fas fa-reply-all"></i> Your reply: ${escapeHtml(q.reply)}
                </div>
            ` : `
                <div class="reply-area">
                    <div class="reply-input-wrapper">
                        <i class="fas fa-reply"></i>
                        <input type="text" id="reply-${q.id}" class="reply-input" placeholder="Write your public reply...">
                    </div>
                    <button onclick="postReply('${q.id}')" class="apple-btn red" style="margin-top:8px;">
                        <i class="fas fa-paper-plane"></i> Post reply
                    </button>
                </div>
            `}
        </div>
    `).join('');
}

window.voteQuestion = async function(questionId, voteType) {
    if (!currentUser) {
        alert('Please login to vote');
        return;
    }
    
    const questionRef = doc(db, 'questions', questionId);
    if (voteType === 'upvote') {
        await updateDoc(questionRef, {
            upvotes: increment(1)
        });
    } else {
        await updateDoc(questionRef, {
            downvotes: increment(1)
        });
    }
};

window.postReply = async function(questionId) {
    const replyInput = document.getElementById(`reply-${questionId}`);
    const reply = replyInput?.value.trim();
    
    if (!reply) {
        alert('Write a reply first');
        return;
    }
    
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, {
        reply: reply,
        repliedAt: new Date().toISOString()
    });
    
    alert('✅ Reply posted!');
};

// Send anonymous question
window.sendAnonymousQuestion = async function() {
    const question = document.getElementById('anonymousQuestion').value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const toSlug = urlParams.get('to');
    
    if (!question) {
        alert('Please write a question');
        return;
    }
    
    if (!toSlug) {
        alert('Invalid link. Please use a shared anonymous link.');
        return;
    }
    
    // Find user by slug
    const q = query(collection(db, 'users'), where('slug', '==', toSlug));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        alert('User not found. The link might be invalid.');
        return;
    }
    
    const recipient = querySnapshot.docs[0];
    
    await addDoc(collection(db, 'questions'), {
        toUid: recipient.data().uid,
        toSlug: toSlug,
        question: question,
        upvotes: 0,
        downvotes: 0,
        askedAt: new Date().toISOString(),
        reply: null
    });
    
    document.getElementById('anonymousQuestion').value = '';
    const statusDiv = document.getElementById('messageStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Sent anonymously! Your secret is safe. 🇲🇼';
        statusDiv.style.color = '#2c5f2d';
        statusDiv.style.fontWeight = 'bold';
        setTimeout(() => { statusDiv.innerHTML = ''; }, 3000);
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

// Load ask page
async function loadAskPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const toSlug = urlParams.get('to');
    
    if (toSlug) {
        const q = query(collection(db, 'users'), where('slug', '==', toSlug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const recipient = querySnapshot.docs[0].data();
            const displayName = recipient.name || recipient.email.split('@')[0];
            document.getElementById('recipientName').innerHTML = displayName;
        } else {
            document.getElementById('recipientName').innerHTML = 'this person';
        }
    } else {
        document.getElementById('recipientName').innerHTML = 'someone';
    }
}

// Initialize based on page
const path = window.location.pathname;
if (path.includes('dashboard.html')) {
    loadDashboard();
} else if (path.includes('ask.html')) {
    loadAskPage();
}