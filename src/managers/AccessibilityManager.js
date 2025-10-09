/**
 * AccessibilityManager.js - Accessibility features with gameplay integration
 *
 * This manager handles:
 * - Screen reader support
 * - High contrast mode
 * - Colorblind support
 * - Keyboard navigation
 * - Audio cues and descriptions
 * - Text scaling
 * - Motion reduction
 */

export class AccessibilityManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.gameState = dependencies.gameState;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('AccessibilityManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('AccessibilityManager requires logger dependency');
    }

    // Accessibility settings
    this.settings = {
      screenReader: false,
      highContrast: false,
      colorblindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
      keyboardNavigation: false,
      audioCues: true,
      audioDescriptions: false,
      textScaling: 1.0,
      motionReduction: false,
      reducedAnimations: false,
      largeText: false,
      focusIndicators: true,
    };

    // Audio context for sound cues
    this.audioContext = null;
    this.audioEnabled = true;

    // Screen reader support
    this.announcements = [];
    this.announcementQueue = [];

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('AccessibilityManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing AccessibilityManager...');

    // Load accessibility settings
    await this.loadAccessibilitySettings();

    // Initialize audio context
    this.initializeAudio();

    // Set up DOM accessibility features
    this.setupDOMAccessibility();

    this.logger.info('AccessibilityManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up AccessibilityManager...');

    // Save accessibility settings
    this.saveAccessibilitySettings();

    // Remove event listeners
    this.removeEventHandlers();

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.logger.info('AccessibilityManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime, gameState) {
    // Process announcement queue
    this.processAnnouncementQueue();

    // Update accessibility features based on game state
    this.updateAccessibilityFeatures(gameState);
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Game state events
    this.eventBus.on('game:started', this.handleGameStarted.bind(this));
    this.eventBus.on('game:paused', this.handleGamePaused.bind(this));
    this.eventBus.on('game:resumed', this.handleGameResumed.bind(this));
    this.eventBus.on('game:stopped', this.handleGameStopped.bind(this));

    // Player events
    this.eventBus.on('player:scoreChanged', this.handleScoreChanged.bind(this));
    this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));
    this.eventBus.on(
      'player:itemCollected',
      this.handleItemCollected.bind(this)
    );

    // Level events
    this.eventBus.on('level:started', this.handleLevelStarted.bind(this));
    this.eventBus.on('level:completed', this.handleLevelCompleted.bind(this));

    // Achievement events
    this.eventBus.on(
      'achievement:unlocked',
      this.handleAchievementUnlocked.bind(this)
    );
    this.eventBus.on(
      'dailyChallenge:completed',
      this.handleDailyChallengeCompleted.bind(this)
    );

    // Input events
    this.eventBus.on('game:input', this.handleInput.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener(
      'game:started',
      this.handleGameStarted.bind(this)
    );
    this.eventBus.removeListener(
      'game:paused',
      this.handleGamePaused.bind(this)
    );
    this.eventBus.removeListener(
      'game:resumed',
      this.handleGameResumed.bind(this)
    );
    this.eventBus.removeListener(
      'game:stopped',
      this.handleGameStopped.bind(this)
    );
    this.eventBus.removeListener(
      'player:scoreChanged',
      this.handleScoreChanged.bind(this)
    );
    this.eventBus.removeListener(
      'player:damaged',
      this.handlePlayerDamaged.bind(this)
    );
    this.eventBus.removeListener(
      'player:itemCollected',
      this.handleItemCollected.bind(this)
    );
    this.eventBus.removeListener(
      'level:started',
      this.handleLevelStarted.bind(this)
    );
    this.eventBus.removeListener(
      'level:completed',
      this.handleLevelCompleted.bind(this)
    );
    this.eventBus.removeListener(
      'achievement:unlocked',
      this.handleAchievementUnlocked.bind(this)
    );
    this.eventBus.removeListener(
      'dailyChallenge:completed',
      this.handleDailyChallengeCompleted.bind(this)
    );
    this.eventBus.removeListener('game:input', this.handleInput.bind(this));
  }

  /**
   * Initialize audio context
   */
  initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.audioEnabled = true;
    } catch (error) {
      this.logger.warn('Audio context not available:', error);
      this.audioEnabled = false;
    }
  }

  /**
   * Set up DOM accessibility features
   */
  setupDOMAccessibility() {
    // Create announcement region for screen readers
    this.createAnnouncementRegion();

    // Set up keyboard navigation
    this.setupKeyboardNavigation();

    // Apply initial accessibility settings
    this.applyAccessibilitySettings();
  }

  /**
   * Create announcement region for screen readers
   */
  createAnnouncementRegion() {
    const announcementRegion = document.createElement('div');
    announcementRegion.id = 'accessibility-announcements';
    announcementRegion.setAttribute('aria-live', 'polite');
    announcementRegion.setAttribute('aria-atomic', 'true');
    announcementRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
    document.body.appendChild(announcementRegion);
  }

  /**
   * Set up keyboard navigation
   */
  setupKeyboardNavigation() {
    if (!this.settings.keyboardNavigation) return;

    document.addEventListener('keydown', (event) => {
      this.handleKeyboardNavigation(event);
    });
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(event) {
    if (!this.settings.keyboardNavigation) return;

    switch (event.key) {
      case 'Tab':
        // Ensure proper tab order
        this.handleTabNavigation(event);
        break;
      case 'Enter':
      case ' ':
        // Handle activation
        this.handleActivation(event);
        break;
      case 'Escape':
        // Handle escape key
        this.handleEscape(event);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Handle arrow key navigation
        this.handleArrowNavigation(event);
        break;
    }
  }

  /**
   * Handle tab navigation
   */
  handleTabNavigation(event) {
    // Ensure focusable elements are properly ordered
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // This would implement custom tab order logic
    // based on game state and UI layout
  }

  /**
   * Handle activation
   */
  handleActivation(event) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.click) {
      activeElement.click();
    }
  }

  /**
   * Handle escape key
   */
  handleEscape(event) {
    // Emit escape event for game to handle
    this.eventBus.emit('accessibility:escape', {
      timestamp: Date.now(),
    });
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowNavigation(event) {
    // Emit arrow navigation event
    this.eventBus.emit('accessibility:arrowNavigation', {
      direction: event.key.replace('Arrow', '').toLowerCase(),
      timestamp: Date.now(),
    });
  }

  /**
   * Apply accessibility settings
   */
  applyAccessibilitySettings() {
    const root = document.documentElement;

    // High contrast mode
    if (this.settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Colorblind mode
    root.classList.remove(
      'colorblind-protanopia',
      'colorblind-deuteranopia',
      'colorblind-tritanopia'
    );
    if (this.settings.colorblindMode !== 'none') {
      root.classList.add(`colorblind-${this.settings.colorblindMode}`);
    }

    // Text scaling
    root.style.setProperty('--text-scale', this.settings.textScaling);

    // Motion reduction
    if (this.settings.motionReduction) {
      root.classList.add('motion-reduced');
    } else {
      root.classList.remove('motion-reduced');
    }

    // Large text
    if (this.settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Focus indicators
    if (this.settings.focusIndicators) {
      root.classList.add('focus-indicators');
    } else {
      root.classList.remove('focus-indicators');
    }
  }

  /**
   * Update accessibility settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applyAccessibilitySettings();

    this.logger.info('Accessibility settings updated');

    // Emit settings changed event
    this.eventBus.emit('accessibility:settingsChanged', {
      settings: this.settings,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Announce text to screen readers
   */
  announce(text, priority = 'polite') {
    if (!this.settings.screenReader) return;

    const announcement = {
      text,
      priority,
      timestamp: Date.now(),
    };

    this.announcementQueue.push(announcement);
  }

  /**
   * Process announcement queue
   */
  processAnnouncementQueue() {
    if (this.announcementQueue.length === 0) return;

    const announcement = this.announcementQueue.shift();
    const announcementRegion = document.getElementById(
      'accessibility-announcements'
    );

    if (announcementRegion) {
      announcementRegion.setAttribute('aria-live', announcement.priority);
      announcementRegion.textContent = announcement.text;
    }
  }

  /**
   * Play audio cue
   */
  playAudioCue(cueType, frequency = 440, duration = 200) {
    if (!this.settings.audioCues || !this.audioEnabled || !this.audioContext)
      return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.1,
        this.audioContext.currentTime + 0.01
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + duration / 1000
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      this.logger.warn('Failed to play audio cue:', error);
    }
  }

  /**
   * Handle game started
   */
  handleGameStarted(data) {
    this.announce('Game started');
    this.playAudioCue('gameStart', 523, 300);
  }

  /**
   * Handle game paused
   */
  handleGamePaused(data) {
    this.announce('Game paused');
    this.playAudioCue('pause', 330, 200);
  }

  /**
   * Handle game resumed
   */
  handleGameResumed(data) {
    this.announce('Game resumed');
    this.playAudioCue('resume', 523, 200);
  }

  /**
   * Handle game stopped
   */
  handleGameStopped(data) {
    this.announce('Game stopped');
    this.playAudioCue('gameOver', 220, 500);
  }

  /**
   * Handle score changed
   */
  handleScoreChanged(data) {
    if (data.scoreChange > 0) {
      this.announce(
        `Score increased by ${data.scoreChange}. Total score: ${data.score}`
      );
      this.playAudioCue('score', 659, 100);
    }
  }

  /**
   * Handle player damaged
   */
  handlePlayerDamaged(data) {
    this.announce(`Player damaged. Lives remaining: ${data.lives}`);
    this.playAudioCue('damage', 220, 300);
  }

  /**
   * Handle item collected
   */
  handleItemCollected(data) {
    this.announce(`Item collected: ${data.itemType}`);
    this.playAudioCue('item', 880, 150);
  }

  /**
   * Handle level started
   */
  handleLevelStarted(data) {
    this.announce(`Level ${data.level} started`);
    this.playAudioCue('levelStart', 523, 400);
  }

  /**
   * Handle level completed
   */
  handleLevelCompleted(data) {
    this.announce(
      `Level ${data.level} completed in ${Math.floor(data.time / 1000)} seconds`
    );
    this.playAudioCue('levelComplete', 1047, 600);
  }

  /**
   * Handle achievement unlocked
   */
  handleAchievementUnlocked(data) {
    this.announce(`Achievement unlocked: ${data.name}`);
    this.playAudioCue('achievement', 1319, 800);
  }

  /**
   * Handle daily challenge completed
   */
  handleDailyChallengeCompleted(data) {
    this.announce(`Daily challenge completed: ${data.name}`);
    this.playAudioCue('challenge', 1047, 500);
  }

  /**
   * Handle input
   */
  handleInput(data) {
    if (this.settings.audioCues) {
      this.playAudioCue('input', 440, 50);
    }
  }

  /**
   * Update accessibility features based on game state
   */
  updateAccessibilityFeatures(gameState) {
    // Update focus management based on game state
    if (gameState.isPaused) {
      this.manageFocusOnPause();
    } else if (gameState.isRunning) {
      this.manageFocusDuringGameplay();
    }
  }

  /**
   * Manage focus when game is paused
   */
  manageFocusOnPause() {
    // Ensure focus is on pause menu
    const pauseMenu = document.querySelector('.pause-menu');
    if (pauseMenu && pauseMenu.focus) {
      pauseMenu.focus();
    }
  }

  /**
   * Manage focus during gameplay
   */
  manageFocusDuringGameplay() {
    // Ensure focus is on game canvas or main game area
    const gameArea = document.querySelector('.game-area');
    if (gameArea && gameArea.focus) {
      gameArea.focus();
    }
  }

  /**
   * Load accessibility settings from storage
   */
  async loadAccessibilitySettings() {
    try {
      const savedSettings = localStorage.getItem('accessibilitySettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...settings };
        this.applyAccessibilitySettings();
        this.logger.info('Accessibility settings loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load accessibility settings:', error);
    }
  }

  /**
   * Save accessibility settings to storage
   */
  saveAccessibilitySettings() {
    try {
      localStorage.setItem(
        'accessibilitySettings',
        JSON.stringify(this.settings)
      );
      this.logger.info('Accessibility settings saved to storage');
    } catch (error) {
      this.logger.error('Failed to save accessibility settings:', error);
    }
  }

  /**
   * Reset accessibility settings to defaults
   */
  resetSettings() {
    this.settings = {
      screenReader: false,
      highContrast: false,
      colorblindMode: 'none',
      keyboardNavigation: false,
      audioCues: true,
      audioDescriptions: false,
      textScaling: 1.0,
      motionReduction: false,
      reducedAnimations: false,
      largeText: false,
      focusIndicators: true,
    };

    this.applyAccessibilitySettings();
    this.logger.info('Accessibility settings reset to defaults');
  }
}

export default AccessibilityManager;
