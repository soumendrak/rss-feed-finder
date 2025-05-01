// popup.js
function findFeeds() {
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
    
    return Array.from(feedData.values());
  } catch (error) {
    console.error('Error finding feeds:', error);
    return [];
  }
}

function renderFeeds(feeds) {
  const list = document.getElementById('feeds-list');
  list.innerHTML = '';
  
  // Filter to only show valid feeds
  const validFeeds = feeds.filter(feed => feed.isValid === true);
  
  if (validFeeds.length === 0) {
    list.innerHTML = '<li class="no-feeds">No working RSS feeds found on this page.</li>';
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

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: findFeeds,
    }, (results) => {
      const feeds = results && results[0] && results[0].result ? results[0].result : [];
      processFeeds(feeds);
    });
  });
});
