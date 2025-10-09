/**
 * ErrorHandler.js - Comprehensive error handling and recovery system
 *
 * This manager handles:
 * - Error catching and logging
 * - Error recovery strategies
 * - User-friendly error messages
 * - Error reporting and analytics
 * - Graceful degradation
 * - Crash recovery
 */

export class ErrorHandler {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('ErrorHandler requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('ErrorHandler requires logger dependency');
    }

    // Error handling configuration
    this.config = {
      enableErrorReporting: true,
      enableCrashRecovery: true,
      enableGracefulDegradation: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      errorReportingEndpoint: null,
      enableUserNotifications: true,
      logLevel: 'error',
      ...dependencies.config,
    };

    // Error state
    this.errorCount = 0;
    this.lastError = null;
    this.errorHistory = [];
    this.maxErrorHistory = 100;
    this.recoveryStrategies = new Map();
    this.errorHandlers = new Map();

    // Recovery state
    this.recoveryInProgress = false;
    this.recoveryAttempts = 0;
    this.lastRecoveryTime = 0;

    // Set up error handling
    this.setupErrorHandling();
    this.setupRecoveryStrategies();
    this.setupGlobalErrorHandlers();

    this.logger.info('ErrorHandler initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing ErrorHandler...');

    // Set up error reporting if enabled
    if (this.config.enableErrorReporting) {
      this.setupErrorReporting();
    }

    this.logger.info('ErrorHandler initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up ErrorHandler...');

    // Remove global error handlers
    this.removeGlobalErrorHandlers();

    // Clear error history
    this.errorHistory = [];

    this.logger.info('ErrorHandler cleaned up');
  }

  /**
   * Set up error handling
   */
  setupErrorHandling() {
    // Register error handlers for different error types
    this.registerErrorHandler('TypeError', this.handleTypeError.bind(this));
    this.registerErrorHandler(
      'ReferenceError',
      this.handleReferenceError.bind(this)
    );
    this.registerErrorHandler('SyntaxError', this.handleSyntaxError.bind(this));
    this.registerErrorHandler('RangeError', this.handleRangeError.bind(this));
    this.registerErrorHandler(
      'NetworkError',
      this.handleNetworkError.bind(this)
    );
    this.registerErrorHandler(
      'TimeoutError',
      this.handleTimeoutError.bind(this)
    );
    this.registerErrorHandler(
      'ValidationError',
      this.handleValidationError.bind(this)
    );
    this.registerErrorHandler('GameError', this.handleGameError.bind(this));
    this.registerErrorHandler('Default', this.handleDefaultError.bind(this));
  }

  /**
   * Set up recovery strategies
   */
  setupRecoveryStrategies() {
    // Game state recovery
    this.recoveryStrategies.set('gameState', {
      recover: this.recoverGameState.bind(this),
      priority: 1,
      maxAttempts: 3,
    });

    // Input system recovery
    this.recoveryStrategies.set('inputSystem', {
      recover: this.recoverInputSystem.bind(this),
      priority: 2,
      maxAttempts: 2,
    });

    // Rendering system recovery
    this.recoveryStrategies.set('renderingSystem', {
      recover: this.recoverRenderingSystem.bind(this),
      priority: 3,
      maxAttempts: 2,
    });

    // Audio system recovery
    this.recoveryStrategies.set('audioSystem', {
      recover: this.recoverAudioSystem.bind(this),
      priority: 4,
      maxAttempts: 1,
    });

    // Network recovery
    this.recoveryStrategies.set('network', {
      recover: this.recoverNetwork.bind(this),
      priority: 5,
      maxAttempts: 5,
    });
  }

  /**
   * Set up global error handlers
   */
  setupGlobalErrorHandlers() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'unhandled',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandledRejection',
        promise: event.promise,
      });
    });

    // Resource loading errors
    window.addEventListener(
      'error',
      (event) => {
        if (event.target !== window) {
          this.handleError(
            new Error(
              `Resource loading failed: ${event.target.src || event.target.href}`
            ),
            {
              type: 'resourceError',
              element: event.target,
              src: event.target.src || event.target.href,
            }
          );
        }
      },
      true
    );
  }

  /**
   * Remove global error handlers
   */
  removeGlobalErrorHandlers() {
    // Note: In a real application, you would store references to the handlers
    // and remove them properly. For simplicity, we'll leave them as is.
  }

  /**
   * Handle error
   */
  handleError(error, context = {}) {
    // Increment error count
    this.errorCount++;
    this.lastError = error;

    // Create error record
    const errorRecord = {
      id: this.generateErrorId(),
      error: error,
      context: context,
      timestamp: Date.now(),
      stack: error.stack,
      message: error.message,
      name: error.name,
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false,
    };

    // Add to error history
    this.addToErrorHistory(errorRecord);

    // Log error
    this.logError(errorRecord);

    // Try to recover
    if (this.config.enableCrashRecovery) {
      this.attemptRecovery(errorRecord);
    }

    // Report error
    if (this.config.enableErrorReporting) {
      this.reportError(errorRecord);
    }

    // Notify user if enabled
    if (this.config.enableUserNotifications) {
      this.notifyUser(errorRecord);
    }

    // Emit error event
    this.eventBus.emit('error:occurred', errorRecord);

    // Check for error threshold
    this.checkErrorThreshold();
  }

  /**
   * Register error handler
   */
  registerErrorHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  /**
   * Handle specific error types
   */
  handleTypeError(errorRecord) {
    this.logger.error('TypeError occurred:', errorRecord);

    // Try to recover by reinitializing affected systems
    this.recoverSystem('gameState');
  }

  handleReferenceError(errorRecord) {
    this.logger.error('ReferenceError occurred:', errorRecord);

    // Try to recover by reloading the page
    this.recoverSystem('gameState');
  }

  handleSyntaxError(errorRecord) {
    this.logger.error('SyntaxError occurred:', errorRecord);

    // This usually indicates a code issue, try to recover
    this.recoverSystem('gameState');
  }

  handleRangeError(errorRecord) {
    this.logger.error('RangeError occurred:', errorRecord);

    // Try to recover by resetting affected values
    this.recoverSystem('gameState');
  }

  handleNetworkError(errorRecord) {
    this.logger.error('NetworkError occurred:', errorRecord);

    // Try to recover network functionality
    this.recoverSystem('network');
  }

  handleTimeoutError(errorRecord) {
    this.logger.error('TimeoutError occurred:', errorRecord);

    // Try to recover by retrying the operation
    this.recoverSystem('network');
  }

  handleValidationError(errorRecord) {
    this.logger.error('ValidationError occurred:', errorRecord);

    // Try to recover by resetting validation state
    this.recoverSystem('gameState');
  }

  handleGameError(errorRecord) {
    this.logger.error('GameError occurred:', errorRecord);

    // Try to recover game state
    this.recoverSystem('gameState');
  }

  handleDefaultError(errorRecord) {
    this.logger.error('Unknown error occurred:', errorRecord);

    // Try general recovery
    this.recoverSystem('gameState');
  }

  /**
   * Attempt recovery
   */
  async attemptRecovery(errorRecord) {
    if (this.recoveryInProgress) {
      this.logger.warn('Recovery already in progress');
      return;
    }

    this.recoveryInProgress = true;
    this.recoveryAttempts++;

    try {
      // Determine recovery strategy based on error type
      const strategy = this.determineRecoveryStrategy(errorRecord);

      if (strategy) {
        this.logger.info('Attempting recovery with strategy:', strategy);

        const success = await strategy.recover(errorRecord);

        if (success) {
          this.logger.info('Recovery successful');
          this.recoveryInProgress = false;
          this.recoveryAttempts = 0;
          this.lastRecoveryTime = Date.now();

          this.eventBus.emit('error:recovered', {
            errorRecord,
            strategy: strategy.name,
            timestamp: Date.now(),
          });
        } else {
          this.logger.warn('Recovery failed, trying next strategy');
          await this.tryNextRecoveryStrategy(errorRecord);
        }
      } else {
        this.logger.warn('No recovery strategy available for error');
        this.recoveryInProgress = false;
      }
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed:', recoveryError);
      this.recoveryInProgress = false;
    }
  }

  /**
   * Determine recovery strategy
   */
  determineRecoveryStrategy(errorRecord) {
    const errorName = errorRecord.error.name;
    const context = errorRecord.context;

    // Check for specific error patterns
    if (errorName === 'TypeError' && context.type === 'unhandled') {
      return this.recoveryStrategies.get('gameState');
    }

    if (context.type === 'resourceError') {
      return this.recoveryStrategies.get('renderingSystem');
    }

    if (errorName === 'NetworkError' || context.type === 'network') {
      return this.recoveryStrategies.get('network');
    }

    // Default to game state recovery
    return this.recoveryStrategies.get('gameState');
  }

  /**
   * Try next recovery strategy
   */
  async tryNextRecoveryStrategy(errorRecord) {
    const strategies = Array.from(this.recoveryStrategies.values()).sort(
      (a, b) => a.priority - b.priority
    );

    for (const strategy of strategies) {
      if (strategy.attempts < strategy.maxAttempts) {
        strategy.attempts = (strategy.attempts || 0) + 1;

        try {
          const success = await strategy.recover(errorRecord);
          if (success) {
            this.logger.info(
              'Recovery successful with strategy:',
              strategy.name
            );
            this.recoveryInProgress = false;
            return;
          }
        } catch (error) {
          this.logger.error('Recovery strategy failed:', error);
        }
      }
    }

    this.logger.error('All recovery strategies failed');
    this.recoveryInProgress = false;
  }

  /**
   * Recovery strategies
   */
  async recoverGameState(errorRecord) {
    this.logger.info('Attempting game state recovery');

    try {
      // Emit recovery event
      this.eventBus.emit('game:recoverState', {
        errorRecord,
        timestamp: Date.now(),
      });

      // Wait for recovery to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      this.logger.error('Game state recovery failed:', error);
      return false;
    }
  }

  async recoverInputSystem(errorRecord) {
    this.logger.info('Attempting input system recovery');

    try {
      // Emit recovery event
      this.eventBus.emit('input:recover', {
        errorRecord,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      this.logger.error('Input system recovery failed:', error);
      return false;
    }
  }

  async recoverRenderingSystem(errorRecord) {
    this.logger.info('Attempting rendering system recovery');

    try {
      // Emit recovery event
      this.eventBus.emit('render:recover', {
        errorRecord,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      this.logger.error('Rendering system recovery failed:', error);
      return false;
    }
  }

  async recoverAudioSystem(errorRecord) {
    this.logger.info('Attempting audio system recovery');

    try {
      // Emit recovery event
      this.eventBus.emit('audio:recover', {
        errorRecord,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      this.logger.error('Audio system recovery failed:', error);
      return false;
    }
  }

  async recoverNetwork(errorRecord) {
    this.logger.info('Attempting network recovery');

    try {
      // Emit recovery event
      this.eventBus.emit('network:recover', {
        errorRecord,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      this.logger.error('Network recovery failed:', error);
      return false;
    }
  }

  /**
   * Recover system
   */
  async recoverSystem(systemName) {
    const strategy = this.recoveryStrategies.get(systemName);
    if (strategy) {
      return await strategy.recover({ system: systemName });
    }
    return false;
  }

  /**
   * Log error
   */
  logError(errorRecord) {
    const level = this.config.logLevel || 'error';

    switch (level) {
      case 'error':
        this.logger.error('Error occurred:', errorRecord);
        break;
      case 'warn':
        this.logger.warn('Error occurred:', errorRecord);
        break;
      case 'info':
        this.logger.info('Error occurred:', errorRecord);
        break;
      default:
        console.error('Error occurred:', errorRecord);
    }
  }

  /**
   * Report error
   */
  async reportError(errorRecord) {
    if (!this.config.errorReportingEndpoint) {
      return;
    }

    try {
      const reportData = {
        id: errorRecord.id,
        message: errorRecord.message,
        stack: errorRecord.stack,
        context: errorRecord.context,
        timestamp: errorRecord.timestamp,
        userAgent: errorRecord.userAgent,
        url: errorRecord.url,
        errorCount: this.errorCount,
      };

      // Send error report
      const response = await fetch(this.config.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        this.logger.info('Error reported successfully');
      } else {
        this.logger.warn('Failed to report error:', response.status);
      }
    } catch (error) {
      this.logger.error('Error reporting failed:', error);
    }
  }

  /**
   * Notify user
   */
  notifyUser(errorRecord) {
    // Create user-friendly error message
    const message = this.createUserFriendlyMessage(errorRecord);

    // Show notification
    this.showErrorNotification(message, errorRecord);
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(errorRecord) {
    const errorName = errorRecord.error.name;
    const context = errorRecord.context;

    switch (errorName) {
      case 'TypeError':
        return 'A game error occurred. The game will attempt to recover automatically.';
      case 'ReferenceError':
        return 'A game error occurred. Please refresh the page if the problem persists.';
      case 'NetworkError':
        return 'Network connection lost. The game will attempt to reconnect.';
      case 'TimeoutError':
        return 'Request timed out. The game will retry automatically.';
      default:
        return 'An unexpected error occurred. The game will attempt to recover.';
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message, errorRecord) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
            <div class="error-notification-content">
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Check error threshold
   */
  checkErrorThreshold() {
    const threshold = 10; // Maximum errors before taking action

    if (this.errorCount >= threshold) {
      this.logger.error('Error threshold exceeded:', this.errorCount);

      // Emit critical error event
      this.eventBus.emit('error:critical', {
        errorCount: this.errorCount,
        threshold: threshold,
        timestamp: Date.now(),
      });

      // Reset error count
      this.errorCount = 0;
    }
  }

  /**
   * Add to error history
   */
  addToErrorHistory(errorRecord) {
    this.errorHistory.push(errorRecord);

    // Maintain history size limit
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Generate error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      lastError: this.lastError,
      errorHistory: this.errorHistory,
      recoveryInProgress: this.recoveryInProgress,
      recoveryAttempts: this.recoveryAttempts,
      lastRecoveryTime: this.lastRecoveryTime,
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Set up error reporting
   */
  setupErrorReporting() {
    // This would set up error reporting to external services
    // For now, we'll just log that it's enabled
    this.logger.info('Error reporting enabled');
  }

  /**
   * Wrap function with error handling
   */
  wrapFunction(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error, {
          ...context,
          function: fn.name,
          arguments: args,
        });
        throw error;
      }
    };
  }

  /**
   * Wrap promise with error handling
   */
  wrapPromise(promise, context = {}) {
    return promise.catch((error) => {
      this.handleError(error, context);
      throw error;
    });
  }
}

export default ErrorHandler;
