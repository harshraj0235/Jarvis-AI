// ============================================================
// Jarvis AI — Offscreen Voice Listener
// Runs in background, listens for voice commands even when
// the side panel is closed. Uses Web Speech API.
// ============================================================

(function() {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[Jarvis Offscreen] SpeechRecognition not available');
    return;
  }

  let recognition = null;
  let isListening = false;
  let restartTimeout = null;

  function startListening() {
    if (isListening) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript.length > 0) {
            console.log('[Jarvis Offscreen] Voice command:', transcript);
            // Send to background for processing
            chrome.runtime.sendMessage({
              action: 'OFFSCREEN_VOICE_COMMAND',
              data: { transcript }
            }).catch(() => {});
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Jarvis Offscreen] Error:', event.error);
      isListening = false;

      // Auto-restart on recoverable errors
      if (['no-speech', 'network', 'aborted'].includes(event.error)) {
        scheduleRestart(2000);
      } else if (event.error === 'not-allowed') {
        // Permission denied — stop trying
        console.error('[Jarvis Offscreen] Microphone permission denied');
      }
    };

    recognition.onend = () => {
      isListening = false;
      // Auto-restart to keep listening
      scheduleRestart(500);
    };

    recognition.onstart = () => {
      isListening = true;
      console.log('[Jarvis Offscreen] Listening started');
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('[Jarvis Offscreen] Start failed:', e);
      scheduleRestart(1000);
    }
  }

  function stopListening() {
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    isListening = false;
  }

  function scheduleRestart(delay) {
    if (restartTimeout) clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      startListening();
    }, delay);
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'START_OFFSCREEN_LISTENING') {
      startListening();
    } else if (message.action === 'STOP_OFFSCREEN_LISTENING') {
      stopListening();
    }
  });

  // Start listening immediately
  startListening();
})();
