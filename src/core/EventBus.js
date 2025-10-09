/**
 * EventBus.js - Central event management system
 *
 * This class provides:
 * - Event emission and listening
 * - Event filtering and transformation
 * - Event history and debugging
 * - Performance monitoring
 */

export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.debug = false;
    this.performanceMetrics = {
      totalEvents: 0,
      averageProcessingTime: 0,
      slowestEvent: null,
      eventCounts: new Map(),
    };
  }

  /**
   * Add event listener
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: options.id || null,
      context: options.context || null,
    };

    this.listeners.get(event).push(listener);

    // Sort by priority (higher priority first)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority);

    this.log(`Added listener for event: ${event}`);
  }

  /**
   * Add one-time event listener
   */
  once(event, callback, options = {}) {
    this.on(event, callback, { ...options, once: true });
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }

    const eventListeners = this.listeners.get(event);
    const index = eventListeners.findIndex(
      (listener) => listener.callback === callback
    );

    if (index !== -1) {
      eventListeners.splice(index, 1);
      this.log(`Removed listener for event: ${event}`);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
      this.log(`Removed all listeners for event: ${event}`);
    } else {
      this.listeners.clear();
      this.log('Removed all listeners');
    }
  }

  /**
   * Alias for off method for backward compatibility
   */
  removeListener(event, callback) {
    return this.off(event, callback);
  }

  /**
   * Emit an event
   */
  emit(event, data = {}) {
    const startTime = performance.now();

    if (!this.listeners.has(event)) {
      this.log(`No listeners for event: ${event}`);
      return;
    }

    const eventListeners = this.listeners.get(event);
    const eventData = {
      event,
      data,
      timestamp: Date.now(),
      id: this.generateEventId(),
    };

    // Add to history
    this.addToHistory(eventData);

    // Update performance metrics
    this.updatePerformanceMetrics(event, startTime);

    // Call listeners
    const listenersToRemove = [];

    for (let i = 0; i < eventListeners.length; i++) {
      const listener = eventListeners[i];

      try {
        // Call listener with context if provided
        if (listener.context) {
          listener.callback.call(listener.context, eventData.data, eventData);
        } else {
          listener.callback(eventData.data, eventData);
        }

        // Mark for removal if it's a one-time listener
        if (listener.once) {
          listenersToRemove.push(i);
        }
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }

    // Remove one-time listeners
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      eventListeners.splice(listenersToRemove[i], 1);
    }

    this.log(`Emitted event: ${event}`, eventData);
  }

  /**
   * Emit event asynchronously
   */
  async emitAsync(event, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.emit(event, data);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Wait for an event
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (data, eventData) => {
        clearTimeout(timeoutId);
        this.off(event, handler);
        resolve({ data, eventData });
      };

      this.on(event, handler);
    });
  }

  /**
   * Add event to history
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData);

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(event, startTime) {
    const processingTime = performance.now() - startTime;

    this.performanceMetrics.totalEvents++;

    // Update average processing time
    const totalTime =
      this.performanceMetrics.averageProcessingTime *
      (this.performanceMetrics.totalEvents - 1);
    this.performanceMetrics.averageProcessingTime =
      (totalTime + processingTime) / this.performanceMetrics.totalEvents;

    // Update slowest event
    if (
      !this.performanceMetrics.slowestEvent ||
      processingTime > this.performanceMetrics.slowestEvent.time
    ) {
      this.performanceMetrics.slowestEvent = {
        event,
        time: processingTime,
        timestamp: Date.now(),
      };
    }

    // Update event counts
    const count = this.performanceMetrics.eventCounts.get(event) || 0;
    this.performanceMetrics.eventCounts.set(event, count + 1);
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event history
   */
  getHistory(filter = {}) {
    let history = [...this.eventHistory];

    if (filter.event) {
      history = history.filter((item) => item.event === filter.event);
    }

    if (filter.since) {
      history = history.filter((item) => item.timestamp >= filter.since);
    }

    if (filter.until) {
      history = history.filter((item) => item.timestamp <= filter.until);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      eventCounts: Object.fromEntries(this.performanceMetrics.eventCounts),
    };
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    this.log('Event history cleared');
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalEvents: 0,
      averageProcessingTime: 0,
      slowestEvent: null,
      eventCounts: new Map(),
    };
    this.log('Performance metrics reset');
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug = true;
    this.log('Debug mode enabled');
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debug = false;
  }

  /**
   * Log debug message
   */
  log(message, data = null) {
    if (this.debug) {
      if (data) {
        console.log(`[EventBus] ${message}`, data);
      } else {
        console.log(`[EventBus] ${message}`);
      }
    }
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event) {
    return this.listeners.has(event) && this.listeners.get(event).length > 0;
  }

  /**
   * Create event filter
   */
  createFilter(event, condition) {
    return (data, eventData) => {
      if (condition(data, eventData)) {
        this.emit(event, data);
      }
    };
  }

  /**
   * Create event transformer
   */
  createTransformer(event, transform) {
    return (data, eventData) => {
      const transformedData = transform(data, eventData);
      this.emit(event, transformedData);
    };
  }

  /**
   * Destroy the event bus
   */
  destroy() {
    this.listeners.clear();
    this.eventHistory = [];
    this.performanceMetrics = {
      totalEvents: 0,
      averageProcessingTime: 0,
      slowestEvent: null,
      eventCounts: new Map(),
    };
    this.log('EventBus destroyed');
  }
}

export default EventBus;
