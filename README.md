# Smart Bookmarks & History Chrome Extension

A Chrome extension that tracks your daily browsing activity and provides easy access to both recently visited sites and bookmarks through a convenient popup interface.

## Features

- **Daily Visit Tracking**: Automatically tracks all sites you visit during the day
- **Smart Storage**: Keeps up to 100 sites per day, automatically cleans up data older than 7 days
- **Unified Interface**: View both today's visits and bookmarks in one popup
- **Quick Bookmarking**: Add/remove bookmarks directly from the popup
- **Search**: Search through both daily visits and bookmarks
- **Visit Counter**: See how many times you've visited each site today

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the extension directory
4. The extension icon will appear in your toolbar

## Usage

- Click the extension icon to open the popup
- Switch between "Today" and "Bookmarks" tabs
- Use the search box to filter results
- Click any site to open it in a new tab
- Use the ★ button to add/remove bookmarks
- Visit counts show how frequently you've accessed sites today

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker that tracks visited URLs
- `popup.html` - Popup interface HTML
- `popup.js` - Popup interface JavaScript logic
- `icons/` - Extension icons (16px, 48px, 128px)

## Permissions

- `tabs` - Access to tab information for URL tracking
- `bookmarks` - Read and modify bookmarks
- `history` - Access browsing history
- `storage` - Store daily visit data locally
- `activeTab` - Access currently active tab

## Privacy

All data is stored locally on your device using Chrome's storage API. No data is sent to external servers.