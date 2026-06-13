// ============================================================
// Jarvis AI — Command Patterns (Local Intent Matching)
// 150+ regex patterns for FULLY OFFLINE command processing
// Integrates with LearningEngine for adaptive matching
// ============================================================

const CommandPatterns = (() => {
  'use strict';

  // ── Synonym maps for flexible matching ───────────────────
  const verbSynonyms = {
    open: ['open', 'go to', 'goto', 'navigate to', 'visit', 'launch', 'load', 'head to', 'take me to', 'show me', 'bring up'],
    close: ['close', 'shut', 'kill', 'end', 'remove', 'exit', 'dismiss', 'get rid of'],
    search: ['search', 'google', 'look up', 'lookup', 'find', 'search for', 'query'],
    show: ['show', 'list', 'get', 'view', 'display', 'see', 'check', 'give me', 'what are'],
    clear: ['clear', 'delete', 'remove', 'wipe', 'erase', 'clean'],
    copy: ['copy', 'clipboard', 'grab', 'get']
  };

  // Each pattern: { regex, intent, extract(match) }
  const patterns = [

    // ══════════════════════════════════════════════════════
    // ── NAVIGATION ────────────────────────────────────────
    // ══════════════════════════════════════════════════════

    // Open/navigate to site
    {
      regex: /^(?:open|go\s*to|goto|navigate\s*to|visit|launch|load|head\s*to|take\s*me\s*to|show\s*me|bring\s*up)\s+(.+?)(?:\s+(?:in\s+(?:a\s+)?new\s+tab))?$/i,
      intent: 'navigate',
      extract: (m) => {
        let target = m[1].trim().replace(/^(the\s+)?/i, '');
        const inNewTab = /in\s+(?:a\s+)?new\s+tab/i.test(m[0]);
        return { target, newTab: inNewTab };
      }
    },
    // Open multiple sites: "open youtube and gmail"
    {
      regex: /^(?:open|launch|visit)\s+(.+?)(?:\s+and\s+|\s*,\s*)(.+?)(?:(?:\s+and\s+|\s*,\s*)(.+?))?(?:(?:\s+and\s+|\s*,\s*)(.+?))?$/i,
      intent: 'openMultiple',
      extract: (m) => {
        const sites = [m[1], m[2], m[3], m[4]].filter(Boolean).map(s => s.trim());
        return { sites };
      }
    },
    // Search
    {
      regex: /^(?:search|google|look\s*up|lookup|find|query)\s+(?:for\s+)?(.+)/i,
      intent: 'search',
      extract: (m) => ({ query: m[1].trim() })
    },
    // Go back
    {
      regex: /^(?:go\s*back|back|previous\s+page|go\s+to\s+previous|navigate\s+back)$/i,
      intent: 'goBack',
      extract: () => ({})
    },
    // Go forward
    {
      regex: /^(?:go\s*forward|forward|next\s+page|go\s+to\s+next|navigate\s+forward)$/i,
      intent: 'goForward',
      extract: () => ({})
    },
    // Reload
    {
      regex: /^(?:refresh|reload|re-load|hard\s+refresh)(?:\s+(?:this\s+)?(?:page|tab|site))?$/i,
      intent: 'reload',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── TAB MANAGEMENT ────────────────────────────────────
    // ══════════════════════════════════════════════════════

    // New tab
    {
      regex: /^(?:new|open\s+(?:a\s+)?new|create\s+(?:a\s+)?(?:new\s+)?)\s*tab$/i,
      intent: 'newTab',
      extract: () => ({})
    },
    // Close tab
    {
      regex: /^(?:close|shut|kill|end|exit)\s+(?:this\s+|current\s+)?tab$/i,
      intent: 'closeTab',
      extract: () => ({})
    },
    // Close other tabs
    {
      regex: /^close\s+(?:all\s+)?(?:the\s+)?other\s+tabs$/i,
      intent: 'closeOtherTabs',
      extract: () => ({})
    },
    // Close all tabs
    {
      regex: /^close\s+all\s+(?:the\s+)?tabs$/i,
      intent: 'closeAllTabs',
      extract: () => ({})
    },
    // Close tabs by domain: "close all youtube tabs"
    {
      regex: /^close\s+(?:all\s+)?(\w[\w.-]+)\s+tabs?$/i,
      intent: 'closeTabsByDomain',
      extract: (m) => ({ domain: m[1].trim().toLowerCase() })
    },
    // Close last N tabs: "close last 3 tabs"
    {
      regex: /^close\s+(?:the\s+)?(?:last|previous)\s+(\d+)\s+tabs?$/i,
      intent: 'closeLastNTabs',
      extract: (m) => ({ count: parseInt(m[1]) })
    },
    // Close first tab
    {
      regex: /^close\s+(?:the\s+)?first\s+tab$/i,
      intent: 'closeFirstTab',
      extract: () => ({})
    },
    // Close duplicate tabs
    {
      regex: /^(?:close|remove|delete)\s+(?:all\s+)?duplicat(?:e|ed)\s*(?:tabs?)?$/i,
      intent: 'closeDuplicates',
      extract: () => ({})
    },
    // Next tab
    {
      regex: /^(?:next\s+tab|switch\s+to\s+(?:the\s+)?next\s+tab|tab\s+right|right\s+tab)$/i,
      intent: 'nextTab',
      extract: () => ({})
    },
    // Previous tab
    {
      regex: /^(?:prev(?:ious)?\s+tab|switch\s+to\s+(?:the\s+)?prev(?:ious)?\s+tab|tab\s+left|left\s+tab)$/i,
      intent: 'prevTab',
      extract: () => ({})
    },
    // Switch to tab N
    {
      regex: /^(?:switch|go)\s+to\s+tab\s+(\d+)/i,
      intent: 'switchToTab',
      extract: (m) => ({ index: parseInt(m[1]) })
    },
    // Switch to tab by title
    {
      regex: /^(?:switch|go)\s+to\s+(?:the\s+)?(.+?)\s+tab$/i,
      intent: 'switchToTabByTitle',
      extract: (m) => ({ title: m[1].trim() })
    },
    // Find tab by title
    {
      regex: /^(?:find|search\s+for)\s+(?:the\s+)?(.+?)\s+tab$/i,
      intent: 'switchToTabByTitle',
      extract: (m) => ({ title: m[1].trim() })
    },
    // Duplicate tab
    {
      regex: /^(?:duplicate|clone|copy)\s+(?:this\s+)?tab$/i,
      intent: 'duplicateTab',
      extract: () => ({})
    },
    // Pin/unpin tab
    {
      regex: /^pin\s+(?:this\s+)?tab$/i,
      intent: 'pinTab',
      extract: () => ({})
    },
    {
      regex: /^unpin\s+(?:this\s+)?tab$/i,
      intent: 'unpinTab',
      extract: () => ({})
    },
    // Mute/unmute tab
    {
      regex: /^mute\s+(?:this\s+)?tab$/i,
      intent: 'muteTab',
      extract: () => ({})
    },
    {
      regex: /^unmute\s+(?:this\s+)?tab$/i,
      intent: 'unmuteTab',
      extract: () => ({})
    },
    // List tabs
    {
      regex: /^(?:show|list|get|view|display|see)\s+(?:all\s+)?(?:open\s+)?tabs$/i,
      intent: 'listTabs',
      extract: () => ({})
    },
    // Tab count
    {
      regex: /^(?:how\s+many\s+tabs|tab\s+count|count\s+tabs|number\s+of\s+tabs)(?:\s+(?:are\s+)?(?:open|there))?$/i,
      intent: 'tabCount',
      extract: () => ({})
    },
    // Move tab left/right
    {
      regex: /^move\s+tab\s+(left|right|to\s+(?:the\s+)?(?:start|end|beginning))$/i,
      intent: 'moveTab',
      extract: (m) => ({ direction: m[1].trim().toLowerCase() })
    },
    // Sort tabs
    {
      regex: /^sort\s+(?:all\s+)?tabs(?:\s+(?:by\s+)?(?:title|name|url|alphabetical(?:ly)?))?$/i,
      intent: 'sortTabs',
      extract: () => ({})
    },
    // Discard/suspend tab
    {
      regex: /^(?:discard|suspend|sleep|freeze)\s+(?:this\s+|current\s+)?tab$/i,
      intent: 'discardTab',
      extract: () => ({})
    },
    // Reopen/restore closed tab
    {
      regex: /^(?:reopen|restore|undo\s+close|bring\s+back|recover)\s+(?:(?:the\s+)?(?:last\s+)?(?:closed\s+)?)?tab$/i,
      intent: 'reopenTab',
      extract: () => ({})
    },
    // Current tab info
    {
      regex: /^(?:what\s+(?:page|tab|site)\s+(?:is\s+this|am\s+i\s+on)|current\s+tab(?:\s+info)?|where\s+am\s+i|what\s+is\s+this\s+(?:page|tab|site))$/i,
      intent: 'currentTabInfo',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── TAB GROUPS ────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^group\s+(?:all\s+|these\s+|the\s+)?tabs?(?:\s+(?:as|named?|called?|label(?:led)?)\s+(.+))?$/i,
      intent: 'groupTabs',
      extract: (m) => ({ label: m[1]?.trim() || 'Group' })
    },
    {
      regex: /^ungroup\s+(?:all\s+|these\s+|the\s+)?tabs?$/i,
      intent: 'ungroupTabs',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── WINDOW MANAGEMENT ─────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:new|open\s+(?:a\s+)?(?:new\s+)?)\s*window$/i,
      intent: 'newWindow',
      extract: () => ({})
    },
    {
      regex: /^(?:open\s+)?(?:new\s+)?incognito(?:\s+(?:window|mode|tab))?$/i,
      intent: 'incognitoWindow',
      extract: () => ({})
    },
    {
      regex: /^close\s+(?:this\s+)?window$/i,
      intent: 'closeWindow',
      extract: () => ({})
    },
    {
      regex: /^(?:show|list)\s+(?:all\s+)?windows$/i,
      intent: 'listWindows',
      extract: () => ({})
    },
    {
      regex: /^(?:fullscreen|full\s+screen|maximize(?:\s+window)?|toggle\s+fullscreen)$/i,
      intent: 'fullscreen',
      extract: () => ({})
    },
    {
      regex: /^(?:minimize(?:\s+window)?)$/i,
      intent: 'minimizeWindow',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── BOOKMARKS ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^bookmark\s+(?:this\s+)?(?:page|tab|site)?$/i,
      intent: 'bookmarkPage',
      extract: () => ({})
    },
    {
      regex: /^(?:show|list|get|view|display|see)\s+(?:my\s+)?bookmarks$/i,
      intent: 'listBookmarks',
      extract: () => ({})
    },
    {
      regex: /^(?:search|find)\s+bookmark(?:s)?\s+(?:for\s+)?(.+)/i,
      intent: 'searchBookmarks',
      extract: (m) => ({ query: m[1].trim() })
    },
    {
      regex: /^(?:remove|delete|unbookmark)\s+(?:this\s+)?bookmark$/i,
      intent: 'removeBookmark',
      extract: () => ({})
    },
    {
      regex: /^open\s+all\s+bookmarks$/i,
      intent: 'openAllBookmarks',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── HISTORY ───────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:show|view|get|list|display|see|check)\s+(?:my\s+)?(?:recent\s+|browsing\s+)?history$/i,
      intent: 'showHistory',
      extract: () => ({})
    },
    {
      regex: /^(?:search|find(?:\s+in)?)?\s*history\s+(?:for\s+)?(.+)/i,
      intent: 'searchHistory',
      extract: (m) => ({ query: m[1].trim() })
    },
    {
      regex: /^clear\s+(?:my\s+)?(?:browsing\s+)?history$/i,
      intent: 'clearHistory',
      extract: () => ({})
    },
    {
      regex: /^clear\s+(?:all\s+)?(?:browsing\s+)?data$/i,
      intent: 'clearBrowsingData',
      extract: () => ({})
    },
    {
      regex: /^clear\s+(?:browser\s+)?cache$/i,
      intent: 'clearCache',
      extract: () => ({})
    },
    {
      regex: /^clear\s+(?:all\s+)?cookies?$/i,
      intent: 'clearCookies',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── DOWNLOADS ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:show|view|list|get|display|see|check)\s+(?:my\s+)?(?:recent\s+)?downloads$/i,
      intent: 'showDownloads',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── PAGE INTERACTION ──────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?(.+)/i,
      intent: 'clickElement',
      extract: (m) => ({ target: m[1].trim() })
    },
    // Type text — multiple patterns
    {
      regex: /^(?:type|enter|input|write|fill(?:\s+in)?)\s+["']?(.+?)["']?\s+(?:in(?:to)?|on)\s+(?:the\s+)?(.+)/i,
      intent: 'typeText',
      extract: (m) => ({ text: m[1].trim(), target: m[2].trim() })
    },
    {
      regex: /^(?:type|enter|input|write)\s+["']?(.+?)["']?$/i,
      intent: 'typeText',
      extract: (m) => ({ text: m[1].trim(), target: null })
    },
    // Scroll
    {
      regex: /^scroll\s+(up|down|to\s+(?:the\s+)?top|to\s+(?:the\s+)?bottom)/i,
      intent: 'scroll',
      extract: (m) => ({ direction: m[1].trim().toLowerCase().replace(/the\s+/g, '') })
    },
    // Scroll to element
    {
      regex: /^scroll\s+to\s+(?:the\s+)?(.+)/i,
      intent: 'scrollToElement',
      extract: (m) => {
        const target = m[1].trim().toLowerCase();
        // Don't match "scroll to top" or "scroll to bottom" here
        if (target === 'top' || target === 'bottom') return null;
        return { target: m[1].trim() };
      }
    },
    // Auto-scroll
    {
      regex: /^(?:auto\s*scroll|start\s+(?:auto\s*)?scrolling|continuous\s+scroll)$/i,
      intent: 'autoScroll',
      extract: () => ({ action: 'start' })
    },
    {
      regex: /^(?:stop\s+(?:auto\s*)?scrolling|stop\s+scroll|pause\s+scroll)$/i,
      intent: 'autoScroll',
      extract: () => ({ action: 'stop' })
    },
    {
      regex: /^scroll\s+(faster|slower|speed\s+(?:up|down))$/i,
      intent: 'autoScrollSpeed',
      extract: (m) => {
        const input = m[1].toLowerCase();
        return { faster: input.includes('fast') || input.includes('up') };
      }
    },
    // Read page / Summarize
    {
      regex: /^(?:read|get|extract)\s+(?:the\s+)?(?:page\s+)?(?:text|content)$/i,
      intent: 'readPage',
      extract: () => ({})
    },
    {
      regex: /^(?:summarize|summarise|summary(?:\s+of)?|tldr|tl;?dr)\s*(?:this\s+)?(?:page|site|article|content)?$/i,
      intent: 'summarizePage',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── SMART GRID ────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:show|enable)\s+(?:the\s+)?grid$/i,
      intent: 'showGrid',
      extract: () => ({})
    },
    {
      regex: /^(?:hide|disable|remove)\s+(?:the\s+)?grid$/i,
      intent: 'hideGrid',
      extract: () => ({})
    },
    {
      regex: /^click\s+(?:number\s+)?(\d+)$/i,
      intent: 'clickGrid',
      extract: (m) => ({ number: parseInt(m[1]) })
    },

    // ══════════════════════════════════════════════════════
    // ── PAGE TOOLS ────────────────────────────────────────
    // ══════════════════════════════════════════════════════

    // Find in page
    {
      regex: /^(?:find|search|look\s+for|highlight)\s+(?:on\s+(?:this\s+)?page\s+(?:for\s+)?|(?:in|on)\s+(?:this\s+)?page\s+)?["']?(.+?)["']?(?:\s+on\s+(?:this\s+)?page)?$/i,
      intent: 'findInPage',
      extract: (m) => {
        const query = m[1].trim();
        // Avoid matching regular search intent
        if (/^(?:for\s+)?/i.test(query) && query.length < 3) return null;
        return { query };
      }
    },
    // Reading mode
    {
      regex: /^(?:reading\s+mode|reader\s+(?:view|mode)|distraction\s*free|clean\s+(?:view|mode|page))$/i,
      intent: 'readingMode',
      extract: () => ({})
    },
    // Force dark mode on site
    {
      regex: /^(?:force\s+)?dark\s+mode\s+(?:on|for)\s+(?:this\s+)?(?:site|page|website)$/i,
      intent: 'forceDarkMode',
      extract: () => ({})
    },
    // Copy URL
    {
      regex: /^copy\s+(?:this\s+)?(?:page\s+)?(?:url|link|address)$/i,
      intent: 'copyUrl',
      extract: () => ({})
    },
    // Copy title
    {
      regex: /^copy\s+(?:this\s+)?(?:page\s+)?title$/i,
      intent: 'copyTitle',
      extract: () => ({})
    },
    // Copy page text
    {
      regex: /^copy\s+(?:all\s+)?(?:page\s+)?text$/i,
      intent: 'copyPageText',
      extract: () => ({})
    },
    // Copy all links
    {
      regex: /^copy\s+(?:all\s+)?links(?:\s+(?:from|on)\s+(?:this\s+)?page)?$/i,
      intent: 'copyLinks',
      extract: () => ({})
    },
    // Copy to clipboard
    {
      regex: /^copy\s+(?:this|text):\s*(.+)/i,
      intent: 'copyToClipboard',
      extract: (m) => ({ text: m[1].trim() })
    },
    // Print
    {
      regex: /^(?:print|print\s+(?:this\s+)?(?:page|tab))$/i,
      intent: 'printPage',
      extract: () => ({})
    },
    // View source
    {
      regex: /^(?:view|show|see)\s+(?:page\s+)?source$/i,
      intent: 'viewSource',
      extract: () => ({})
    },
    // Page stats
    {
      regex: /^(?:page\s+(?:info|stats|statistics|details)|word\s+count|how\s+many\s+words|page\s+analysis)$/i,
      intent: 'pageStats',
      extract: () => ({})
    },
    // QR code
    {
      regex: /^(?:(?:show|generate|create|make)\s+(?:a\s+)?)?qr\s*code(?:\s+(?:for|of)\s+(?:this\s+)?(?:page|url|link|site))?$/i,
      intent: 'qrCode',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── SCREENSHOTS & ZOOM ────────────────────────────────
    // ══════════════════════════════════════════════════════
    // ── NATIVE DESKTOP CONTROL (Via Native Host) ──────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:open|launch|start|run)\s+(?:the\s+)?(?:app|application|program\s+)?(.+)(?<!window|tab|browser|site|page)$/i,
      intent: 'nativeOpenApp',
      extract: (m) => {
        // Prevent collision with "open youtube" -> we let fuzzy matching handle sites, 
        // but if it's explicitly an app like "calculator", it comes here.
        // Also avoid capturing "open new window"
        const app = m[1].trim();
        if (['new window', 'incognito', 'settings', 'downloads', 'extensions', 'history'].includes(app.toLowerCase())) return null;
        
        // If it's a known website shortcut, don't treat it as a native app
        if (siteShortcuts[app.toLowerCase()]) return null;

        return { app };
      }
    },
    {
      regex: /^(?:install|download\s+and\s+install)\s+(?:the\s+)?(?:app|application|program\s+)?(.+)$/i,
      intent: 'nativeInstallApp',
      extract: (m) => ({ app: m[1].trim() })
    },
    {
      regex: /^(?:lock|sleep|shutdown|restart|turn\s*off)\s+(?:my\s+)?(?:computer|pc|laptop|machine)$/i,
      intent: 'nativeSystemPower',
      extract: (m) => ({ mode: m[0].split(/\s+/)[0].toLowerCase().replace('turn', 'shutdown') })
    },
    {
      regex: /^(?:open|show)\s+(?:my\s+)?(downloads|documents|desktop|pictures|music|videos)\s*(?:folder|directory)?$/i,
      intent: 'nativeOpenFolder',
      extract: (m) => ({ folder: m[1].toLowerCase() })
    },
    {
      regex: /^(?:run|execute)\s+(?:command\s+)?["']?(.+?)["']?$/i,
      intent: 'nativeRunCommand',
      extract: (m) => ({ command: m[1].trim() })
    },

    // ══════════════════════════════════════════════════════
    // ── MINIMIZE / FULLSCREEN ─────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:minimize(?:\s+window)?)$/i,
      intent: 'minimizeWindow',
      extract: () => ({})
    },
    {
      regex: /^(?:take\s+(?:a\s+)?)?screenshot$/i,
      intent: 'screenshot',
      extract: () => ({})
    },
    {
      regex: /^(?:full\s+(?:page\s+)?screenshot|screenshot\s+full\s+page)$/i,
      intent: 'fullScreenshot',
      extract: () => ({})
    },
    {
      regex: /^zoom\s*in$/i,
      intent: 'zoomIn',
      extract: () => ({})
    },
    {
      regex: /^zoom\s*out$/i,
      intent: 'zoomOut',
      extract: () => ({})
    },
    {
      regex: /^(?:reset|normal|default)\s+zoom$/i,
      intent: 'zoomReset',
      extract: () => ({})
    },
    {
      regex: /^(?:set\s+)?zoom\s+(?:to\s+)?(\d+)\s*%?$/i,
      intent: 'zoomTo',
      extract: (m) => ({ level: parseInt(m[1]) })
    },

    // ══════════════════════════════════════════════════════
    // ── NOTES ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:save\s+(?:a\s+)?note|note|add\s+note|write\s+(?:a\s+)?note|remember)[:\s]\s*(.+)/i,
      intent: 'saveNote',
      extract: (m) => ({ text: m[1].trim() })
    },
    {
      regex: /^(?:show|list|view|see|get|display)\s+(?:my\s+)?(?:all\s+)?notes$/i,
      intent: 'listNotes',
      extract: () => ({})
    },
    {
      regex: /^(?:delete|remove)\s+note\s+(\d+)$/i,
      intent: 'deleteNote',
      extract: (m) => ({ index: parseInt(m[1]) - 1 })
    },
    {
      regex: /^(?:clear|delete)\s+(?:all\s+)?notes$/i,
      intent: 'clearNotes',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── TIMERS & ALARMS ───────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(second|sec|minute|min|hour|hr)s?$/i,
      intent: 'setTimer',
      extract: (m) => {
        let seconds = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        if (unit.startsWith('min')) seconds *= 60;
        if (unit.startsWith('hour') || unit.startsWith('hr')) seconds *= 3600;
        return { seconds, label: `${m[1]} ${m[2]}s` };
      }
    },
    {
      regex: /^(?:set\s+(?:an?\s+)?)?(?:alarm|reminder|remind\s+me)\s+(?:at|for|in)\s+(.+)/i,
      intent: 'setAlarm',
      extract: (m) => ({ timeStr: m[1].trim() })
    },
    {
      regex: /^(?:show|list|check)\s+(?:my\s+)?(?:all\s+)?timers?$/i,
      intent: 'listTimers',
      extract: () => ({})
    },
    {
      regex: /^(?:cancel|stop|remove|delete|clear)\s+(?:all\s+)?timers?$/i,
      intent: 'cancelTimer',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── MACROS & AUTOMATION ───────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:start\s+)?record(?:ing)?\s+(?:a\s+)?macro\s+(?:called|named)\s+(.+)$/i,
      intent: 'recordMacro',
      extract: (m) => ({ name: m[1].trim() })
    },
    {
      regex: /^(?:stop|end|finish)\s+record(?:ing)?(?:\s+(?:the\s+)?macro)?$/i,
      intent: 'stopRecordingMacro',
      extract: () => ({})
    },
    {
      regex: /^(?:run|play|execute)\s+(?:the\s+)?macro\s+(?:called|named)?\s*(.+)$/i,
      intent: 'runMacro',
      extract: (m) => ({ name: m[1].trim() })
    },
    {
      regex: /^(?:show|list|view|get)\s+(?:all\s+)?macros$/i,
      intent: 'listMacros',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── WORKSPACE PRESETS ─────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:open|start|launch)\s+(work|study|social|entertainment|dev(?:elop(?:ment|er)?)?|coding)\s*(?:mode|workspace|setup)?$/i,
      intent: 'openWorkspace',
      extract: (m) => ({ workspace: m[1].toLowerCase() })
    },

    // ══════════════════════════════════════════════════════
    // ── SETTINGS & CHROME PAGES (40+ settings commands) ──
    // ══════════════════════════════════════════════════════
    // General
    {
      regex: /^(?:open\s+)?(?:chrome\s+|browser\s+)?settings$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings', label: 'Settings' })
    },
    {
      regex: /^(?:open\s+)?extensions?(?:\s+page)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://extensions', label: 'Extensions' })
    },
    {
      regex: /^(?:open\s+)?(?:chrome\s+)?downloads?\s*page$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://downloads', label: 'Downloads' })
    },
    {
      regex: /^(?:open\s+)?(?:chrome\s+)?flags$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://flags', label: 'Chrome Flags' })
    },
    {
      regex: /^(?:chrome\s+)?(?:about|version|info)$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/help', label: 'About Chrome' })
    },
    // Privacy & Security
    {
      regex: /^(?:open\s+)?(?:privacy|security)\s*(?:settings?|page)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/privacy', label: 'Privacy & Security' })
    },
    {
      regex: /^(?:open\s+)?(?:site\s+)?permissions?\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content', label: 'Site Permissions' })
    },
    {
      regex: /^(?:open\s+)?cookies?\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/cookies', label: 'Cookie Settings' })
    },
    {
      regex: /^(?:open\s+)?(?:safe\s*browsing|security\s+level)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/security', label: 'Safe Browsing' })
    },
    // Passwords & Autofill
    {
      regex: /^(?:open\s+|show\s+|manage\s+)?(?:saved\s+)?passwords?\s*(?:settings?|manager|page)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/passwords', label: 'Passwords' })
    },
    {
      regex: /^(?:open\s+|manage\s+)?(?:autofill|auto\s*fill)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/autofill', label: 'Autofill' })
    },
    {
      regex: /^(?:open\s+|manage\s+)?(?:payment|cards?|credit\s*cards?)\s*(?:settings?|methods?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/payments', label: 'Payment Methods' })
    },
    {
      regex: /^(?:open\s+|manage\s+)?(?:address(?:es)?|saved\s+address(?:es)?)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/addresses', label: 'Addresses' })
    },
    // Appearance
    {
      regex: /^(?:open\s+)?(?:appearance|look|theme)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/appearance', label: 'Appearance' })
    },
    {
      regex: /^(?:open\s+|change\s+)?(?:font|fonts?|text\s*size)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/fonts', label: 'Font Settings' })
    },
    // Search Engine
    {
      regex: /^(?:open\s+|change\s+|manage\s+)?(?:search\s+engine|default\s+search)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/search', label: 'Search Engine' })
    },
    // Startup
    {
      regex: /^(?:open\s+|change\s+)?(?:startup|on\s+startup|start\s*up)\s*(?:settings?|page)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/onStartup', label: 'On Startup' })
    },
    // Default Browser
    {
      regex: /^(?:set\s+|make\s+)?(?:chrome\s+)?(?:as\s+)?default\s+browser$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/defaultBrowser', label: 'Default Browser' })
    },
    // Downloads
    {
      regex: /^(?:open\s+|change\s+)?download(?:s)?\s*(?:location|folder|path|settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/downloads', label: 'Download Settings' })
    },
    // Languages
    {
      regex: /^(?:open\s+|change\s+)?(?:language|languages|spell\s*check)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/languages', label: 'Languages' })
    },
    // Accessibility
    {
      regex: /^(?:open\s+)?(?:accessibility|a11y)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/accessibility', label: 'Accessibility' })
    },
    // System
    {
      regex: /^(?:open\s+)?(?:system|hardware\s*acceleration|proxy)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/system', label: 'System Settings' })
    },
    // Sync & Google
    {
      regex: /^(?:open\s+)?(?:sync|google\s+sync|sync\s+and\s+google)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/syncSetup', label: 'Sync & Google' })
    },
    {
      regex: /^(?:open\s+|manage\s+)?(?:google\s+)?account\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/people', label: 'Google Account' })
    },
    // Notifications
    {
      regex: /^(?:open\s+|manage\s+)?notifications?\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/notifications', label: 'Notification Settings' })
    },
    // Camera & Microphone
    {
      regex: /^(?:open\s+|manage\s+)?(?:camera|webcam)\s*(?:settings?|permissions?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/camera', label: 'Camera Settings' })
    },
    {
      regex: /^(?:open\s+|manage\s+)?(?:microphone|mic)\s*(?:settings?|permissions?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/microphone', label: 'Microphone Settings' })
    },
    // Location
    {
      regex: /^(?:open\s+|manage\s+)?(?:location|geolocation)\s*(?:settings?|permissions?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/location', label: 'Location Settings' })
    },
    // Pop-ups
    {
      regex: /^(?:open\s+|manage\s+)?(?:pop\s*ups?|popups?|redirects?)\s*(?:settings?|blocker)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/popups', label: 'Pop-ups & Redirects' })
    },
    // Ads
    {
      regex: /^(?:open\s+|manage\s+)?(?:ads?|advertisements?)\s*(?:settings?|blocker)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/ads', label: 'Ad Settings' })
    },
    // JavaScript
    {
      regex: /^(?:open\s+|manage\s+)?(?:javascript|js)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/javascript', label: 'JavaScript Settings' })
    },
    // Images
    {
      regex: /^(?:open\s+|manage\s+)?(?:images?|pictures?)\s*(?:settings?|permissions?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/images', label: 'Image Settings' })
    },
    // Sound
    {
      regex: /^(?:open\s+|manage\s+)?(?:sound|audio)\s*(?:settings?|permissions?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/sound', label: 'Sound Settings' })
    },
    // Reset
    {
      regex: /^(?:reset|restore)\s+(?:chrome|browser)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/reset', label: 'Reset Chrome Settings' })
    },
    // Task Manager
    {
      regex: /^(?:open\s+)?(?:chrome\s+)?task\s*manager$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://taskmanager', label: 'Task Manager' })
    },
    // Inspect / DevTools
    {
      regex: /^(?:open\s+)?(?:dev\s*tools|developer\s*tools|inspect|console)$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://inspect', label: 'DevTools Inspect' })
    },
    // GPU Info
    {
      regex: /^(?:open\s+)?(?:gpu|graphics)\s*(?:info|settings?|status)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://gpu', label: 'GPU Info' })
    },
    // Network / Net-internals
    {
      regex: /^(?:open\s+)?(?:network|net\s*internals|dns)\s*(?:info|settings?|logs?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://net-internals', label: 'Network Internals' })
    },
    // Bluetooth
    {
      regex: /^(?:open\s+|manage\s+)?bluetooth\s*(?:settings?|devices?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://bluetooth-internals', label: 'Bluetooth' })
    },
    // Site Data
    {
      regex: /^(?:open\s+|manage\s+|clear\s+)?(?:site\s+)?(?:data|storage)\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://settings/content/siteData', label: 'Site Data' })
    },
    // Shortcuts
    {
      regex: /^(?:open\s+|show\s+)?(?:keyboard\s+)?shortcuts?\s*(?:settings?)?$/i,
      intent: 'openSettingsPage',
      extract: () => ({ page: 'chrome://extensions/shortcuts', label: 'Extension Shortcuts' })
    },

    // ══════════════════════════════════════════════════════
    // ── THEME ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:switch\s+to\s+|toggle\s+|enable\s+)?dark\s*mode$/i,
      intent: 'darkMode',
      extract: () => ({})
    },
    {
      regex: /^(?:switch\s+to\s+|toggle\s+|enable\s+)?light\s*mode$/i,
      intent: 'lightMode',
      extract: () => ({})
    },

    // ══════════════════════════════════════════════════════
    // ── HELP & META ───────────────────────────────────────
    // ══════════════════════════════════════════════════════
    {
      regex: /^(?:help|what\s+can\s+you\s+do|commands|show\s+commands|features|capabilities|list\s+commands)$/i,
      intent: 'help',
      extract: () => ({})
    },
    {
      regex: /^(?:show|list|get)\s+(?:my\s+)?(?:top|most\s+visited|frequent)\s+sites$/i,
      intent: 'topSites',
      extract: () => ({})
    },
    // Learning stats
    {
      regex: /^(?:learning\s+stats|show\s+learning|what\s+(?:have\s+you|did\s+you)\s+learn(?:ed)?|my\s+stats)$/i,
      intent: 'learningStats',
      extract: () => ({})
    },
    // Teach / custom pattern
    {
      regex: /^(?:when\s+i\s+say|teach|learn|remember\s+that)\s+["']?(.+?)["']?\s*(?:,\s*| then |=>)\s*(.+)/i,
      intent: 'teachCommand',
      extract: (m) => ({ trigger: m[1].trim(), action: m[2].trim() })
    },
    // Recent commands
    {
      regex: /^(?:recent|last|previous)\s+commands?$/i,
      intent: 'recentCommands',
      extract: () => ({})
    }
  ];

  // ── Known website shortcuts (50+ sites) ──────────────────
  const siteShortcuts = {
    'youtube': 'https://www.youtube.com',
    'yt': 'https://www.youtube.com',
    'google': 'https://www.google.com',
    'gmail': 'https://mail.google.com',
    'email': 'https://mail.google.com',
    'mail': 'https://mail.google.com',
    'github': 'https://github.com',
    'gh': 'https://github.com',
    'twitter': 'https://twitter.com',
    'x': 'https://twitter.com',
    'facebook': 'https://www.facebook.com',
    'fb': 'https://www.facebook.com',
    'instagram': 'https://www.instagram.com',
    'insta': 'https://www.instagram.com',
    'ig': 'https://www.instagram.com',
    'reddit': 'https://www.reddit.com',
    'linkedin': 'https://www.linkedin.com',
    'amazon': 'https://www.amazon.in',
    'netflix': 'https://www.netflix.com',
    'spotify': 'https://open.spotify.com',
    'twitch': 'https://www.twitch.tv',
    'discord': 'https://discord.com/app',
    'whatsapp': 'https://web.whatsapp.com',
    'wa': 'https://web.whatsapp.com',
    'telegram': 'https://web.telegram.org',
    'tg': 'https://web.telegram.org',
    'wikipedia': 'https://www.wikipedia.org',
    'wiki': 'https://www.wikipedia.org',
    'stackoverflow': 'https://stackoverflow.com',
    'stack overflow': 'https://stackoverflow.com',
    'so': 'https://stackoverflow.com',
    'chatgpt': 'https://chat.openai.com',
    'chat gpt': 'https://chat.openai.com',
    'gpt': 'https://chat.openai.com',
    'google drive': 'https://drive.google.com',
    'drive': 'https://drive.google.com',
    'google docs': 'https://docs.google.com',
    'docs': 'https://docs.google.com',
    'google sheets': 'https://sheets.google.com',
    'sheets': 'https://sheets.google.com',
    'google maps': 'https://maps.google.com',
    'maps': 'https://maps.google.com',
    'google calendar': 'https://calendar.google.com',
    'calendar': 'https://calendar.google.com',
    'outlook': 'https://outlook.live.com',
    'notion': 'https://www.notion.so',
    'figma': 'https://www.figma.com',
    'canva': 'https://www.canva.com',
    'pinterest': 'https://www.pinterest.com',
    'tiktok': 'https://www.tiktok.com',
    'ebay': 'https://www.ebay.com',
    'flipkart': 'https://www.flipkart.com',
    'myntra': 'https://www.myntra.com',
    'swiggy': 'https://www.swiggy.com',
    'zomato': 'https://www.zomato.com',
    'paytm': 'https://paytm.com',
    'google meet': 'https://meet.google.com',
    'meet': 'https://meet.google.com',
    'zoom': 'https://zoom.us',
    'slack': 'https://slack.com',
    'trello': 'https://trello.com',
    'jira': 'https://www.atlassian.com/software/jira',
    'codepen': 'https://codepen.io',
    'replit': 'https://replit.com',
    'vercel': 'https://vercel.com',
    'netlify': 'https://netlify.com',
    'medium': 'https://medium.com',
    'dev.to': 'https://dev.to',
    'devto': 'https://dev.to',
    'hashnode': 'https://hashnode.com',
    'producthunt': 'https://www.producthunt.com',
    'product hunt': 'https://www.producthunt.com',
    'hacker news': 'https://news.ycombinator.com',
    'hn': 'https://news.ycombinator.com',
    'claude': 'https://claude.ai',
    'gemini': 'https://gemini.google.com',
    'perplexity': 'https://www.perplexity.ai',
    'google photos': 'https://photos.google.com',
    'photos': 'https://photos.google.com'
  };

  // ── Workspace presets ────────────────────────────────────
  const workspacePresets = {
    work: ['https://mail.google.com', 'https://calendar.google.com', 'https://sheets.google.com', 'https://docs.google.com'],
    study: ['https://www.wikipedia.org', 'https://scholar.google.com', 'https://www.notion.so', 'https://docs.google.com'],
    social: ['https://twitter.com', 'https://www.instagram.com', 'https://www.facebook.com', 'https://web.whatsapp.com'],
    entertainment: ['https://www.youtube.com', 'https://www.netflix.com', 'https://open.spotify.com', 'https://www.twitch.tv'],
    dev: ['https://github.com', 'https://stackoverflow.com', 'https://dev.to', 'https://codepen.io'],
    coding: ['https://github.com', 'https://stackoverflow.com', 'https://dev.to', 'https://codepen.io'],
    developer: ['https://github.com', 'https://stackoverflow.com', 'https://dev.to', 'https://codepen.io'],
    development: ['https://github.com', 'https://stackoverflow.com', 'https://dev.to', 'https://codepen.io']
  };

  /**
   * Try to match input against patterns
   * Priority: 1) Custom patterns (learned), 2) Static patterns, 3) Fuzzy
   */
  function match(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // 1. Try learned patterns first (from LearningEngine)
    if (typeof LearningEngine !== 'undefined') {
      const learned = LearningEngine.matchLearned(trimmed);
      if (learned) {
        return learned;
      }
    }

    // 2. Try static regex patterns
    for (const pattern of patterns) {
      const m = trimmed.match(pattern.regex);
      if (m) {
        const data = pattern.extract(m);
        if (data === null) continue; // Extractor rejected this match

        // Special handling for navigation: resolve site shortcuts
        if (pattern.intent === 'navigate' && data.target) {
          resolveNavigationTarget(data);
        }

        // Special handling for openMultiple
        if (pattern.intent === 'openMultiple' && data.sites) {
          data.urls = data.sites.map(s => {
            const lower = s.toLowerCase().trim();
            return siteShortcuts[lower] || (
              /^https?:\/\//i.test(s) ? s :
              /\.\w{2,}$/i.test(s) ? 'https://' + s :
              siteShortcuts[lower.replace(/\s+/g, '')] || null
            );
          }).filter(Boolean);
          if (data.urls.length === 0) {
            return { intent: 'search', data: { query: data.sites.join(' ') } };
          }
        }

        // Special handling for openWorkspace
        if (pattern.intent === 'openWorkspace') {
          data.urls = workspacePresets[data.workspace] || [];
          if (data.urls.length === 0) {
            return { intent: 'chat', data: { response: `I don't have a "${data.workspace}" workspace preset.` } };
          }
        }

        return { intent: pattern.intent, data };
      }
    }

    // 3. Try fuzzy matching against site shortcuts for "open X" style
    const openMatch = trimmed.match(/^(?:open|go\s*to|visit)\s+(.+)/i);
    if (openMatch) {
      const target = openMatch[1].trim().toLowerCase();
      const fuzzyUrl = fuzzyMatchSite(target);
      if (fuzzyUrl) {
        return {
          intent: 'navigate',
          data: { url: fuzzyUrl.url, siteName: fuzzyUrl.name, target: openMatch[1].trim() }
        };
      }
    }

    return null; // No match
  }

  /**
   * Resolve a navigation target to a URL
   */
  function resolveNavigationTarget(data) {
    const lower = data.target.toLowerCase().replace(/[.\s]+$/, '');

    if (siteShortcuts[lower]) {
      data.url = siteShortcuts[lower];
      data.siteName = lower;
    } else if (/^https?:\/\//i.test(data.target)) {
      data.url = data.target;
    } else if (/\.\w{2,}$/i.test(data.target)) {
      data.url = 'https://' + data.target.replace(/^(https?:\/\/)/i, '');
    } else {
      // Check concatenated version
      const noSpaces = lower.replace(/\s+/g, '');
      if (siteShortcuts[noSpaces]) {
        data.url = siteShortcuts[noSpaces];
        data.siteName = noSpaces;
      } else {
        // Fuzzy match
        const fuzzy = fuzzyMatchSite(lower);
        if (fuzzy) {
          data.url = fuzzy.url;
          data.siteName = fuzzy.name;
        } else {
          // Default to search
          return { intent: 'search', data: { query: data.target } };
        }
      }
    }
  }

  /**
   * Fuzzy match against site shortcuts using edit distance
   */
  function fuzzyMatchSite(input) {
    let best = null;
    let bestDist = Infinity;
    const maxDist = Math.max(2, Math.floor(input.length * 0.35));

    for (const [name, url] of Object.entries(siteShortcuts)) {
      const dist = typeof LearningEngine !== 'undefined'
        ? LearningEngine.levenshtein(input, name)
        : simpleDistance(input, name);

      if (dist < bestDist && dist <= maxDist) {
        bestDist = dist;
        best = { name, url };
      }
    }

    return best;
  }

  /**
   * Simple edit distance (fallback if LearningEngine not loaded)
   */
  function simpleDistance(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
        else matrix[i][j] = Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Get URL for a known site shortcut
   */
  function getSiteUrl(name) {
    return siteShortcuts[name.toLowerCase()] || null;
  }

  return {
    match,
    getSiteUrl,
    siteShortcuts,
    workspacePresets
  };
})();
