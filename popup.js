// popup.js
function findFeeds(deepSearchEnabled = false) {
  try {
    // This script runs in the context of the page
    const feeds = new Set();
    const feedData = new Map();
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    // 1. Find <link> tags with RSS/Atom types (most reliable method)
    document.querySelectorAll('link[rel]').forEach(link => {
      const rel = (link.rel || '').toLowerCase();
      const type = (link.type || '').toLowerCase();
      const href = link.href;
      
      if (!href) return;
      
      // Check for standard feed indicators
      if (rel.includes('alternate') && (
          type.includes('rss') || 
          type.includes('atom') || 
          type.includes('xml') || 
          type.includes('json') || 
          href.match(/\.(rss|xml|atom|feed)($|\/|\?)/i))) {
        feeds.add(href);
        feedData.set(href, {
          href,
          title: link.title || link.getAttribute('title') || (new URL(href).hostname + ' feed'),
          type: link.type || 'feed'
        });
      }
    });
    
    // 2. Check for feed autodiscovery links (WordPress and others)
    document.querySelectorAll('link[rel="alternate"], link[rel="feed"]').forEach(link => {
      const href = link.href;
      if (!href) return;
      
      // Add it even if type doesn't exactly match - we'll validate later
      if (href.match(/\/(feed|rss|atom|xml)[\/\?]?/i) || href.match(/\.(rss|xml|atom|feed)($|\/|\?)/i)) {
        feeds.add(href);
        if (!feedData.has(href)) {
          feedData.set(href, {
            href,
            title: link.title || link.getAttribute('title') || 'Feed: ' + new URL(href).pathname,
            type: 'autodiscovery'
          });
        }
      }
    });
    
    // 3. Look for <a> tags with feed-related attributes
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (!href) return;
      
      const hrefLower = href.toLowerCase();
      const text = (a.textContent || '').toLowerCase();
      const hasImage = a.querySelector('img');
      
      // Icons or text that might indicate RSS
      const hasRssIcon = hasImage && (
        a.innerHTML.includes('rss') ||
        a.innerHTML.includes('feed') ||
        a.querySelector('img[src*="feed"]') ||
        a.querySelector('img[src*="rss"]') ||
        a.querySelector('img[src*="syndicate"]')
      );
      
      // Only check if it has keywords in the URL or text
      if (hrefLower.match(/\/(rss|feed|atom|syndicate|xml)[\/#?]?/i) || 
          hrefLower.match(/\.(rss|xml|atom)($|\/|\?)/i) ||
          hasRssIcon ||
          (text.match(/(rss|feed|syndicate|atom|subscribe)/i) && 
           !text.match(/comments|social media|twitter|facebook/i))) {
        feeds.add(href);
        if (!feedData.has(href)) {
          feedData.set(href, {
            href,
            title: a.textContent.trim() || new URL(href).pathname,
            type: 'link'
          });
        }
      }
    });
    
    // 4. Look for typical feed URLs in page meta or script tags
    const metaOgSite = document.querySelector('meta[property="og:site_name"]');
    const siteName = metaOgSite ? metaOgSite.getAttribute('content') : hostname;
    
    // Check common feed services (like Feedburner)
    document.querySelectorAll('script').forEach(script => {
      const content = script.textContent || '';
      const feedburnerMatch = content.match(/feedburner\.com\/[\w-]+/i);
      if (feedburnerMatch) {
        const feedUrl = 'https://' + feedburnerMatch[0];
        feeds.add(feedUrl);
        feedData.set(feedUrl, {
          href: feedUrl,
          title: 'FeedBurner: ' + siteName,
          type: 'service'
        });
      }
    });
    
    // 5. Generate possible feed URLs based on common patterns
    if (feeds.size === 0 || feeds.size < 2) {
      // Common feed paths for many popular platforms
      const possiblePaths = [
        '/feed', '/rss', '/atom.xml', '/feed.xml', '/rss.xml', 
        '/index.xml', '/feeds/posts/default', '/rss/feed', '/blog/feed',
        '/feed/rss', '/feed/atom', '/rss2.xml', '/atom', '/rss/index.xml',
        '/blog/atom.xml', '/blog/feed/atom', '/blog.atom', '/blog.rss'
      ];
      
      // Check for WordPress which often has category-specific feeds
      if (document.querySelector('link[rel="https://api.w.org/"]') || 
          document.querySelector('meta[name="generator"][content*="WordPress"]')) {
        // WordPress-specific feeds
        const currentPath = window.location.pathname;
        if (currentPath.includes('/category/')) {
          possiblePaths.push(currentPath + 'feed');
          possiblePaths.push(currentPath + '/feed');
        }
      }
      
      // Check for top-level section-specific feeds
      const pathSegments = window.location.pathname.split('/');
      if (pathSegments.length > 1 && pathSegments[1]) {
        const section = pathSegments[1];
        possiblePaths.push(`/${section}/feed`);
        possiblePaths.push(`/${section}/rss`);
        possiblePaths.push(`/${section}/atom`);
      }
      
      // Add possible feed URLs for the site
      possiblePaths.forEach(path => {
        const probableFeedUrl = origin + path;
        if (!feeds.has(probableFeedUrl)) {
          feedData.set(probableFeedUrl, {
            href: probableFeedUrl,
            title: 'Possible feed: ' + path,
            type: 'probable',
            isProbable: true
          });
        }
      });
    }
    
    // 6. Deep search enabled: Find sitemaps and extract additional RSS feeds
    if (deepSearchEnabled) {
      // First check common sitemap locations
      const sitemapUrls = getSitemapUrls(origin, hostname);
      
      // Make sure uiLogger is initialized if it exists
      if (typeof window.uiLogger !== 'undefined') {
        uiLogger.log('info', '🔍 STARTING SITEMAP SEARCH...');
      }
      
      feedData.set('_sitemapSearch', {
        href: '_sitemapSearch',
        title: 'Searching sitemaps for feeds...',
        type: 'info',
        isSearching: true
      });
      
      // Add to the return data that we're doing a sitemap search
      // This will be used to show logs in the UI
      return Array.from(feedData.values());
    }
    
    return Array.from(feedData.values());
  } catch (error) {
    console.error('Error finding feeds:', error);
    return [];
  }
}

function renderFeeds(feeds) {
  const list = document.getElementById('feeds-list');
  list.innerHTML = '';
  
  // Check for info messages first
  const infoMessages = feeds.filter(feed => feed.isInfo === true);
  if (infoMessages.length > 0) {
    infoMessages.forEach(info => {
      const li = document.createElement('li');
      li.className = 'info-message';
      li.textContent = info.title;
      list.appendChild(li);
    });
  }
  
  // Filter to only show valid feeds
  const validFeeds = feeds.filter(feed => feed.isValid === true);
  
  if (validFeeds.length === 0 && infoMessages.length === 0) {
    list.innerHTML = '<li class="no-feeds">No working RSS feeds found on this page.</li>';
    return;
  } else if (validFeeds.length === 0) {
    // We already rendered info messages, so just return
    return;
  }

  // Add count indicator
  const header = document.querySelector('h2');
  if (header) {
    header.textContent = `Working RSS Feeds (${validFeeds.length})`;
  }
  
  validFeeds.forEach(feed => {
    try {
      const li = document.createElement('li');
      li.className = 'valid-feed';
      
      // Create link
      const a = document.createElement('a');
      a.href = feed.href;
      a.textContent = feed.title;
      a.title = feed.href;
      a.target = '_blank';
      
      // Add validation checkmark
      const statusEl = document.createElement('span');
      statusEl.className = 'status valid';
      statusEl.textContent = '✓';
      statusEl.title = 'Working feed';
      a.insertAdjacentElement('afterbegin', statusEl);
      
      li.appendChild(a);
      
      // Add copy button
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy feed URL';
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(feed.href)
          .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.classList.remove('copied');
            }, 1500);
          })
          .catch(err => console.error('Could not copy text: ', err));
      });
      
      li.appendChild(copyBtn);
      list.appendChild(li);
    } catch (error) {
      console.error('Error rendering feed:', error);
    }
  });
}

// Cache for validated feed URLs to prevent duplicate checks
const validatedFeedCache = new Map();

// Validate a feed by checking if the URL returns valid RSS/Atom XML content
async function validateFeed(url) {
  // Check cache first to avoid duplicate validations
  if (validatedFeedCache.has(url)) {
    return validatedFeedCache.get(url);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Faster 2 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD', // First try a HEAD request to check headers quickly
      signal: controller.signal,
      headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' }
    }).catch(() => null); // Catch network errors gracefully
    
    clearTimeout(timeoutId);
    
    // If HEAD succeeded and content type looks like a feed
    const contentType = response?.headers?.get('Content-Type') || '';
    if (response?.ok && (
        contentType.includes('xml') ||
        contentType.includes('rss') ||
        contentType.includes('atom')
    )) {
      // Do a quick GET to verify content
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 2000);
      
      // Only fetch the first 8KB of the response to validate quickly
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: {
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Range': 'bytes=0-8191' // Get just the first 8KB
        }
      }).catch(() => null);
      
      clearTimeout(getTimeoutId);
      
      if (getResponse?.ok) {
        // Get just enough text to validate feed format
        const text = await getResponse.text();
        
        // Check if it looks like a valid feed
        const isValid = (
          text.includes('<rss') || 
          text.includes('<feed') || 
          text.includes('<channel') || 
          text.includes('<entry')
        );
        
        validatedFeedCache.set(url, isValid); // Cache the result
        return isValid;
      }
    }
    
    // If the HEAD request failed, try a direct GET as fallback
    const getFallbackController = new AbortController();
    const getFallbackTimeoutId = setTimeout(() => getFallbackController.abort(), 2000);
    
    const getFallbackResponse = await fetch(url, {
      method: 'GET',
      signal: getFallbackController.signal,
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'Range': 'bytes=0-8191' // Get just the first 8KB
      }
    }).catch(() => null);
    
    clearTimeout(getFallbackTimeoutId);
    
    if (!getFallbackResponse?.ok) {
      validatedFeedCache.set(url, false);
      return false;
    }
    
    const text = await getFallbackResponse.text();
    
    // Check if it looks like XML and contains feed elements
    const isValid = (
      (text.trim().startsWith('<?xml') || getFallbackResponse.headers.get('Content-Type')?.includes('xml')) &&
      (text.includes('<rss') || text.includes('<feed') || text.includes('<channel') || text.includes('<entry'))
    );
    
    validatedFeedCache.set(url, isValid); // Cache the result
    return isValid;
  } catch (error) {
    console.log('Feed validation error:', error);
    validatedFeedCache.set(url, false);
    return false;
  }
}

// Process and validate feeds before displaying
async function processFeeds(feeds) {
  const feedList = document.getElementById('feeds-list');
  feedList.innerHTML = '<li class="loading">Searching for RSS feeds...</li>';
  
  if (feeds.length === 0) {
    feedList.innerHTML = '<li class="no-feeds">No RSS feeds found on this page.</li>';
    return;
  }
  
  // Add count indicator
  const header = document.querySelector('h2');
  if (header) {
    header.textContent = `Checking ${feeds.length} possible feeds...`;
  }
  
  // Prioritize the most likely feeds first
  feeds.sort((a, b) => {
    // Prioritize <link> tags over other methods
    if (a.type === 'feed' && b.type !== 'feed') return -1;
    if (a.type !== 'feed' && b.type === 'feed') return 1;
    // Then autodiscovery
    if (a.type === 'autodiscovery' && b.type !== 'autodiscovery') return -1;
    if (a.type !== 'autodiscovery' && b.type === 'autodiscovery') return 1;
    // Deprioritize probable feeds
    if (a.isProbable && !b.isProbable) return 1;
    if (!a.isProbable && b.isProbable) return -1;
    return 0;
  });
  
  // Validate feeds in parallel for better performance
  const validatedFeeds = [];
  const maxFeedsToCheck = Math.min(25, feeds.length); // Check up to 25 feeds
  const batchSize = 5; // Process 5 feeds in parallel at a time
  let validCount = 0;
  let checkedCount = 0;
  
  // Process feeds in batches to find working ones quickly
  const feedsToCheck = feeds.slice(0, maxFeedsToCheck);
  
  for (let i = 0; i < feedsToCheck.length; i += batchSize) {
    const batch = feedsToCheck.slice(i, i + batchSize);
    
    // Run this batch in parallel
    const batchPromises = batch.map(feed => {
      return validateFeed(feed.href)
        .then(isValid => {
          feed.isValid = isValid;
          validatedFeeds.push(feed);
          
          if (isValid) validCount++;
          checkedCount++;
          
          // Update progress
          if (header) {
            if (validCount > 0) {
              header.textContent = `Found ${validCount} working feeds... (checking ${checkedCount}/${maxFeedsToCheck})`;
            } else {
              header.textContent = `Checking feeds (${checkedCount}/${maxFeedsToCheck})`;
            }
          }
          
          return feed;
        });
    });
    
    // Wait for this batch to complete before starting the next
    await Promise.all(batchPromises);
    
    // If we've found enough valid feeds, we can stop checking
    if (validCount >= 10) {
      break;
    }
  }
  
  // Only keep valid feeds for display
  const workingFeeds = validatedFeeds.filter(feed => feed.isValid === true);
  
  // Update the final count
  if (header) {
    if (workingFeeds.length > 0) {
      header.textContent = `Working RSS Feeds (${workingFeeds.length})`;
    } else {
      header.textContent = 'RSS Feeds';
    }
  }
  
  renderFeeds(workingFeeds);
}

// Functions to handle sitemap discovery and parsing
async function findFeedsFromSitemap(sitemapUrl, feedsFound = new Set()) {
  try {
    console.log(`Attempting to fetch sitemap at: ${sitemapUrl}`);
    // Add clear UI log
    uiLogger.log('info', `CHECKING: ${new URL(sitemapUrl).pathname}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/xml, text/xml' }
    }).catch(error => {
      console.warn(`Fetch error for sitemap ${sitemapUrl}:`, error.message);
      return null;
    });
    
    clearTimeout(timeoutId);
    
    if (!response?.ok) {
      console.warn(`Sitemap not found or invalid response at ${sitemapUrl}. Status: ${response?.status || 'No response'}`);
      // Log the failure clearly
      uiLogger.log('warning', `NOT FOUND: ${new URL(sitemapUrl).pathname}`);
      return { feeds: Array.from(feedsFound), newSitemaps: [] };
    }
    
    console.log(`Successfully fetched sitemap at: ${sitemapUrl}`);
    const text = await response.text();
    
    // Debug the first few characters of the response
    console.log(`Sitemap content preview: ${text.substring(0, 100)}...`);
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      return { feeds: Array.from(feedsFound), newSitemaps: [] };
    }
    
    // Check for XML parsing issues by looking at the document element
    const rootElement = xmlDoc.documentElement;
    console.log(`Root XML element: ${rootElement.tagName}`); 
    
    // Check if it's a sitemap index (contains other sitemaps)
    // Try multiple selectors to handle different sitemap formats
    let sitemapTags = [];
    
    // Try different selectors for sitemap loc elements
    const sitemapSelectors = [
      'sitemap > loc', // Standard format
      'sitemap loc',   // Some formats don't use proper nesting
      'sitemapindex > sitemap > loc' // More explicit nesting
    ];
    
    for (const selector of sitemapSelectors) {
      const tags = xmlDoc.querySelectorAll(selector);
      if (tags.length > 0) {
        console.log(`Found sitemap locs using selector: ${selector}`);
        sitemapTags = tags;
        break;
      }
    }
    
    const newSitemaps = [];
    
    if (sitemapTags.length > 0) {
      console.log(`Found ${sitemapTags.length} nested sitemaps in sitemap index`);
      // It's a sitemap index
      for (const sitemapTag of sitemapTags) {
        const sitemapLoc = sitemapTag.textContent;
        if (sitemapLoc) {
          const trimmedLoc = sitemapLoc.trim();
          console.log(`Found nested sitemap: ${trimmedLoc}`);
          newSitemaps.push(trimmedLoc);
        }
      }
    }
    
    // Look for feed-like URLs in sitemap
    // Try multiple selectors for URL elements as well
    let urls = [];
    const urlSelectors = [
      'url > loc',  // Standard format
      'url loc',    // Some formats don't use proper nesting
      'urlset > url > loc', // More explicit nesting
      'loc'         // Some simple sitemaps just use loc elements
    ];
    
    for (const selector of urlSelectors) {
      const foundUrls = xmlDoc.querySelectorAll(selector);
      if (foundUrls.length > 0) {
        console.log(`Found URLs using selector: ${selector}`);
        urls = foundUrls;
        break;
      }
    }
    console.log(`Found ${urls.length} URLs in sitemap`);
    
    let feedsInCurrentSitemap = 0;
    for (const urlTag of urls) {
      const url = urlTag.textContent;
      if (!url) continue;
      
      const cleanUrl = url.trim();
      
      // Check if URL looks like a feed
      if (cleanUrl.match(/\/(rss|feed|atom|syndicate|xml)[\/\#?]?/i) || 
          cleanUrl.match(/\.(rss|xml|atom)($|\/|\?)/i)) {
        console.log(`Potential feed URL found in sitemap: ${cleanUrl}`);
        feedsFound.add(cleanUrl);
        feedsInCurrentSitemap++;
        // Log feed discovery clearly
        uiLogger.log('success', `FEED FOUND: ${new URL(cleanUrl).pathname}`);
      }
    }
    
    console.log(`Completed processing sitemap at ${sitemapUrl}. Found ${feedsInCurrentSitemap} potential feeds.`);
    return { feeds: Array.from(feedsFound), newSitemaps };
  } catch (error) {
    console.error(`Error parsing sitemap ${sitemapUrl}:`, error);
    return { feeds: Array.from(feedsFound), newSitemaps: [] };
  }
}

function getSitemapUrls(origin, hostname) {
  // Common sitemap locations
  const sitemapUrls = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap`,
    `${origin}/sitemaps.xml`,
    `${origin}/wp-sitemap.xml`,
    `${origin}/sitemap/sitemap-index.xml`,
    `${origin}/sitemap.php`,
    `${origin}/sitemap_news.xml`,
    // Also try with www and without if applicable
    hostname.startsWith('www.') ? 
      `${origin.replace('www.', '')}/sitemap.xml` : 
      `${origin.replace('://', '://www.')}/sitemap.xml`,
  ];
  
  console.log('Checking the following sitemap URLs:', sitemapUrls);
  // Log sitemap check in UI
  uiLogger.log('info', `SEARCHING ${sitemapUrls.length} SITEMAP LOCATIONS`);
  return sitemapUrls;
}

async function processSitemaps(sitemapUrls, maxDepth = 2) {
  try {
    console.log(`Starting sitemap search with ${sitemapUrls.length} potential sitemap URLs`);
    
    // Update UI to show we're searching
    const header = document.querySelector('h2');
    if (header) {
      header.textContent = 'Searching sitemaps...';
    }
    
    const allFeeds = new Set();
    const processedSitemaps = new Set();
    const pendingSitemaps = [...sitemapUrls];
    let depth = 0;
    let sitemapsFound = 0;
    let sitemapsChecked = 0;
    
    // Process sitemaps up to the specified depth
    while (pendingSitemaps.length > 0 && depth < maxDepth) {
      const currentSitemap = pendingSitemaps.shift();
      sitemapsChecked++;
      
      // Update list with progress
      const feedsList = document.getElementById('feeds-list');
      if (feedsList && feedsList.querySelector('.loading')) {
        feedsList.querySelector('.loading').textContent = 
          `Checking sitemap ${sitemapsChecked}/${Math.min(5, sitemapUrls.length)}...`;
      }
      
      // Skip if already processed
      if (processedSitemaps.has(currentSitemap)) {
        console.log(`Skipping already processed sitemap: ${currentSitemap}`);
        continue;
      }
      processedSitemaps.add(currentSitemap);
      
      // Process current sitemap
      const { feeds, newSitemaps } = await findFeedsFromSitemap(currentSitemap, allFeeds);
      
      if (feeds.length > 0 || newSitemaps.length > 0) {
        sitemapsFound++;
        console.log(`Sitemap processing successful. Found ${feeds.length} feeds and ${newSitemaps.length} new sitemaps.`);
      }
      
      // Add any feeds found
      feeds.forEach(feed => allFeeds.add(feed));
      
      // Queue newly discovered sitemaps for next iteration
      newSitemaps.forEach(sitemap => {
        if (!processedSitemaps.has(sitemap)) {
          console.log(`Queueing nested sitemap: ${sitemap}`);
          pendingSitemaps.push(sitemap);
        }
      });
      
      // If we've processed all sitemaps at this level, increase depth
      if (pendingSitemaps.length === 0 && newSitemaps.length > 0) {
        depth++;
        console.log(`Increasing sitemap search depth to ${depth}`);
      }
      
      // Limit to processing 5 sitemaps total to avoid excessive requests
      if (processedSitemaps.size >= 5) {
        console.log(`Reached maximum sitemap processing limit (5). Stopping search.`);
        break;
      }
    }
    
    console.log(`Sitemap search complete. Checked ${sitemapsChecked} URLs, found ${sitemapsFound} valid sitemaps with ${allFeeds.size} total feeds.`);
    
    // Clear summary log
    if (allFeeds.size > 0) {
      uiLogger.log('success', `SEARCH COMPLETE: FOUND ${allFeeds.size} FEEDS IN ${sitemapsFound} SITEMAPS`);
    } else if (sitemapsFound > 0) {
      uiLogger.log('warning', `SEARCH COMPLETE: FOUND ${sitemapsFound} SITEMAPS, BUT NO FEEDS INSIDE`);
    } else {
      uiLogger.log('warning', `SEARCH COMPLETE: NO VALID SITEMAPS FOUND ON THIS SITE`);
    }
    
    if (header) {
      if (allFeeds.size > 0) {
        header.textContent = `Found ${allFeeds.size} feeds from sitemaps`;
      } else {
        header.textContent = 'RSS Feeds';
      }
    }
    
    if (allFeeds.size === 0) {
      console.warn('No feeds found in any sitemaps!');
    }
    
    return Array.from(allFeeds);
  } catch (error) {
    console.error('Error processing sitemaps:', error);
    return [];
  }
}

// Main page load logic
// Custom logging functions to display logs in UI
let uiLogger = {
  logContainer: null,
  logMessages: null,
  isEnabled: false,
  maxLogEntries: 100,
  logCount: 0,
  
  init: function() {
    this.logContainer = document.getElementById('log-container');
    this.logMessages = document.getElementById('log-messages');
    
    if (!this.logContainer || !this.logMessages) return;
    
    // Show log container when deep search is enabled, hide otherwise
    const deepSearchCheckbox = document.getElementById('deep-search');
    if (deepSearchCheckbox) {
      if (deepSearchCheckbox.checked) {
        this.logContainer.style.display = 'block';
      } else {
        this.logContainer.style.display = 'none';
      }
      
      deepSearchCheckbox.addEventListener('change', () => {
        if (deepSearchCheckbox.checked) {
          this.logContainer.style.display = 'block';
        } else {
          this.logContainer.style.display = 'none';
        }
      });
    }
    
    this.isEnabled = true;
    
    // Only log important things to the UI to avoid overloading it
    // We'll use a more selective approach for UI logs using direct calls
    // Instead of overriding all console methods, we'll call uiLogger directly
  },
  
  log: function(type, message) {
    if (!this.isEnabled || !this.logMessages) return;
    
    // Show the log container if it was hidden
    this.logContainer.style.display = 'block';
    
    // Create log entry
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    
    // Add to log container
    this.logMessages.appendChild(entry);
    
    // Auto-scroll to bottom
    this.logMessages.scrollTop = this.logMessages.scrollHeight;
    
    // Limit number of log entries
    this.logCount++;
    if (this.logCount > this.maxLogEntries) {
      const firstChild = this.logMessages.firstChild;
      if (firstChild) {
        this.logMessages.removeChild(firstChild);
        this.logCount--;
      }
    }
  },
  
  clear: function() {
    if (this.logMessages) {
      this.logMessages.innerHTML = '';
      this.logCount = 0;
    }
  },
  
  success: function(message) {
    this.log('success', message);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the UI logger
  uiLogger.init();
  
  // Get UI elements
  const deepSearchCheckbox = document.getElementById('deep-search');
  const searchButton = document.getElementById('search-button');
  
  // Initial state for the deep search checkbox
  chrome.storage.local.get(['deepSearchEnabled'], function(result) {
    deepSearchCheckbox.checked = result.deepSearchEnabled || false;
    
    // Show or hide log container based on deep search being enabled
    const logContainer = document.getElementById('log-container');
    if (deepSearchCheckbox.checked) {
      logContainer.style.display = 'block';
    } else {
      logContainer.style.display = 'none';
    }
    
    // Save preference when checkbox changes
    deepSearchCheckbox.addEventListener('change', function() {
      chrome.storage.local.set({deepSearchEnabled: this.checked});
      
      // Show/hide log container
      if (this.checked) {
        logContainer.style.display = 'block';
      } else {
        logContainer.style.display = 'none';
      }
    });
  });
  
  // Add click event listener to the search button
  searchButton.addEventListener('click', function() {
    // Update button state during search
    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;
    
    // Clear previous results and logs
    const feedsList = document.getElementById('feeds-list');
    feedsList.innerHTML = '<li class="loading">Searching for RSS feeds...</li>';
    uiLogger.clear();
    
    // Start feed search
    refreshFeeds(function() {
      // Restore button state after search completes
      searchButton.textContent = 'Search for Feeds';
      searchButton.disabled = false;
    });
  });
});

function refreshFeeds(callback) {
  const deepSearchEnabled = document.getElementById('deep-search').checked;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: findFeeds,
      args: [deepSearchEnabled]
    }, (results) => {
      let feeds = results && results[0] && results[0].result ? results[0].result : [];
      
      // Process the initially found feeds
      processFeeds(feeds);
      
      // If deep search is enabled, start sitemap search after initial results are shown
      if (deepSearchEnabled) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: (tab) => {
            return {
              url: window.location.href,
              hostname: window.location.hostname,
              origin: window.location.origin
            };
          }
        }, (pageInfo) => {
          if (pageInfo && pageInfo[0] && pageInfo[0].result) {
            const info = pageInfo[0].result;
            const sitemapUrls = getSitemapUrls(info.origin, info.hostname);
            
            // Process sitemaps to find additional feeds
            console.log('Starting sitemap search process...');
            uiLogger.log('info', 'STARTING DEEP SEARCH...');
            processSitemaps(sitemapUrls).then(sitemapFeeds => {
              console.log(`Sitemap search completed. Found ${sitemapFeeds.length} potential feeds.`);
              
              if (sitemapFeeds.length > 0) {
                // Create feed entries for sitemap discovered feeds
                const sitemapFeedObjects = sitemapFeeds.map(href => {
                  console.log(`Creating feed object for sitemap discovered URL: ${href}`);
                  return {
                    href,
                    title: 'Sitemap feed: ' + new URL(href).pathname,
                    type: 'sitemap'
                  };
                });
                
                // Add these to the existing feeds and reprocess
                const combinedFeeds = [...feeds.filter(f => f.href !== '_sitemapSearch'), ...sitemapFeedObjects];
                console.log(`Combining ${sitemapFeedObjects.length} sitemap feeds with ${feeds.length} regular feeds`);
                processFeeds(combinedFeeds);
              } else {
                console.warn('No feeds found in sitemaps. Check console for detailed logs.');
                
                // Create a message to show in the UI
                const noSitemapMessage = {
                  href: 'no_sitemap_feeds',
                  title: 'No feeds found in sitemaps. Check browser console (F12) for logs.',
                  type: 'info',
                  isInfo: true
                };
                
                // Remove the searching indicator and add our info message
                const updatedFeeds = [...feeds.filter(f => f.href !== '_sitemapSearch'), noSitemapMessage];
                processFeeds(updatedFeeds);
              }
              
              // Execute callback after sitemap search is complete, if provided
              if (typeof callback === 'function') {
                callback();
              }
            });
          } else if (typeof callback === 'function') {
            callback();
          }
        });
      } else if (typeof callback === 'function') {
        // Execute callback immediately if deep search is not enabled
        callback();
      }
    });
  });
}
