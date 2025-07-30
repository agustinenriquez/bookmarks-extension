# Smart Bookmarks & History - Firefox Edition

Firefox-compatible version of the Smart Bookmarks & History extension.

## Installation

### Method 1: Temporary Installation (Development)
1. Open Firefox and navigate to `about:debugging`
2. Click on "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to the `firefox/` directory and select `manifest.json`
5. The extension will be loaded temporarily (removed on Firefox restart)

### Method 2: Permanent Installation (Signed)
1. Package the extension: `cd firefox && zip -r smart-bookmarks-firefox.zip *`
2. Submit to Mozilla Add-ons for signing
3. Install the signed `.xpi` file

## Firefox-Specific Changes

- **Manifest Version**: Uses v2 (Firefox standard)
- **Browser Action**: Uses `browser_action` instead of `action`
- **Background Scripts**: Uses array of scripts instead of service worker
- **API Compatibility**: Uses `browser` API with Chrome fallback
- **Applications Section**: Includes Firefox-specific metadata

## Features

All Chrome features are supported:
- Daily visit tracking
- Bookmark management
- Search functionality
- Detachable window
- Auto-cleanup

## Permissions

Same permissions as Chrome version:
- Access to tabs and bookmarks
- Local storage
- History access
- All URLs access for tracking

## Development Notes

The Firefox version uses the WebExtensions API which is largely compatible with Chrome's extension API. The main differences are in the manifest format and some API naming conventions.