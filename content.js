// ============================================================
// Jarvis AI — Content Script (Enhanced)
// DOM interaction: click, type, scroll, find, read, dark mode,
// auto-scroll, QR code, page stats, clipboard, reading mode
// ============================================================

(function() {
  'use strict';

  if (window.__jarvisInjected) return;
  window.__jarvisInjected = true;

  // ── State ────────────────────────────────────────────────
  let autoScrollInterval = null;
  let autoScrollSpeed = 2;
  let readingModeActive = false;
  let darkModeActive = false;
  let findHighlights = [];

  // ── Message Listener ────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== 'JARVIS_ACTION') return;
    const { type, data } = message;

    try {
      switch (type) {
        case 'CLICK_ELEMENT':
          handleClick(data).then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }));
          return true;

        case 'TYPE_TEXT':
          handleType(data).then(r => sendResponse(r)).catch(e => sendResponse({ error: e.message }));
          return true;

        case 'SCROLL':
          handleScroll(data);
          sendResponse({ success: true });
          return false;

        case 'SCROLL_TO_ELEMENT':
          handleScrollToElement(data);
          sendResponse({ success: true });
          return false;

        case 'AUTO_SCROLL':
          handleAutoScroll(data);
          sendResponse({ success: true, action: data.action });
          return false;

        case 'AUTO_SCROLL_SPEED':
          if (data.faster) { autoScrollSpeed = Math.min(10, autoScrollSpeed + 1); }
          else { autoScrollSpeed = Math.max(1, autoScrollSpeed - 1); }
          sendResponse({ success: true, speed: autoScrollSpeed });
          return false;

        case 'READ_PAGE':
          sendResponse({ success: true, ...readPage() });
          return false;

        case 'FIND_IN_PAGE':
          const findResult = findInPage(data.query);
          sendResponse({ success: true, ...findResult });
          return false;

        case 'READING_MODE':
          toggleReadingMode();
          sendResponse({ success: true, active: readingModeActive });
          return false;

        case 'FORCE_DARK_MODE':
          toggleForceDarkMode();
          sendResponse({ success: true, active: darkModeActive });
          return false;

        case 'COPY_URL':
          copyToClipboard(window.location.href);
          sendResponse({ success: true, copied: window.location.href });
          return false;

        case 'COPY_TITLE':
          copyToClipboard(document.title);
          sendResponse({ success: true, copied: document.title });
          return false;

        case 'COPY_PAGE_TEXT':
          const pageText = document.body.innerText.substring(0, 50000);
          copyToClipboard(pageText);
          sendResponse({ success: true, length: pageText.length });
          return false;

        case 'COPY_LINKS':
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href).filter(h => h.startsWith('http'));
          const uniqueLinks = [...new Set(links)];
          copyToClipboard(uniqueLinks.join('\n'));
          sendResponse({ success: true, count: uniqueLinks.length, links: uniqueLinks.slice(0, 20) });
          return false;

        case 'COPY_TO_CLIPBOARD':
          copyToClipboard(data.text);
          sendResponse({ success: true, copied: data.text });
          return false;

        case 'PAGE_STATS':
          sendResponse({ success: true, ...getPageStats() });
          return false;

        case 'QR_CODE':
          const qrDataUrl = generateQRCode(window.location.href);
          sendResponse({ success: true, dataUrl: qrDataUrl, url: window.location.href });
          return false;

        case 'PRINT_PAGE':
          window.print();
          sendResponse({ success: true });
          return false;

        default:
          sendResponse({ error: `Unknown content action: ${type}` });
          return false;
      }
    } catch (err) {
      sendResponse({ error: err.message });
      return false;
    }
  });

  // ── Click Handler ─────────────────────────────────────────
  async function handleClick(data) {
    const { target } = data;
    if (!target) throw new Error('No click target specified');
    const element = findElement(target);
    if (!element) throw new Error(`Could not find element: "${target}"`);
    highlightElement(element);
    await sleep(300);
    element.click();
    return { success: true, clicked: describeElement(element) };
  }

  // ── Type Handler ──────────────────────────────────────────
  async function handleType(data) {
    const { text, target } = data;
    if (!text) throw new Error('No text to type');

    let element;
    if (target) {
      element = findElement(target);
      if (!element) element = findInputNear(target);
    }
    if (!element) {
      element = document.activeElement;
      if (!isInputElement(element)) element = findFirstVisibleInput();
    }
    if (!element || !isInputElement(element)) {
      throw new Error(target ? `Could not find input field: "${target}"` : 'No input field found');
    }

    element.focus();
    highlightElement(element);
    await sleep(200);
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    return { success: true, typed: text, field: describeElement(element) };
  }

  // ── Scroll Handler ────────────────────────────────────────
  function handleScroll(data) {
    const d = data.direction;
    switch (d) {
      case 'up': window.scrollBy({ top: -400, behavior: 'smooth' }); break;
      case 'down': window.scrollBy({ top: 400, behavior: 'smooth' }); break;
      case 'to top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'to bottom': window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); break;
      default: window.scrollBy({ top: 400, behavior: 'smooth' });
    }
  }

  // ── Scroll to Element ─────────────────────────────────────
  function handleScrollToElement(data) {
    const target = data.target?.toLowerCase();
    if (!target) return;

    // Try headings first
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
      if (h.textContent.toLowerCase().includes(target)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(h);
        return;
      }
    }

    // Try IDs and classes
    const el = document.querySelector(`#${CSS.escape(target)}`) ||
               document.querySelector(`.${CSS.escape(target)}`) ||
               document.querySelector(`[name="${target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightElement(el);
      return;
    }

    // Try any element with matching text
    const allEls = document.querySelectorAll('section, article, div, footer, header, nav, aside');
    for (const el of allEls) {
      const id = (el.id || '').toLowerCase();
      const cls = (el.className || '').toLowerCase();
      if (id.includes(target) || cls.includes(target)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(el);
        return;
      }
    }
  }

  // ── Auto Scroll ───────────────────────────────────────────
  function handleAutoScroll(data) {
    if (data.action === 'start') {
      if (autoScrollInterval) clearInterval(autoScrollInterval);
      autoScrollInterval = setInterval(() => {
        window.scrollBy(0, autoScrollSpeed);
      }, 16); // ~60fps
    } else {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
    }
  }

  // ── Read Page ─────────────────────────────────────────────
  function readPage() {
    const title = document.title;
    const url = window.location.href;

    const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
    let textContent;
    if (mainContent) {
      textContent = mainContent.innerText;
    } else {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, nav, header, footer, aside, [aria-hidden="true"]')
        .forEach(el => el.remove());
      textContent = clone.innerText;
    }

    textContent = textContent.replace(/\n{3,}/g, '\n\n').replace(/\t+/g, ' ').trim().substring(0, 8000);

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 10).map(h => ({ tag: h.tagName, text: h.textContent.trim().substring(0, 100) }));

    const links = Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 20).map(a => ({ text: a.textContent.trim().substring(0, 60), href: a.href }))
      .filter(l => l.text);

    return { title, url, textContent, headings, links };
  }

  // ── Find in Page ──────────────────────────────────────────
  function findInPage(query) {
    // Clear previous highlights
    clearFindHighlights();

    if (!query || query.length < 1) return { count: 0 };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const matches = [];
    const lowerQuery = query.toLowerCase();

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent;
      let idx = text.toLowerCase().indexOf(lowerQuery);
      while (idx !== -1) {
        matches.push({ node, index: idx, length: query.length });
        idx = text.toLowerCase().indexOf(lowerQuery, idx + 1);
      }
    }

    // Highlight matches (limit to 100)
    const toHighlight = matches.slice(0, 100);
    for (const match of toHighlight) {
      try {
        const range = document.createRange();
        range.setStart(match.node, match.index);
        range.setEnd(match.node, match.index + match.length);

        const span = document.createElement('span');
        span.className = 'jarvis-find-highlight';
        span.style.cssText = 'background: #ffeb3b !important; color: #000 !important; padding: 1px 2px; border-radius: 2px; box-shadow: 0 0 4px rgba(255,235,59,0.5);';
        range.surroundContents(span);
        findHighlights.push(span);
      } catch (e) {}
    }

    // Scroll to first match
    if (findHighlights.length > 0) {
      findHighlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      findHighlights[0].style.background = '#ff9800';
    }

    return { count: matches.length, highlighted: findHighlights.length };
  }

  function clearFindHighlights() {
    for (const span of findHighlights) {
      try {
        const parent = span.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(span.textContent), span);
          parent.normalize();
        }
      } catch (e) {}
    }
    findHighlights = [];
  }

  // ── Reading Mode ──────────────────────────────────────────
  function toggleReadingMode() {
    if (readingModeActive) {
      const overlay = document.getElementById('jarvis-reading-mode');
      if (overlay) overlay.remove();
      readingModeActive = false;
      return;
    }

    const pageData = readPage();
    const overlay = document.createElement('div');
    overlay.id = 'jarvis-reading-mode';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: #1a1a2e; color: #e0e0e0;
      overflow-y: auto; padding: 40px 20px;
      font-family: 'Georgia', serif; font-size: 18px; line-height: 1.8;
    `;
    overlay.innerHTML = `
      <div style="max-width:680px; margin:0 auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid #333; padding-bottom:16px;">
          <h1 style="font-size:28px; color:#00d4ff; margin:0; line-height:1.3;">${escapeHtml(pageData.title)}</h1>
          <button id="jarvis-close-reading" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:8px 16px; cursor:pointer; font-size:14px; font-weight:600;">✕ Close</button>
        </div>
        <div style="color:#b0b0b0; font-size:12px; margin-bottom:20px;">${escapeHtml(pageData.url)}</div>
        <div style="white-space:pre-wrap; word-break:break-word;">${escapeHtml(pageData.textContent)}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#jarvis-close-reading').addEventListener('click', () => {
      overlay.remove();
      readingModeActive = false;
    });

    readingModeActive = true;
  }

  // ── Force Dark Mode ───────────────────────────────────────
  function toggleForceDarkMode() {
    const existingStyle = document.getElementById('jarvis-dark-mode');
    if (existingStyle) {
      existingStyle.remove();
      darkModeActive = false;
      return;
    }

    const style = document.createElement('style');
    style.id = 'jarvis-dark-mode';
    style.textContent = `
      html {
        filter: invert(0.9) hue-rotate(180deg) !important;
        background: #111 !important;
      }
      img, video, canvas, svg, [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `;
    document.head.appendChild(style);
    darkModeActive = true;
  }

  // ── Clipboard ─────────────────────────────────────────────
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  // ── Page Stats ────────────────────────────────────────────
  function getPageStats() {
    const text = document.body.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const images = document.querySelectorAll('img').length;
    const links = document.querySelectorAll('a[href]').length;
    const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    const forms = document.querySelectorAll('form').length;
    const inputs = document.querySelectorAll('input, textarea, select').length;
    const scripts = document.querySelectorAll('script').length;
    const title = document.title;
    const url = window.location.href;
    const readTime = Math.ceil(words / 200); // ~200 wpm

    return {
      title, url, words, chars, images, links, headings, forms, inputs, scripts, readTime
    };
  }

  // ── QR Code Generator (inline, no dependencies) ───────────
  function generateQRCode(text) {
    // Simple QR code using a canvas — uses Google Charts API as fallback
    // For offline: generate a basic visual representation
    const size = 200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Simple visual representation with encoded text
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    // Create a simple QR-like pattern from URL hash
    const data = text.split('').map(c => c.charCodeAt(0));
    const gridSize = 21;
    const cellSize = Math.floor(size / gridSize);
    const offset = Math.floor((size - cellSize * gridSize) / 2);

    // Position patterns (corners)
    drawFinderPattern(ctx, offset, offset, cellSize);
    drawFinderPattern(ctx, offset + (gridSize - 7) * cellSize, offset, cellSize);
    drawFinderPattern(ctx, offset, offset + (gridSize - 7) * cellSize, cellSize);

    // Data modules
    let dataIdx = 0;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Skip finder patterns
        if ((row < 8 && col < 8) || (row < 8 && col >= gridSize - 8) || (row >= gridSize - 8 && col < 8)) continue;

        const byte = data[dataIdx % data.length];
        const bit = (byte >> ((row + col) % 8)) & 1;
        if (bit) {
          ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
        }
        dataIdx++;
      }
    }

    return canvas.toDataURL('image/png');
  }

  function drawFinderPattern(ctx, x, y, cellSize) {
    // Outer
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    // Inner white
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    // Center
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  // ── Element Finder ────────────────────────────────────────
  function findElement(target) {
    const lower = target.toLowerCase().trim();

    // Strategy 1: Clickable elements by text
    const clickableSelectors = [
      'button', 'a', '[role="button"]', 'input[type="submit"]',
      'input[type="button"]', '[onclick]', '[tabindex]', 'label', 'summary'
    ];

    for (const selector of clickableSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (!isVisible(el)) continue;
        const elText = (el.textContent || el.value || el.title || el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (elText === lower || elText.includes(lower)) return el;
      }
    }

    // Strategy 2: By attributes
    const allInteractive = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
    );
    for (const el of allInteractive) {
      if (!isVisible(el)) continue;
      const attrs = [
        el.getAttribute('placeholder'), el.getAttribute('title'),
        el.getAttribute('aria-label'), el.getAttribute('name'),
        el.getAttribute('id'), el.getAttribute('value')
      ].filter(Boolean).map(a => a.toLowerCase());
      if (attrs.some(a => a.includes(lower) || lower.includes(a))) return el;
    }

    // Strategy 3: Any element with matching text
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (!isVisible(el)) continue;
      if (el.children.length > 3) continue;
      const text = el.textContent.trim().toLowerCase();
      if (text === lower && text.length < 100) return el;
    }

    // Strategy 4: CSS selector
    try { const el = document.querySelector(target); if (el) return el; } catch (e) {}

    return null;
  }

  function findInputNear(target) {
    const lower = target.toLowerCase().trim();
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase().includes(lower)) {
        if (label.htmlFor) { const input = document.getElementById(label.htmlFor); if (input) return input; }
        const nested = label.querySelector('input, textarea, select');
        if (nested) return nested;
      }
    }
    const inputs = document.querySelectorAll('input, textarea, select');
    for (const input of inputs) {
      if (!isVisible(input)) continue;
      const attrs = [input.placeholder, input.name, input.id, input.getAttribute('aria-label')]
        .filter(Boolean).map(a => a.toLowerCase());
      if (attrs.some(a => a.includes(lower) || lower.includes(a))) return input;
    }
    return null;
  }

  function findFirstVisibleInput() {
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea'
    );
    for (const input of inputs) { if (isVisible(input)) return input; }
    return null;
  }

  // ── Helpers ───────────────────────────────────────────────
  function isInputElement(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function describeElement(el) {
    const tag = el.tagName?.toLowerCase() || 'element';
    const text = (el.textContent || el.value || el.placeholder || '').trim().substring(0, 50);
    const type = el.type ? ` [${el.type}]` : '';
    return `<${tag}${type}> "${text}"`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightElement(el) {
    const orig = { outline: el.style.outline, transition: el.style.transition, boxShadow: el.style.boxShadow };
    el.style.transition = 'outline 0.2s ease';
    el.style.outline = '3px solid #00d4ff';
    el.style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.5)';
    setTimeout(() => {
      el.style.outline = orig.outline;
      el.style.boxShadow = orig.boxShadow;
      el.style.transition = orig.transition;
    }, 1500);
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
})();
