# Privacy Policy for Jarvis: AI Voice Assistant & Browser Agent

**Last Updated:** June 13, 2026

At **Jarvis**, your privacy and data security are our absolute highest priorities. This Privacy Policy outlines how your data is handled when you use the Jarvis Chrome Extension.

## 1. 100% Offline & Local Operation
Jarvis is designed from the ground up to be a privacy-first AI agent. 
- **No Data Collection:** We do not collect, store, or transmit your personal data, browsing history, bookmarks, or any other information to external servers.
- **Local Processing:** All voice recognition (via Web Speech API), natural language processing, and command execution happens **locally on your device**.
- **No Cloud Dependency:** With the exception of the optional AI-based page summarization feature (which relies on an anonymous third-party API call if utilized), all core functionalities are performed offline.

## 2. Permissions & How They Are Used
To function as an effective browser agent, Jarvis requires several Chrome permissions. **None of the data accessed via these permissions ever leaves your browser.**
- `activeTab`, `tabs`, `tabGroups`: Used strictly locally to navigate, switch, close, or organize your tabs based on your commands.
- `bookmarks`, `history`: Used locally so you can search for and open your saved pages or previous history via voice/text commands.
- `downloads`: Used locally to open the downloads page or manage downloaded files if requested.
- `storage`: Used to save your local settings, command history, and custom macros entirely within your browser's local storage.
- `scripting`, `sidePanel`: Used to inject the floating command palette and side panel UI into your browser for interaction.
- `notifications`: Used to provide non-intrusive feedback when actions are executed.

## 3. Third-Party Services
If you explicitly use the "Summarize this page" feature, the text content of the active page is sent anonymously to a third-party AI provider (Pollinations AI) to generate the summary. This is a one-time, stateless request, and no personally identifiable information or user IDs are attached.

## 4. Voice Data
Voice commands are processed entirely using your operating system and browser's built-in Web Speech API. We do not record, store, or transmit your voice clips.

## 5. Changes to This Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy. You are advised to review this Privacy Policy periodically for any changes.

## 6. Contact
If you have any questions or concerns about this Privacy Policy or our data practices, please create an issue on our [GitHub Repository](https://github.com/harshraj0235/Jarvis-AI).
