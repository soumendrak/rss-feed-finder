// Feed validation service
import { isValidUrl } from '../utils.js';

// Cache for validated feed URLs to prevent duplicate checks
const validatedFeedCache = new Map();

/**
 * Validate a feed by checking if the URL returns valid RSS/Atom XML content
 * @param {string} url - The feed URL to validate
 * @returns {Promise<Object>} - Validation result with status and details
 */
export async function validateFeed(url) {
  if (!isValidUrl(url)) {
    return { isValid: false, reason: 'Invalid URL format' };
  }
  
  // Check cache first
  if (validatedFeedCache.has(url)) {
    return validatedFeedCache.get(url);
  }
  
  try {
    // Attempt to fetch the feed URL
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      // Timeout after 5 seconds to keep things responsive
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      const result = { isValid: false, reason: `HTTP error: ${response.status} ${response.statusText}` };
      validatedFeedCache.set(url, result);
      return result;
    }
    
    // Get content type to help identify feed type
    const contentType = response.headers.get('content-type') || '';
    
    // Get the text content of the response
    const text = await response.text();
    
    // Basic check for empty or short responses
    if (!text || text.length < 30) {
      const result = { isValid: false, reason: 'Empty or too short response' };
      validatedFeedCache.set(url, result);
      return result;
    }
    
    // 1. Check content type headers first
    const isXml = contentType.includes('xml') || 
                 contentType.includes('rss') || 
                 contentType.includes('atom');
    
    const isJson = contentType.includes('json');
    
    // 2. Analyze content for feed markers regardless of headers
    // For XML feeds
    const hasRssXmlMarkers = text.includes('<rss') || 
                           text.includes('<feed') ||
                           text.includes('<rdf:RDF') ||
                           text.includes('xmlns="http://www.w3.org/2005/Atom"') ||
                           text.includes('xmlns="http://purl.org/rss/');
    
    // For JSON feeds                     
    const hasJsonFeedMarkers = text.includes('"version": "https://jsonfeed.org/version/1') ||
                              text.includes('"items":') && 
                              (text.includes('"feed_url":') || text.includes('"home_page_url":'));
    
    // Check for redirect markers (certain link formats often found in HTML redirects)
    const isHtmlRedirect = text.includes('<html') && 
                         text.includes('<link') && 
                         text.includes('type="application/rss') ||
                         text.includes('type="application/atom');
    
    // Check if it appears to be HTML with actual content (meaning not a feed)
    const isActualHtml = text.includes('<html') && 
                       (text.includes('<body') || text.includes('<div')) &&
                       !isHtmlRedirect;
    
    // Make validation decision with all collected factors
    let isValid = false;
    let feedType = null;
    let reason = '';
    
    if (isActualHtml) {
      isValid = false;
      reason = 'URL returns HTML content instead of a feed';
    } else if (isXml && hasRssXmlMarkers) {
      isValid = true;
      if (text.includes('<rss')) {
        feedType = 'RSS';
      } else if (text.includes('<feed')) {
        feedType = 'Atom';
      } else if (text.includes('<rdf:RDF')) {
        feedType = 'RDF';
      } else {
        feedType = 'XML';
      }
    } else if (isJson && hasJsonFeedMarkers) {
      isValid = true;
      feedType = 'JSON';
    } else if (isHtmlRedirect) {
      isValid = false;
      reason = 'HTML redirect page, not a direct feed';
    } else {
      isValid = false;
      reason = 'Not recognized as a valid feed format';
    }
    
    const result = { isValid, feedType, reason };
    validatedFeedCache.set(url, result);
    return result;
  } catch (error) {
    console.error(`Error validating feed ${url}:`, error);
    // Cache the error to prevent repeated failures
    const errorMessage = error.name === 'TimeoutError' ? 
        'Request timed out' : `Error: ${error.message}`;
    
    const result = { isValid: false, reason: errorMessage };
    validatedFeedCache.set(url, result);
    return result;
  }
}
