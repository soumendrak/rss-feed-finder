// Function to extract feeds from HTML content
export function extractFeedsFromHTML(htmlContent, url) {
    const feeds = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Look for RSS links
    const rssLinks = doc.querySelectorAll('link[type="application/rss+xml"]');
    rssLinks.forEach(link => {
        feeds.push({
            url: new URL(link.getAttribute('href'), url).href,
            type: 'RSS'
        });
    });

    // Look for Atom links
    const atomLinks = doc.querySelectorAll('link[type="application/atom+xml"]');
    atomLinks.forEach(link => {
        feeds.push({
            url: new URL(link.getAttribute('href'), url).href,
            type: 'Atom'
        });
    });

    // Look for JSON Feed links (less common, but good to include)
    const jsonFeedLinks = doc.querySelectorAll('link[type="application/json"]');
    jsonFeedLinks.forEach(link => {
        feeds.push({
            url: new URL(link.getAttribute('href'), url).href,
            type: 'JSON'
        });
    });

    // Simple heuristic: Look for links ending in .rss or .xml in anchors
    const anchorLinks = doc.querySelectorAll('a');
    anchorLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.endsWith('.rss') || href.endsWith('.xml'))) {
             // Avoid duplicates and ensure it's a valid URL
             try {
                const absoluteUrl = new URL(href, url).href;
                if (!feeds.some(feed => feed.url === absoluteUrl)) {
                    feeds.push({
                        url: absoluteUrl,
                        type: href.endsWith('.rss') ? 'RSS (Heuristic)' : 'XML (Heuristic)'
                    });
                }
            } catch (e) {
                // Ignore invalid URLs
                console.warn(`Skipping potentially invalid feed URL found in anchor: ${href}`);
            }
        }
    });

    // Deduplicate feeds based on URL
    const uniqueFeeds = feeds.reduce((acc, current) => {
        const x = acc.find(item => item.url === current.url);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []);

    return uniqueFeeds;
}
