// ============================================================
// Jarvis AI — Macro Engine
// Record, save, and replay sequences of browser actions
// ============================================================

const MacroEngine = (() => {
  'use strict';

  let isRecording = false;
  let currentRecording = [];
  let macros = {};

  // Load saved macros
  function init() {
    try {
      const saved = localStorage.getItem('jarvis-macros');
      if (saved) macros = JSON.parse(saved);
    } catch (e) {}
  }

  function startRecording() {
    isRecording = true;
    currentRecording = [];
    return { success: true };
  }

  function stopRecording() {
    isRecording = false;
    return { success: true, steps: currentRecording.length };
  }

  function saveMacro(name) {
    if (currentRecording.length === 0) {
      return { error: 'No actions recorded' };
    }
    const safeName = name.toLowerCase().trim();
    macros[safeName] = {
      name: safeName,
      steps: [...currentRecording],
      created: Date.now()
    };
    localStorage.setItem('jarvis-macros', JSON.stringify(macros));
    const stepCount = currentRecording.length;
    currentRecording = [];
    return { success: true, name: safeName, steps: stepCount };
  }

  function recordAction(intent, data) {
    if (!isRecording) return;
    currentRecording.push({ intent, data, timestamp: Date.now() });
  }

  function listMacros() {
    const list = Object.values(macros).map(m => ({
      name: m.name,
      steps: m.steps.length,
      created: m.created
    }));
    return { success: true, macros: list };
  }

  function deleteMacro(name) {
    const safeName = name.toLowerCase().trim();
    if (macros[safeName]) {
      delete macros[safeName];
      localStorage.setItem('jarvis-macros', JSON.stringify(macros));
      return { success: true, name: safeName };
    }
    return { error: `Macro "${name}" not found` };
  }

  function getMacro(name) {
    const safeName = name.toLowerCase().trim();
    return macros[safeName] || null;
  }

  return {
    init,
    get isRecording() { return isRecording; },
    startRecording,
    stopRecording,
    saveMacro,
    recordAction,
    listMacros,
    deleteMacro,
    getMacro
  };
})();
