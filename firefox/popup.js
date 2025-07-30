// Popup script for Firefox - proper API detection
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

let currentTab = 'today';
let allTodaySites = [];
let allBookmarks = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  setupTabSwitching();
  setupSearch();
  setupDetachButton();
  await loadTodaySites();
  await loadBookmarks();
});

// Setup tab switching
function setupTabSwitching() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  
  document.getElementById(`${tabName}Content`).style.display = 'block';
  currentTab = tabName;
  
  // Clear search when switching tabs
  document.getElementById('searchInput').value = '';
  applySearch('');
}

// Setup search functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    applySearch(e.target.value.toLowerCase());
  });
}

function applySearch(query) {
  if (currentTab === 'today') {
    const filteredSites = allTodaySites.filter(site => 
      site.title.toLowerCase().includes(query) || 
      site.url.toLowerCase().includes(query)
    );
    renderTodaySites(filteredSites);
  } else if (currentTab === 'bookmarks') {
    const filteredBookmarks = allBookmarks.filter(bookmark => 
      bookmark.title.toLowerCase().includes(query) || 
      bookmark.url.toLowerCase().includes(query)
    );
    renderBookmarks(filteredBookmarks);
  }
}

// Load today's visited sites
async function loadTodaySites() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we're in a private window
    const currentWindow = await browserAPI.windows.getCurrent();
    const isPrivate = currentWindow.incognito;
    
    // Load appropriate data based on private mode
    const regularKey = `dailyVisits_${today}`;
    const privateKey = `privateVisits_${today}`;
    
    let regularSites = [];
    let privateSites = [];
    
    if (isPrivate) {
      // In private mode, load both private session data and regular data
      const result = await browserAPI.storage.local.get([regularKey, privateKey]);
      regularSites = result[regularKey] || [];
      privateSites = result[privateKey] || [];
      
      // Show private sites first, then regular sites
      allTodaySites = [...privateSites, ...regularSites];
      
      // Update tab label to indicate private mode
      const todayTab = document.querySelector('[data-tab="today"]');
      if (todayTab) {
        todayTab.textContent = '🔒 Today (Private)';
      }
    } else {
      // In regular mode, only load regular sites
      const result = await browserAPI.storage.local.get([regularKey]);
      allTodaySites = result[regularKey] || [];
    }
    
    allTodaySites.sort((a, b) => b.lastVisited - a.lastVisited);
    renderTodaySites(allTodaySites);
  } catch (error) {
    console.error('Error loading today\'s sites:', error);
    renderEmptyState('todaySites', 'No sites visited today');
  }
}

// Load bookmarks
async function loadBookmarks() {
  try {
    const bookmarkTree = await browserAPI.bookmarks.getTree();
    allBookmarks = [];
    
    function extractBookmarks(nodes) {
      for (const node of nodes) {
        if (node.url) {
          allBookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded
          });
        }
        if (node.children) {
          extractBookmarks(node.children);
        }
      }
    }
    
    extractBookmarks(bookmarkTree);
    allBookmarks.sort((a, b) => b.dateAdded - a.dateAdded);
    
    renderBookmarks(allBookmarks);
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    renderEmptyState('bookmarksList', 'No bookmarks found');
  }
}

// Render today's sites
function renderTodaySites(sites) {
  const container = document.getElementById('todaySites');
  
  if (sites.length === 0) {
    renderEmptyState('todaySites', 'No sites visited today');
    return;
  }
  
  container.innerHTML = '';
  
  sites.forEach(site => {
    const li = document.createElement('li');
    li.className = 'site-item';
    li.dataset.url = site.url;
    
    const favicon = document.createElement('img');
    favicon.className = 'site-favicon';
    favicon.src = getFaviconUrl(site.url);
    favicon.onerror = () => {
      favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    };
    
    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    
    const siteTitle = document.createElement('div');
    siteTitle.className = 'site-title';
    siteTitle.textContent = site.title;
    
    const siteUrl = document.createElement('div');
    siteUrl.className = 'site-url';
    siteUrl.textContent = site.url;
    
    siteInfo.appendChild(siteTitle);
    siteInfo.appendChild(siteUrl);
    
    const siteMeta = document.createElement('div');
    siteMeta.className = 'site-meta';
    siteMeta.textContent = `${site.visitCount}x`;
    
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'bookmark-btn';
    bookmarkBtn.textContent = '★';
    bookmarkBtn.onclick = () => toggleBookmark(site.url, site.title, bookmarkBtn);
    
    li.appendChild(favicon);
    li.appendChild(siteInfo);
    li.appendChild(siteMeta);
    li.appendChild(bookmarkBtn);
    
    container.appendChild(li);
  });
  
  // Add click listeners to site items
  container.querySelectorAll('.site-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('bookmark-btn')) return;
      const url = item.dataset.url;
      browserAPI.tabs.create({ url });
      window.close();
    });
  });
  
  // Update bookmark button states
  updateBookmarkButtons();
}

// Render bookmarks
function renderBookmarks(bookmarks) {
  const container = document.getElementById('bookmarksList');
  
  if (bookmarks.length === 0) {
    renderEmptyState('bookmarksList', 'No bookmarks found');
    return;
  }
  
  container.innerHTML = '';
  
  bookmarks.forEach(bookmark => {
    const li = document.createElement('li');
    li.className = 'site-item';
    li.dataset.url = bookmark.url;
    
    const favicon = document.createElement('img');
    favicon.className = 'site-favicon';
    favicon.src = getFaviconUrl(bookmark.url);
    favicon.onerror = () => {
      favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    };
    
    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    
    const siteTitle = document.createElement('div');
    siteTitle.className = 'site-title';
    siteTitle.textContent = bookmark.title;
    
    const siteUrl = document.createElement('div');
    siteUrl.className = 'site-url';
    siteUrl.textContent = bookmark.url;
    
    siteInfo.appendChild(siteTitle);
    siteInfo.appendChild(siteUrl);
    
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'bookmark-btn bookmarked';
    bookmarkBtn.textContent = '★';
    bookmarkBtn.onclick = () => removeBookmark(bookmark.id, bookmarkBtn);
    
    li.appendChild(favicon);
    li.appendChild(siteInfo);
    li.appendChild(bookmarkBtn);
    
    container.appendChild(li);
  });
  
  // Add click listeners to bookmark items
  container.querySelectorAll('.site-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('bookmark-btn')) return;
      const url = item.dataset.url;
      browserAPI.tabs.create({ url });
      window.close();
    });
  });
}

// Render empty state
function renderEmptyState(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="empty-state">
      <div>${message}</div>
    </div>
  `;
}

// Toggle bookmark
async function toggleBookmark(url, title, button) {
  try {
    // Check if already bookmarked
    const existingBookmarks = await browserAPI.bookmarks.search({ url });
    
    if (existingBookmarks.length > 0) {
      // Remove bookmark
      await browserAPI.bookmarks.remove(existingBookmarks[0].id);
      button.classList.remove('bookmarked');
    } else {
      // Add bookmark
      await browserAPI.bookmarks.create({ title, url });
      button.classList.add('bookmarked');
    }
    
    // Reload bookmarks if on bookmarks tab
    if (currentTab === 'bookmarks') {
      await loadBookmarks();
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}

// Remove bookmark
async function removeBookmark(bookmarkId) {
  try {
    await browserAPI.bookmarks.remove(bookmarkId);
    await loadBookmarks();
  } catch (error) {
    console.error('Error removing bookmark:', error);
  }
}

// Update bookmark button states for today's sites
async function updateBookmarkButtons() {
  try {
    const buttons = document.querySelectorAll('#todaySites .bookmark-btn');
    
    for (const button of buttons) {
      const siteItem = button.closest('.site-item');
      const url = siteItem.dataset.url;
      const existingBookmarks = await browserAPI.bookmarks.search({ url });
      
      if (existingBookmarks.length > 0) {
        button.classList.add('bookmarked');
      }
    }
  } catch (error) {
    console.error('Error updating bookmark buttons:', error);
  }
}

// Utility functions
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
  }
}

// Setup detach button
function setupDetachButton() {
  const detachBtn = document.getElementById('detachBtn');
  if (detachBtn) {
    detachBtn.addEventListener('click', () => {
      browserAPI.windows.create({
        url: 'window.html',
        type: 'popup',
        width: 500,
        height: 700,
        left: 100,
        top: 100
      });
      window.close();
    });
  }
}