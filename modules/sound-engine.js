// ============================================================
// Jarvis AI — Sound Engine
// Procedural audio feedback via Web Audio API (no files needed)
// ============================================================

const SoundEngine = (() => {
  'use strict';

  let ctx = null;
  let enabled = true;

  function getContext() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    return ctx;
  }

  function setEnabled(val) {
    enabled = val;
  }

  // ── Core tone generator ─────────────────────────────────
  function playTone(frequency, duration, type = 'sine', volume = 0.15, rampDown = true) {
    if (!enabled) return;
    const ac = getContext();
    if (!ac) return;

    // Resume if suspended (autoplay policy)
    if (ac.state === 'suspended') ac.resume();

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime);
    gain.gain.setValueAtTime(volume, ac.currentTime);

    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  }

  // ── Multi-tone sequence ─────────────────────────────────
  function playSequence(tones) {
    if (!enabled) return;
    const ac = getContext();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();

    let offset = 0;
    for (const tone of tones) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = tone.type || 'sine';
      osc.frequency.setValueAtTime(tone.freq, ac.currentTime + offset);
      gain.gain.setValueAtTime(tone.vol || 0.12, ac.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + offset + tone.dur);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(ac.currentTime + offset);
      osc.stop(ac.currentTime + offset + tone.dur);

      offset += tone.gap || tone.dur;
    }
  }

  // ── Sound Presets ───────────────────────────────────────

  // Bright ascending chime — command received
  function playCommandReceived() {
    playSequence([
      { freq: 880, dur: 0.06, gap: 0.07, vol: 0.08 },
      { freq: 1320, dur: 0.08, gap: 0.09, vol: 0.1 }
    ]);
  }

  // Satisfying success ding — action completed
  function playSuccess() {
    playSequence([
      { freq: 523, dur: 0.08, gap: 0.06, type: 'sine', vol: 0.12 },
      { freq: 659, dur: 0.08, gap: 0.06, type: 'sine', vol: 0.14 },
      { freq: 784, dur: 0.15, type: 'sine', vol: 0.12 }
    ]);
  }

  // Soft error buzz
  function playError() {
    playSequence([
      { freq: 220, dur: 0.12, gap: 0.08, type: 'sawtooth', vol: 0.08 },
      { freq: 180, dur: 0.18, type: 'sawtooth', vol: 0.06 }
    ]);
  }

  // Mic activation — rising tone
  function playVoiceStart() {
    playSequence([
      { freq: 440, dur: 0.06, gap: 0.05, vol: 0.1 },
      { freq: 660, dur: 0.06, gap: 0.05, vol: 0.12 },
      { freq: 880, dur: 0.1, vol: 0.1 }
    ]);
  }

  // Mic deactivation — falling tone
  function playVoiceEnd() {
    playSequence([
      { freq: 880, dur: 0.06, gap: 0.05, vol: 0.08 },
      { freq: 440, dur: 0.12, vol: 0.06 }
    ]);
  }

  // Subtle click
  function playClick() {
    playTone(1200, 0.04, 'sine', 0.06);
  }

  // Notification bell
  function playNotification() {
    playSequence([
      { freq: 988, dur: 0.1, gap: 0.12, type: 'sine', vol: 0.15 },
      { freq: 1319, dur: 0.1, gap: 0.12, type: 'sine', vol: 0.12 },
      { freq: 988, dur: 0.15, type: 'sine', vol: 0.1 }
    ]);
  }

  // Typing keystroke
  function playKeystroke() {
    const freq = 800 + Math.random() * 400;
    playTone(freq, 0.02, 'sine', 0.03, true);
  }

  // Timer done — urgent chime
  function playTimerDone() {
    playSequence([
      { freq: 1047, dur: 0.12, gap: 0.15, vol: 0.18 },
      { freq: 1319, dur: 0.12, gap: 0.15, vol: 0.18 },
      { freq: 1568, dur: 0.12, gap: 0.15, vol: 0.18 },
      { freq: 2093, dur: 0.3, vol: 0.15 }
    ]);
  }

  return {
    setEnabled,
    playCommandReceived,
    playSuccess,
    playError,
    playVoiceStart,
    playVoiceEnd,
    playClick,
    playNotification,
    playKeystroke,
    playTimerDone
  };
})();
