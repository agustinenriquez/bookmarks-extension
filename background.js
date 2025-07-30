// Background service worker for tracking visited URLs
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smart Bookmarks & History extension installed');
});

// Handle keyboard shortcut to open detached window
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-window') {
    openDetachedWindow();
  }
});

// Function to open detached window
function openDetachedWindow() {
  chrome.windows.create({
    url: 'window.html',
    type: 'popup',
    width: 500,
    height: 700,
    left: 100,
    top: 100
  });
}

// Track tab updates (when user navigates to new URLs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Only track http/https URLs
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      saveDailyVisit(tab.url, tab.title);
    }
  }
});

// Track tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      saveDailyVisit(tab.url, tab.title);
    }
  });
});

// Save visited URL to daily storage
async function saveDailyVisit(url, title) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const storageKey = `dailyVisits_${today}`;
  
  try {
    const result = await chrome.storage.local.get([storageKey]);
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
    await chrome.storage.local.set({ [storageKey]: dailyVisits });
  } catch (error) {
    console.error('Error saving daily visit:', error);
  }
}

// Clean up old daily visits (keep only last 7 days)
async function cleanupOldVisits() {
  try {
    const allKeys = await chrome.storage.local.get();
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
      await chrome.storage.local.remove(keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning up old visits:', error);
  }
}

// Run cleanup daily
chrome.alarms.create('cleanupOldVisits', { delayInMinutes: 1, periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupOldVisits') {
    cleanupOldVisits();
  }
});