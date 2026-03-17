# Caption Highlighter

Chrome extension for Google Meet that:

- highlights glossary terms in live captions
- creates AI meeting notes from captions
- syncs those notes into a selected Google Docs document

## Setup

```bash
pnpm install
pnpm dev
```

Load the `extension/` directory in `chrome://extensions`.

## Main Commands

```bash
pnpm typecheck
pnpm test
pnpm build
```

## User Setup Flow

1. Open the extension options page.
2. Save a Google AI Studio key.
3. Allow sending captions to Google AI and grant browser access.
4. Open a Google Docs tab and select it as the sync target.
5. Import or edit glossary entries for caption highlighting.

## Notes

- Google Docs sync replaces the document body with the latest meeting-note snapshot.
- The Meet-side Google Docs selector remains available for quick rebinding during a call.
