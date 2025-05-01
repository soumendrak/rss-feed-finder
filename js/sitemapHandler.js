// Function to fetch and parse sitemap
export async function handleSitemap(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const sitemapText = await response.text();
        const parser = new DOMParser();
        const sitemapDoc = parser.parseFromString(sitemapText, "application/xml");
        const errorNode = sitemapDoc.querySelector("parsererror");
        if (errorNode) {
            console.error("Error parsing sitemap XML:", errorNode);
            return []; // Return empty array on parsing error
        }

        const urls = [];
        const urlElements = sitemapDoc.querySelectorAll("url > loc");
        urlElements.forEach(loc => {
            urls.push(loc.textContent);
        });

        // Handle sitemap index files
        const sitemapIndexElements = sitemapDoc.querySelectorAll("sitemap > loc");
        if (sitemapIndexElements.length > 0) {
            console.log(`Found sitemap index with ${sitemapIndexElements.length} sitemaps.`);
            const nestedSitemapPromises = Array.from(sitemapIndexElements).map(loc => handleSitemap(loc.textContent));
            const nestedResults = await Promise.allSettled(nestedSitemapPromises);

            nestedResults.forEach(result => {
                if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                    urls.push(...result.value);
                } else if (result.status === 'rejected') {
                    console.error("Error fetching/parsing nested sitemap:", result.reason);
                }
            });
        }

        // Deduplicate URLs from potential nested sitemaps
        return [...new Set(urls)];

    } catch (error) {
        console.error(`Error fetching or parsing sitemap ${url}:`, error);
        // Consider how to handle errors - perhaps return an empty array or re-throw
        return []; // Return empty array on fetch/parse error
    }
}

// Function to check a list of URLs for feeds
export async function checkUrlsForFeeds(urlsToCheck, tabId, extractFeedsFunc) {
    let foundFeeds = [];
    // Limit the number of URLs to check to avoid overwhelming the browser/server
    const limit = 50; // Adjust this limit as needed
    const urlsToProcess = urlsToCheck.slice(0, limit);

    console.log(`Checking ${urlsToProcess.length} URLs from sitemap for feeds...`);

    // Execute content script in the target tab for each URL
    // Note: Chrome extensions cannot directly fetch content of arbitrary URLs due to security restrictions.
    // We need to inject a content script into the *active tab* to fetch and parse HTML.
    // This approach has limitations: it only works if the URLs are on the same origin
    // as the current tab, or if we have host permissions.
    // A more robust approach might involve a background script with broad host permissions,
    // but that increases security implications.

    // For now, let's assume we need a content script. We'll need to refine this.
    // The following is a conceptual placeholder for injecting scripts and getting results.
    // A proper implementation would require message passing between popup, background, and content scripts.

    // Placeholder: Simulate checking URLs (replace with actual implementation)
    // In a real extension, you'd use chrome.scripting.executeScript and message passing.
    for (const url of urlsToProcess) {
        try {
            // Simulate fetching content (replace with actual content script execution)
            console.log(`Simulating check for feeds on: ${url}`);
            // const response = await fetch(url); // This won't work directly in popup/content scripts for cross-origin
            // const html = await response.text();
            // const feeds = extractFeedsFunc(html, url);
            // foundFeeds.push(...feeds);
        } catch (error) {
            console.warn(`Could not check URL ${url}: ${error.message}`);
        }
    }

    // Simulate finding some feeds for demonstration
    if (urlsToProcess.length > 0) {
         foundFeeds.push({ url: `${urlsToProcess[0]}/simulated_feed.xml`, type: 'Simulated RSS'});
    }

    // Deduplicate
    const uniqueFeeds = foundFeeds.reduce((acc, current) => {
        const x = acc.find(item => item.url === current.url);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []);


    console.log(`Sitemap check simulation found: ${uniqueFeeds.length} feeds.`);
    return uniqueFeeds;
}
