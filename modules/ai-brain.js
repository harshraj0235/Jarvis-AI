// ============================================================
// Jarvis AI — AI Brain (Refactored)
// ALL browser commands are LOCAL-ONLY (no AI dependency)
// AI is OPTIONAL — only used for chat conversation if enabled
// ============================================================

const AIBrain = (() => {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // FUZZY MATCHING ENGINE (Levenshtein + Typo Dictionary)
  // ══════════════════════════════════════════════════════════

  /**
   * Levenshtein Distance — measures how "different" two strings are.
   * A distance of 0 means identical. 1 means one character off, etc.
   */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * Find the closest match from a list of candidates.
   * Returns the best match if it's within the tolerance threshold.
   */
  function fuzzyMatch(input, candidates, maxDistance = 2) {
    let bestMatch = null;
    let bestDist = Infinity;
    const lower = input.toLowerCase();
    
    for (const candidate of candidates) {
      const dist = levenshtein(lower, candidate.toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = candidate;
      }
    }
    
    // Only accept if the distance is within tolerance
    // For short words (<=4 chars), allow max 1 edit; for longer, allow 2
    const threshold = lower.length <= 4 ? 1 : maxDistance;
    return bestDist <= threshold ? bestMatch : null;
  }

  /**
   * Massive typo dictionary — maps common voice misrecognitions to correct words.
   * This covers phonetic mistakes, accent-based errors, and keyboard typos.
   */
  const TYPO_MAP = {
    // Actions
    'opin': 'open', 'opn': 'open', 'openn': 'open', 'ope': 'open', 'opne': 'open',
    'clos': 'close', 'clsoe': 'close', 'clse': 'close', 'clase': 'close',
    'serch': 'search', 'seach': 'search', 'sarch': 'search', 'saerch': 'search',
    'scrool': 'scroll', 'scrol': 'scroll', 'scrill': 'scroll', 'skroll': 'scroll',
    'scrennshot': 'screenshot', 'screensnot': 'screenshot', 'screnshot': 'screenshot',
    'bookmak': 'bookmark', 'bokmark': 'bookmark', 'boomark': 'bookmark', 'boookmark': 'bookmark',
    'histori': 'history', 'histry': 'history', 'histroy': 'history',
    'downlod': 'download', 'donwload': 'download', 'downlaod': 'download',
    'relaod': 'reload', 'relod': 'reload', 'refesh': 'refresh', 'refrsh': 'refresh',
    'navgate': 'navigate', 'naviage': 'navigate',
    'duplcate': 'duplicate', 'duplaicate': 'duplicate', 'dupliate': 'duplicate',
    'sumrize': 'summarize', 'summerize': 'summarize', 'sumarize': 'summarize',
    'minimze': 'minimize', 'minimise': 'minimize',
    'fullscren': 'fullscreen', 'fulscreen': 'fullscreen',
    'incognto': 'incognito', 'incognitto': 'incognito', 'incognitoo': 'incognito',
    'swich': 'switch', 'swicth': 'switch', 'swtich': 'switch',
    'previus': 'previous', 'previuos': 'previous', 'prevous': 'previous',
    'settigns': 'settings', 'setings': 'settings', 'settins': 'settings',
    'extention': 'extension', 'extensin': 'extension', 'extnsion': 'extension',
    'privcy': 'privacy', 'priavcy': 'privacy', 'privecy': 'privacy',
    'pasword': 'password', 'passwrod': 'password', 'passwrd': 'password',
    'notifcation': 'notification', 'notifiation': 'notification',
    'accesibility': 'accessibility', 'acessibility': 'accessibility',
    'languae': 'language', 'langauge': 'language', 'languge': 'language',
    'apperance': 'appearance', 'apearance': 'appearance',

    // Targets
    'tub': 'tab', 'tabb': 'tab', 'tag': 'tab', 'tap': 'tab',
    'noo': 'new', 'nw': 'new', 'ne': 'new',
    'windw': 'window', 'widnow': 'window', 'wndow': 'window',
    'pge': 'page', 'pag': 'page', 'pgae': 'page',
    'syte': 'site', 'iste': 'site',

    // Sites
    'youtub': 'youtube', 'yotube': 'youtube', 'u tube': 'youtube', 'you tube': 'youtube',
    'gogle': 'google', 'googl': 'google', 'googel': 'google',
    'gmal': 'gmail', 'gmial': 'gmail', 'gmaill': 'gmail',
    'twitr': 'twitter', 'twiter': 'twitter',
    'facbook': 'facebook', 'facebok': 'facebook', 'fcebook': 'facebook',
    'instagam': 'instagram', 'instragram': 'instagram', 'insagram': 'instagram',
    'redit': 'reddit', 'redditt': 'reddit',
    'linkdin': 'linkedin', 'linkdein': 'linkedin', 'linkedn': 'linkedin',
    'amazn': 'amazon', 'amzon': 'amazon',
    'flipkrt': 'flipkart', 'flipkat': 'flipkart',
    'whtsapp': 'whatsapp', 'watsapp': 'whatsapp', 'whatsap': 'whatsapp',

    // Filler words to strip
    'plz': '', 'pls': '', 'please': '', 'kindly': '', 'just': '',
    'wanna': '', 'gonna': '', 'lemme': 'let me'
  };

  /**
   * Normalize input — fix typos using the dictionary, strip filler words
   */
  function normalizeInput(input) {
    let result = input;
    
    // Apply the typo map (word-by-word replacement)
    const words = result.split(/\s+/);
    const fixed = words.map(word => {
      const lower = word.toLowerCase();
      // 1. Check exact match in typo map
      if (TYPO_MAP[lower] !== undefined) {
        return TYPO_MAP[lower];
      }
      // 2. Check fuzzy match against typo map keys (for typos OF typos!)
      const closestTypo = fuzzyMatch(lower, Object.keys(TYPO_MAP), 1);
      if (closestTypo && TYPO_MAP[closestTypo] !== undefined) {
        return TYPO_MAP[closestTypo];
      }
      return word;
    }).filter(w => w !== ''); // Remove stripped filler words
    
    return fixed.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Process user input — LOCAL-FIRST, AI-FREE for commands
   */
  async function processInput(input) {
    if (!input || typeof input !== 'string') return { intent: 'none', data: {}, response: "I didn't catch that." };

    // Normalize input to handle common voice transcription typos
    const normalizedInput = normalizeInput(input);
    const trimmed = normalizedInput.trim();
    
    if (!trimmed) {
      return { intent: 'none', data: {}, response: "I didn't catch that. Could you say it again?" };
    }

    // 1. Try learned patterns (from LearningEngine)
    if (typeof LearningEngine !== 'undefined') {
      const learned = LearningEngine.matchLearned(trimmed);
      if (learned) {
        return { intent: learned.intent, data: learned.data, response: null };
      }
    }

    // 2. Try local pattern matching (instant, no API)
    const localMatch = CommandPatterns.match(trimmed);
    if (localMatch) {
      return { intent: localMatch.intent, data: localMatch.data, response: null };
    }

    // 3. Try smart fallback — guess closest command
    const guess = smartGuess(trimmed);
    if (guess) {
      return guess;
    }

    // 4. Respond with help — NO AI API call for commands
    return {
      intent: 'chat',
      data: {},
      response: generateLocalResponse(trimmed)
    };
  }

  /**
   * Smart guess: try to figure out what the user wants without AI.
   * Now enhanced with Levenshtein fuzzy matching for keywords and site names.
   */
  function smartGuess(input) {
    const lower = input.toLowerCase();
    const words = lower.split(/\s+/);

    // Check if it looks like a URL
    if (/^[\w.-]+\.\w{2,}$/.test(lower)) {
      return {
        intent: 'navigate',
        data: { url: 'https://' + lower, target: input },
        response: null
      };
    }

    // Check if it contains a known site name (exact or fuzzy)
    const sites = CommandPatterns.siteShortcuts;
    const siteNames = Object.keys(sites);
    for (const word of words) {
      // Exact match
      if (sites[word]) {
        return {
          intent: 'navigate',
          data: { url: sites[word], siteName: word, target: word },
          response: null
        };
      }
      // Fuzzy match (e.g. "youtbe" → "youtube")
      const fuzzySite = fuzzyMatch(word, siteNames, 2);
      if (fuzzySite && sites[fuzzySite]) {
        return {
          intent: 'navigate',
          data: { url: sites[fuzzySite], siteName: fuzzySite, target: fuzzySite },
          response: null
        };
      }
    }

    // Check for action keywords (exact or fuzzy)
    const actionKeywords = {
      'close': 'closeTab',
      'shut': 'closeTab',
      'new': 'newTab',
      'back': 'goBack',
      'forward': 'goForward',
      'refresh': 'reload',
      'reload': 'reload',
      'bookmark': 'bookmarkPage',
      'history': 'showHistory',
      'download': 'showDownloads',
      'screenshot': 'screenshot',
      'zoom': words.includes('in') ? 'zoomIn' : (words.includes('out') ? 'zoomOut' : null),
      'mute': 'muteTab',
      'unmute': 'unmuteTab',
      'pin': 'pinTab',
      'unpin': 'unpinTab',
      'duplicate': 'duplicateTab',
      'summarize': 'summarizePage',
      'summary': 'summarizePage',
      'scroll': 'scroll',
      'help': 'help',
      'settings': 'openSettingsPage',
      'privacy': 'openSettingsPage',
      'password': 'openSettingsPage',
      'extensions': 'openSettingsPage',
      'note': lower.includes('show') || lower.includes('list') ? 'listNotes' : null,
      'timer': lower.includes('show') || lower.includes('list') ? 'listTimers' : null
    };

    const allKeywords = Object.keys(actionKeywords);

    for (const word of words) {
      // Exact keyword match
      if (actionKeywords[word] && actionKeywords[word] !== null) {
        const intent = actionKeywords[word];
        const data = {};
        if (intent === 'scroll') {
          data.direction = lower.includes('up') ? 'up' : 'down';
        }
        if (intent === 'openSettingsPage') {
          data.page = 'chrome://settings';
          data.label = 'Settings';
        }
        return { intent, data, response: null };
      }
      // Fuzzy keyword match (e.g. "bookmak" → "bookmark")
      if (word.length >= 4) {
        const fuzzyKeyword = fuzzyMatch(word, allKeywords, 2);
        if (fuzzyKeyword && actionKeywords[fuzzyKeyword] !== null) {
          const intent = actionKeywords[fuzzyKeyword];
          const data = {};
          if (intent === 'scroll') {
            data.direction = lower.includes('up') ? 'up' : 'down';
          }
          if (intent === 'openSettingsPage') {
            data.page = 'chrome://settings';
            data.label = 'Settings';
          }
          return { intent, data, response: null };
        }
      }
    }

    return null;
  }

  /**
   * Generate a local response for unrecognized input (no AI needed)
   */
  function generateLocalResponse(input) {
    const lower = input.toLowerCase();

    // Common greetings
    if (/^(hi|hello|hey|yo|sup|howdy|good\s*(morning|evening|afternoon|night))/.test(lower)) {
      const greetings = [
        "Hey! 👋 I'm Jarvis, your browser assistant. What can I help you with?",
        "Hello! Ready to help you with anything browser-related. Just say a command!",
        "Hi there! 🚀 Try saying \"open YouTube\" or \"show my bookmarks\".",
        "Hey! I'm all ears. What would you like me to do?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Thank you
    if (/^(thank|thanks|thx|ty|appreciate)/.test(lower)) {
      return "You're welcome! 😊 Let me know if you need anything else.";
    }

    // Who are you
    if (/who\s+are\s+you|what\s+are\s+you|your\s+name/.test(lower)) {
      return "I'm **Jarvis**, your AI browser agent! I can control your browser — tabs, bookmarks, history, page interactions, and much more. All commands work **100% offline**. Say **\"help\"** to see everything I can do!";
    }

    // How are you
    if (/how\s+are\s+you|how\s+do\s+you\s+do/.test(lower)) {
      return "I'm doing great, thanks for asking! 🤖 Ready to help you with anything. Try a command!";
    }

    // Default
    return `I'm not sure what you mean by **"${input}"**. Here are some things I can do:\n\n` +
      `• **\"open YouTube\"** — navigate to sites\n` +
      `• **\"close tab\"** — manage tabs\n` +
      `• **\"bookmark this page\"** — manage bookmarks\n` +
      `• **\"screenshot\"** — take screenshots\n` +
      `• **\"set timer 5 minutes\"** — set timers\n` +
      `• **\"help\"** — see all commands\n\n` +
      `💡 I learn from you! The more you use me, the better I understand your commands.`;
  }

  /**
   * Summarize page content using AI (optional — only feature that uses AI)
   */
  async function summarizePage(pageText, pageUrl) {
    const content = pageText.substring(0, 4000);

    // Try AI summarization
    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [{
            role: 'system',
            content: 'You are a helpful assistant. Provide concise, clear summaries using bullet points.'
          }, {
            role: 'user',
            content: `Summarize this webpage content in 3-4 concise bullet points. URL: ${pageUrl}\n\nContent:\n${content}`
          }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        return json.choices?.[0]?.message?.content || localSummarize(pageText);
      }
    } catch (e) {}

    // Fallback: local summarization (no AI)
    return localSummarize(pageText);
  }

  /**
   * Local summarization — extract key sentences without AI
   */
  function localSummarize(text) {
    const sentences = text.replace(/\n+/g, '. ')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300);

    if (sentences.length === 0) return 'Could not extract meaningful content from this page.';

    // Pick first sentence and a few important ones
    const summary = [];
    summary.push(sentences[0]);

    // Find sentences with important keywords
    const importantWords = ['important', 'key', 'main', 'significant', 'conclusion', 'result', 'summary', 'feature'];
    for (const s of sentences.slice(1)) {
      if (summary.length >= 4) break;
      const lower = s.toLowerCase();
      if (importantWords.some(w => lower.includes(w)) || s.length > 50) {
        if (!summary.includes(s)) summary.push(s);
      }
    }

    // Fill remaining slots with evenly spaced sentences
    while (summary.length < 4 && sentences.length > summary.length) {
      const idx = Math.floor(sentences.length * summary.length / 4);
      if (!summary.includes(sentences[idx])) {
        summary.push(sentences[idx]);
      } else break;
    }

    return summary.map(s => `• ${s}`).join('\n');
  }

  /**
   * Generate the help text
   */
  function getHelpText() {
    return `Here's everything I can do (all works **offline**!):

**🌐 Navigation**
- "Open YouTube" / "Go to google.com"
- "Open youtube and gmail" (multiple sites!)
- "Search for [query]"
- "Go back" / "Go forward" / "Refresh"
- "Open work mode" (workspace preset)

**📑 Tab Management**
- "New tab" / "Close tab"
- "Next tab" / "Previous tab" / "Switch to tab 3"
- "Close all other tabs" / "Close all youtube tabs"
- "Close duplicates" / "Close last 3 tabs"
- "Pin tab" / "Mute tab" / "Duplicate tab"
- "Sort tabs" / "Move tab left/right"
- "Reopen tab" / "Tab count"
- "Group tabs as work" / "Ungroup tabs"
- "Discard tab" / "Current tab info"

**🪟 Window Management**
- "New window" / "Incognito window"
- "Close window" / "List windows"
- "Fullscreen" / "Minimize window"

**⭐ Bookmarks**
- "Bookmark this page" / "Show bookmarks"
- "Search bookmarks for [query]"
- "Remove bookmark" / "Open all bookmarks"

**📜 History & Data**
- "Show history" / "Search history for [query]"
- "Clear history" / "Clear cache" / "Clear cookies"

**🖱️ Page Interaction**
- "Click on [button/link text]"
- "Type [text] in [field]"
- "Scroll down/up/to top/to bottom"
- "Scroll to comments" / "Auto scroll" / "Stop scrolling"
- "Find [text] on page"

**📝 Page Tools**
- "Summarize this page" / "Read this page"
- "Reading mode" / "Force dark mode on this site"
- "Copy url" / "Copy title" / "Copy all links"
- "Page stats" / "Word count"
- "QR code" / "Print" / "View source"

**📋 Notes**
- "Note: buy groceries" / "Show notes"
- "Delete note 1" / "Clear notes"

**⏰ Timers**
- "Set timer 5 minutes" / "Timer 30 seconds"
- "Show timers" / "Cancel timer"

**🔧 System**
- "Screenshot" / "Zoom in/out/reset"
- "Zoom to 150%" / "Show top sites"
- "Dark mode" / "Light mode"

**⚙️ Browser Settings (voice-controlled!)**
- "Open settings" / "Privacy settings" / "Security settings"
- "Password settings" / "Autofill settings"
- "Search engine settings" / "Appearance settings"
- "Font settings" / "Download settings"
- "Language settings" / "Accessibility settings"
- "Notification settings" / "Camera settings"
- "Microphone settings" / "Location settings"
- "Cookie settings" / "Pop-up settings"
- "Sync settings" / "System settings"
- "Ad settings" / "JavaScript settings"
- "Reset chrome settings" / "Chrome flags"
- "Default browser" / "Startup settings"
- "Shortcuts" / "Extensions" / "Task manager"
- "DevTools" / "GPU info" / "Network logs"

**💻 Desktop Control (Native Host)**
- "Open calculator" / "Launch notepad"
- "Install VLC" / "Install Firefox" (via winget!)
- "Open downloads folder" / "Open documents"
- "Lock computer" / "Sleep computer"
- "Shutdown" / "Restart"

**🧠 Learning**
- "When I say yt, open youtube" (teach custom commands)
- "Learning stats" / "Recent commands"

Just speak or type naturally — I learn from you! 🚀`;
  }

  return {
    processInput,
    summarizePage,
    getHelpText,
    generateLocalResponse
  };
})();
