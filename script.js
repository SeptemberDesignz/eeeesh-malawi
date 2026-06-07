// ========== Helper Functions ==========
const STORAGE_USERS = 'eeeesh_users';
const STORAGE_QUESTIONS = 'eeeesh_questions';
let currentUser = null;

// Initialize data if empty
function initData() {
    if (!localStorage.getItem(STORAGE_USERS)) {
        // Demo account for testing
        const defaultUsers = [
            { id: 'user1', email: 'banda@example.com', password: '123456', name: 'Banda from Lilongwe', slug: 'banda123', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem(STORAGE_USERS, JSON.stringify(defaultUsers));
    }
    if (!localStorage.getItem(STORAGE_QUESTIONS)) {
        // Add a sample question for demo
        const sampleQuestions = [
            {
                id: 'sample1',
                toSlug: 'banda123',
                question: 'Eeeesh! Are you really happy at your current job? Be honest 👀',
                askedAt: new Date().toISOString(),
                reply: null,
                isBlocked: false
            }
        ];
        localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(sampleQuestions));
    }
}

// Get current logged in user from session
function getCurrentUser() {
    const userJson = sessionStorage.getItem('eeeesh_current_user');
    if (!userJson) return null;
    return JSON.parse(userJson);
}

// Save logged in user
function setCurrentUser(user) {
    sessionStorage.setItem('eeeesh_current_user', JSON.stringify(user));
    currentUser = user;
}

// Get base URL for GitHub Pages
function getBaseUrl() {
    const path = window.location.pathname;
    if (path.includes('/eeeesh-malawi/')) {
        return '/eeeesh-malawi/';
    }
    return '/';
}

// Redirect if not logged in
function requireAuth() {
    const user = getCurrentUser();
    const currentPage = window.location.pathname;
    
    if (!user && !currentPage.includes('index.html') && !currentPage.includes('ask.html')) {
        window.location.href = getBaseUrl() + 'index.html';
        return false;
    }
    return true;
}

// ========== Auth Functions (index.html) ==========
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        setCurrentUser({ id: user.id, email: user.email, name: user.name, slug: user.slug });
        window.location.href = getBaseUrl() + 'dashboard.html';
    } else {
        alert('Invalid email or password. Try banda@example.com / 123456');
    }
}

function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password || password.length < 6) {
        alert('Email and password (min 6 chars) required');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
    if (users.find(u => u.email === email)) {
        alert('Email already exists. Login instead.');
        return;
    }
    
    const newUser = {
        id: 'user_' + Date.now(),
        email: email,
        password: password,
        name: name || email.split('@')[0],
        slug: email.split('@')[0] + '_' + Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    alert('Account created! Please login.');
    showLogin();
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function logout() {
    sessionStorage.removeItem('eeeesh_current_user');
    window.location.href = getBaseUrl() + 'index.html';
}

// ========== Dashboard Functions ==========
function loadDashboard() {
    if (!requireAuth()) return;
    
    const user = getCurrentUser();
    if (!user) return;
    
    // Show user info
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `👋 Hi, ${user.name || user.email} 🇲🇼`;
    }
    
    // Generate anonymous link
    const baseUrl = window.location.origin + getBaseUrl();
    const anonymousLink = `${baseUrl}ask.html?to=${user.slug}`;
    const linkElement = document.getElementById('anonymousLink');
    if (linkElement) {
        linkElement.textContent = anonymousLink;
    }
    
    // Load questions for this user
    renderQuestions();
}

function renderQuestions() {
    const user = getCurrentUser();
    if (!user) return;
    
    const allQuestions = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS));
    const myQuestions = allQuestions.filter(q => q.toSlug === user.slug && !q.isBlocked);
    
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    if (myQuestions.length === 0) {
        container.innerHTML = '<div class="empty-msg">🤫 No anonymous questions yet. Share your link above!</div>';
        return;
    }
    
    container.innerHTML = myQuestions.map(q => `
        <div class="question-item" data-id="${q.id}">
            <div class="question-text">❓ ${escapeHtml(q.question)}</div>
            <div class="question-meta">Asked ${new Date(q.askedAt).toLocaleString()}</div>
            ${q.reply ? `<div class="reply-text">📝 Your reply: ${escapeHtml(q.reply)}</div>` : `
                <div class="reply-area">
                    <input type="text" class="reply-input" id="reply-${q.id}" placeholder="Write a public reply...">
                    <button onclick="postReply('${q.id}')" class="small-btn">Reply</button>
                    <button onclick="blockQuestion('${q.id}')" class="small-btn" style="background:#9e2a2a;">Block</button>
                </div>
            `}
        </div>
    `).join('');
}

function postReply(questionId) {
    const replyInput = document.getElementById(`reply-${questionId}`);
    const replyText = replyInput?.value.trim();
    if (!replyText) return alert('Write a reply first');
    
    const allQuestions = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS));
    const qIndex = allQuestions.findIndex(q => q.id === questionId);
    if (qIndex !== -1) {
        allQuestions[qIndex].reply = replyText;
        allQuestions[qIndex].repliedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(allQuestions));
        renderQuestions();
    }
}

function blockQuestion(questionId) {
    if (!confirm('Block this anonymous user? They won\'t be able to ask you again.')) return;
    
    const allQuestions = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS));
    const qIndex = allQuestions.findIndex(q => q.id === questionId);
    if (qIndex !== -1) {
        allQuestions[qIndex].isBlocked = true;
        localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(allQuestions));
        renderQuestions();
    }
}

function copyLink() {
    const linkText = document.getElementById('anonymousLink')?.textContent;
    if (linkText) {
        navigator.clipboard.writeText(linkText);
        alert('✅ Link copied! Share it on WhatsApp or Facebook.');
    }
}

// ========== Ask Page (public anonymous) ==========
function loadAskPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const toSlug = urlParams.get('to');
    
    if (toSlug) {
        const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
        const recipient = users.find(u => u.slug === toSlug);
        if (recipient) {
            const displayName = recipient.name || recipient.email.split('@')[0];
            document.getElementById('recipientName').innerHTML = displayName;
            document.getElementById('recipientName').style.color = '#d97a2b';
            document.getElementById('recipientName').style.fontWeight = 'bold';
        } else {
            document.getElementById('recipientName').innerHTML = 'this person';
        }
        window.currentRecipientSlug = toSlug;
    } else {
        document.getElementById('recipientName').innerHTML = 'anyone (share a link first)';
        window.currentRecipientSlug = null;
    }
}

function sendAnonymousQuestion() {
    const question = document.getElementById('anonymousQuestion')?.value.trim();
    if (!question) {
        alert('Please write your anonymous question first!');
        return;
    }
    
    if (!window.currentRecipientSlug) {
        alert('❌ Invalid link. Please use a shared anonymous link from someone.\n\nAsk them to share their Eeeesh link with you.');
        return;
    }
    
    const allQuestions = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS));
    const newQuestion = {
        id: 'q_' + Date.now() + '_' + Math.random(),
        toSlug: window.currentRecipientSlug,
        question: question,
        askedAt: new Date().toISOString(),
        reply: null,
        isBlocked: false
    };
    
    allQuestions.push(newQuestion);
    localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(allQuestions));
    
    document.getElementById('anonymousQuestion').value = '';
    const statusDiv = document.getElementById('messageStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '✅ Sent anonymously! Your secret is safe. 🇲🇼';
        statusDiv.style.color = '#2c5f2d';
        statusDiv.style.fontWeight = 'bold';
        setTimeout(() => { statusDiv.innerHTML = ''; }, 3000);
    }
}

// Helper to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== Page Load Handler ==========
window.onload = function() {
    initData();
    
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    if (filename === 'dashboard.html' || path.includes('dashboard')) {
        loadDashboard();
    } else if (filename === 'ask.html' || path.includes('ask')) {
        loadAskPage();
    } else if (filename === 'index.html' || filename === '' || path.endsWith('/')) {
        // Login page — nothing extra, but show demo hint
        console.log('Eeeesh Malawi — Login page loaded');
    }
};