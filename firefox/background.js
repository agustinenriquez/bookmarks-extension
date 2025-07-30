// Background script for Firefox - proper API detection
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Initialize extension
browserAPI.runtime.onInstalled.addListener(() => {
  console.log('Smart Bookmarks & History extension installed');
  console.log('Browser API available:', !!browserAPI);
  console.log('Storage API available:', !!browserAPI.storage);
  console.log('Bookmarks API available:', !!browserAPI.bookmarks);
  console.log('Tabs API available:', !!browserAPI.tabs);
});

// Handle keyboard shortcut to open detached window
if (browserAPI.commands && browserAPI.commands.onCommand) {
  browserAPI.commands.onCommand.addListener((command) => {
    if (command === 'open-window') {
      openDetachedWindow();
    }
  });
}

// Function to open detached window
function openDetachedWindow() {
  browserAPI.windows.create({
    url: 'window.html',
    type: 'popup',
    width: 500,
    height: 700,
    left: 100,
    top: 100
  });
}

// Track tab updates (when user navigates to new URLs)
browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log('Tab updated:', {tabId, changeInfo, url: tab.url, title: tab.title});
  if (changeInfo.status === 'complete' && tab.url) {
    // Only track http/https URLs
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      console.log('Saving daily visit:', tab.url, tab.title);
      
      // Check if tab is in private browsing mode
      const isPrivate = tab.incognito;
      await saveDailyVisit(tab.url, tab.title, isPrivate);
    }
  }
});

// Track tab activation (when user switches tabs)
browserAPI.tabs.onActivated.addListener((activeInfo) => {
  browserAPI.tabs.get(activeInfo.tabId).then(async (tab) => {
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      const isPrivate = tab.incognito;
      await saveDailyVisit(tab.url, tab.title, isPrivate);
    }
  }).catch(error => {
    console.error('Error getting tab info:', error);
  });
});

// Save visited URL to daily storage
async function saveDailyVisit(url, title, isPrivate = false) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const storageKey = isPrivate ? `privateVisits_${today}` : `dailyVisits_${today}`;
  
  console.log('Attempting to save daily visit:', {url, title, storageKey, isPrivate});
  
  try {
    const result = await browserAPI.storage.local.get([storageKey]);
    const dailyVisits = result[storageKey] || [];
    
    // Check if URL already exists today
    const existingIndex = dailyVisits.findIndex(visit => visit.url === url);
    
    if (existingIndex >= 0) {
      // Update existing entry with latest timestamp and title
      dailyVisits[existingIndex] = {
        url,
        title: title || dailyVisits[existingIndex].title,
        lastVisited: Date.now(),
        visitCount: dailyVisits[existingIndex].visitCount + 1
      };
    } else {
      // Add new entry
      dailyVisits.push({
        url,
        title: title || url,
        lastVisited: Date.now(),
        visitCount: 1
      });
    }
    
    // Keep only last 100 entries per day
    if (dailyVisits.length > 100) {
      dailyVisits.sort((a, b) => b.lastVisited - a.lastVisited);
      dailyVisits.splice(100);
    }
    
    // Save updated list
    await browserAPI.storage.local.set({ [storageKey]: dailyVisits });
    console.log('Successfully saved daily visit. Total visits today:', dailyVisits.length);
  } catch (error) {
    console.error('Error saving daily visit:', error);
  }
}

// Clean up old daily visits (keep only last 7 days)
async function cleanupOldVisits() {
  try {
    const allKeys = await browserAPI.storage.local.get();
    const keysToRemove = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const key in allKeys) {
      if (key.startsWith('dailyVisits_')) {
        const dateStr = key.replace('dailyVisits_', '');
        const date = new Date(dateStr);
        if (date < sevenDaysAgo) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await browserAPI.storage.local.remove(keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning up old visits:', error);
  }
}

// Clean up private browsing data when windows close
browserAPI.windows.onRemoved.addListener(async (windowId) => {
  try {
    // Get all windows to check if any private windows remain
    const windows = await browserAPI.windows.getAll();
    const hasPrivateWindows = windows.some(win => win.incognito);
    
    if (!hasPrivateWindows) {
      // No private windows remain, clean up private data
      console.log('All private windows closed, cleaning up private data');
      await cleanupPrivateData();
    }
  } catch (error) {
    console.error('Error checking for private windows:', error);
  }
});

// Clean up private browsing data
async function cleanupPrivateData() {
  try {
    const allKeys = await browserAPI.storage.local.get();
    const keysToRemove = [];
    
    for (const key in allKeys) {
      if (key.startsWith('privateVisits_')) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await browserAPI.storage.local.remove(keysToRemove);
      console.log('Cleaned up private browsing data:', keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning up private data:', error);
  }
}

// Run cleanup daily - Firefox compatible
if (browserAPI.alarms) {
  browserAPI.alarms.create('cleanupOldVisits', { delayInMinutes: 1, periodInMinutes: 24 * 60 });
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupOldVisits') {
      cleanupOldVisits();
    }
  });
} else {
  // Fallback for Firefox versions without alarms API
  setInterval(cleanupOldVisits, 24 * 60 * 60 * 1000); // Run daily
}