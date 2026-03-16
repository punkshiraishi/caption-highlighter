# Google Docs Live Sync

- Users bind an already-open Google Docs tab from Options.
- The binding stores the tab id plus the Google Docs document id so the background script can recover if the tab id changes but the same doc is reopened.
- Meet whiteboard markdown is pushed to the background on every meaningful summary update and relayed to the bound Docs tab.
- The Docs content script owns all document-writing logic and replaces the current document body with the latest markdown snapshot.
- If the bound tab is gone, the feature falls back to a stale status and requires the user to rebind from Options.
