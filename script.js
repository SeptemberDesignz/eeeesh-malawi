import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, query, where, getDocs, updateDoc, onSnapshot, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch(console.error);

let currentUser = null;
let currentUserData = null;
let notificationPermission = false;

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            notificationPermission = permission === 'granted';
        });
    }
}

function sendNotification(title, body) {
    if (notificationPermission && 'Notification' in window) {
        new Notification(title, { body: body });
    }
}

function getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/';
    }
    return '/eeeesh-malawi/';
}

function getLiveUrl() {
    return `https://septemberdesignz.github.io${getBaseUrl()}`;
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

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

window.handleLogin = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        
        if (methods.includes('google.com') && methods.length === 1) {
            alert('This email uses Google Sign-In.\n\nPlease click the "Continue with Google" button below to login.');
            return;
        }
        
        await signInWithEmailAndPassword(auth, email, password);
        showSuccessMessage('Login successful!');
        setTimeout(() => {
            window.location.href = getBaseUrl() + 'dashboard.html';
        }, 500);
        
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            alert('Account not found.\n\nPlease click "Sign up" to create a new account.');
        } else if (error.code === 'auth/wrong-password') {
            alert('Wrong password.\n\nClick "Forgot Password" to reset it.');
        } else if (error.code === 'auth/invalid-credential') {
            alert('Invalid email or password.\n\nPlease check your credentials or sign up first.');
        } else {
            alert('Login failed: ' + error.message);
        }
    }
};

window.handleSignup = async function() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        
        if (methods.length > 0) {
            if (methods.includes('google.com')) {
                alert('This email already uses Google Sign-In.\n\nPlease click "Continue with Google" to login.');
            } else {
                alert('Email already exists.\n\nPlease login instead.');
            }
            return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const baseSlug = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
        const slug = baseSlug + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name || email.split('@')[0],
            email: email,
            slug: slug,
            createdAt: new Date().toISOString()
        });
        
        showSuccessMessage('Account created successfully!');
        setTimeout(() => {
            window.location.href = getBaseUrl() + 'dashboard.html';
        }, 500);
        
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert('Email already in use.\n\nPlease login instead.');
        } else if (error.code === 'auth/weak-password') {
            alert('Password is too weak. Use at least 6 characters.');
        } else {
            alert('Signup failed: ' + error.message);
        }
    }
};

window.forgotPassword = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        alert('Please enter your email address first');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent!\n\nCheck your inbox and follow the instructions.');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            alert('No account found with this email.\n\nPlease sign up first.');
        } else {
            alert('Failed to send reset email: ' + error.message);
        }
    }
};

window.handleGoogleSignIn = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            const baseSlug = (user.displayName || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
            const slug = baseSlug + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                slug: slug,
                createdAt: new Date().toISOString()
            });
        }
        
        showSuccessMessage('Google sign-in successful!');
        setTimeout(() => {
            window.location.href = getBaseUrl() + 'dashboard.html';
        }, 500);
        
    } catch (error) {
        alert('Google sign-in failed: ' + error.message);
    }
};

window.logout = async function() {
    await signOut(auth);
    showSuccessMessage('Logged out');
    setTimeout(() => {
        window.location.href = getBaseUrl() + 'index.html';
    }, 500);
};

window.copyLink = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        navigator.clipboard.writeText(liveLink);
        showSuccessMessage('Link copied!');
    }
};

window.shareToWhatsApp = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        const message = `Eeeesh Malawi: Ask me anything anonymously! ${liveLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
};

window.shareAsImage = async function() {
    const linkCode = document.getElementById('anonymousLink');
    if (!linkCode) return;
    
    const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
    const userName = document.getElementById('userName').innerText;
    
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ff3b30');
    gradient.addColorStop(1, '#ff6b62');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.fillRect(40, 80, canvas.width - 80, 400);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 28px -apple-system';
    ctx.fillText('Eeeesh Malawi', 60, 140);
    
    ctx.fillStyle = '#1c1c1e';
    ctx.font = '20px -apple-system';
    ctx.fillText(`Ask ${userName} anonymously`, 60, 190);
    
    ctx.fillStyle = '#8e8e93';
    ctx.font = '14px monospace';
    ctx.fillText(liveLink, 60, 250);
    
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 32px -apple-system';
    ctx.fillText('👇', canvas.width / 2 - 20, 340);
    
    ctx.fillStyle = '#2c5f2d';
    ctx.font = '16px -apple-system';
    ctx.fillText('Scan or click to ask anything', 60, 420);
    
    const link = document.createElement('a');
    link.download = 'eeeesh-share.png';
    link.href = canvas.toDataURL();
    link.click();
    
    showSuccessMessage('Image saved! Share it on WhatsApp or Instagram');
};

window.deleteQuestion = async function(questionId) {
    if (!confirm('Delete this question?')) return;
    try {
        await deleteDoc(doc(db, 'questions', questionId));
        showSuccessMessage('Question deleted');
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

async function deleteExpiredQuestions(userId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(collection(db, 'questions'), where('toUid', '==', userId));
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
        const question = doc.data();
        if (question.askedAt && new Date(question.askedAt) < sevenDaysAgo) {
            await deleteDoc(doc.ref);
        }
    }
}

async function loadDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = getBaseUrl() + 'index.html';
            return;
        }
        
        currentUser = user;
        requestNotificationPermission();
        
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
            
            await deleteExpiredQuestions(user.uid);
            
            let previousCount = 0;
            const q = query(collection(db, 'questions'), where('toUid', '==', user.uid));
            onSnapshot(q, (snapshot) => {
                const questions = [];
                snapshot.forEach(doc => {
                    questions.push({ id: doc.id, ...doc.data() });
                });
                
                if (questions.length > previousCount && previousCount > 0) {
                    sendNotification('New anonymous question!', 'Someone asked you a question on Eeeesh Malawi');
                }
                previousCount = questions.length;
                
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
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><br>🤫 No anonymous questions yet. Share your link above!</div>';
        return;
    }
    
    questions.sort((a, b) => new Date(b.askedAt) - new Date(a.askedAt));
    
    const getDaysRemaining = (askedAt) => {
        const asked = new Date(askedAt);
        const expiry = new Date(asked);
        expiry.setDate(expiry.getDate() + 7);
        const now = new Date();
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    };
    
    container.innerHTML = questions.map(q => {
        const daysLeft = getDaysRemaining(q.askedAt);
        const expiryWarning = daysLeft <= 2 ? `<span class="expiry-warning"><i class="fas fa-clock"></i> Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span>` : '';
        
        return `
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
                <div class="question-meta">
                    <small><i class="fas fa-calendar-alt"></i> Asked: ${new Date(q.askedAt).toLocaleString()}</small>
                    ${expiryWarning ? `<small class="expiry-warning"> ${expiryWarning}</small>` : ''}
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
        `;
    }).join('');
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
            showSuccessMessage('Upvoted!');
        } else {
            await updateDoc(questionRef, { downvotes: increment(1) });
            showSuccessMessage('Downvoted!');
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
    const sendBtn = document.querySelector('.apple-btn.red');
    
    statusDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Sending anonymously...';
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const q = query(collection(db, 'users'), where('slug', '==', toSlug));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> User not found';
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
        statusDiv.style.color = '#2c5f2d';
        
        showSuccessMessage('Question sent anonymously!');
        
        setTimeout(() => { 
            statusDiv.innerHTML = ''; 
            statusDiv.style.color = '';
        }, 3000);
    } catch (error) {
        statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to send';
    } finally {
        if (sendBtn) sendBtn.disabled = false;
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
            } else {
                document.getElementById('recipientName').innerHTML = 'this person';
            }
        } catch (error) {
            document.getElementById('recipientName').innerHTML = 'this person';
        }
    } else {
        document.getElementById('recipientName').innerHTML = 'someone';
    }
    
    const textarea = document.getElementById('anonymousQuestion');
    const charCount = document.getElementById('charCount');
    if (textarea && charCount) {
        textarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }
}

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