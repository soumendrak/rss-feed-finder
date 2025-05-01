// Core functions for sitemap discovery and processing
import { handleSitemap, checkUrlsForFeeds } from '../sitemapHandler.js';
import { extractFeedsFromHTML } from '../feedDetector.js';

/**
 * Find potential feed URLs in a sitemap
 * @param {string} sitemapUrl - URL of the sitemap
 * @param {Set} feedsFound - Set of already found feeds to avoid duplicates
 * @returns {Promise<Array>} - Array of discovered feed URLs
 */
export async function findFeedsFromSitemap(sitemapUrl, feedsFound = new Set()) {
  try {
    console.log(`Processing sitemap: ${sitemapUrl}`);
    const urlsFromSitemap = await handleSitemap(sitemapUrl);
    
    if (!urlsFromSitemap || urlsFromSitemap.length === 0) {
      console.warn(`No URLs found in sitemap: ${sitemapUrl}`);
      return Array.from(feedsFound);
    }
    
    console.log(`Found ${urlsFromSitemap.length} URLs in sitemap: ${sitemapUrl}`);
    
    // Sample some URLs from the sitemap to check (don't check all to avoid overloading)
    const samplesToCheck = [];
    
    // Prioritize URLs with keywords that might indicate feeds
    const priorityMatches = urlsFromSitemap.filter(url => 
      url.match(/\/(feed|rss|atom|xml)[\/\?]?/i) || url.match(/\.(rss|xml|atom|feed)($|\/|\?)/i)
    );
    
    // Add priority matches first
    priorityMatches.forEach(url => {
      if (!feedsFound.has(url)) {
        samplesToCheck.push(url);
        feedsFound.add(url);
      }
    });
    
    // If we haven't filled our samples, add some regular URLs
    // Take different sections of the array to get a representative sample
    if (urlsFromSitemap.length > 10 && samplesToCheck.length < 5) {
      // Get a sampling from beginning, middle, and end
      const stride = Math.floor(urlsFromSitemap.length / 5);
      for (let i = 0; i < 5 && samplesToCheck.length < 10; i++) {
        const idx = i * stride;
        const url = urlsFromSitemap[idx];
        if (url && !feedsFound.has(url)) {
          samplesToCheck.push(url);
          feedsFound.add(url);
        }
      }
    } else {
      // For smaller sitemaps, just take the first few
      for (let i = 0; i < Math.min(5, urlsFromSitemap.length) && samplesToCheck.length < 10; i++) {
        const url = urlsFromSitemap[i];
        if (!feedsFound.has(url)) {
          samplesToCheck.push(url);
          feedsFound.add(url);
        }
      }
    }
    
    console.log(`Selected ${samplesToCheck.length} URLs to check for feeds`);
    
    // Use fetch to check each URL and look for feeds
    const feedPromises = samplesToCheck.map(async url => {
      try {
        console.log(`Checking URL for feeds: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          // Timeout after 3 seconds
          signal: AbortSignal.timeout(3000)
        });
        
        if (!response.ok) {
          console.warn(`Error fetching ${url}: ${response.status}`);
          return [];
        }
        
        const contentType = response.headers.get('content-type') || '';
        
        // Skip processing if not HTML
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          console.log(`Skipping non-HTML URL: ${url}`);
          return [];
        }
        
        const html = await response.text();
        return extractFeedsFromHTML(html, url);
      } catch (error) {
        console.warn(`Error checking ${url} for feeds: ${error.message}`);
        return [];
      }
    });
    
    // Wait for all checks to complete
    const feedResults = await Promise.allSettled(feedPromises);
    
    // Collect all found feed URLs
    const discoveredFeeds = [];
    feedResults.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        result.value.forEach(feed => {
          if (!feedsFound.has(feed.url)) {
            feedsFound.add(feed.url);
            discoveredFeeds.push(feed.url);
          }
        });
      }
    });
    
    console.log(`Found ${discoveredFeeds.length} potential feed URLs from sitemap samples`);
    return Array.from(feedsFound);
  } catch (error) {
    console.error(`Error processing sitemap ${sitemapUrl}: ${error.message}`);
    return Array.from(feedsFound);
  }
}

/**
 * Generate potential sitemap URLs based on hostname
 * @param {string} origin - Origin of the website
 * @param {string} hostname - Hostname of the website
 * @returns {Array} - Array of potential sitemap URLs
 */
export function getSitemapUrls(origin, hostname) {
  // Common sitemap paths
  const sitemapPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap_news.xml',
    '/sitemap-index.xml',
    '/sitemapindex.xml',
    '/sitemap/',
    '/sitemap/sitemap.xml',
    '/sitemap1.xml',
    '/sitemaps/',
    '/sitemap.php',
    '/sitemap.txt',
    '/sitemap.xml.gz',
    '/wp-sitemap.xml', // WordPress 5.5+
    '/post-sitemap.xml', // Yoast SEO style
    '/page-sitemap.xml',
    '/category-sitemap.xml',
    '/wp-sitemap-posts-post-1.xml', // WP 5.5 specific format
    '/wp-sitemap-posts-page-1.xml',
    '/wp-sitemap-taxonomies-category-1.xml'
  ];
  
  return sitemapPaths.map(path => new URL(path, origin).href);
}

/**
 * Process multiple sitemaps to find feeds
 * @param {Array} sitemapUrls - Array of sitemap URLs to process
 * @param {number} maxDepth - Maximum recursion depth for nested sitemaps
 * @returns {Promise<Array>} - Array of discovered feed URLs
 */
export async function processSitemaps(sitemapUrls, maxDepth = 2) {
  // Keep track of all feeds found to avoid duplicates
  const allFeedsFound = new Set();
  
  // Keep track of processed sitemaps to avoid loops
  const processedSitemaps = new Set();
  
  /**
   * Recursive function to process sitemaps
   * @param {Array} urls - Sitemap URLs to process
   * @param {number} depth - Current recursion depth
   * @returns {Promise<Array>} - Found feed URLs
   */
  async function processSitemapBatch(urls, depth = 0) {
    if (depth >= maxDepth || urls.length === 0) {
      return Array.from(allFeedsFound);
    }
    
    console.log(`Processing sitemap batch at depth ${depth}. URLs to check: ${urls.length}`);
    
    // Process sitemaps in parallel with a limit to avoid overwhelming the browser
    const batchSize = 3;
    const results = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => {
        // Skip if already processed
        if (processedSitemaps.has(url)) {
          return Promise.resolve([]);
        }
        
        // Mark as processed
        processedSitemaps.add(url);
        
        // Process the sitemap
        return findFeedsFromSitemap(url, allFeedsFound);
      });
      
      // Wait for batch to complete before moving to next batch
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          results.push(...result.value);
        }
      });
    }
    
    // Return the unique feed URLs found
    return Array.from(allFeedsFound);
  }
  
  // Start processing the initial batch of sitemaps
  return processSitemapBatch(sitemapUrls, 0);
}
