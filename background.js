// ============================================================
// Jarvis AI — Background Service Worker
// Central message router and browser action executor
// 40+ action handlers for FULL browser automation
// ============================================================

// ── State ──────────────────────────────────────────────────
let activeTimers = {};   // { timerId: { label, endTime, alarmName } }
let notes = [];          // { text, timestamp }
let offscreenCreated = false;

// Load persisted state from storage (survives service worker sleep)
chrome.storage.local.get(['jarvis_notes', 'jarvis_timers'], (result) => {
  notes = result.jarvis_notes || [];
  
  // Restore timers — prune any that have already expired
  const savedTimers = result.jarvis_timers || {};
  const now = Date.now();
  for (const [id, timer] of Object.entries(savedTimers)) {
    if (timer.endTime > now) {
      activeTimers[id] = timer;
    }
  }
});

// ── On Install: Open welcome page & set up side panel ──────
chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.error('[Jarvis] setPanelBehavior error:', err));

  // Show welcome page on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// ── Offscreen Document for Always-Listening Voice ──────────
async function setupOffscreenVoice() {
  if (offscreenCreated) return;

  // Check if user enabled always-listen
  const stored = await chrome.storage.local.get('jarvis_always_listen');
  if (!stored.jarvis_always_listen) return;

  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Voice recognition for browser commands'
      });
      offscreenCreated = true;
      console.log('[Jarvis] Offscreen voice listener created');
    } else {
      offscreenCreated = true;
    }
  } catch (err) {
    console.warn('[Jarvis] Offscreen setup failed:', err.message);
  }
}

// Try to set up offscreen voice on startup
setupOffscreenVoice();

// ── Handle offscreen voice commands ────────────────────────
// This processes voice commands received from the offscreen document
// and executes them directly without needing the side panel
async function handleOffscreenVoiceCommand(transcript) {
  console.log('[Jarvis] Background processing voice command:', transcript);

  // Import command patterns for matching
  // Since we can't import modules in service worker, we do basic matching here
  // The real processing happens in sidepanel, but we handle common commands directly

  const lower = transcript.toLowerCase().trim();

  // Basic site shortcuts for background processing
  const sites = {
    'youtube': 'https://www.youtube.com', 'google': 'https://www.google.com',
    'gmail': 'https://mail.google.com', 'github': 'https://github.com',
    'twitter': 'https://twitter.com', 'facebook': 'https://www.facebook.com',
    'instagram': 'https://www.instagram.com', 'reddit': 'https://www.reddit.com',
    'linkedin': 'https://www.linkedin.com', 'whatsapp': 'https://web.whatsapp.com',
    'amazon': 'https://www.amazon.in', 'flipkart': 'https://www.flipkart.com',
    'netflix': 'https://www.netflix.com', 'spotify': 'https://open.spotify.com'
  };

  // Navigation: "open X"
  const openMatch = lower.match(/^(?:open|go\s*to|visit|launch)\s+(.+)/);
  if (openMatch) {
    const target = openMatch[1].trim().replace(/^the\s+/, '');
    const url = sites[target] || (target.includes('.') ? 'https://' + target : null);
    if (url) {
      await navigateTo(url);
      showNotification('Jarvis', `Opening ${target}...`);
      return;
    }
    // Search instead
    await searchGoogle(target);
    showNotification('Jarvis', `Searching for "${target}"...`);
    return;
  }

  // Search: "search for X"
  const searchMatch = lower.match(/^(?:search|google|find|look\s*up)\s+(?:for\s+)?(.+)/);
  if (searchMatch) {
    await searchGoogle(searchMatch[1].trim());
    showNotification('Jarvis', `Searching for "${searchMatch[1].trim()}"...`);
    return;
  }

  // Tab actions
  if (/^new\s+tab$/.test(lower)) {
    await chrome.tabs.create({ active: true });
    showNotification('Jarvis', 'New tab opened');
    return;
  }
  if (/^close\s+(?:this\s+)?tab$/.test(lower)) {
    await closeCurrentTab();
    return;
  }
  if (/^(?:next|switch\s+to\s+next)\s+tab$/.test(lower)) {
    await switchTab(1);
    return;
  }
  if (/^(?:prev(?:ious)?|switch\s+to\s+prev(?:ious)?)\s+tab$/.test(lower)) {
    await switchTab(-1);
    return;
  }
  if (/^(?:reload|refresh)/.test(lower)) {
    await reloadTab();
    showNotification('Jarvis', 'Page reloaded');
    return;
  }
  if (/^go\s*back$/.test(lower)) {
    await executeOnActiveTab('history.back()');
    return;
  }
  if (/^(?:bookmark|save)\s+(?:this\s+)?(?:page)?$/.test(lower)) {
    await bookmarkCurrentPage();
    showNotification('Jarvis', 'Page bookmarked!');
    return;
  }
  if (/^screenshot$/.test(lower)) {
    await takeScreenshot();
    showNotification('Jarvis', 'Screenshot captured!');
    return;
  }
  if (/^(?:new\s+)?(?:incognito)/.test(lower)) {
    await chrome.windows.create({ incognito: true });
    return;
  }
  if (/^scroll\s+(down|up)$/.test(lower)) {
    const dir = lower.includes('up') ? 'up' : 'down';
    await executeContentAction('SCROLL', { direction: dir });
    return;
  }

  // If nothing matched, show notification that command wasn't understood
  showNotification('Jarvis', `I heard: "${transcript}". Open the side panel for full features.`);
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: 1
  }).catch(() => {});
}

// ── Alarm handler (for timers) ─────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('jarvis_timer_')) {
    const timerId = alarm.name;
    const timer = activeTimers[timerId];
    const label = timer?.label || 'Timer';

    chrome.notifications.create(timerId, {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: '⏰ Jarvis Timer',
      message: `${label} is done!`,
      priority: 2
    });

    chrome.runtime.sendMessage({
      action: 'TIMER_DONE',
      data: { label, timerId }
    }).catch(() => {});

    delete activeTimers[timerId];
    chrome.storage.local.set({ jarvis_timers: activeTimers });
  }
});

// ── Message Router ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, data } = message;

  switch (action) {
    // ── Offscreen Listening ───────────────────────────────
    case 'ENABLE_ALWAYS_LISTEN':
      setupOffscreenVoice();
      sendResponse({ success: true });
      return false;

    case 'START_OFFSCREEN_LISTENING':
    case 'STOP_OFFSCREEN_LISTENING':
      // Forward to offscreen document
      chrome.runtime.sendMessage({ action }).catch(() => {});
      sendResponse({ success: true });
      return false;

    case 'OFFSCREEN_VOICE_COMMAND':
      handleOffscreenVoiceCommand(data.transcript);
      sendResponse({ success: true });
      return false;

    case 'OPEN_SIDE_PANEL':
      chrome.sidePanel.open({ windowId: sender.tab?.windowId }).catch(() => {});
      sendResponse({ success: true });
      return false;

    // ── Navigation ────────────────────────────────────────
    case 'NAVIGATE':
      navigateTo(data.url, data.newTab)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SEARCH':
      searchGoogle(data.query)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'GO_BACK':
      executeOnActiveTab('history.back()')
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'GO_FORWARD':
      executeOnActiveTab('history.forward()')
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'RELOAD':
      reloadTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'OPEN_MULTIPLE':
      openMultipleUrls(data.urls)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'OPEN_WORKSPACE':
      openMultipleUrls(data.urls)
        .then(res => sendResponse({ ...res, workspace: data.workspace }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Tab Management ────────────────────────────────────
    case 'NEW_TAB':
      chrome.tabs.create({ active: true })
        .then(tab => sendResponse({ success: true, tabId: tab.id }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_TAB':
      closeCurrentTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_OTHER_TABS':
      closeOtherTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_ALL_TABS':
      closeAllTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_TABS_BY_DOMAIN':
      closeTabsByDomain(data.domain)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_LAST_N_TABS':
      closeLastNTabs(data.count)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_FIRST_TAB':
      closeFirstTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_DUPLICATES':
      closeDuplicateTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'NEXT_TAB':
      switchTab(1)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'PREV_TAB':
      switchTab(-1)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SWITCH_TO_TAB':
      switchToTabByIndex(data.index)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'DUPLICATE_TAB':
      duplicateTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'PIN_TAB':
      pinTab(true)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'UNPIN_TAB':
      pinTab(false)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'MUTE_TAB':
      muteTab(true)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'UNMUTE_TAB':
      muteTab(false)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'LIST_TABS':
      listAllTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'TAB_COUNT':
      chrome.tabs.query({ currentWindow: true })
        .then(tabs => sendResponse({ success: true, count: tabs.length }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CURRENT_TAB_INFO':
      getActiveTab()
        .then(tab => sendResponse({
          success: true,
          title: tab.title,
          url: tab.url,
          pinned: tab.pinned,
          muted: tab.mutedInfo?.muted || false,
          index: tab.index + 1
        }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'MOVE_TAB':
      moveTab(data.direction)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SORT_TABS':
      sortTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'DISCARD_TAB':
      discardTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'REOPEN_TAB':
      reopenClosedTab()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Tab Groups ────────────────────────────────────────
    case 'GROUP_TABS':
      groupTabs(data.label)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'UNGROUP_TABS':
      ungroupTabs()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Window Management ─────────────────────────────────
    case 'NEW_WINDOW':
      chrome.windows.create({})
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'INCOGNITO_WINDOW':
      chrome.windows.create({ incognito: true })
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLOSE_WINDOW':
      chrome.windows.getCurrent()
        .then(win => chrome.windows.remove(win.id))
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'LIST_WINDOWS':
      chrome.windows.getAll({ populate: true })
        .then(windows => sendResponse({
          success: true,
          windows: windows.map((w, i) => ({
            index: i + 1,
            id: w.id,
            tabCount: w.tabs?.length || 0,
            focused: w.focused,
            incognito: w.incognito,
            type: w.type
          }))
        }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'FULLSCREEN':
      chrome.windows.getCurrent()
        .then(win => chrome.windows.update(win.id, {
          state: win.state === 'fullscreen' ? 'maximized' : 'fullscreen'
        }))
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'MINIMIZE_WINDOW':
      chrome.windows.getCurrent()
        .then(win => chrome.windows.update(win.id, { state: 'minimized' }))
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Bookmarks ─────────────────────────────────────────
    case 'BOOKMARK_PAGE':
      bookmarkCurrentPage()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'LIST_BOOKMARKS':
      listBookmarks()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SEARCH_BOOKMARKS':
      searchBookmarks(data.query)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'REMOVE_BOOKMARK':
      removeCurrentBookmark()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'OPEN_ALL_BOOKMARKS':
      openAllBookmarks()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── History ────────────────────────────────────────────
    case 'SHOW_HISTORY':
      showHistory()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SEARCH_HISTORY':
      searchHistory(data.query)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLEAR_HISTORY':
      clearHistory()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLEAR_BROWSING_DATA':
      clearBrowsingData()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLEAR_CACHE':
      chrome.browsingData.remove({ since: 0 }, { cache: true })
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'CLEAR_COOKIES':
      chrome.browsingData.remove({ since: 0 }, { cookies: true })
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Downloads ──────────────────────────────────────────
    case 'SHOW_DOWNLOADS':
      showDownloads()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Page Interaction (via content script) ──────────────
    case 'CLICK_ELEMENT':
    case 'TYPE_TEXT':
    case 'SCROLL':
    case 'SCROLL_TO_ELEMENT':
    case 'AUTO_SCROLL':
    case 'AUTO_SCROLL_SPEED':
    case 'READ_PAGE':
    case 'FIND_IN_PAGE':
    case 'READING_MODE':
    case 'FORCE_DARK_MODE':
    case 'COPY_URL':
    case 'COPY_TITLE':
    case 'COPY_PAGE_TEXT':
    case 'COPY_LINKS':
    case 'COPY_TO_CLIPBOARD':
    case 'PAGE_STATS':
    case 'QR_CODE':
    case 'PRINT_PAGE':
      executeContentAction(action.replace(/_/g, '_'), data)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Screenshot ─────────────────────────────────────────
    case 'SCREENSHOT':
      takeScreenshot()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Zoom ───────────────────────────────────────────────
    case 'ZOOM_IN':
      changeZoom(0.1)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'ZOOM_OUT':
      changeZoom(-0.1)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'ZOOM_RESET':
      resetZoom()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'ZOOM_TO':
      setZoom(data.level / 100)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Native Desktop Operations ──────────────────────────
    case 'NATIVE_OPEN_APP':
      sendNativeCommand({ action: 'OPEN_APP', data: { app: data.app } })
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'NATIVE_INSTALL_APP':
      sendNativeCommand({ action: 'INSTALL_APP', data: { app: data.app } })
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'NATIVE_SYSTEM_POWER':
      sendNativeCommand({ action: 'SYSTEM_POWER', data: { mode: data.mode } })
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'NATIVE_OPEN_FOLDER':
      sendNativeCommand({ action: 'OPEN_FOLDER', data: { folder: data.folder } })
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'NATIVE_RUN_COMMAND':
      sendNativeCommand({ action: 'RUN_COMMAND', data: { command: data.command } })
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Chrome Pages & Settings (unified handler) ──────────
    case 'OPEN_SETTINGS_PAGE':
      chrome.tabs.create({ url: data.page })
        .then(() => sendResponse({ success: true, page: data.page, label: data.label }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'VIEW_SOURCE':
      getActiveTab()
        .then(tab => chrome.tabs.create({ url: 'view-source:' + tab.url }))
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Top Sites ──────────────────────────────────────────
    case 'TOP_SITES':
      chrome.topSites.get()
        .then(sites => sendResponse({
          success: true,
          sites: sites.slice(0, 10).map(s => ({ title: s.title, url: s.url }))
        }))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    // ── Notes ──────────────────────────────────────────────
    case 'SAVE_NOTE':
      notes.push({ text: data.text, timestamp: Date.now() });
      chrome.storage.local.set({ jarvis_notes: notes });
      sendResponse({ success: true, noteIndex: notes.length, text: data.text });
      return false;

    case 'LIST_NOTES':
      sendResponse({ success: true, notes: notes.map((n, i) => ({ index: i + 1, text: n.text, timestamp: n.timestamp })) });
      return false;

    case 'DELETE_NOTE':
      if (data.index >= 0 && data.index < notes.length) {
        const removed = notes.splice(data.index, 1)[0];
        chrome.storage.local.set({ jarvis_notes: notes });
        sendResponse({ success: true, deleted: removed.text });
      } else {
        sendResponse({ error: 'Invalid note index' });
      }
      return false;

    case 'CLEAR_NOTES':
      const count = notes.length;
      notes = [];
      chrome.storage.local.set({ jarvis_notes: notes });
      sendResponse({ success: true, count });
      return false;

    // ── Timers ─────────────────────────────────────────────
    case 'SET_TIMER':
      setTimer(data.seconds, data.label)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'SET_ALARM':
      // Basic implementation for alarm - converting to a 60 second timer for demo purposes if not parseable
      // In a real app, we'd parse data.timeStr to an actual timestamp and find the diff
      setTimer(60, `Alarm: ${data.timeStr}`)
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'LIST_TIMERS':
      sendResponse({
        success: true,
        timers: Object.entries(activeTimers).map(([id, t]) => ({
          id,
          label: t.label,
          remainingSeconds: Math.max(0, Math.round((t.endTime - Date.now()) / 1000))
        }))
      });
      return false;

    case 'CANCEL_TIMER':
      cancelAllTimers()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    default:
      sendResponse({ error: `Unknown action: ${action}` });
      return false;
  }
});


// ══════════════════════════════════════════════════════════════
// Action Executor Functions
// ══════════════════════════════════════════════════════════════

// ── Helper: get active tab ──────────────────────────────────
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found');
  return tab;
}

// ── Navigation ──────────────────────────────────────────────
async function navigateTo(url, newTab = false) {
  if (newTab) {
    await chrome.tabs.create({ url, active: true });
  } else {
    const tab = await getActiveTab();
    await chrome.tabs.update(tab.id, { url });
  }
  return { success: true, url };
}

async function searchGoogle(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { url });
  return { success: true, query, url };
}

async function reloadTab() {
  const tab = await getActiveTab();
  await chrome.tabs.reload(tab.id);
  return { success: true };
}

async function openMultipleUrls(urls) {
  const opened = [];
  for (const url of urls) {
    const tab = await chrome.tabs.create({ url, active: false });
    opened.push({ url, tabId: tab.id });
  }
  // Activate the first one
  if (opened.length > 0) {
    await chrome.tabs.update(opened[0].tabId, { active: true });
  }
  return { success: true, opened: opened.length, urls };
}

// ── Tab Management ──────────────────────────────────────────
async function closeCurrentTab() {
  const tab = await getActiveTab();
  await chrome.tabs.remove(tab.id);
  return { success: true, closedTitle: tab.title };
}

async function closeOtherTabs() {
  const tab = await getActiveTab();
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const toClose = allTabs.filter(t => t.id !== tab.id).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  return { success: true, closedCount: toClose.length };
}

async function closeAllTabs() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  await chrome.tabs.create({ active: true });
  const toClose = allTabs.map(t => t.id);
  await chrome.tabs.remove(toClose);
  return { success: true, closedCount: toClose.length };
}

async function closeTabsByDomain(domain) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const domainLower = domain.toLowerCase();
  const toClose = allTabs.filter(t => {
    try {
      const hostname = new URL(t.url).hostname.toLowerCase();
      return hostname.includes(domainLower);
    } catch { return false; }
  });
  if (toClose.length > 0) {
    await chrome.tabs.remove(toClose.map(t => t.id));
  }
  return { success: true, closedCount: toClose.length, domain };
}

async function closeLastNTabs(count) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const toClose = allTabs.slice(-count);
  if (toClose.length > 0) {
    await chrome.tabs.remove(toClose.map(t => t.id));
  }
  return { success: true, closedCount: toClose.length };
}

async function closeFirstTab() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  if (allTabs.length > 1) {
    await chrome.tabs.remove(allTabs[0].id);
    return { success: true, closedTitle: allTabs[0].title };
  }
  return { error: 'Only one tab remaining' };
}

async function closeDuplicateTabs() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const seen = new Set();
  const duplicates = [];
  for (const tab of allTabs) {
    const key = tab.url;
    if (seen.has(key)) {
      duplicates.push(tab.id);
    } else {
      seen.add(key);
    }
  }
  if (duplicates.length > 0) {
    await chrome.tabs.remove(duplicates);
  }
  return { success: true, closedCount: duplicates.length };
}

async function switchTab(direction) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const activeTab = allTabs.find(t => t.active);
  if (!activeTab) throw new Error('No active tab');
  const currentIndex = allTabs.indexOf(activeTab);
  let newIndex = (currentIndex + direction + allTabs.length) % allTabs.length;
  await chrome.tabs.update(allTabs[newIndex].id, { active: true });
  return { success: true, switchedTo: allTabs[newIndex].title };
}

async function switchToTabByIndex(index) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const targetIndex = Math.max(0, Math.min(index - 1, allTabs.length - 1));
  await chrome.tabs.update(allTabs[targetIndex].id, { active: true });
  return { success: true, switchedTo: allTabs[targetIndex].title };
}

async function duplicateTab() {
  const tab = await getActiveTab();
  await chrome.tabs.duplicate(tab.id);
  return { success: true, duplicatedTitle: tab.title };
}

async function pinTab(pinned) {
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { pinned });
  return { success: true, pinned };
}

async function muteTab(muted) {
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { muted });
  return { success: true, muted };
}

async function listAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return {
    success: true,
    tabs: tabs.map((t, i) => ({
      index: i + 1,
      title: t.title || 'Untitled',
      url: t.url,
      active: t.active,
      pinned: t.pinned,
      muted: t.mutedInfo?.muted || false
    }))
  };
}

async function moveTab(direction) {
  const tab = await getActiveTab();
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  let newIndex;
  if (direction.includes('left') || direction.includes('start') || direction.includes('beginning')) {
    newIndex = Math.max(0, tab.index - 1);
  } else if (direction.includes('right') || direction.includes('end')) {
    newIndex = Math.min(allTabs.length - 1, tab.index + 1);
  } else {
    newIndex = tab.index;
  }
  await chrome.tabs.move(tab.id, { index: newIndex });
  return { success: true, newIndex: newIndex + 1 };
}

async function sortTabs() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const sorted = [...allTabs].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  for (let i = 0; i < sorted.length; i++) {
    await chrome.tabs.move(sorted[i].id, { index: i });
  }
  return { success: true, count: sorted.length };
}

async function discardTab() {
  const tab = await getActiveTab();
  // Switch to another tab first
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const otherTab = allTabs.find(t => t.id !== tab.id);
  if (otherTab) {
    await chrome.tabs.update(otherTab.id, { active: true });
    await chrome.tabs.discard(tab.id);
    return { success: true, discardedTitle: tab.title };
  }
  return { error: 'Cannot discard the only tab' };
}

async function reopenClosedTab() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
  if (sessions.length > 0 && sessions[0].tab) {
    await chrome.sessions.restore(sessions[0].tab.sessionId);
    return { success: true, restoredTitle: sessions[0].tab.title };
  }
  return { error: 'No recently closed tabs to restore' };
}

// ── Tab Groups ──────────────────────────────────────────────
async function groupTabs(label) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const tabIds = allTabs.map(t => t.id);
  const groupId = await chrome.tabs.group({ tabIds });
  const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  await chrome.tabGroups.update(groupId, { title: label, color });
  return { success: true, label, color, tabCount: tabIds.length };
}

async function ungroupTabs() {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of allTabs) {
    if (tab.groupId !== -1) {
      await chrome.tabs.ungroup(tab.id);
    }
  }
  return { success: true };
}

// ── Bookmarks ───────────────────────────────────────────────
async function bookmarkCurrentPage() {
  const tab = await getActiveTab();
  const bookmark = await chrome.bookmarks.create({ title: tab.title, url: tab.url });
  return { success: true, title: tab.title, id: bookmark.id };
}

async function listBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = [];
  function flatten(nodes) {
    for (const node of nodes) {
      if (node.url) bookmarks.push({ id: node.id, title: node.title, url: node.url });
      if (node.children) flatten(node.children);
    }
  }
  flatten(tree);
  return { success: true, bookmarks: bookmarks.slice(-20).reverse() };
}

async function searchBookmarks(query) {
  const results = await chrome.bookmarks.search(query);
  return {
    success: true,
    bookmarks: results.slice(0, 15).map(b => ({ id: b.id, title: b.title, url: b.url }))
  };
}

async function removeCurrentBookmark() {
  const tab = await getActiveTab();
  const results = await chrome.bookmarks.search({ url: tab.url });
  if (results.length > 0) {
    await chrome.bookmarks.remove(results[0].id);
    return { success: true, title: results[0].title };
  }
  return { error: 'This page is not bookmarked' };
}

async function openAllBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = [];
  function flatten(nodes) {
    for (const node of nodes) {
      if (node.url) bookmarks.push(node.url);
      if (node.children) flatten(node.children);
    }
  }
  flatten(tree);
  const toOpen = bookmarks.slice(0, 20); // Limit to 20
  for (const url of toOpen) {
    await chrome.tabs.create({ url, active: false });
  }
  return { success: true, opened: toOpen.length };
}

// ── History ─────────────────────────────────────────────────
async function showHistory() {
  const items = await chrome.history.search({
    text: '', maxResults: 20,
    startTime: Date.now() - (7 * 24 * 60 * 60 * 1000)
  });
  return {
    success: true,
    history: items.map(h => ({ title: h.title || 'Untitled', url: h.url, lastVisit: h.lastVisitTime }))
  };
}

async function searchHistory(query) {
  const items = await chrome.history.search({ text: query, maxResults: 15 });
  return {
    success: true,
    history: items.map(h => ({ title: h.title || 'Untitled', url: h.url, lastVisit: h.lastVisitTime }))
  };
}

async function clearHistory() {
  await chrome.history.deleteAll();
  return { success: true };
}

async function clearBrowsingData() {
  await chrome.browsingData.remove({ since: 0 }, { cache: true, cookies: true, history: true });
  return { success: true };
}

// ── Downloads ───────────────────────────────────────────────
async function showDownloads() {
  const items = await chrome.downloads.search({ limit: 15, orderBy: ['-startTime'] });
  return {
    success: true,
    downloads: items.map(d => ({
      filename: d.filename?.split(/[\\/]/).pop() || 'Unknown',
      url: d.url, state: d.state,
      fileSize: d.fileSize, startTime: d.startTime
    }))
  };
}

// ── Screenshot ──────────────────────────────────────────────
async function takeScreenshot() {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 90 });
  return { success: true, dataUrl };
}

// ── Zoom ────────────────────────────────────────────────────
async function changeZoom(delta) {
  const tab = await getActiveTab();
  const currentZoom = await chrome.tabs.getZoom(tab.id);
  const newZoom = Math.max(0.25, Math.min(5, currentZoom + delta));
  await chrome.tabs.setZoom(tab.id, newZoom);
  return { success: true, zoom: Math.round(newZoom * 100) };
}

async function resetZoom() {
  const tab = await getActiveTab();
  await chrome.tabs.setZoom(tab.id, 1);
  return { success: true, zoom: 100 };
}

async function setZoom(level) {
  const tab = await getActiveTab();
  const clamped = Math.max(0.25, Math.min(5, level));
  await chrome.tabs.setZoom(tab.id, clamped);
  return { success: true, zoom: Math.round(clamped * 100) };
}

// ── Timers ──────────────────────────────────────────────────
async function setTimer(seconds, label) {
  const alarmName = `jarvis_timer_${Date.now()}`;
  const endTime = Date.now() + seconds * 1000;

  activeTimers[alarmName] = { label, endTime };
  
  // Persist to storage so timers survive service worker sleep
  chrome.storage.local.set({ jarvis_timers: activeTimers });

  await chrome.alarms.create(alarmName, {
    delayInMinutes: seconds / 60
  });

  return { success: true, label, seconds, alarmName };
}

async function cancelAllTimers() {
  const names = Object.keys(activeTimers);
  for (const name of names) {
    await chrome.alarms.clear(name);
  }
  const count = names.length;
  activeTimers = {};
  chrome.storage.local.set({ jarvis_timers: activeTimers });
  return { success: true, cancelledCount: count };
}

// ── Restricted Page Check (friendly errors) ─────────────────
function checkRestrictedPage(tab) {
  const url = tab.url || '';
  if (url.startsWith('chrome://')) {
    throw new Error('🚫 This is a Chrome internal page — I can\'t interact with it for security reasons. Try this on a normal website!');
  }
  if (url.startsWith('chrome-extension://')) {
    throw new Error('🚫 This is an extension page — browser security prevents me from interacting here.');
  }
  if (url.includes('chromewebstore.google.com')) {
    throw new Error('🚫 The Chrome Web Store blocks extensions from modifying it. Please try on a different site!');
  }
  if (url.startsWith('about:') || url.startsWith('edge://') || url.startsWith('brave://')) {
    throw new Error('🚫 This is a browser internal page. I can only work on regular websites.');
  }
  if (!url || url === 'chrome://newtab/') {
    throw new Error('🚫 This is an empty tab. Please navigate to a website first!');
  }
}

// ── Execute script on active tab ────────────────────────────
async function executeOnActiveTab(code) {
  const tab = await getActiveTab();
  checkRestrictedPage(tab);
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: new Function(code)
  });
  return { success: true };
}

// ── Execute content script action ───────────────────────────
async function executeContentAction(type, data) {
  const tab = await getActiveTab();
  checkRestrictedPage(tab);

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'JARVIS_ACTION',
      type,
      data
    });
    return response;
  } catch (err) {
    // Content script might not be injected yet
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'JARVIS_ACTION',
      type,
      data
    });
    return response;
  }
}

// ── Native Messaging (with timeout & auto-recovery) ─────────
const NATIVE_HOST_TIMEOUT_MS = 15000; // 15 seconds

function sendNativeCommand(message) {
  return new Promise((resolve, reject) => {
    // Timeout guard — if the host hangs, don't freeze the extension
    const timeoutId = setTimeout(() => {
      reject(new Error('⏱️ The Desktop Host took too long to respond. It may have crashed. Please check that Node.js is running and try again.'));
    }, NATIVE_HOST_TIMEOUT_MS);

    try {
      chrome.runtime.sendNativeMessage('com.jarvis.desktop', message, (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          console.error('[Jarvis] Native messaging error:', errMsg);

          // Provide specific, actionable error messages
          if (errMsg.includes('not found') || errMsg.includes('Specified native messaging host not found')) {
            reject(new Error('💻 Desktop Host not installed. Open the "native-host" folder and double-click "install.bat" to set it up.'));
          } else if (errMsg.includes('host has exited') || errMsg.includes('Native host has exited')) {
            reject(new Error('💻 Desktop Host crashed. Make sure Node.js is installed on your computer, then try again.'));
          } else {
            reject(new Error(`💻 Desktop connection error: ${errMsg}`));
          }
          return;
        }
        
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response || { success: true });
        }
      });
    } catch (err) {
      clearTimeout(timeoutId);
      reject(new Error('💻 Could not connect to the Desktop Host. Is Chrome up to date?'));
    }
  });
}
