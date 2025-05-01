// Logger module for displaying log messages in the UI

/**
 * UI Logger for displaying log messages in the extension popup
 */
export class UILogger {
  constructor() {
    this.logContainer = null;
    this.logMessages = null;
    this.isEnabled = false;
    this.maxLogEntries = 100;
    this.logCount = 0;
  }

  /**
   * Initialize the logger
   */
  init() {
    this.logContainer = document.getElementById('log-container');
    this.logMessages = document.getElementById('log-messages');
    
    if (this.logContainer && this.logMessages) {
      this.isEnabled = true;
    } else {
      console.warn('Logger container elements not found');
    }
  }

  /**
   * Log a message
   * @param {string} type - Message type (info, error, warning, success)
   * @param {string} message - The message to log
   */
  log(type, message) {
    // Always log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (!this.isEnabled || !this.logMessages) {
      return;
    }
    
    // Create log entry
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    // Add to log container
    this.logMessages.appendChild(logEntry);
    
    // Auto-scroll to bottom
    this.logMessages.scrollTop = this.logMessages.scrollHeight;
    
    // Limit the number of log entries
    this.logCount++;
    if (this.logCount > this.maxLogEntries) {
      const firstChild = this.logMessages.firstChild;
      if (firstChild) {
        this.logMessages.removeChild(firstChild);
      }
      this.logCount--;
    }
  }

  /**
   * Clear all log messages
   */
  clear() {
    if (this.logMessages) {
      this.logMessages.innerHTML = '';
      this.logCount = 0;
    }
  }

  /**
   * Log a success message
   * @param {string} message - The success message to log
   */
  success(message) {
    this.log('success', message);
  }
}

// Create and export a singleton instance
export const uiLogger = new UILogger();
