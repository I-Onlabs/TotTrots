/**
 * GameRefactored.js - Main game controller with cross-cutting features integration
 *
 * This file serves as the central orchestrator for the game, integrating:
 * - Core gameplay mechanics
 * - Achievements system
 * - Daily challenges
 * - Accessibility features
 * - Modular component architecture with dependency injection
 */

import { GameManager } from './managers/GameManager.js';
import { AchievementManager } from './managers/AchievementManager.js';
import { DailyChallengeManager } from './managers/DailyChallengeManager.js';
import { AccessibilityManager } from './managers/AccessibilityManager.js';
import { EventBus } from './core/EventBus.js';
import { Logger } from './utils/Logger.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { InputManager } from './core/InputManager.js';
import { MobileTesting } from './utils/MobileTesting.js';

export class GameRefactored {
  constructor(config = {}) {
    // Validate and normalize config
    this.config = this.validateConfig({
      debug: false,
      enableAchievements: true,
      enableDailyChallenges: true,
      enableAccessibility: true,
      ...config,
    });

    // Assert config validation
    if (typeof this.config.debug !== 'boolean') {
      throw new Error('GameRefactored: config.debug must be a boolean');
    }
    if (typeof this.config.enableAchievements !== 'boolean') {
      throw new Error(
        'GameRefactored: config.enableAchievements must be a boolean'
      );
    }
    if (typeof this.config.enableDailyChallenges !== 'boolean') {
      throw new Error(
        'GameRefactored: config.enableDailyChallenges must be a boolean'
      );
    }
    if (typeof this.config.enableAccessibility !== 'boolean') {
      throw new Error(
        'GameRefactored: config.enableAccessibility must be a boolean'
      );
    }

    // Core systems - with assertions
    this.eventBus = new EventBus();
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      throw new Error('GameRefactored: EventBus initialization failed');
    }

    this.logger = new Logger(this.config.debug);
    if (!this.logger || typeof this.logger.info !== 'function') {
      throw new Error('GameRefactored: Logger initialization failed');
    }

    // Game state - with assertions
    this.gameState = {
      isRunning: false,
      isPaused: false,
      currentLevel: 1,
      score: 0,
      player: null,
      gameObjects: [],
      startTime: null,
      lastUpdateTime: null,
      activePowerUps: new Map(), // Track active power-ups
    };

    // Assert game state structure
    if (typeof this.gameState.isRunning !== 'boolean') {
      throw new Error('GameRefactored: gameState.isRunning must be a boolean');
    }
    if (
      typeof this.gameState.currentLevel !== 'number' ||
      this.gameState.currentLevel < 1
    ) {
      throw new Error(
        'GameRefactored: gameState.currentLevel must be a positive number'
      );
    }
    if (typeof this.gameState.score !== 'number' || this.gameState.score < 0) {
      throw new Error(
        'GameRefactored: gameState.score must be a non-negative number'
      );
    }
    if (!Array.isArray(this.gameState.gameObjects)) {
      throw new Error('GameRefactored: gameState.gameObjects must be an array');
    }

    // Manager instances (dependency injection) - with assertions
    this.managers = {};
    this.initializeManagers();

    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });

    // Input management
    this.inputManager = new InputManager({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });

    // Mobile testing
    this.mobileTesting = new MobileTesting({
      eventBus: this.eventBus,
      logger: this.logger,
      inputManager: this.inputManager,
      performanceMonitor: this.performanceMonitor,
      config: this.config,
    });

    // Assert managers were initialized
    if (!this.managers.game) {
      throw new Error('GameRefactored: GameManager initialization failed');
    }
    if (this.config.enableAchievements && !this.managers.achievements) {
      throw new Error(
        'GameRefactored: AchievementManager initialization failed when enabled'
      );
    }
    if (this.config.enableDailyChallenges && !this.managers.dailyChallenges) {
      throw new Error(
        'GameRefactored: DailyChallengeManager initialization failed when enabled'
      );
    }
    if (this.config.enableAccessibility && !this.managers.accessibility) {
      throw new Error(
        'GameRefactored: AccessibilityManager initialization failed when enabled'
      );
    }

    // Bind methods - with assertions
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
    this.handleInput = this.handleInput.bind(this);

    // Assert methods are bound correctly
    if (typeof this.update !== 'function') {
      throw new Error('GameRefactored: update method binding failed');
    }
    if (typeof this.render !== 'function') {
      throw new Error('GameRefactored: render method binding failed');
    }
    if (typeof this.handleInput !== 'function') {
      throw new Error('GameRefactored: handleInput method binding failed');
    }

    this.logger.info('GameRefactored initialized');
  }

  /**
   * Validate and normalize configuration
   */
  validateConfig(config) {
    const validatedConfig = { ...config };

    // Normalize boolean values
    validatedConfig.debug = Boolean(validatedConfig.debug);
    validatedConfig.enableAchievements = Boolean(
      validatedConfig.enableAchievements
    );
    validatedConfig.enableDailyChallenges = Boolean(
      validatedConfig.enableDailyChallenges
    );
    validatedConfig.enableAccessibility = Boolean(
      validatedConfig.enableAccessibility
    );

    return validatedConfig;
  }

  /**
   * Initialize all game managers with dependency injection
   */
  initializeManagers() {
    // Core game manager
    this.managers.game = new GameManager({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });

    // Cross-cutting feature managers
    if (this.config.enableAchievements) {
      this.managers.achievements = new AchievementManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState,
      });
    }

    if (this.config.enableDailyChallenges) {
      this.managers.dailyChallenges = new DailyChallengeManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState,
      });
    }

    if (this.config.enableAccessibility) {
      this.managers.accessibility = new AccessibilityManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState,
      });
    }

    // Set up cross-manager communication
    this.setupManagerCommunication();
  }

  /**
   * Set up communication between managers
   */
  setupManagerCommunication() {
    // Game events that affect achievements
    this.eventBus.on('player:scoreChanged', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkScoreAchievements(data.score);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkScoreChallenges(data.score);
      }
    });

    this.eventBus.on('player:levelCompleted', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkLevelAchievements(data.level);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkLevelChallenges(data.level);
      }
    });

    this.eventBus.on('player:itemCollected', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkCollectionAchievements(data.itemType);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkCollectionChallenges(data.itemType);
      }
    });

    // Combo events for achievements and challenges
    this.eventBus.on('player:comboChanged', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkComboAchievements(data.combo);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkComboChallenges(data.combo);
      }
    });

    // Time-based events
    this.eventBus.on('level:completed', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkSpeedAchievements(data.time);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkTimeChallenges(data.time);
      }
    });

    // Damage events for perfect level achievements
    this.eventBus.on('player:damaged', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.handlePlayerDamaged(data);
      }
    });

    // Accessibility events
    this.eventBus.on('game:stateChanged', (data) => {
      if (this.managers.accessibility) {
        this.managers.accessibility.announceStateChange(data);
      }
    });

    // Achievement events that affect gameplay
    this.eventBus.on('achievement:unlocked', (data) => {
      this.logger.info(`Achievement unlocked: ${data.name}`);
      if (this.managers.game) {
        this.managers.game.handleAchievementUnlock(data);
      }
      // Apply achievement effects to gameplay
      this.applyAchievementEffects(data);
    });

    // Daily challenge events
    this.eventBus.on('dailyChallenge:completed', (data) => {
      this.logger.info(`Daily challenge completed: ${data.name}`);
      if (this.managers.game) {
        this.managers.game.handleDailyChallengeCompletion(data);
      }
      // Apply challenge effects to gameplay
      this.applyChallengeEffects(data);
    });

    // Endless mode events
    this.eventBus.on('endless:waveStarted', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkSurvivalAchievements(data.wave);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkSurvivalChallenges(data.wave);
      }
    });

    this.eventBus.on('endless:scoreChanged', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkScoreAchievements(data.score);
      }
    });

    this.eventBus.on('endless:comboChanged', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkComboAchievements(data.combo);
      }
    });
  }

  /**
   * Start the game
   */
  async start() {
    try {
      this.logger.info('Starting game...');

      // Initialize all managers
      for (const [name, manager] of Object.entries(this.managers)) {
        if (manager.initialize) {
          await manager.initialize();
        }
      }

      // Initialize performance monitoring
      if (this.performanceMonitor.initialize) {
        await this.performanceMonitor.initialize();
      }

      // Initialize input management
      if (this.inputManager.initialize) {
        await this.inputManager.initialize();
      }

      // Initialize mobile testing
      if (this.mobileTesting.initialize) {
        await this.mobileTesting.initialize();
      }

      // Set up game state
      this.gameState.isRunning = true;
      this.gameState.startTime = Date.now();
      this.gameState.lastUpdateTime = performance.now();

      // Start game loop
      this.gameLoopId = requestAnimationFrame(this.update);

      // Emit game start event
      this.eventBus.emit('game:started', {
        timestamp: this.gameState.startTime,
        config: this.config,
      });

      this.logger.info('Game started successfully');
    } catch (error) {
      this.logger.error('Failed to start game:', error);
      throw error;
    }
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.gameState.isRunning && !this.gameState.isPaused) {
      this.gameState.isPaused = true;
      cancelAnimationFrame(this.gameLoopId);

      this.eventBus.emit('game:paused', {
        timestamp: Date.now(),
        pauseTime: this.gameState.startTime,
      });

      this.logger.info('Game paused');
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.gameState.isRunning && this.gameState.isPaused) {
      this.gameState.isPaused = false;
      this.gameState.lastUpdateTime = performance.now();
      this.gameLoopId = requestAnimationFrame(this.update);

      this.eventBus.emit('game:resumed', {
        timestamp: Date.now(),
      });

      this.logger.info('Game resumed');
    }
  }

  /**
   * Stop the game
   */
  stop() {
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;

    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }

    // Cleanup managers
    for (const [name, manager] of Object.entries(this.managers)) {
      if (manager.cleanup) {
        manager.cleanup();
      }
    }

    // Cleanup performance monitoring
    if (this.performanceMonitor.cleanup) {
      this.performanceMonitor.cleanup();
    }

    // Cleanup input management
    if (this.inputManager.cleanup) {
      this.inputManager.cleanup();
    }

    // Cleanup mobile testing
    if (this.mobileTesting.cleanup) {
      this.mobileTesting.cleanup();
    }

    this.eventBus.emit('game:stopped', {
      timestamp: Date.now(),
      finalScore: this.gameState.score,
      finalLevel: this.gameState.currentLevel,
    });

    this.logger.info('Game stopped');
  }

  /**
   * Main game update loop
   */
  update(currentTime) {
    if (!this.gameState.isRunning || this.gameState.isPaused) {
      return;
    }

    const deltaTime = currentTime - this.gameState.lastUpdateTime;
    this.gameState.lastUpdateTime = currentTime;

    try {
      // Update all managers
      for (const [name, manager] of Object.entries(this.managers)) {
        if (manager.update) {
          manager.update(deltaTime, this.gameState);
        }
      }

      // Update performance monitoring
      if (this.performanceMonitor.update) {
        this.performanceMonitor.update(deltaTime);
      }

      // Update input management
      if (this.inputManager.update) {
        this.inputManager.update(deltaTime);
      }

      // Update game objects
      this.updateGameObjects(deltaTime);

      // Continue game loop
      this.gameLoopId = requestAnimationFrame(this.update);
    } catch (error) {
      this.logger.error('Error in game update loop:', error);
      this.stop();
    }
  }

  /**
   * Update all game objects
   */
  updateGameObjects(deltaTime) {
    // Update player
    if (this.gameState.player && this.gameState.player.update) {
      this.gameState.player.update(deltaTime);
    }

    // Update other game objects
    this.gameState.gameObjects.forEach((obj) => {
      if (obj.update) {
        obj.update(deltaTime);
      }
    });

    // Remove destroyed objects
    this.gameState.gameObjects = this.gameState.gameObjects.filter(
      (obj) => !obj.destroyed
    );
  }

  /**
   * Render the game
   */
  render() {
    // This would typically be handled by a rendering system
    // For now, we'll emit render events for managers to handle
    this.eventBus.emit('game:render', {
      gameState: this.gameState,
      timestamp: performance.now(),
    });
  }

  /**
   * Handle input events
   */
  handleInput(inputType, data) {
    if (!this.gameState.isRunning) {
      return;
    }

    // Emit input event for managers to handle
    this.eventBus.emit('game:input', {
      type: inputType,
      data: data,
      timestamp: Date.now(),
    });

    // Handle player input
    if (this.gameState.player && this.gameState.player.handleInput) {
      this.gameState.player.handleInput(inputType, data);
    }
  }

  /**
   * Add a game object to the game
   */
  addGameObject(gameObject) {
    this.gameState.gameObjects.push(gameObject);

    this.eventBus.emit('game:objectAdded', {
      object: gameObject,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a game object from the game
   */
  removeGameObject(gameObjectId) {
    const index = this.gameState.gameObjects.findIndex(
      (obj) => obj.id === gameObjectId
    );
    if (index !== -1) {
      const removedObject = this.gameState.gameObjects.splice(index, 1)[0];

      this.eventBus.emit('game:objectRemoved', {
        object: removedObject,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get current game state (for external access)
   */
  getGameState() {
    return { ...this.gameState };
  }

  /**
   * Get manager by name
   */
  getManager(name) {
    return this.managers[name];
  }

  /**
   * Get performance monitor
   */
  getPerformanceMonitor() {
    return this.performanceMonitor;
  }

  /**
   * Get input manager
   */
  getInputManager() {
    return this.inputManager;
  }

  /**
   * Get mobile testing utility
   */
  getMobileTesting() {
    return this.mobileTesting;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return this.performanceMonitor
      ? this.performanceMonitor.getPerformanceReport()
      : null;
  }

  /**
   * Get mobile controls state
   */
  getMobileControlsState() {
    return this.inputManager
      ? this.inputManager.getMobileControlsState()
      : null;
  }

  /**
   * Get mobile test results
   */
  getMobileTestResults() {
    return this.mobileTesting ? this.mobileTesting.getTestResults() : null;
  }

  /**
   * Update game configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Notify managers of config changes
    this.eventBus.emit('game:configChanged', {
      config: this.config,
      timestamp: Date.now(),
    });
  }

  /**
   * Apply achievement effects to gameplay
   */
  applyAchievementEffects(achievement) {
    if (!achievement.effects) return;

    const effects = achievement.effects;

    // Apply score multiplier
    if (effects.scoreMultiplier) {
      this.gameState.scoreMultiplier = effects.scoreMultiplier;
      this.logger.info(`Score multiplier applied: ${effects.scoreMultiplier}x`);
    }

    // Apply extra lives
    if (effects.extraLives) {
      this.gameState.lives += effects.extraLives;
      this.eventBus.emit('player:livesChanged', {
        lives: this.gameState.lives,
        change: effects.extraLives,
        source: 'achievement',
        achievementId: achievement.id,
      });
    }

    // Apply temporary power-ups
    if (effects.temporaryPowerUp) {
      this.eventBus.emit('game:powerUpActivated', {
        type: effects.temporaryPowerUp,
        duration: effects.duration || 30000,
        source: 'achievement',
        achievementId: achievement.id,
      });
    }

    // Apply permanent stat boosts
    if (effects.statBoost) {
      this.eventBus.emit('player:statBoost', {
        stats: effects.statBoost,
        source: 'achievement',
        achievementId: achievement.id,
      });
    }

    // Apply special abilities
    if (effects.ability) {
      this.eventBus.emit('player:abilityUnlocked', {
        ability: effects.ability,
        source: 'achievement',
        achievementId: achievement.id,
      });
    }
  }

  /**
   * Apply challenge effects to gameplay
   */
  applyChallengeEffects(challenge) {
    if (!challenge.effects) return;

    const effects = challenge.effects;

    // Apply score bonus
    if (effects.scoreBonus) {
      this.gameState.score += effects.scoreBonus;
      this.eventBus.emit('player:scoreChanged', {
        scoreChange: effects.scoreBonus,
        source: 'dailyChallenge',
        challengeId: challenge.id,
      });
    }

    // Apply currency rewards
    if (effects.currency) {
      this.eventBus.emit('player:currencyEarned', {
        amount: effects.currency,
        source: 'dailyChallenge',
        challengeId: challenge.id,
      });
    }

    // Apply temporary effects
    if (effects.temporaryEffect) {
      this.eventBus.emit('game:temporaryEffect', {
        effect: effects.temporaryEffect,
        duration: effects.duration || 30000,
        source: 'dailyChallenge',
        challengeId: challenge.id,
      });
    }

    // Apply unlock rewards
    if (effects.unlock) {
      this.eventBus.emit('game:unlock', {
        type: effects.unlock.type,
        item: effects.unlock.item,
        source: 'dailyChallenge',
        challengeId: challenge.id,
      });
    }
  }

  /**
   * Cleanup and destroy the game instance
   */
  destroy() {
    this.stop();

    // Clear all event listeners
    this.eventBus.removeAllListeners();

    // Clear game state
    this.gameState = null;
    this.managers = null;

    this.logger.info('GameRefactored destroyed');
  }
}

// Export for use in other modules
export default GameRefactored;
