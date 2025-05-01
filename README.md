# RSS Feed Finder

A browser extension that detects and validates RSS/Atom feeds on websites. This extension helps you discover feed URLs that might not be obvious or properly advertised on the websites you visit.

## Features

- Advanced feed detection using multiple methods
- Validation of feed URLs to ensure they're actually valid RSS/Atom feeds
- Visual status indicators for valid, invalid, and suggested feeds
- Easy copying of feed URLs with a single click
- Clean, intuitive user interface
- Lightweight implementation with minimal performance impact

## Installation Instructions

This extension needs to be installed in developer mode as an unpacked extension. Follow these steps:

### For Chrome

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click the "Load unpacked" button that appears
5. Browse to the folder where you downloaded/cloned this extension and select it
6. The RSS Feed Finder extension should now appear in your extensions list and be ready to use

### For Brave

1. Download or clone this repository to your local machine
2. Open Brave and navigate to `brave://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click the "Load unpacked" button that appears
5. Browse to the folder where you downloaded/cloned this extension and select it
6. The RSS Feed Finder extension should now appear in your extensions list and be ready to use

### For Edge

1. Download or clone this repository to your local machine
2. Open Edge and navigate to `edge://extensions/`
3. Enable "Developer mode" by toggling the switch in the left sidebar
4. Click the "Load unpacked" button that appears
5. Browse to the folder where you downloaded/cloned this extension and select it
6. The RSS Feed Finder extension should now appear in your extensions list and be ready to use

## How to Use

1. Visit a website that you want to check for RSS/Atom feeds
2. Click on the RSS Feed Finder extension icon in your browser toolbar
3. The extension will automatically scan the current page for feeds
4. Results will be displayed in the popup window with the following indicators:
   - 🟢 Green: Valid RSS/Atom feed
   - 🔴 Red: Invalid or inaccessible feed
   - 🟡 Yellow: Suggested feed (needs verification)
5. Click the copy button next to any feed URL to copy it to your clipboard
6. Use the copied URL in your favorite RSS reader application

## Troubleshooting

- If no feeds are found on a page that you know has feeds, try refreshing the page and clicking the extension icon again
- Some websites may block access to their feeds from browser extensions due to CORS policies
- If the extension stops working, try reinstalling it following the installation steps

## Privacy

This extension only runs when you click its icon and does not track your browsing activity. It only accesses the current tab's content to find feed URLs.

## License

This project is open source and available under the [MIT License](LICENSE).
