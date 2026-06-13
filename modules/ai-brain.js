// ============================================================
// Jarvis AI — AI Brain (Refactored)
// ALL browser commands are LOCAL-ONLY (no AI dependency)
// AI is OPTIONAL — only used for chat conversation if enabled
// ============================================================

const AIBrain = (() => {
  'use strict';

  /**
   * Process user input — LOCAL-FIRST, AI-FREE for commands
   */
  async function processInput(input) {
    const trimmed = input.trim();
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
   * Smart guess: try to figure out what the user wants without AI
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

    // Check if it contains a known site name
    const sites = CommandPatterns.siteShortcuts;
    for (const [name, url] of Object.entries(sites)) {
      if (lower.includes(name) && (lower.includes('open') || lower.includes('go') || lower.includes('show'))) {
        return {
          intent: 'navigate',
          data: { url, siteName: name, target: name },
          response: null
        };
      }
    }

    // Check for action keywords
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
      'note': lower.includes('show') || lower.includes('list') ? 'listNotes' : null,
      'timer': lower.includes('show') || lower.includes('list') ? 'listTimers' : null
    };

    for (const [keyword, intent] of Object.entries(actionKeywords)) {
      if (intent && words.some(w => w.startsWith(keyword))) {
        const data = {};
        if (intent === 'scroll') {
          data.direction = lower.includes('up') ? 'up' : 'down';
        }
        return { intent, data, response: null };
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
