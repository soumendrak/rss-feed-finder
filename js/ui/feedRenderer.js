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
  
  // Group feeds by status - only valid feeds and info messages
  const validFeeds = [];
  const infoMessages = [];
  
  // Only include valid feeds and info messages
  feeds.forEach(feed => {
    if (feed.isInfo || feed.isSearching) {
      infoMessages.push(feed);
    } else if (feed.isValid === true) {
      validFeeds.push(feed);
    } else {
      // Log any invalid/potential feeds for debugging, but don't display them
      console.log(`Not displaying non-valid feed: ${feed.href}`);
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
      
      // Create copy button with modern UI
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.title = 'Copy feed URL to clipboard';
      copyButton.setAttribute('aria-label', 'Copy URL');
      copyButton.dataset.url = feed.href;
      copyButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const url = event.currentTarget.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          event.currentTarget.classList.add('copied');
          setTimeout(() => {
            event.currentTarget.classList.remove('copied');
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
  
  // If no valid feeds were found, show a simple message
  if (validFeeds.length === 0 && !isSearchingSitemap) {
    const noValidFeedsNote = document.createElement('li');
    noValidFeedsNote.className = 'info-message';
    noValidFeedsNote.textContent = 'No valid RSS feeds were found on this page';
    feedsList.appendChild(noValidFeedsNote);
  }
}
