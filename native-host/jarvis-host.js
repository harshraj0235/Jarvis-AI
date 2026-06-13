const fs = require('fs');
const child_process = require('child_process');

// ── Native Messaging Protocol ──────────────────────────────
// Read messages from stdin (Chrome sends 4-byte length header followed by JSON)
let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  
  while (buffer.length >= 4) {
    const msgLength = buffer.readUInt32LE(0);
    
    if (buffer.length >= 4 + msgLength) {
      const msgBuffer = buffer.slice(4, 4 + msgLength);
      buffer = buffer.slice(4 + msgLength);
      
      try {
        const message = JSON.parse(msgBuffer.toString('utf8'));
        handleMessage(message);
      } catch (err) {
        sendMessage({ error: 'Failed to parse message: ' + err.message });
      }
    } else {
      break;
    }
  }
});

// Write messages to stdout (JSON followed by 4-byte length header)
function sendMessage(msg) {
  const jsonStr = JSON.stringify(msg);
  const msgBuffer = Buffer.from(jsonStr, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(msgBuffer.length, 0);
  
  process.stdout.write(lengthBuffer);
  process.stdout.write(msgBuffer);
}

// ── Command Handlers ────────────────────────────────────────

function handleMessage(message) {
  const { action, data } = message;

  switch (action) {
    case 'OPEN_APP':
      openApp(data.app);
      break;
      
    case 'INSTALL_APP':
      installApp(data.app);
      break;
      
    case 'RUN_COMMAND':
      runCommand(data.command);
      break;
      
    case 'SYSTEM_POWER':
      systemPower(data.mode);
      break;
      
    case 'OPEN_FOLDER':
      openFolder(data.folder);
      break;

    case 'ECHO':
      sendMessage({ action: 'ECHO_REPLY', message: 'Host is working!', data });
      break;
      
    default:
      sendMessage({ error: 'Unknown action: ' + action });
  }
}

// ── App Definitions ─────────────────────────────────────────

const appMap = {
  'calculator': 'calc',
  'notepad': 'notepad',
  'cmd': 'cmd',
  'command prompt': 'cmd',
  'powershell': 'powershell',
  'paint': 'mspaint',
  'explorer': 'explorer',
  'file explorer': 'explorer',
  'settings': 'ms-settings:',
  'word': 'start winword',
  'excel': 'start excel',
  'powerpoint': 'start powerpnt',
  'vscode': 'code',
  'code': 'code',
  'task manager': 'taskmgr',
  'control panel': 'control'
};

const wingetMap = {
  'vlc': 'VideoLAN.VLC',
  'vscode': 'Microsoft.VisualStudioCode',
  'firefox': 'Mozilla.Firefox',
  'chrome': 'Google.Chrome',
  'brave': 'Brave.Brave',
  'spotify': 'Spotify.Spotify',
  'discord': 'Discord.Discord',
  'zoom': 'Zoom.Zoom',
  'slack': 'SlackTechnologies.Slack',
  'notion': 'Notion.Notion',
  'python': 'Python.Python.3.11',
  'nodejs': 'OpenJS.NodeJS'
};

const folderMap = {
  'downloads': '%USERPROFILE%\\Downloads',
  'documents': '%USERPROFILE%\\Documents',
  'desktop': '%USERPROFILE%\\Desktop',
  'pictures': '%USERPROFILE%\\Pictures',
  'music': '%USERPROFILE%\\Music',
  'videos': '%USERPROFILE%\\Videos'
};

// ── Implementations ─────────────────────────────────────────

function openApp(appName) {
  const lowerName = appName.toLowerCase();
  const cmd = appMap[lowerName] || appName;
  
  child_process.exec(cmd, (error) => {
    if (error) {
      // If direct execution fails, try start
      child_process.exec(`start "" "${cmd}"`, (err2) => {
        if (err2) {
          sendMessage({ action: 'OPEN_APP_RESULT', success: false, error: `Could not open ${appName}` });
        } else {
          sendMessage({ action: 'OPEN_APP_RESULT', success: true, app: appName });
        }
      });
    } else {
      sendMessage({ action: 'OPEN_APP_RESULT', success: true, app: appName });
    }
  });
}

function installApp(appName) {
  const lowerName = appName.toLowerCase();
  const wingetId = wingetMap[lowerName] || appName;
  
  sendMessage({ action: 'INSTALL_APP_STATUS', status: `Starting installation of ${appName} via winget...` });
  
  const cmd = `winget install --id "${wingetId}" -e --accept-package-agreements --accept-source-agreements --silent`;
  
  child_process.exec(cmd, (error, stdout, stderr) => {
    if (error) {
      sendMessage({ action: 'INSTALL_APP_RESULT', success: false, error: stderr || error.message });
    } else {
      sendMessage({ action: 'INSTALL_APP_RESULT', success: true, app: appName, output: stdout });
    }
  });
}

function runCommand(command) {
  child_process.exec(command, (error, stdout, stderr) => {
    if (error) {
      sendMessage({ action: 'RUN_COMMAND_RESULT', success: false, error: stderr || error.message });
    } else {
      sendMessage({ action: 'RUN_COMMAND_RESULT', success: true, output: stdout });
    }
  });
}

function systemPower(mode) {
  let cmd = '';
  switch (mode.toLowerCase()) {
    case 'lock': cmd = 'rundll32.exe user32.dll,LockWorkStation'; break;
    case 'sleep': cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'; break;
    case 'shutdown': cmd = 'shutdown /s /t 0'; break;
    case 'restart': cmd = 'shutdown /r /t 0'; break;
    default: 
      sendMessage({ action: 'SYSTEM_POWER_RESULT', success: false, error: 'Unknown power mode' });
      return;
  }
  
  child_process.exec(cmd, (error) => {
    if (error) {
      sendMessage({ action: 'SYSTEM_POWER_RESULT', success: false, error: error.message });
    } else {
      sendMessage({ action: 'SYSTEM_POWER_RESULT', success: true, mode });
    }
  });
}

function openFolder(folderName) {
  const lowerName = folderName.toLowerCase();
  const path = folderMap[lowerName] || folderName;
  
  child_process.exec(`explorer "${path}"`, (error) => {
    if (error) {
      sendMessage({ action: 'OPEN_FOLDER_RESULT', success: false, error: error.message });
    } else {
      sendMessage({ action: 'OPEN_FOLDER_RESULT', success: true, folder: folderName });
    }
  });
}
