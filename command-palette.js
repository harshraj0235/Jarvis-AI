// ============================================================
// Jarvis AI — Floating Command Palette
// Spotlight-style quick command overlay (Ctrl+Shift+J)
// Injected into web pages as a content script
// ============================================================

(function() {
  'use strict';

  if (window.__jarvisPaletteInjected) return;
  window.__jarvisPaletteInjected = true;

  let paletteVisible = false;
  let paletteEl = null;

  // ── Keyboard Shortcut ──────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+J or Cmd+Shift+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      e.stopPropagation();
      togglePalette();
    }
    // Escape to close
    if (e.key === 'Escape' && paletteVisible) {
      e.preventDefault();
      hidePalette();
    }
  });

  // ── Toggle ─────────────────────────────────────────────
  function togglePalette() {
    if (paletteVisible) {
      hidePalette();
    } else {
      showPalette();
    }
  }

  // ── Show Palette ───────────────────────────────────────
  function showPalette() {
    if (paletteEl) {
      paletteEl.style.display = 'flex';
      paletteEl.querySelector('.jarvis-palette-input').focus();
      paletteVisible = true;
      return;
    }

    // Create DOM
    paletteEl = document.createElement('div');
    paletteEl.id = 'jarvis-command-palette';
    paletteEl.innerHTML = `
      <div class="jarvis-palette-backdrop"></div>
      <div class="jarvis-palette-container">
        <div class="jarvis-palette-header">
          <div class="jarvis-palette-logo">
            <div class="jarvis-palette-orb"></div>
          </div>
          <input type="text" class="jarvis-palette-input" placeholder="Ask Jarvis anything..." autocomplete="off" spellcheck="false" />
          <div class="jarvis-palette-shortcut">ESC</div>
        </div>
        <div class="jarvis-palette-suggestions">
          <div class="jarvis-palette-hint" data-cmd="Open YouTube">🌐 Open YouTube</div>
          <div class="jarvis-palette-hint" data-cmd="New tab">➕ New Tab</div>
          <div class="jarvis-palette-hint" data-cmd="Screenshot">📸 Screenshot</div>
          <div class="jarvis-palette-hint" data-cmd="Show bookmarks">⭐ Bookmarks</div>
          <div class="jarvis-palette-hint" data-cmd="Summarize this page">📝 Summarize Page</div>
          <div class="jarvis-palette-hint" data-cmd="Show grid">🔢 Smart Grid</div>
        </div>
        <div class="jarvis-palette-result" style="display:none;">
          <div class="jarvis-palette-result-icon">✅</div>
          <div class="jarvis-palette-result-text"></div>
        </div>
      </div>
    `;

    // Inject styles
    if (!document.getElementById('jarvis-palette-styles')) {
      const style = document.createElement('style');
      style.id = 'jarvis-palette-styles';
      style.textContent = getPaletteCSS();
      document.head.appendChild(style);
    }

    document.body.appendChild(paletteEl);
    paletteVisible = true;

    const input = paletteEl.querySelector('.jarvis-palette-input');
    input.focus();

    // ── Events ──
    // Backdrop click
    paletteEl.querySelector('.jarvis-palette-backdrop').addEventListener('click', hidePalette);

    // Enter to send
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          sendCommand(text);
          input.value = '';
        }
      }
    });

    // Suggestion clicks
    paletteEl.querySelectorAll('.jarvis-palette-hint').forEach(hint => {
      hint.addEventListener('click', () => {
        sendCommand(hint.dataset.cmd);
      });
    });
  }

  // ── Hide Palette ───────────────────────────────────────
  function hidePalette() {
    if (paletteEl) {
      paletteEl.style.display = 'none';
      paletteVisible = false;
      // Hide result
      const result = paletteEl.querySelector('.jarvis-palette-result');
      if (result) result.style.display = 'none';
      const suggestions = paletteEl.querySelector('.jarvis-palette-suggestions');
      if (suggestions) suggestions.style.display = '';
    }
  }

  // ── Send Command ───────────────────────────────────────
  function sendCommand(text) {
    // Show processing state
    const orb = paletteEl.querySelector('.jarvis-palette-orb');
    orb.classList.add('thinking');

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'PALETTE_COMMAND',
      data: { text }
    }, (response) => {
      orb.classList.remove('thinking');

      if (response && response.message) {
        showResult(response.success ? '✅' : '❌', response.message);
      } else {
        showResult('📤', `Sent: "${text}"`);
      }

      // Auto-hide after 1.5s on success
      setTimeout(() => {
        hidePalette();
      }, 1500);
    });
  }

  // ── Show Result ────────────────────────────────────────
  function showResult(icon, text) {
    const result = paletteEl.querySelector('.jarvis-palette-result');
    const suggestions = paletteEl.querySelector('.jarvis-palette-suggestions');

    result.querySelector('.jarvis-palette-result-icon').textContent = icon;
    result.querySelector('.jarvis-palette-result-text').textContent = text;
    result.style.display = 'flex';
    suggestions.style.display = 'none';
  }

  // ── Palette CSS ────────────────────────────────────────
  function getPaletteCSS() {
    return `
      #jarvis-command-palette {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 18vh;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      .jarvis-palette-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: jarvisPaletteFadeIn 0.15s ease;
      }

      @keyframes jarvisPaletteFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes jarvisPaletteSlideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .jarvis-palette-container {
        position: relative;
        width: 580px;
        max-width: 92vw;
        background: linear-gradient(145deg, rgba(20, 22, 35, 0.97), rgba(12, 14, 24, 0.98));
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 16px;
        box-shadow:
          0 25px 60px rgba(0, 0, 0, 0.5),
          0 0 30px rgba(0, 212, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        overflow: hidden;
        animation: jarvisPaletteSlideIn 0.2s ease;
      }

      .jarvis-palette-header {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        gap: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .jarvis-palette-logo {
        flex-shrink: 0;
      }

      .jarvis-palette-orb {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #00d4ff, #8b5cf6, #06b6d4);
        box-shadow: 0 0 16px rgba(0, 212, 255, 0.4);
        animation: jarvisPaletteOrbPulse 2s ease-in-out infinite;
      }

      .jarvis-palette-orb.thinking {
        animation: jarvisPaletteOrbSpin 0.8s linear infinite;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
        background: radial-gradient(circle at 35% 35%, #fbbf24, #f59e0b, #8b5cf6);
      }

      @keyframes jarvisPaletteOrbPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }

      @keyframes jarvisPaletteOrbSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .jarvis-palette-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: #e2e8f0;
        font-size: 17px;
        font-weight: 400;
        letter-spacing: 0.01em;
        font-family: inherit;
      }

      .jarvis-palette-input::placeholder {
        color: rgba(148, 163, 184, 0.6);
      }

      .jarvis-palette-shortcut {
        padding: 4px 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(148, 163, 184, 0.7);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        flex-shrink: 0;
      }

      .jarvis-palette-suggestions {
        padding: 8px 8px 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .jarvis-palette-hint {
        padding: 8px 14px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
      }

      .jarvis-palette-hint:hover {
        background: rgba(0, 212, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.3);
        color: #e2e8f0;
        transform: translateY(-1px);
      }

      .jarvis-palette-result {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        animation: jarvisPaletteFadeIn 0.2s ease;
      }

      .jarvis-palette-result-icon {
        font-size: 22px;
        flex-shrink: 0;
      }

      .jarvis-palette-result-text {
        color: #e2e8f0;
        font-size: 14px;
        line-height: 1.5;
      }
    `;
  }

})();
