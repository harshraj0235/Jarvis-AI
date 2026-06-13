# Jarvis AI - Browser Automation Agent

A powerful, entirely **offline**, zero-AI-dependency browser automation extension for Google Chrome. It leverages regex-based intent classification, native device integration via Node.js, and local capabilities to give you full voice and text control over your browser and desktop.

## 🚀 Features

- **Offline First**: All processing, intent matching, and command parsing happens completely locally in the browser. Zero reliance on OpenAI or external cloud AI services.
- **Voice Control**: Uses the local Web Speech API (running in a background offscreen document) to provide always-on or click-to-talk voice commands.
- **Browser Automation**: 90+ recognized commands for tab management, window management, bookmarks, history, settings, and page interactions.
- **Full Settings Control**: Command every Chrome settings page via voice (`"open privacy settings"`, `"open password settings"`, etc.).
- **Native Desktop Integration**: Comes with a local Node.js Native Messaging Host.
  - Launch PC applications (`"open calculator"`)
  - Install Windows applications silently using Winget (`"install VLC"`)
  - Control system power (`"lock computer"`, `"shutdown"`)
  - Open local directories (`"open downloads folder"`)
- **Smart Adaptive Learning**: Teach the assistant custom commands (`"when I say yt, open youtube"`).
- **Productivity Tools**: Built-in alarms, timers, notes, page summarization, screenshot capture, and QR code generation.

## 🛠️ Installation

### 1. Load the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the folder containing this extension (`d:\New folder (3)`).

### 2. Setup the Native Desktop Host (Windows Only)
To allow the extension to control your desktop (open apps, install software, etc.):
1. Ensure you have **Node.js** installed on your computer.
2. Navigate into the `native-host` directory.
3. Double-click the `install.bat` file.
4. This will register the `com.jarvis.desktop` native host in your Windows Registry so Chrome can communicate with it securely.

## 📝 Example Commands

### Tab & Window Management
- `"close all other tabs"`
- `"group these tabs as work"`
- `"new incognito window"`

### Page Interaction
- `"scroll down"`
- `"copy title"`
- `"find [word] on page"`
- `"screenshot"`

### Desktop Automation (Requires Native Host)
- `"open notepad"`
- `"install firefox"`
- `"lock my computer"`

## 🔧 Architecture

- **`manifest.json` (V3)**: Configures permissions (`offscreen`, `nativeMessaging`, etc.).
- **`background.js`**: Central event router, manages timers, and communicates with the Native Host.
- **`sidepanel.js`**: The chat UI and command execution dispatcher.
- **`content.js`**: Injected into web pages to perform DOM operations (scrolling, clicking, reading).
- **`offscreen.html / js`**: Hosts the Web Speech API to provide continuous voice recognition without needing a visible tab.
- **`modules/ai-brain.js` & `command-patterns.js`**: The local intelligence engine that uses regex patterns to extract user intents.
- **`native-host/jarvis-host.js`**: The Node.js application that executes OS-level commands (child_process).
