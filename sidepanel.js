// ============================================================
// Jarvis AI — Side Panel Controller
// Wires up chat, voice, AI brain, and background actions
// ============================================================

(function() {
  'use strict';

  // ── DOM Elements ──────────────────────────────────────────
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const micBtn = document.getElementById('mic-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  const quickActionsContainer = document.getElementById('quick-actions');
  const welcomeSuggestions = document.getElementById('welcome-suggestions');
  const voiceTranscript = document.getElementById('voice-transcript');
  const voiceTranscriptText = document.getElementById('voice-transcript-text');
  const statusText = document.getElementById('status-text');

  let isProcessing = false;
  let settings = {
    voiceResponse: false,
    continuousListen: false,
    confirmDestructive: true,
    sounds: true
  };

  // ── Initialize ────────────────────────────────────────────
  async function init() {
    loadSettings();
    loadTheme();
    setupEventListeners();
    setupVoiceEngine();
    setupConfirmHandler();

    // Show ready status
    updateStatus('Ready to assist', 'ready');
  }

  // ── Event Listeners ───────────────────────────────────────
  function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', handleSend);

    // Chat input
    chatInput.addEventListener('input', () => {
      sendBtn.classList.toggle('active', chatInput.value.trim().length > 0);
      autoResizeInput();
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Mic button
    micBtn.addEventListener('click', toggleVoice);

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
      ChatRenderer.clearChat();
    });

    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Settings
    settingsBtn.addEventListener('click', () => {
      settingsOverlay.classList.add('visible');
    });

    settingsClose.addEventListener('click', () => {
      settingsOverlay.classList.remove('visible');
    });

    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) {
        settingsOverlay.classList.remove('visible');
      }
    });

    // Settings toggles
    document.getElementById('setting-voice-response')?.addEventListener('change', (e) => {
      settings.voiceResponse = e.target.checked;
      saveSettings();
    });

    document.getElementById('setting-continuous-listen')?.addEventListener('change', (e) => {
      settings.continuousListen = e.target.checked;
      VoiceEngine.setContinuousMode(e.target.checked);
      saveSettings();
    });

    document.getElementById('setting-confirm-destructive')?.addEventListener('change', (e) => {
      settings.confirmDestructive = e.target.checked;
      saveSettings();
    });

    document.getElementById('setting-sounds')?.addEventListener('change', (e) => {
      settings.sounds = e.target.checked;
      saveSettings();
    });

    // Quick action buttons
    quickActionsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-action-btn');
      if (btn) {
        const command = btn.dataset.command;
        if (command) processCommand(command);
      }
    });

    // Welcome suggestions
    welcomeSuggestions.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.welcome-suggestion');
      if (suggestion) {
        const command = suggestion.dataset.command;
        if (command) processCommand(command);
      }
    });

    // List item clicks (for opening URLs from bookmarks/history/tabs)
    document.getElementById('chat-area').addEventListener('click', (e) => {
      const listItem = e.target.closest('.list-item');
      if (listItem) {
        const url = listItem.dataset.url;
        if (url) {
          chrome.runtime.sendMessage({ action: 'NAVIGATE', data: { url } });
        }
      }
    });
  }

  // ── Voice Setup ───────────────────────────────────────────
  function setupVoiceEngine() {
    if (!VoiceEngine.isSupported) {
      micBtn.style.display = 'none';
      return;
    }

    VoiceEngine.init();

    VoiceEngine.onResult((transcript) => {
      hideVoiceTranscript();
      micBtn.classList.remove('recording');
      processCommand(transcript);
    });

    VoiceEngine.onInterim((transcript) => {
      showVoiceTranscript(transcript);
    });

    VoiceEngine.onError((message) => {
      hideVoiceTranscript();
      micBtn.classList.remove('recording');
      updateStatus('Ready to assist', 'ready');

      if (message !== 'Voice recognition was cancelled.') {
        ChatRenderer.addAgentMessage(message, {
          actionCard: { type: 'warning', title: 'Voice Error', content: message }
        });
      }
    });

    VoiceEngine.onEnd(() => {
      micBtn.classList.remove('recording');
      hideVoiceTranscript();
      updateStatus('Ready to assist', 'ready');
    });
  }

  // ── Confirmation Handler ──────────────────────────────────
  function setupConfirmHandler() {
    document.addEventListener('jarvis-confirm', (e) => {
      const { action, data } = e.detail;
      executeAction(action, data || {});
    });
  }

  // ── Toggle Voice ──────────────────────────────────────────
  function toggleVoice() {
    if (VoiceEngine.isListening) {
      VoiceEngine.stopListening();
      micBtn.classList.remove('recording');
      hideVoiceTranscript();
      updateStatus('Ready to assist', 'ready');
    } else {
      const started = VoiceEngine.startListening();
      if (started) {
        micBtn.classList.add('recording');
        updateStatus('Listening...', 'listening');
      }
    }
  }

  // ── Voice Transcript Display ──────────────────────────────
  function showVoiceTranscript(text) {
    voiceTranscriptText.textContent = text;
    voiceTranscript.classList.add('visible');
  }

  function hideVoiceTranscript() {
    voiceTranscript.classList.remove('visible');
    voiceTranscriptText.textContent = '...';
  }

  // ── Handle Send ───────────────────────────────────────────
  function handleSend() {
    const text = chatInput.value.trim();
    if (!text || isProcessing) return;

    chatInput.value = '';
    sendBtn.classList.remove('active');
    autoResizeInput();

    processCommand(text);
  }

  // ── Process Command ───────────────────────────────────────
  async function processCommand(input) {
    if (isProcessing) return;
    isProcessing = true;

    // Show user message
    ChatRenderer.addUserMessage(input);
    ChatRenderer.showTypingIndicator();
    updateStatus('Thinking...', 'thinking');

    try {
      // Classify intent via AI Brain
      const result = await AIBrain.processInput(input);

      // Map intent to action
      await handleIntent(result);
    } catch (err) {
      console.error('[Jarvis] Process error:', err);
      ChatRenderer.addAgentMessage("Oops, something went wrong. Please try again.", {
        actionCard: { type: 'error', title: 'Error', content: err.message }
      });
    } finally {
      isProcessing = false;
      updateStatus('Ready to assist', 'ready');
    }
  }

  // ── Intent Handler ────────────────────────────────────────
  async function handleIntent(result) {
    const { intent, data, response } = result;

    // If it's a pure chat response (no action needed)
    if (intent === 'chat' || intent === 'none') {
      ChatRenderer.addAgentMessage(response || "I'm not sure what you mean. Try asking me to do something!");
      speakIfEnabled(response);
      return;
    }

    // If intent is help
    if (intent === 'help') {
      ChatRenderer.addAgentMessage(AIBrain.getHelpText());
      return;
    }

    // If intent is theme change
    if (intent === 'darkMode') {
      setTheme('dark');
      ChatRenderer.addAgentMessage("🌙 Switched to **dark mode**.");
      return;
    }
    if (intent === 'lightMode') {
      setTheme('light');
      ChatRenderer.addAgentMessage("☀️ Switched to **light mode**.");
      return;
    }

    // Map intent to background action
    const actionMap = {
      // Navigation
      navigate: 'NAVIGATE',
      search: 'SEARCH',
      goBack: 'GO_BACK',
      goForward: 'GO_FORWARD',
      reload: 'RELOAD',
      openMultiple: 'OPEN_MULTIPLE',
      openWorkspace: 'OPEN_WORKSPACE',
      // Tab management
      newTab: 'NEW_TAB',
      closeTab: 'CLOSE_TAB',
      closeOtherTabs: 'CLOSE_OTHER_TABS',
      closeAllTabs: 'CLOSE_ALL_TABS',
      closeTabsByDomain: 'CLOSE_TABS_BY_DOMAIN',
      closeLastNTabs: 'CLOSE_LAST_N_TABS',
      closeFirstTab: 'CLOSE_FIRST_TAB',
      closeDuplicates: 'CLOSE_DUPLICATES',
      nextTab: 'NEXT_TAB',
      prevTab: 'PREV_TAB',
      switchToTab: 'SWITCH_TO_TAB',
      duplicateTab: 'DUPLICATE_TAB',
      pinTab: 'PIN_TAB',
      unpinTab: 'UNPIN_TAB',
      muteTab: 'MUTE_TAB',
      unmuteTab: 'UNMUTE_TAB',
      listTabs: 'LIST_TABS',
      tabCount: 'TAB_COUNT',
      currentTabInfo: 'CURRENT_TAB_INFO',
      moveTab: 'MOVE_TAB',
      sortTabs: 'SORT_TABS',
      discardTab: 'DISCARD_TAB',
      reopenTab: 'REOPEN_TAB',
      // Tab groups
      groupTabs: 'GROUP_TABS',
      ungroupTabs: 'UNGROUP_TABS',
      // Window management
      newWindow: 'NEW_WINDOW',
      incognitoWindow: 'INCOGNITO_WINDOW',
      closeWindow: 'CLOSE_WINDOW',
      listWindows: 'LIST_WINDOWS',
      fullscreen: 'FULLSCREEN',
      minimizeWindow: 'MINIMIZE_WINDOW',
      // Bookmarks
      bookmarkPage: 'BOOKMARK_PAGE',
      listBookmarks: 'LIST_BOOKMARKS',
      searchBookmarks: 'SEARCH_BOOKMARKS',
      removeBookmark: 'REMOVE_BOOKMARK',
      openAllBookmarks: 'OPEN_ALL_BOOKMARKS',
      // History & Data
      showHistory: 'SHOW_HISTORY',
      searchHistory: 'SEARCH_HISTORY',
      clearHistory: 'CLEAR_HISTORY',
      clearBrowsingData: 'CLEAR_BROWSING_DATA',
      clearCache: 'CLEAR_CACHE',
      clearCookies: 'CLEAR_COOKIES',
      // Downloads
      showDownloads: 'SHOW_DOWNLOADS',
      // Page Interaction
      clickElement: 'CLICK_ELEMENT',
      typeText: 'TYPE_TEXT',
      scroll: 'SCROLL',
      scrollToElement: 'SCROLL_TO_ELEMENT',
      autoScroll: 'AUTO_SCROLL',
      autoScrollSpeed: 'AUTO_SCROLL_SPEED',
      readPage: 'READ_PAGE',
      summarizePage: 'READ_PAGE',
      findInPage: 'FIND_IN_PAGE',
      readingMode: 'READING_MODE',
      forceDarkMode: 'FORCE_DARK_MODE',
      copyUrl: 'COPY_URL',
      copyTitle: 'COPY_TITLE',
      copyPageText: 'COPY_PAGE_TEXT',
      copyLinks: 'COPY_LINKS',
      copyToClipboard: 'COPY_TO_CLIPBOARD',
      pageStats: 'PAGE_STATS',
      qrCode: 'QR_CODE',
      printPage: 'PRINT_PAGE',
      viewSource: 'VIEW_SOURCE',
      // Screenshot & Zoom
      screenshot: 'SCREENSHOT',
      fullScreenshot: 'SCREENSHOT',
      zoomIn: 'ZOOM_IN',
      zoomOut: 'ZOOM_OUT',
      zoomReset: 'ZOOM_RESET',
      zoomTo: 'ZOOM_TO',
      // Notes
      saveNote: 'SAVE_NOTE',
      listNotes: 'LIST_NOTES',
      deleteNote: 'DELETE_NOTE',
      clearNotes: 'CLEAR_NOTES',
      // Timers
      setTimer: 'SET_TIMER',
      setAlarm: 'SET_ALARM',
      listTimers: 'LIST_TIMERS',
      cancelTimer: 'CANCEL_TIMER',
      // Settings (unified)
      openSettingsPage: 'OPEN_SETTINGS_PAGE',
      // Top Sites
      topSites: 'TOP_SITES',
      // Native Desktop
      nativeOpenApp: 'NATIVE_OPEN_APP',
      nativeInstallApp: 'NATIVE_INSTALL_APP',
      nativeSystemPower: 'NATIVE_SYSTEM_POWER',
      nativeOpenFolder: 'NATIVE_OPEN_FOLDER',
      nativeRunCommand: 'NATIVE_RUN_COMMAND'
    };

    const action = actionMap[intent];
    if (!action) {
      ChatRenderer.addAgentMessage(response || "I understood your intent but don't know how to do that yet.");
      return;
    }

    // Check if destructive action needs confirmation
    const destructiveIntents = ['closeAllTabs', 'closeOtherTabs', 'clearHistory', 'clearBrowsingData'];
    if (settings.confirmDestructive && destructiveIntents.includes(intent)) {
      const messages = {
        closeAllTabs: 'This will close **all your open tabs**. Are you sure?',
        closeOtherTabs: 'This will close **all tabs except the current one**.',
        clearHistory: 'This will **permanently delete your browsing history**.',
        clearBrowsingData: 'This will **clear your cache, cookies, and history**.'
      };

      ChatRenderer.addAgentMessage('⚠️ Hold on...', {
        confirm: {
          message: messages[intent],
          action: action,
          data: data
        }
      });
      return;
    }

    // Execute the action
    await executeAction(action, data, intent);
  }

  // ── Execute Action ────────────────────────────────────────
  async function executeAction(action, data, intent) {
    try {
      const result = await chrome.runtime.sendMessage({ action, data });

      if (result?.error) {
        ChatRenderer.addAgentMessage(`I couldn't do that.`, {
          actionCard: { type: 'error', title: 'Failed', content: result.error }
        });
        return;
      }

      // Handle the response based on action type
      handleActionResult(action, result, intent, data);

    } catch (err) {
      ChatRenderer.addAgentMessage(`Something went wrong.`, {
        actionCard: { type: 'error', title: 'Error', content: err.message }
      });
    }
  }

  // ── Handle Action Results ─────────────────────────────────
  function handleActionResult(action, result, intent, data) {
    switch (action) {
      case 'NAVIGATE':
        ChatRenderer.addAgentMessage(`🌐 Navigating to **${data.siteName || data.url}**...`, {
          actionCard: { type: 'success', title: 'Navigation', content: `Opening ${data.url}` }
        });
        speakIfEnabled(`Opening ${data.siteName || data.url}`);
        break;

      case 'SEARCH':
        ChatRenderer.addAgentMessage(`🔍 Searching Google for **"${data.query}"**...`, {
          actionCard: { type: 'success', title: 'Search', content: `Searching for: ${data.query}` }
        });
        speakIfEnabled(`Searching for ${data.query}`);
        break;

      case 'GO_BACK':
        ChatRenderer.addAgentMessage('⬅️ Going back to the previous page.');
        speakIfEnabled('Going back');
        break;

      case 'GO_FORWARD':
        ChatRenderer.addAgentMessage('➡️ Going forward.');
        speakIfEnabled('Going forward');
        break;

      case 'RELOAD':
        ChatRenderer.addAgentMessage('🔄 Page reloaded.');
        speakIfEnabled('Page reloaded');
        break;

      case 'NEW_TAB':
        ChatRenderer.addAgentMessage('➕ Opened a **new tab**.');
        speakIfEnabled('New tab opened');
        break;

      case 'CLOSE_TAB':
        ChatRenderer.addAgentMessage(`✖️ Closed the tab${result.closedTitle ? ': **' + result.closedTitle + '**' : ''}.`);
        speakIfEnabled('Tab closed');
        break;

      case 'CLOSE_OTHER_TABS':
        ChatRenderer.addAgentMessage(`✖️ Closed **${result.closedCount}** other tab(s).`, {
          actionCard: { type: 'success', title: 'Tabs Closed', content: `${result.closedCount} tabs were closed` }
        });
        speakIfEnabled(`Closed ${result.closedCount} tabs`);
        break;

      case 'CLOSE_ALL_TABS':
        ChatRenderer.addAgentMessage(`✖️ Closed **${result.closedCount}** tab(s). A new empty tab was created.`);
        speakIfEnabled('All tabs closed');
        break;

      case 'CLOSE_TABS_BY_DOMAIN':
        ChatRenderer.addAgentMessage(`✖️ Closed **${result.closedCount}** tab(s) from **${result.domain}**.`);
        break;

      case 'CLOSE_LAST_N_TABS':
        ChatRenderer.addAgentMessage(`✖️ Closed the last **${result.closedCount}** tab(s).`);
        break;

      case 'CLOSE_FIRST_TAB':
        ChatRenderer.addAgentMessage(`✖️ Closed the first tab${result.closedTitle ? ': **' + result.closedTitle + '**' : ''}.`);
        break;

      case 'CLOSE_DUPLICATES':
        ChatRenderer.addAgentMessage(`✖️ Removed **${result.closedCount}** duplicate tab(s).`);
        break;

      case 'NEXT_TAB':
        ChatRenderer.addAgentMessage(`📑 Switched to: **${result.switchedTo}**`);
        break;

      case 'PREV_TAB':
        ChatRenderer.addAgentMessage(`📑 Switched to: **${result.switchedTo}**`);
        break;

      case 'SWITCH_TO_TAB':
        ChatRenderer.addAgentMessage(`📑 Switched to tab: **${result.switchedTo}**`);
        break;

      case 'DUPLICATE_TAB':
        ChatRenderer.addAgentMessage(`📋 Duplicated: **${result.duplicatedTitle}**`);
        break;

      case 'PIN_TAB':
        ChatRenderer.addAgentMessage(result.pinned ? '📌 Tab **pinned**.' : '📌 Tab **unpinned**.');
        break;

      case 'UNPIN_TAB':
        ChatRenderer.addAgentMessage('📌 Tab **unpinned**.');
        break;

      case 'MUTE_TAB':
        ChatRenderer.addAgentMessage('🔇 Tab **muted**.');
        break;

      case 'UNMUTE_TAB':
        ChatRenderer.addAgentMessage('🔊 Tab **unmuted**.');
        break;

      case 'LIST_TABS':
        if (result.tabs && result.tabs.length > 0) {
          const items = result.tabs.map(t => ({
            icon: t.active ? '🟢' : (t.pinned ? '📌' : '📄'),
            title: `${t.index}. ${t.title}${t.muted ? ' 🔇' : ''}`,
            url: t.url
          }));
          ChatRenderer.addAgentMessage(`📑 You have **${result.tabs.length}** open tabs:`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No tabs found.');
        }
        break;

      case 'BOOKMARK_PAGE':
        ChatRenderer.addAgentMessage(`⭐ Bookmarked: **${result.title}**`, {
          actionCard: { type: 'success', title: 'Bookmarked', content: result.title }
        });
        speakIfEnabled(`Page bookmarked: ${result.title}`);
        break;

      case 'LIST_BOOKMARKS':
        if (result.bookmarks && result.bookmarks.length > 0) {
          const items = result.bookmarks.map(b => ({
            icon: '⭐',
            title: b.title || 'Untitled',
            url: b.url
          }));
          ChatRenderer.addAgentMessage(`⭐ Here are your recent bookmarks (${result.bookmarks.length}):`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('You don\'t have any bookmarks yet.');
        }
        break;

      case 'SEARCH_BOOKMARKS':
        if (result.bookmarks && result.bookmarks.length > 0) {
          const items = result.bookmarks.map(b => ({
            icon: '⭐',
            title: b.title || 'Untitled',
            url: b.url
          }));
          ChatRenderer.addAgentMessage(`🔍 Found **${result.bookmarks.length}** bookmark(s):`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No bookmarks found matching your search.');
        }
        break;

      case 'REMOVE_BOOKMARK':
        ChatRenderer.addAgentMessage(`⭐ Removed bookmark: **${result.title}**`);
        break;

      case 'SHOW_HISTORY':
        if (result.history && result.history.length > 0) {
          const items = result.history.map(h => ({
            icon: '📜',
            title: h.title || 'Untitled',
            url: h.url
          }));
          ChatRenderer.addAgentMessage(`📜 Recent browsing history (${result.history.length}):`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No recent history found.');
        }
        break;

      case 'SEARCH_HISTORY':
        if (result.history && result.history.length > 0) {
          const items = result.history.map(h => ({
            icon: '📜',
            title: h.title || 'Untitled',
            url: h.url
          }));
          ChatRenderer.addAgentMessage(`🔍 Found **${result.history.length}** history items:`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No history items found matching your search.');
        }
        break;

      case 'CLEAR_HISTORY':
        ChatRenderer.addAgentMessage('🗑️ Browsing history has been **cleared**.', {
          actionCard: { type: 'success', title: 'History Cleared', content: 'All browsing history has been deleted' }
        });
        break;

      case 'CLEAR_BROWSING_DATA':
        ChatRenderer.addAgentMessage('🗑️ Browsing data (cache, cookies, history) has been **cleared**.', {
          actionCard: { type: 'success', title: 'Data Cleared', content: 'Cache, cookies, and history cleared' }
        });
        break;

      case 'SHOW_DOWNLOADS':
        if (result.downloads && result.downloads.length > 0) {
          const items = result.downloads.map(d => ({
            icon: d.state === 'complete' ? '✅' : (d.state === 'in_progress' ? '⏳' : '❌'),
            title: d.filename,
            url: d.url
          }));
          ChatRenderer.addAgentMessage(`📥 Recent downloads (${result.downloads.length}):`, { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No recent downloads found.');
        }
        break;

      case 'CLICK_ELEMENT':
        if (result.success) {
          ChatRenderer.addAgentMessage(`🖱️ Clicked on **${result.clicked}**`, {
            actionCard: { type: 'success', title: 'Click', content: `Clicked: ${result.clicked}` }
          });
        }
        break;

      case 'TYPE_TEXT':
        if (result.success) {
          ChatRenderer.addAgentMessage(`⌨️ Typed **"${result.typed}"** into ${result.field}`, {
            actionCard: { type: 'success', title: 'Typed', content: `"${result.typed}" → ${result.field}` }
          });
        }
        break;

      case 'SCROLL':
        const dirMap = { up: '⬆️ up', down: '⬇️ down', 'to top': '⬆️ to the top', 'to bottom': '⬇️ to the bottom' };
        ChatRenderer.addAgentMessage(`${dirMap[data.direction] || '⬇️ Scrolled'} — scrolled ${data.direction}.`);
        break;

      case 'READ_PAGE':
        if (intent === 'summarizePage' && result.textContent) {
          // Use AI to summarize
          ChatRenderer.showTypingIndicator();
          updateStatus('Summarizing page...', 'thinking');
          AIBrain.summarizePage(result.textContent, result.url).then(summary => {
            ChatRenderer.addAgentMessage(`📝 **Summary of "${result.title}":**\n\n${summary}`);
            speakIfEnabled(summary);
          }).catch(() => {
            ChatRenderer.addAgentMessage('Failed to summarize the page.');
          });
        } else if (result.textContent) {
          const preview = result.textContent.substring(0, 500) + (result.textContent.length > 500 ? '...' : '');
          ChatRenderer.addAgentMessage(`📖 **Page content from "${result.title}":**\n\n${preview}`, {
            actionCard: {
              type: 'info',
              title: 'Page Info',
              content: `${result.headings?.length || 0} headings • ${result.links?.length || 0} links • ${result.textContent.length} characters`
            }
          });
        }
        break;

      case 'SCREENSHOT':
        if (result.dataUrl) {
          ChatRenderer.addAgentMessage('📸 Screenshot captured!', { screenshot: result.dataUrl });
        }
        break;

      case 'ZOOM_IN':
        ChatRenderer.addAgentMessage(`🔍 Zoomed in to **${result.zoom}%**`);
        break;

      case 'ZOOM_OUT':
        ChatRenderer.addAgentMessage(`🔍 Zoomed out to **${result.zoom}%**`);
        break;

      case 'ZOOM_RESET':
        ChatRenderer.addAgentMessage('🔍 Zoom reset to **100%**');
        break;

      case 'ZOOM_TO':
        ChatRenderer.addAgentMessage(`🔍 Zoom set to **${result.zoom}%**`);
        break;

      // ── Settings (unified) ──────────────────────────────
      case 'OPEN_SETTINGS_PAGE':
        ChatRenderer.addAgentMessage(`⚙️ Opened **${result.label || 'Settings'}**.`, {
          actionCard: { type: 'success', title: 'Settings', content: `Opened ${result.label}` }
        });
        speakIfEnabled(`Opened ${result.label}`);
        break;

      // ── Notes ───────────────────────────────────────────
      case 'SAVE_NOTE':
        ChatRenderer.addAgentMessage(`📝 Note saved: **"${result.text}"**`);
        speakIfEnabled('Note saved');
        break;

      case 'LIST_NOTES':
        if (result.notes && result.notes.length > 0) {
          const noteItems = result.notes.map(n => ({
            icon: '📝',
            title: `${n.index}. ${n.text}`,
            subtext: new Date(n.timestamp).toLocaleString()
          }));
          ChatRenderer.addAgentMessage(`📝 You have **${result.notes.length}** note(s):`, { listItems: noteItems });
        } else {
          ChatRenderer.addAgentMessage('📝 No notes saved yet. Say **"note: buy milk"** to save one.');
        }
        break;

      case 'DELETE_NOTE':
        ChatRenderer.addAgentMessage(`🗑️ Deleted note: **"${result.deleted}"**`);
        break;

      case 'CLEAR_NOTES':
        ChatRenderer.addAgentMessage(`🗑️ Cleared **${result.count}** note(s).`);
        break;

      // ── Timers ──────────────────────────────────────────
      case 'SET_TIMER':
        ChatRenderer.addAgentMessage(`⏰ Timer set: **${result.label}**`, {
          actionCard: { type: 'success', title: 'Timer Started', content: `${result.label} — I'll notify you when it's done!` }
        });
        speakIfEnabled(`Timer set for ${result.label}`);
        break;

      case 'LIST_TIMERS':
        if (result.timers && result.timers.length > 0) {
          const timerItems = result.timers.map(t => ({
            icon: '⏰',
            title: t.label,
            subtext: `${t.remainingSeconds}s left`
          }));
          ChatRenderer.addAgentMessage(`⏰ Active timers:`, { listItems: timerItems });
        } else {
          ChatRenderer.addAgentMessage('⏰ No active timers.');
        }
        break;

      case 'CANCEL_TIMER':
        ChatRenderer.addAgentMessage(`⏰ Cancelled **${result.cancelledCount}** timer(s).`);
        break;

      // ── Window Management ───────────────────────────────
      case 'NEW_WINDOW':
        ChatRenderer.addAgentMessage('🪟 Opened a **new window**.');
        break;

      case 'INCOGNITO_WINDOW':
        ChatRenderer.addAgentMessage('🕶️ Opened an **incognito window**.');
        break;

      case 'CLOSE_WINDOW':
        ChatRenderer.addAgentMessage('🪟 Window **closed**.');
        break;

      case 'LIST_WINDOWS':
        if (result.windows) {
          const winItems = result.windows.map(w => ({
            icon: w.incognito ? '🕶️' : '🪟',
            title: `Window ${w.index}${w.focused ? ' (active)' : ''}`,
            subtext: `${w.tabCount} tabs`
          }));
          ChatRenderer.addAgentMessage(`🪟 You have **${result.windows.length}** window(s):`, { listItems: winItems });
        }
        break;

      case 'FULLSCREEN':
        ChatRenderer.addAgentMessage('🖥️ Toggled **fullscreen** mode.');
        break;

      case 'MINIMIZE_WINDOW':
        ChatRenderer.addAgentMessage('🪟 Window **minimized**.');
        break;

      // ── Tab Management (extra) ──────────────────────────
      case 'TAB_COUNT':
        ChatRenderer.addAgentMessage(`📑 You have **${result.count}** tab(s) open.`);
        break;

      case 'CURRENT_TAB_INFO':
        ChatRenderer.addAgentMessage(`📑 **Current tab:**\n• Title: ${result.title}\n• URL: ${result.url}\n• Tab #${result.index}${result.pinned ? ' 📌' : ''}${result.muted ? ' 🔇' : ''}`);
        break;

      case 'MOVE_TAB':
        ChatRenderer.addAgentMessage(`📑 Tab moved to position **${result.newIndex}**.`);
        break;

      case 'SORT_TABS':
        ChatRenderer.addAgentMessage(`📑 Sorted **${result.count}** tabs alphabetically.`);
        break;

      case 'DISCARD_TAB':
        ChatRenderer.addAgentMessage(`💤 Tab **"${result.discardedTitle}"** suspended to save memory.`);
        break;

      case 'REOPEN_TAB':
        ChatRenderer.addAgentMessage(`♻️ Reopened: **${result.restoredTitle || 'closed tab'}**`);
        break;

      case 'GROUP_TABS':
        ChatRenderer.addAgentMessage(`📂 Grouped **${result.tabCount}** tabs as **"${result.label}"** (${result.color}).`);
        break;

      case 'UNGROUP_TABS':
        ChatRenderer.addAgentMessage('📂 All tabs **ungrouped**.');
        break;

      // ── Page Interaction Results ─────────────────────────
      case 'FIND_IN_PAGE':
        ChatRenderer.addAgentMessage(`🔎 Found **${result.count}** match(es) on this page.${result.highlighted ? ` Highlighted ${result.highlighted}.` : ''}`);
        break;

      case 'READING_MODE':
        ChatRenderer.addAgentMessage(result.active ? '📖 **Reading mode** activated.' : '📖 **Reading mode** deactivated.');
        break;

      case 'FORCE_DARK_MODE':
        ChatRenderer.addAgentMessage(result.active ? '🌙 **Dark mode** forced on this site.' : '🌙 **Dark mode** removed from this site.');
        break;

      case 'COPY_URL':
        ChatRenderer.addAgentMessage(`📋 Copied URL: **${result.copied}**`);
        break;

      case 'COPY_TITLE':
        ChatRenderer.addAgentMessage(`📋 Copied title: **${result.copied}**`);
        break;

      case 'COPY_PAGE_TEXT':
        ChatRenderer.addAgentMessage(`📋 Copied **${result.length}** characters of page text.`);
        break;

      case 'COPY_LINKS':
        ChatRenderer.addAgentMessage(`📋 Copied **${result.count}** link(s) to clipboard.`);
        break;

      case 'COPY_TO_CLIPBOARD':
        ChatRenderer.addAgentMessage(`📋 Copied content to clipboard.`);
        break;

      case 'PAGE_STATS':
        ChatRenderer.addAgentMessage(`📊 **Page Statistics:**`, { pageStats: result });
        break;

      case 'QR_CODE':
        ChatRenderer.addAgentMessage(`📱 QR code for this page:`, { qrCode: result.dataUrl });
        break;

      case 'PRINT_PAGE':
        ChatRenderer.addAgentMessage('🖨️ Print dialog opened.');
        break;

      case 'VIEW_SOURCE':
        ChatRenderer.addAgentMessage('💻 Viewing page **source code**.');
        break;

      case 'AUTO_SCROLL':
        ChatRenderer.addAgentMessage(data.action === 'start' ? '⬇️ Auto-scrolling started. Say **"stop scrolling"** to stop.' : '⏹️ Auto-scrolling stopped.');
        break;

      case 'SET_ALARM':
        ChatRenderer.addAgentMessage(`⏰ Alarm set for **${data.timeStr}**`, {
          actionCard: { type: 'success', title: 'Alarm Created', content: `Will notify you at ${data.timeStr}!` }
        });
        speakIfEnabled(`Alarm set for ${data.timeStr}`);
        break;

      // ── Bookmarks (extra) ───────────────────────────────
      case 'OPEN_ALL_BOOKMARKS':
        ChatRenderer.addAgentMessage(`⭐ Opened **${result.opened}** bookmark(s).`);
        break;

      case 'CLEAR_CACHE':
        ChatRenderer.addAgentMessage('🧹 Browser **cache cleared**.');
        break;

      case 'CLEAR_COOKIES':
        ChatRenderer.addAgentMessage('🍪 All **cookies cleared**.');
        break;

      case 'TOP_SITES':
        if (result.sites && result.sites.length > 0) {
          const items = result.sites.map((s, i) => ({
            icon: `${i + 1}.`,
            title: s.title || 'Untitled',
            url: s.url
          }));
          ChatRenderer.addAgentMessage('🏆 Your most visited sites:', { listItems: items });
        } else {
          ChatRenderer.addAgentMessage('No top sites data available.');
        }
        break;

      // ── Native Desktop UI Responses ──────────────────────────
      case 'NATIVE_OPEN_APP':
        ChatRenderer.addAgentMessage(`💻 Opening application: **${data.app}**...`, {
          actionCard: { type: 'success', title: 'Desktop Action', content: `Opened ${data.app}` }
        });
        speakIfEnabled(`Opening ${data.app}`);
        break;

      case 'NATIVE_INSTALL_APP':
        ChatRenderer.addAgentMessage(`📦 Installing application: **${data.app}**...`, {
          actionCard: { type: 'info', title: 'Package Manager', content: `Starting winget install for ${data.app}...` }
        });
        speakIfEnabled(`Installing ${data.app}`);
        break;

      case 'NATIVE_SYSTEM_POWER':
        ChatRenderer.addAgentMessage(`⚡ Executing system power command: **${data.mode}**`, {
          actionCard: { type: 'warning', title: 'System Power', content: `Executing ${data.mode}...` }
        });
        speakIfEnabled(`Executing system power command: ${data.mode}`);
        break;

      case 'NATIVE_OPEN_FOLDER':
        ChatRenderer.addAgentMessage(`📁 Opening folder: **${data.folder}**...`);
        speakIfEnabled(`Opening ${data.folder} folder`);
        break;

      case 'NATIVE_RUN_COMMAND':
        ChatRenderer.addAgentMessage(`⌨️ Running command: \`${data.command}\`...`);
        break;

      default:
        if (result.success) {
          ChatRenderer.addAgentMessage('✅ Done!');
        }
    }
  }

  // ── Theme ─────────────────────────────────────────────────
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jarvis-theme', theme);

    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    if (darkIcon && lightIcon) {
      darkIcon.style.display = theme === 'dark' ? '' : 'none';
      lightIcon.style.display = theme === 'light' ? '' : 'none';
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem('jarvis-theme') || 'dark';
    setTheme(saved);
  }

  // ── Settings ──────────────────────────────────────────────
  function loadSettings() {
    try {
      const saved = localStorage.getItem('jarvis-settings');
      if (saved) {
        Object.assign(settings, JSON.parse(saved));
      }
    } catch (e) {}

    // Apply to UI
    const voiceResponseEl = document.getElementById('setting-voice-response');
    const continuousListenEl = document.getElementById('setting-continuous-listen');
    const confirmDestructiveEl = document.getElementById('setting-confirm-destructive');
    const soundsEl = document.getElementById('setting-sounds');

    if (voiceResponseEl) voiceResponseEl.checked = settings.voiceResponse;
    if (continuousListenEl) continuousListenEl.checked = settings.continuousListen;
    if (confirmDestructiveEl) confirmDestructiveEl.checked = settings.confirmDestructive;
    if (soundsEl) soundsEl.checked = settings.sounds;
  }

  function saveSettings() {
    localStorage.setItem('jarvis-settings', JSON.stringify(settings));
  }

  // ── Utilities ─────────────────────────────────────────────
  function updateStatus(text, state) {
    if (statusText) {
      const dotColors = {
        ready: 'var(--accent-green)',
        listening: 'var(--accent-red)',
        thinking: 'var(--accent-orange)'
      };
      statusText.innerHTML = `<span class="status-dot" style="background:${dotColors[state] || dotColors.ready}; box-shadow: 0 0 8px ${dotColors[state] || dotColors.ready}"></span>&nbsp;${text}`;
    }
  }

  function speakIfEnabled(text) {
    if (settings.voiceResponse && text) {
      // Strip markdown
      const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      VoiceEngine.speak(clean);
    }
  }

  function autoResizeInput() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
  }

  // ── Boot ──────────────────────────────────────────────────
  init();

})();
