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
    });

    this.eventBus.on('player:levelCompleted', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkLevelAchievements(data.level);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkLevelChallenge(data.level);
      }
    });

    this.eventBus.on('player:itemCollected', (data) => {
      if (this.managers.achievements) {
        this.managers.achievements.checkCollectionAchievements(data.itemType);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkCollectionChallenge(data.itemType);
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
    });

    // Daily challenge events
    this.eventBus.on('dailyChallenge:completed', (data) => {
      this.logger.info(`Daily challenge completed: ${data.name}`);
      if (this.managers.game) {
        this.managers.game.handleDailyChallengeCompletion(data);
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
