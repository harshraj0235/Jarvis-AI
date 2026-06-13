// ============================================================
// Jarvis AI — Voice Engine
// Web Speech API for speech-to-text and text-to-speech
// ============================================================

const VoiceEngine = (() => {
  'use strict';

  let recognition = null;
  let isListening = false;
  let onResultCallback = null;
  let onInterimCallback = null;
  let onErrorCallback = null;
  let onEndCallback = null;
  let continuousMode = false;

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSynthesis = window.speechSynthesis;

  const isSupported = !!SpeechRecognition;

  /**
   * Initialize speech recognition
   */
  function init(options = {}) {
    if (!isSupported) {
      console.warn('[Jarvis] Speech Recognition not supported in this browser');
      return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = options.lang || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterimCallback) {
        onInterimCallback(interimTranscript);
      }

      if (finalTranscript && onResultCallback) {
        onResultCallback(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('[Jarvis] Speech recognition error:', event.error);
      isListening = false;

      if (onErrorCallback) {
        let message = 'Voice recognition error';
        switch (event.error) {
          case 'no-speech':
            message = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            message = 'No microphone found. Please connect a microphone.';
            break;
          case 'not-allowed':
            message = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'network':
            message = 'Network error during voice recognition.';
            break;
          case 'aborted':
            message = 'Voice recognition was cancelled.';
            break;
        }
        onErrorCallback(message, event.error);
      }
    };

    recognition.onend = () => {
      isListening = false;
      if (onEndCallback) onEndCallback();

      // Auto-restart if continuous mode is enabled
      if (continuousMode) {
        setTimeout(() => {
          if (continuousMode) startListening();
        }, 300);
      }
    };

    recognition.onstart = () => {
      isListening = true;
    };

    return true;
  }

  /**
   * Start listening for voice input
   */
  function startListening() {
    if (!recognition) {
      if (!init()) return false;
    }

    try {
      recognition.start();
      return true;
    } catch (err) {
      // Already started
      if (err.name === 'InvalidStateError') {
        recognition.stop();
        setTimeout(() => {
          try { recognition.start(); } catch(e) {}
        }, 100);
        return true;
      }
      console.error('[Jarvis] Failed to start recognition:', err);
      return false;
    }
  }

  /**
   * Stop listening
   */
  function stopListening() {
    continuousMode = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    isListening = false;
  }

  /**
   * Enable continuous listening mode
   */
  function setContinuousMode(enabled) {
    continuousMode = enabled;
    if (enabled && !isListening) {
      startListening();
    } else if (!enabled && isListening) {
      stopListening();
    }
  }

  /**
   * Speak text using speech synthesis
   */
  function speak(text, options = {}) {
    if (!speechSynthesis) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;
    utterance.lang = options.lang || 'en-US';

    // Try to use a natural voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  function stopSpeaking() {
    if (speechSynthesis) speechSynthesis.cancel();
  }

  /**
   * Set callback functions
   */
  function onResult(cb) { onResultCallback = cb; }
  function onInterim(cb) { onInterimCallback = cb; }
  function onError(cb) { onErrorCallback = cb; }
  function onEnd(cb) { onEndCallback = cb; }

  return {
    isSupported,
    init,
    startListening,
    stopListening,
    setContinuousMode,
    speak,
    stopSpeaking,
    onResult,
    onInterim,
    onError,
    onEnd,
    get isListening() { return isListening; }
  };
})();
