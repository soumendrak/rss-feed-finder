// Functions for rendering feed results in the UI

/**
 * Renders feed items in the UI
 * @param {Array} feeds - Array of feed objects to render
 */
export function renderFeeds(feeds) {
  const feedsList = document.getElementById('feeds-list');
  
  // Clear the current list
  feedsList.innerHTML = '';
  
  // Show message if no feeds found
  if (!feeds || feeds.length === 0) {
    feedsList.innerHTML = '<li class="info-message">No feeds found on this site</li>';
    return;
  }
  
  // Check if we have a "searching sitemap" indicator
  const isSearchingSitemap = feeds.some(feed => feed.isSearching && feed.href === '_sitemapSearch');
  
  // Group feeds by status
  const validFeeds = [];
  const potentialFeeds = [];
  const invalidFeeds = [];
  const infoMessages = [];
  
  // Sort feeds into categories
  feeds.forEach(feed => {
    if (feed.isInfo || feed.isSearching) {
      infoMessages.push(feed);
    } else if (feed.isValid === true) {
      validFeeds.push(feed);
    } else if (feed.isValid === false) {
      invalidFeeds.push(feed);
    } else {
      potentialFeeds.push(feed);
    }
  });
  
  // Create feed list elements
  const createFeedElement = (feed) => {
    // Create list item
    const li = document.createElement('li');
    
    // Handle info messages
    if (feed.isInfo || feed.isSearching) {
      li.textContent = feed.title;
      li.className = feed.isSearching ? 'loading' : 'info-message';
      return li;
    }
    
    // Set appropriate class based on validation status
    if (feed.isValid === true) {
      li.className = 'valid-feed';
    } else if (feed.isValid === false) {
      li.className = 'invalid-feed';
    } else if (feed.isPotential) {
      li.className = 'potential-feed';
    } else {
      li.className = 'pending-feed';
    }
    
    // Create link element for the feed
    const feedLink = document.createElement('a');
    feedLink.href = feed.href;
    feedLink.className = 'feed-link';
    feedLink.textContent = feed.title || feed.href;
    feedLink.title = feed.href;
    feedLink.target = '_blank';
    feedLink.rel = 'noopener noreferrer';
    
    // Create a URL element to extract domain
    try {
      const url = new URL(feed.href);
      const domain = url.hostname;
      
      // Create domain indicator
      const domainSpan = document.createElement('span');
      domainSpan.className = 'feed-domain';
      domainSpan.textContent = domain;
      
      // Create type indicator
      const typeSpan = document.createElement('span');
      typeSpan.className = 'feed-type';
      typeSpan.textContent = feed.feedType || feed.type || 'Feed';
      
      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.textContent = 'Copy URL';
      copyButton.title = 'Copy feed URL to clipboard';
      copyButton.dataset.url = feed.href;
      copyButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const url = event.target.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          event.target.textContent = 'Copied!';
          setTimeout(() => {
            event.target.textContent = 'Copy URL';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
      });
      
      // Add error message if feed is invalid
      if (feed.isValid === false && feed.validationError) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'feed-error';
        errorSpan.textContent = feed.validationError;
        li.appendChild(errorSpan);
      }
      
      // Add elements to list item
      li.appendChild(feedLink);
      li.appendChild(domainSpan);
      li.appendChild(typeSpan);
      li.appendChild(copyButton);
      
    } catch (e) {
      // Fallback if URL is invalid
      li.appendChild(feedLink);
      const errorSpan = document.createElement('span');
      errorSpan.className = 'feed-error';
      errorSpan.textContent = 'Invalid URL';
      li.appendChild(errorSpan);
    }
    
    return li;
  };
  
  // First add any info messages
  infoMessages.forEach(feed => {
    feedsList.appendChild(createFeedElement(feed));
  });
  
  // Then add valid feeds
  if (validFeeds.length > 0) {
    const validHeader = document.createElement('li');
    validHeader.className = 'feed-section-header';
    validHeader.textContent = 'Verified Feeds';
    feedsList.appendChild(validHeader);
    
    validFeeds.forEach(feed => {
      feedsList.appendChild(createFeedElement(feed));
    });
  }
  
  // Then add potential feeds
  if (potentialFeeds.length > 0 && (!isSearchingSitemap || validFeeds.length === 0)) {
    const potentialHeader = document.createElement('li');
    potentialHeader.className = 'feed-section-header';
    potentialHeader.textContent = 'Potential Feeds (Unverified)';
    feedsList.appendChild(potentialHeader);
    
    // Sort potential feeds: common paths first, then alphabetically
    potentialFeeds.sort((a, b) => {
      const aGenerated = a.type === 'generated' ? 1 : 0;
      const bGenerated = b.type === 'generated' ? 1 : 0;
      if (aGenerated !== bGenerated) {
        return aGenerated - bGenerated;
      }
      return a.href.localeCompare(b.href);
    });
    
    // Limit the number of potential feeds shown
    const limit = isSearchingSitemap ? 5 : 15;
    const feedsToShow = potentialFeeds.slice(0, limit);
    
    feedsToShow.forEach(feed => {
      feedsList.appendChild(createFeedElement(feed));
    });
    
    // Add a note if we truncated the list
    if (potentialFeeds.length > limit) {
      const truncatedNote = document.createElement('li');
      truncatedNote.className = 'info-message';
      truncatedNote.textContent = `${potentialFeeds.length - limit} more potential feeds not shown`;
      feedsList.appendChild(truncatedNote);
    }
  }
  
  // Finally add invalid feeds
  if (invalidFeeds.length > 0 && !isSearchingSitemap) {
    const invalidHeader = document.createElement('li');
    invalidHeader.className = 'feed-section-header';
    invalidHeader.textContent = 'Invalid Feeds';
    feedsList.appendChild(invalidHeader);
    
    invalidFeeds.forEach(feed => {
      feedsList.appendChild(createFeedElement(feed));
    });
  }
}
