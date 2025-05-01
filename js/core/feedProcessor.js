// Feed processor module
import { validateFeed } from '../services/feedValidator.js';

/**
 * Process and validate feeds before displaying
 * @param {Array} feeds - Array of feed objects to process
 * @returns {Promise<Array>} - Processed feed objects with validation info
 */
export async function processFeeds(feeds) {
  // No feeds, return empty array
  if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
    return [];
  }
  
  // Handle case with sitemap search indicator
  const hasSitemapSearching = feeds.some(feed => feed.isSearching && feed.href === '_sitemapSearch');
  
  // First, filter out obvious duplicates based on URL
  const uniqueFeeds = feeds.reduce((acc, current) => {
    const x = acc.find(item => item.href === current.href);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);
  
  // If we're in deep search mode, only validate a few feeds to keep UI responsive
  // The rest will be validated in batches as the deep search progresses
  const maxToValidate = hasSitemapSearching ? 5 : 30;
  
  // Get non-info feeds
  const regularFeeds = uniqueFeeds.filter(feed => !feed.isInfo && !feed.isSearching);
  const infoFeeds = uniqueFeeds.filter(feed => feed.isInfo || feed.isSearching);
  
  // Sort feeds: prioritize likely valid ones (non-generated first)
  const sortedFeeds = [...regularFeeds].sort((a, b) => {
    // Deprioritize generated feeds compared to found ones
    const aGenerated = a.isPotential || a.type === 'generated' ? 1 : 0;
    const bGenerated = b.isPotential || b.type === 'generated' ? 1 : 0;
    
    if (aGenerated !== bGenerated) {
      return aGenerated - bGenerated;
    }
    
    // Sort by URL as a fallback
    return a.href.localeCompare(b.href);
  });
  
  // Only validate the top N feeds to keep UI responsive
  const feedsToValidate = sortedFeeds.slice(0, maxToValidate);
  const feedsToDefer = sortedFeeds.slice(maxToValidate);
  
  console.log(`Validating ${feedsToValidate.length} feeds, deferring ${feedsToDefer.length}`);
  
  // Process feeds in parallel
  const validatePromises = feedsToValidate.map(async feed => {
    try {
      // Skip validation for sitemaps and internal special URLs
      if (feed.isInfo || feed.isSearching || feed.href === '_sitemapSearch') {
        return feed;
      }
      
      // Perform feed validation
      const validationResult = await validateFeed(feed.href);
      
      // Add validation results to feed object
      return {
        ...feed,
        isValid: validationResult.isValid,
        feedType: validationResult.feedType,
        validationError: validationResult.isValid ? null : validationResult.reason
      };
    } catch (error) {
      console.error(`Error validating feed ${feed.href}:`, error);
      
      // On error, mark as invalid
      return {
        ...feed,
        isValid: false,
        validationError: `Error: ${error.message}`
      };
    }
  });
  
  // Wait for all validations to complete
  const validatedFeeds = await Promise.all(validatePromises);
  
  // Combine the validated feeds with deferred feeds and info messages
  const processedFeeds = [
    ...validatedFeeds,
    ...feedsToDefer.map(feed => ({
      ...feed,
      isPotential: true // Mark remaining feeds as potential/unverified
    })),
    ...infoFeeds
  ];
  
  return processedFeeds;
}
