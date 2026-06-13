// ============================================================
// Jarvis AI — Learning Engine
// Learns from user behavior to improve command matching
// Stores patterns locally in chrome.storage — NO AI needed
// ============================================================

const LearningEngine = (() => {
  'use strict';

  // In-memory cache of learned data
  let learnedAliases = {};   // "yt" → { intent: "navigate", data: { url: "https://youtube.com" } }
  let commandHistory = [];    // Last 200 commands with results
  let commandFrequency = {};  // Tracks how often each command is used
  let corrections = {};       // Tracks when user retries after failure
  let customPatterns = [];    // User-defined "when I say X, do Y"

  const MAX_HISTORY = 200;
  const STORAGE_KEY = 'jarvis_learning_data';

  /**
   * Initialize — load learned data from chrome.storage
   */
  async function init() {
    try {
      // PRO UPGRADE: Using chrome.storage.sync instead of local for Cross-Device Cloud Sync
      const stored = await chrome.storage.sync.get(STORAGE_KEY);
      if (stored[STORAGE_KEY]) {
        const data = stored[STORAGE_KEY];
        learnedAliases = data.aliases || {};
        commandHistory = data.history || [];
        commandFrequency = data.frequency || {};
        corrections = data.corrections || {};
        customPatterns = data.customPatterns || [];
        console.log(`[Jarvis] Learning engine loaded from Cloud Sync: ${Object.keys(learnedAliases).length} aliases, ${commandHistory.length} history items`);
      }
    } catch (e) {
      // Fallback to localStorage if chrome.storage isn't available (sidepanel context)
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          learnedAliases = data.aliases || {};
          commandHistory = data.history || [];
          commandFrequency = data.frequency || {};
          corrections = data.corrections || {};
          customPatterns = data.customPatterns || [];
        }
      } catch (e2) {}
    }
  }

  /**
   * Save learned data
   */
  async function save() {
    const data = {
      aliases: learnedAliases,
      history: commandHistory.slice(-MAX_HISTORY),
      frequency: commandFrequency,
      corrections,
      customPatterns
    };

    try {
      // PRO UPGRADE: Using chrome.storage.sync instead of local
      await chrome.storage.sync.set({ [STORAGE_KEY]: data });
    } catch (e) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e2) {}
    }
  }

  /**
   * Record a command and its result (called after every command)
   */
  function recordCommand(input, intent, data, success) {
    const normalized = input.trim().toLowerCase();
    const timestamp = Date.now();

    // Add to history
    commandHistory.push({ input: normalized, intent, data, success, timestamp });
    if (commandHistory.length > MAX_HISTORY) {
      commandHistory = commandHistory.slice(-MAX_HISTORY);
    }

    // Update frequency
    commandFrequency[normalized] = (commandFrequency[normalized] || 0) + 1;

    // If this command succeeded, learn the alias
    if (success && intent !== 'chat' && intent !== 'none' && intent !== 'help') {
      learnedAliases[normalized] = { intent, data };
    }

    // Check for correction pattern: if last command failed and this one succeeded
    // with similar intent, learn the correction
    if (success && commandHistory.length >= 2) {
      const prev = commandHistory[commandHistory.length - 2];
      if (!prev.success && (timestamp - prev.timestamp) < 30000) {
        // User corrected within 30 seconds — learn the failed input maps to this intent
        corrections[prev.input] = { intent, data, correctedTo: normalized };
        learnedAliases[prev.input] = { intent, data };
      }
    }

    // Save periodically (every 5 commands)
    if (commandHistory.length % 5 === 0) {
      save();
    }
  }

  /**
   * Try to match input against learned patterns
   * Returns { intent, data } or null
   */
  function matchLearned(input) {
    const normalized = input.trim().toLowerCase();

    // 1. Exact match from learned aliases
    if (learnedAliases[normalized]) {
      return learnedAliases[normalized];
    }

    // 2. Check corrections
    if (corrections[normalized]) {
      return { intent: corrections[normalized].intent, data: corrections[normalized].data };
    }

    // 3. Check custom patterns
    for (const pattern of customPatterns) {
      if (pattern.trigger.toLowerCase() === normalized) {
        return { intent: pattern.intent, data: pattern.data };
      }
    }

    // 4. Fuzzy match against known aliases (Levenshtein distance)
    const bestFuzzy = findFuzzyMatch(normalized);
    if (bestFuzzy) {
      return bestFuzzy;
    }

    return null;
  }

  /**
   * Fuzzy matching using Levenshtein distance
   */
  function findFuzzyMatch(input) {
    let bestMatch = null;
    let bestDistance = Infinity;
    const maxDistance = Math.max(2, Math.floor(input.length * 0.3)); // Allow 30% errors

    for (const [key, value] of Object.entries(learnedAliases)) {
      const dist = levenshtein(input, key);
      if (dist < bestDistance && dist <= maxDistance) {
        bestDistance = dist;
        bestMatch = value;
      }
    }

    return bestMatch;
  }

  /**
   * Levenshtein distance calculation
   */
  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Add a custom pattern ("when I say X, do Y")
   */
  function addCustomPattern(trigger, intent, data) {
    customPatterns.push({ trigger: trigger.toLowerCase(), intent, data, created: Date.now() });
    learnedAliases[trigger.toLowerCase()] = { intent, data };
    save();
  }

  /**
   * Get most frequently used commands (for suggestions)
   */
  function getTopCommands(limit = 5) {
    return Object.entries(commandFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cmd, count]) => ({ command: cmd, count }));
  }

  /**
   * Get recent successful commands
   */
  function getRecentCommands(limit = 10) {
    return commandHistory
      .filter(c => c.success)
      .slice(-limit)
      .reverse()
      .map(c => ({ command: c.input, intent: c.intent, time: c.timestamp }));
  }

  /**
   * Get learning statistics
   */
  function getStats() {
    return {
      learnedAliases: Object.keys(learnedAliases).length,
      totalCommands: commandHistory.length,
      corrections: Object.keys(corrections).length,
      customPatterns: customPatterns.length,
      topCommands: getTopCommands(5)
    };
  }

  /**
   * Clear all learned data
   */
  async function clearAll() {
    learnedAliases = {};
    commandHistory = [];
    commandFrequency = {};
    corrections = {};
    customPatterns = [];
    await save();
  }

  return {
    init,
    save,
    recordCommand,
    matchLearned,
    addCustomPattern,
    getTopCommands,
    getRecentCommands,
    getStats,
    clearAll,
    levenshtein
  };
})();
