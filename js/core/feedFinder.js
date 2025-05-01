// Core functions to find feeds on a page
import { isValidUrl } from '../utils.js';

/**
 * Searches for feeds on the current page
 * @param {boolean} deepSearchEnabled - Whether to perform a deep search
 * @returns {Array} - Array of feed objects
 */
export function findFeeds(deepSearchEnabled = false) {
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
      const commonFeedPaths = [
        '/feed',
        '/rss',
        '/feed/rss',
        '/rss/feed',
        '/feed.xml',
        '/rss.xml',
        '/atom.xml',
        '/feeds',
        '/index.xml',
        '/rss/index.xml',
        '/feed/index.xml',
        `/${hostname}.xml`,
        '/feed/atom',
        '/rdf',
        '/news.rss',
        '/news.xml',
        '/blog.rss',
        '/blog.xml',
        '/blog/feed',
        '/blog/rss',
        '/blog/atom',
        '/feed.rss',
        '/node/feed',
        '/articles.rss',
        '/posts.rss',
        '/main-feed.xml',
        '/feeds/default',
        '/feeds/posts/default',
        '/xml/rss/blog',
        '/comments/feed', // WordPress comments feed
        '/category/feed',
        '/category/rss',
        '/wp-feed.php',
        '/wp-rss.php',
        '/wp-feed',
        '/feed/rss2',
        '/index.rdf',
        '/index.rss',
        '/feed/podcast', // Podcast feeds
        '/feed.rss2',
        '/rss2.0',
        '/rss20.xml',
        '/?feed=rss',
        '/?feed=rss2',
        '/?feed=atom',
        // Ghost blog feeds
        '/rss/',
        // Tumblr styled
        '/rss',
        // Medium feeds
        '/feed/medium',
        // Drupal paths
        '/taxonomy/term/all/feed',
        '/taxonomy/term/all/rss.xml',
      ];
      
      for (const path of commonFeedPaths) {
        try {
          const feedUrl = new URL(path, origin).href;
          feeds.add(feedUrl);
          feedData.set(feedUrl, {
            href: feedUrl,
            title: 'Generated: ' + path,
            type: 'generated',
            isPotential: true // Mark as potential/unverified
          });
        } catch (e) {
          console.warn(`Failed to create URL for ${path}: ${e.message}`);
        }
      }
    }
    
    // If deep search is enabled, indicate that we're going to search sitemaps
    if (deepSearchEnabled) {
      const sitemapIndicator = {
        href: '_sitemapSearch',
        title: 'Searching sitemaps...',
        type: 'info',
        isSearching: true
      };
      
      // Convert feeds to array
      const result = Array.from(feedData.values());
      
      // Add the sitemap search indicator
      return [...result, sitemapIndicator];
    }
    
    // Return feeds as array
    return Array.from(feedData.values());
    
  } catch (error) {
    console.error("Error in findFeeds:", error);
    // Return empty array on error
    return [];
  }
}
