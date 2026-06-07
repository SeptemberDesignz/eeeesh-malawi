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
                <i class="fas fa-question-circle" style="color: #ff3b30; margin-right: 8px;"></i>
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