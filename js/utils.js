// Utility function to check if a string is a valid URL
export function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Add other utility functions here as needed
