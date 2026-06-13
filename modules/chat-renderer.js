// ============================================================
// Jarvis AI — Chat Renderer
// Renders messages, typing indicators, action cards, and lists
// ============================================================

const ChatRenderer = (() => {
  'use strict';

  const chatArea = () => document.getElementById('chat-area');
  const welcomeScreen = () => document.getElementById('welcome-screen');

  let messageCount = 0;

  /**
   * Hide the welcome screen when first message arrives
   */
  function hideWelcome() {
    const ws = welcomeScreen();
    if (ws) {
      ws.style.display = 'none';
    }
  }

  /**
   * Scroll chat to the bottom
   */
  function scrollToBottom() {
    const area = chatArea();
    if (area) {
      requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
      });
    }
  }

  /**
   * Format timestamp
   */
  function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Simple markdown-like formatting for agent messages
   */
  function formatText(text) {
    if (!text) return '';

    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Unordered lists
    html = html.replace(/((?:^|<br>)(?:[-•]\s+.+(?:<br>)?)+)/g, (match) => {
      const items = match
        .split(/<br>/)
        .filter(line => /^[-•]\s+/.test(line.trim()))
        .map(line => `<li>${line.trim().replace(/^[-•]\s+/, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });

    // Numbered lists
    html = html.replace(/((?:^|<br>)(?:\d+[.)]\s+.+(?:<br>)?)+)/g, (match) => {
      const items = match
        .split(/<br>/)
        .filter(line => /^\d+[.)]\s+/.test(line.trim()))
        .map(line => `<li>${line.trim().replace(/^\d+[.)]\s+/, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    });

    // Wrap loose text in paragraphs (split by double line breaks)
    const parts = html.split(/<br><br>/);
    if (parts.length > 1) {
      html = parts.map(p => `<p>${p}</p>`).join('');
    }

    return html;
  }

  /**
   * Add a user message to the chat
   */
  function addUserMessage(text) {
    hideWelcome();
    messageCount++;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message user';
    msgEl.style.animationDelay = '0.05s';
    msgEl.innerHTML = `
      <div class="message-avatar">👤</div>
      <div>
        <div class="message-bubble">${escapeHtml(text)}</div>
        <div class="message-time">${formatTime()}</div>
      </div>
    `;

    chatArea().appendChild(msgEl);
    scrollToBottom();
    return msgEl;
  }

  /**
   * Add an agent message to the chat
   */
  function addAgentMessage(text, options = {}) {
    hideWelcome();
    removeTypingIndicator();
    messageCount++;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message agent';
    msgEl.style.animationDelay = '0.05s';

    let content = formatText(text);

    // Append action card if provided
    if (options.actionCard) {
      content += renderActionCard(options.actionCard);
    }

    // Append list items if provided
    if (options.listItems) {
      content += renderListItems(options.listItems);
    }

    // Append screenshot if provided
    if (options.screenshot) {
      content += `<div class="screenshot-preview"><img src="${options.screenshot}" alt="Screenshot"></div>`;
    }

    // Append QR Code if provided
    if (options.qrCode) {
      content += `
        <div class="qr-code-preview" style="text-align:center; margin:8px 0; background:#fff; padding:10px; border-radius:8px;">
          <img src="${options.qrCode}" alt="QR Code" style="max-width:100%; height:auto;">
        </div>
      `;
    }

    // Append Page Stats if provided
    if (options.pageStats) {
      const stats = options.pageStats;
      content += `
        <div class="page-stats-card" style="margin:8px 0; background:var(--bg-tertiary); padding:10px; border-radius:8px; border:1px solid var(--border-glass);">
          <div style="font-size:12px; font-weight:600; margin-bottom:8px; color:var(--text-primary);">${escapeHtml(stats.title)}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; color:var(--text-secondary);">
            <div>📝 Words: <strong>${stats.words}</strong></div>
            <div>⏱️ Read Time: <strong>~${stats.readTime} min</strong></div>
            <div>🔗 Links: <strong>${stats.links}</strong></div>
            <div>🖼️ Images: <strong>${stats.images}</strong></div>
          </div>
        </div>
      `;
    }

    // Append confirmation dialog if needed
    if (options.confirm) {
      content += renderConfirmDialog(options.confirm);
    }

    msgEl.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div>
        <div class="message-bubble">${content}</div>
        <div class="message-time">${formatTime()}</div>
      </div>
    `;

    chatArea().appendChild(msgEl);
    scrollToBottom();

    // Attach confirmation handlers if needed
    if (options.confirm) {
      attachConfirmHandlers(msgEl, options.confirm);
    }

    return msgEl;
  }

  /**
   * Render an action result card
   */
  function renderActionCard(card) {
    const type = card.type || 'info'; // success, error, warning, info
    return `
      <div class="action-card ${type}">
        <div class="action-card-title">${card.title || type.toUpperCase()}</div>
        <div class="action-card-content">${card.content}</div>
      </div>
    `;
  }

  /**
   * Render list items (tabs, bookmarks, history, notes, timers)
   */
  function renderListItems(items) {
    if (!items || items.length === 0) return '';
    return items.map(item => `
      <div class="list-item" ${item.url ? `data-url="${escapeHtml(item.url)}"` : ''} ${item.id ? `data-id="${item.id}"` : ''} ${item.timerId ? `data-timer="${item.timerId}"` : ''} ${item.noteIndex !== undefined ? `data-note="${item.noteIndex}"` : ''}>
        <span class="item-icon">${item.icon || '📄'}</span>
        <span class="item-title">${escapeHtml(item.title || 'Untitled')}</span>
        ${item.url ? `<span class="item-url">${escapeHtml(truncateUrl(item.url))}</span>` : ''}
        ${item.subtext ? `<span class="item-subtext" style="font-size:10px; color:var(--text-tertiary); margin-left:auto;">${escapeHtml(item.subtext)}</span>` : ''}
        ${item.actionBtn ? `<button class="item-action-btn" data-action="${item.actionBtn.action}" data-target="${item.actionBtn.target}" style="margin-left:auto; background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:12px;">${item.actionBtn.text}</button>` : ''}
      </div>
    `).join('');
  }

  /**
   * Render confirmation dialog
   */
  function renderConfirmDialog(confirm) {
    return `
      <div class="confirm-dialog">
        <p>⚠️ ${confirm.message}</p>
        <div class="confirm-dialog-actions">
          <button class="confirm-btn confirm-yes" data-confirm-action="${confirm.action}">Yes, do it</button>
          <button class="confirm-btn confirm-no">Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event handlers to confirmation buttons
   */
  function attachConfirmHandlers(msgEl, confirm) {
    const yesBtn = msgEl.querySelector('.confirm-yes');
    const noBtn = msgEl.querySelector('.confirm-no');

    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('jarvis-confirm', {
          detail: { action: confirm.action, data: confirm.data }
        }));
        // Remove the dialog
        const dialog = yesBtn.closest('.confirm-dialog');
        if (dialog) dialog.remove();
      });
    }

    if (noBtn) {
      noBtn.addEventListener('click', () => {
        const dialog = noBtn.closest('.confirm-dialog');
        if (dialog) {
          dialog.innerHTML = '<p style="color: var(--text-tertiary); font-size: 12px;">❌ Cancelled.</p>';
        }
      });
    }
  }

  /**
   * Show typing indicator
   */
  function showTypingIndicator() {
    removeTypingIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;

    chatArea().appendChild(indicator);
    scrollToBottom();
  }

  /**
   * Remove typing indicator
   */
  function removeTypingIndicator() {
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();
  }

  /**
   * Clear all chat messages
   */
  function clearChat() {
    const area = chatArea();
    const ws = welcomeScreen();

    // Remove all messages
    area.querySelectorAll('.chat-message, .typing-indicator').forEach(el => el.remove());

    // Show welcome screen again
    if (ws) ws.style.display = '';

    messageCount = 0;
  }

  /**
   * Utility: escape HTML
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Utility: truncate URL for display
   */
  function truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 20 ? u.pathname.substring(0, 20) + '...' : u.pathname);
    } catch {
      return url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
  }

  return {
    addUserMessage,
    addAgentMessage,
    showTypingIndicator,
    removeTypingIndicator,
    clearChat,
    hideWelcome,
    scrollToBottom
  };
})();
