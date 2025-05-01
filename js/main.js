// Main entry point for the RSS Feed Finder extension
import { findFeeds } from './core/feedFinder.js';
import { processFeeds } from './core/feedProcessor.js';
import { getSitemapUrls, processSitemaps } from './core/sitemapProcessor.js';
import { renderFeeds } from './ui/feedRenderer.js';
import { uiLogger } from './ui/logger.js';

/**
 * Main function to refresh feeds from the current tab
 * @param {Function} callback - Callback to execute after the feed search is complete
 */
export function refreshFeeds(callback) {
  const deepSearchEnabled = document.getElementById('deep-search').checked;
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: findFeeds,
      args: [deepSearchEnabled]
    }, (results) => {
      let feeds = results && results[0] && results[0].result ? results[0].result : [];
      
      // Process the initially found feeds
      processFeeds(feeds).then(processedFeeds => {
        renderFeeds(processedFeeds);
        
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
                  processFeeds(combinedFeeds).then(processedCombined => {
                    renderFeeds(processedCombined);
                    
                    // Execute callback after sitemap search is complete, if provided
                    if (typeof callback === 'function') {
                      callback();
                    }
                  });
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
                  processFeeds(updatedFeeds).then(processedUpdated => {
                    renderFeeds(processedUpdated);
                    
                    // Execute callback after sitemap search is complete, if provided
                    if (typeof callback === 'function') {
                      callback();
                    }
                  });
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
  });
}

// Initialize the application when the popup is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the UI logger
  uiLogger.init();
  
  // Get UI elements
  const deepSearchCheckbox = document.getElementById('deep-search');
  const searchButton = document.getElementById('search-button');
  const logContainer = document.getElementById('log-container');
  
  // Check if we need to show logs (for debug mode or deep search)
  chrome.storage.local.get(['showLogs'], function(result) {
    const showLogs = result.showLogs === undefined ? false : result.showLogs;
    
    // Set checkbox state from storage
    deepSearchCheckbox.checked = showLogs;
    
    // Show/hide log container based on checkbox
    logContainer.style.display = showLogs ? 'block' : 'none';
    
    // Save state when checkbox changes
    deepSearchCheckbox.addEventListener('change', function() {
      chrome.storage.local.set({ showLogs: this.checked });
      
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
