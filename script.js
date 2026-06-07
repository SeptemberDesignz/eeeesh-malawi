import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, query, where, getDocs, updateDoc, onSnapshot, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

googleProvider.addScope('email');
googleProvider.addScope('profile');

let currentUser = null;
let currentUserData = null;
let notificationPermission = false;

const REVEAL_PRICE = 5000;
const ADMIN_EMAIL = 'admin@eeeeshmalawi.com';
const ADMIN_PASSWORD = '093ramini.3002';

const PAYMENT_NUMBERS = {
    airtel: '0994071332',
    tnm: '0886314031'
};

// ========== TOGGLE ADMIN LOGIN ==========
window.toggleAdminLogin = function() {
    const form = document.getElementById('adminLoginForm');
    const icon = document.getElementById('adminToggleIcon');
    if (form) {
        form.classList.toggle('show');
        if (icon) {
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }
    }
};

// ========== ADMIN LOGIN ==========
window.adminLogin = async function() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminLoginError');
    
    if (email !== ADMIN_EMAIL) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Invalid admin email';
        }
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        if (errorDiv) errorDiv.style.display = 'none';
        window.location.href = getBaseUrl() + 'admin.html';
    } catch (error) {
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Invalid password. Please try again.';
        }
    }
};

// ========== NOTIFICATION FUNCTIONS ==========
window.requestNotificationPermission = function() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            notificationPermission = permission === 'granted';
            if (notificationPermission) {
                showSuccessMessage('Notifications enabled!');
                const banner = document.getElementById('notificationBanner');
                if (banner) banner.style.display = 'none';
            }
        });
    }
};

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

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text);
    showSuccessMessage('Copied to clipboard!');
};

// ========== GOOGLE SIGN-IN ==========
window.handleGoogleSignIn = async function() {
    const googleBtn = document.querySelector('.apple-btn.google');
    if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Signing in...';
    }
    
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
                provider: 'google',
                createdAt: new Date().toISOString()
            });
        }
        
        showSuccessMessage('Welcome! Redirecting...');
        setTimeout(() => {
            window.location.href = getBaseUrl() + 'dashboard.html';
        }, 500);
        
    } catch (error) {
        alert('Sign-in failed: ' + error.message);
    } finally {
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
        }
    }
};

// ========== APPLE SIGN-IN ==========
window.handleAppleSignIn = async function() {
    const appleBtn = document.querySelector('.apple-btn.apple');
    if (appleBtn) {
        appleBtn.disabled = true;
        appleBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Signing in...';
    }
    
    try {
        const result = await signInWithPopup(auth, appleProvider);
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
                provider: 'apple',
                createdAt: new Date().toISOString()
            });
        }
        
        showSuccessMessage('Welcome! Redirecting...');
        setTimeout(() => {
            window.location.href = getBaseUrl() + 'dashboard.html';
        }, 500);
        
    } catch (error) {
        alert('Apple sign-in failed: ' + error.message);
    } finally {
        if (appleBtn) {
            appleBtn.disabled = false;
            appleBtn.innerHTML = '<i class="fab fa-apple"></i> Sign in with Apple';
        }
    }
};

// ========== LOGOUT ==========
window.logout = async function() {
    await signOut(auth);
    showSuccessMessage('Logged out');
    setTimeout(() => {
        window.location.href = getBaseUrl() + 'index.html';
    }, 500);
};

// ========== COPY LINK ==========
window.copyLink = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        navigator.clipboard.writeText(liveLink);
        showSuccessMessage('Link copied!');
    }
};

// ========== SHARE TO WHATSAPP ==========
window.shareToWhatsApp = function() {
    const linkCode = document.getElementById('anonymousLink');
    if (linkCode) {
        const liveLink = linkCode.getAttribute('data-live-link') || linkCode.innerText;
        const message = `Eeeesh Malawi: Ask me anything anonymously! ${liveLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
};

// ========== SHARE AS IMAGE ==========
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
    
    showSuccessMessage('Image saved!');
};

// ========== DELETE QUESTION ==========
window.deleteQuestion = async function(questionId) {
    if (!confirm('Delete this question?')) return;
    try {
        await deleteDoc(doc(db, 'questions', questionId));
        showSuccessMessage('Question deleted');
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

// ========== DELETE EXPIRED QUESTIONS ==========
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

// ========== REVEAL SENDER PAYMENT ==========
window.initiateRevealPayment = async function(questionId) {
    if (!currentUser) {
        alert('Please login to reveal anonymous sender');
        return;
    }
    
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    const questionData = questionSnap.data();
    
    if (questionData.revealed && questionData.revealedTo === currentUser.uid) {
        showRevealedSender(questionData);
        return;
    }
    
    if (questionData.revealed) {
        alert('This sender has already been revealed to someone else.');
        return;
    }
    
    showPaymentModal(questionId);
};

function showPaymentModal(questionId) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.id = 'paymentModal';
    modal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <i class="fas fa-crown"></i>
                <h3>Reveal Anonymous Sender</h3>
                <button class="close-modal" onclick="closePaymentModal()">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="payment-amount">
                    <span class="currency">MWK</span>
                    <span class="amount">${REVEAL_PRICE.toLocaleString()}</span>
                </div>
                
                <div class="payment-instructions">
                    <h4><i class="fas fa-info-circle"></i> Payment Instructions</h4>
                    <div class="instruction-step">
                        <span class="step-number">1</span>
                        <span>Send <strong>MWK ${REVEAL_PRICE.toLocaleString()}</strong> to:</span>
                    </div>
                    <div class="payment-numbers">
                        <div class="payment-number-box airtel">
                            <i class="fas fa-mobile-alt"></i>
                            <span>Airtel Money: <strong>${PAYMENT_NUMBERS.airtel}</strong></span>
                            <button onclick="copyToClipboard('${PAYMENT_NUMBERS.airtel}')" class="copy-number"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="payment-number-box tnm">
                            <i class="fas fa-mobile-alt"></i>
                            <span>TNM Mpamba: <strong>${PAYMENT_NUMBERS.tnm}</strong></span>
                            <button onclick="copyToClipboard('${PAYMENT_NUMBERS.tnm}')" class="copy-number"><i class="fas fa-copy"></i></button>
                        </div>
                    </div>
                    <div class="instruction-step">
                        <span class="step-number">2</span>
                        <span>Use reference: <strong class="ref-highlight">Eeeesh Malawi</strong></span>
                        <button onclick="copyToClipboard('Eeeesh Malawi')" class="copy-number"><i class="fas fa-copy"></i></button>
                    </div>
                    <div class="instruction-step">
                        <span class="step-number">3</span>
                        <span>Fill in the form below after sending payment</span>
                    </div>
                </div>
                
                <div class="payment-confirmation-form">
                    <h4><i class="fas fa-check-circle"></i> Confirm Your Payment</h4>
                    <div class="input-icon">
                        <i class="fas fa-user"></i>
                        <input type="text" id="senderName" placeholder="Your full name" class="apple-input">
                    </div>
                    <div class="input-icon">
                        <i class="fas fa-phone"></i>
                        <input type="tel" id="phoneNumber" placeholder="Your phone number (e.g., 0999123456)" class="apple-input">
                    </div>
                    <div class="input-icon">
                        <i class="fas fa-exchange-alt"></i>
                        <select id="paymentMethod" class="apple-input">
                            <option value="">Select payment method</option>
                            <option value="airtel">Airtel Money</option>
                            <option value="tnm">TNM Mpamba</option>
                        </select>
                    </div>
                    <div class="input-icon">
                        <i class="fas fa-hashtag"></i>
                        <input type="text" id="transactionId" placeholder="Transaction ID / Reference number" class="apple-input">
                    </div>
                    <button onclick="submitPaymentConfirmation('${questionId}')" class="apple-btn red">
                        <i class="fas fa-paper-plane"></i> Submit Payment Confirmation
                    </button>
                </div>
                
                <div class="payment-info">
                    <i class="fas fa-shield-alt"></i>
                    Your payment is secure. Admin will verify within 24 hours.
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closePaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.remove();
};

window.submitPaymentConfirmation = async function(questionId) {
    const senderName = document.getElementById('senderName')?.value.trim();
    const phoneNumber = document.getElementById('phoneNumber')?.value.trim();
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const transactionId = document.getElementById('transactionId')?.value.trim();
    
    if (!senderName || !phoneNumber || !paymentMethod || !transactionId) {
        alert('Please fill in all fields');
        return;
    }
    
    if (!phoneNumber.match(/^0[0-9]{9}$/)) {
        alert('Please enter a valid phone number (10 digits starting with 0)');
        return;
    }
    
    try {
        await addDoc(collection(db, 'payments'), {
            questionId: questionId,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: senderName,
            phoneNumber: phoneNumber,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            amount: REVEAL_PRICE,
            status: 'pending',
            submittedAt: new Date().toISOString()
        });
        
        closePaymentModal();
        alert('✅ Payment confirmation submitted!\n\nAdmin will verify within 24 hours.\n\nYou will be notified when the sender is revealed.');
        showSuccessMessage('Payment submitted! Awaiting verification.');
        
    } catch (error) {
        alert('Failed to submit: ' + error.message);
    }
};

function showRevealedSender(questionData) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-modal-header">
                <i class="fas fa-user-check"></i>
                <h3>Sender Revealed!</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="revealed-info">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>Name:</strong> ${escapeHtml(questionData.senderName || 'Anonymous User')}<br>
                        <strong>Email:</strong> ${escapeHtml(questionData.senderEmail || 'hidden@example.com')}
                    </div>
                </div>
                <div class="payment-info">
                    <i class="fas fa-shield-alt"></i>
                    This information is confidential. Please respect privacy.
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="apple-btn red">
                    <i class="fas fa-check"></i> Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ========== LOAD DASHBOARD ==========
async function loadDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = getBaseUrl() + 'index.html';
            return;
        }
        
        currentUser = user;
        
        if (notificationPermission === false && 'Notification' in window && Notification.permission === 'default') {
            const banner = document.getElementById('notificationBanner');
            if (banner) banner.style.display = 'block';
        } else if (Notification.permission === 'granted') {
            notificationPermission = true;
        }
        
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
                    sendNotification('🔔 New Anonymous Question!', `Someone asked you a question on Eeeesh Malawi!`);
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
                    ${expiryWarning}
                </div>
                <div class="vote-buttons">
                    <button class="vote-btn" onclick="voteQuestion('${q.id}', 'upvote')">
                        <i class="fas fa-thumbs-up"></i> ${q.upvotes || 0}
                    </button>
                    <button class="vote-btn" onclick="voteQuestion('${q.id}', 'downvote')">
                        <i class="fas fa-thumbs-down"></i> ${q.downvotes || 0}
                    </button>
                </div>
                ${!q.revealed ? 
                    `<button onclick="initiateRevealPayment('${q.id}')" class="reveal-btn">
                        <i class="fas fa-eye"></i> Reveal Sender (MWK ${REVEAL_PRICE.toLocaleString()})
                    </button>` : 
                    (q.revealedTo === currentUser?.uid ? 
                        `<button onclick='showRevealedSender(${JSON.stringify(q).replace(/'/g, "\\'")})' class="reveal-btn revealed">
                            <i class="fas fa-eye"></i> View Sender
                        </button>` : 
                        `<button class="reveal-btn disabled" disabled>
                            <i class="fas fa-lock"></i> Already Revealed
                        </button>`
                    )
                }
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
            askedAt: new Date().toISOString(),
            senderUid: currentUser?.uid || null
        });
        
        document.getElementById('anonymousQuestion').value = '';
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Sent anonymously!';
        statusDiv.style.color = '#2c5f2d';
        
        showSuccessMessage('✅ Your anonymous question has been sent!');
        
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