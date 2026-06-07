import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, query, where, getDocs, updateDoc, onSnapshot, increment, setDoc, deleteDoc, getDoc, orderBy } from 'firebase/firestore';

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

// ========== ADMIN CONFIGURATION ==========
// Admin email - ONLY nicholaskenneth29@gmail.com has admin access
const ADMIN_EMAILS = [
    'nicholaskenneth29@gmail.com'  // MAIN ADMIN - ONLY THIS EMAIL
];

// Check if current user is admin
function isAdmin() {
    return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}

// Payment constants
const REVEAL_PRICE = 5000;

// ========== NOTIFICATION FUNCTIONS ==========
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            notificationPermission = permission === 'granted';
            if (notificationPermission) {
                showSuccessMessage('Notifications enabled! You will be alerted when you get new questions.');
                const banner = document.getElementById('notificationBanner');
                if (banner) banner.style.display = 'none';
            } else {
                showSuccessMessage('You can enable notifications in browser settings to get alerts.');
            }
        });
    }
}

function sendNotification(title, body) {
    if (notificationPermission && 'Notification' in window) {
        const notification = new Notification(title, { 
            body: body, 
            icon: 'https://septemberdesignz.github.io/eeeesh-malawi/favicon.ico'
        });
        setTimeout(() => notification.close(), 5000);
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
        if (error.code === 'auth/popup-closed-by-user') {
            alert('Sign-in cancelled. Please try again.');
        } else if (error.code === 'auth/popup-blocked') {
            alert('Popup blocked. Please allow popups for this site.');
        } else {
            alert('Sign-in failed: ' + error.message);
        }
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
        if (error.code === 'auth/popup-closed-by-user') {
            alert('Sign-in cancelled. Please try again.');
        } else if (error.code === 'auth/popup-blocked') {
            alert('Popup blocked. Please allow popups for this site.');
        } else {
            alert('Apple sign-in failed: ' + error.message);
        }
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
    
    showSuccessMessage('Image saved! Share it on WhatsApp or Instagram');
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
                <button onclick="closePaymentModal()" class="close-modal">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="payment-amount">
                    <span class="currency">MWK</span>
                    <span class="amount">${REVEAL_PRICE.toLocaleString()}</span>
                </div>
                
                <div class="payment-instructions">
                    <h4><i class="fas fa-info-circle"></i> How to Pay:</h4>
                    <ol>
                        <li>Send exactly <strong>MWK ${REVEAL_PRICE.toLocaleString()}</strong> to:</li>
                        <li><strong>Airtel Money:</strong> 0991 234 567</li>
                        <li><strong>TNM Mpamba:</strong> 0881 234 567</li>
                        <li>Use reference: <strong>EEE-${questionId.slice(-8)}</strong></li>
                        <li>Fill in the form below after sending</li>
                    </ol>
                </div>
                
                <div class="payment-confirmation-form">
                    <h4><i class="fas fa-check-circle"></i> Confirm Payment</h4>
                    <div class="input-icon">
                        <i class="fas fa-user"></i>
                        <input type="text" id="senderName" placeholder="Your full name" class="apple-input">
                    </div>
                    <div class="input-icon">
                        <i class="fas fa-phone"></i>
                        <input type="tel" id="phoneNumber" placeholder="Your phone number" class="apple-input">
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
                        <input type="text" id="transactionId" placeholder="Transaction ID" class="apple-input">
                    </div>
                    <button onclick="submitPaymentConfirmation('${questionId}')" class="apple-btn red">
                        <i class="fas fa-paper-plane"></i> Submit Payment Confirmation
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.remove();
}

window.submitPaymentConfirmation = async function(questionId) {
    const senderName = document.getElementById('senderName')?.value.trim();
    const phoneNumber = document.getElementById('phoneNumber')?.value.trim();
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const transactionId = document.getElementById('transactionId')?.value.trim();
    
    if (!senderName || !phoneNumber || !paymentMethod || !transactionId) {
        alert('Please fill in all fields');
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
        alert('✅ Payment confirmation submitted! Admin will verify within 24 hours.');
        
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
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-modal">&times;</button>
            </div>
            <div class="payment-modal-body">
                <div class="revealed-info">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>Name:</strong> ${escapeHtml(questionData.senderName || 'Anonymous User')}<br>
                        <strong>Email:</strong> ${escapeHtml(questionData.senderEmail || 'hidden@example.com')}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="apple-btn red">
                    <i class="fas fa-check"></i> Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ========== ADMIN PANEL ==========
window.showAdminPanel = async function() {
    if (!isAdmin()) {
        alert('Access denied. Admin only.');
        return;
    }
    
    const paymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc')
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = [];
    paymentsSnapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
    });
    
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
        <div class="payment-modal-content admin-panel">
            <div class="payment-modal-header">
                <i class="fas fa-shield-alt"></i>
                <h3>Admin Panel - Pending Payments</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-modal">&times;</button>
            </div>
            <div class="payment-modal-body">
                ${payments.length === 0 ? '<p>No pending payments.</p>' : payments.map(p => `
                    <div class="payment-request">
                        <div class="payment-request-header">
                            <strong>${escapeHtml(p.userName)}</strong>
                            <span class="payment-status pending">Pending</span>
                        </div>
                        <div class="payment-request-details">
                            <div><i class="fas fa-envelope"></i> ${escapeHtml(p.userEmail)}</div>
                            <div><i class="fas fa-phone"></i> ${escapeHtml(p.phoneNumber)}</div>
                            <div><i class="fas fa-exchange-alt"></i> ${p.paymentMethod === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}</div>
                            <div><i class="fas fa-hashtag"></i> Transaction: ${escapeHtml(p.transactionId)}</div>
                            <div><i class="fas fa-clock"></i> ${new Date(p.submittedAt).toLocaleString()}</div>
                        </div>
                        <div class="payment-request-actions">
                            <button onclick="verifyPayment('${p.id}', '${p.questionId}', '${p.userId}')" class="verify-btn">
                                <i class="fas fa-check-circle"></i> Verify & Reveal
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.verifyPayment = async function(paymentId, questionId, userId) {
    if (!confirm('Verify this payment and reveal the anonymous sender?')) return;
    
    try {
        const questionRef = doc(db, 'questions', questionId);
        const questionSnap = await getDoc(questionRef);
        const question = questionSnap.data();
        
        // Get sender info - you need to store senderUid when question is asked
        const senderRef = doc(db, 'users', question.senderUid);
        const senderSnap = await getDoc(senderRef);
        const sender = senderSnap.data();
        
        await updateDoc(questionRef, {
            revealed: true,
            revealedTo: userId,
            revealedAt: new Date().toISOString(),
            senderName: sender?.name || 'Anonymous User',
            senderEmail: sender?.email || 'hidden@example.com'
        });
        
        await updateDoc(doc(db, 'payments', paymentId), {
            status: 'completed',
            verifiedAt: new Date().toISOString()
        });
        
        alert('Payment verified! Sender revealed to user.');
        closePaymentModal();
        showAdminPanel();
        
    } catch (error) {
        alert('Failed to verify: ' + error.message);
    }
};

// ========== LOAD DASHBOARD ==========
async function loadDashboard() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = getBaseUrl() + 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Show admin button if user is admin
        if (isAdmin()) {
            const adminBtn = document.getElementById('adminBtnContainer');
            if (adminBtn) adminBtn.style.display = 'block';
        }
        
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
                    provider: 'unknown',
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
                    ${expiryWarning ? `<small class="expiry-warning"> ${expiryWarning}</small>` : ''}
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

window.requestNotificationPermission = requestNotificationPermission;

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