/**
 * GameManager.js - Core game management with explicit lifecycle and dependency injection
 *
 * This manager handles:
 * - Game state management
 * - Level progression
 * - Score management
 * - Player management
 * - Game object lifecycle
 */

class GameManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('GameManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('GameManager requires logger dependency');
    }

    // Game state
    this.state = {
      currentLevel: 1,
      maxLevel: 10,
      score: 0,
      highScore: 0,
      lives: 3,
      levelStartTime: null,
      levelCompleted: false,
      gameOver: false
    };

    // Level configuration
    this.levelConfigs = this.initializeLevelConfigs();

    // Event handlers
    this.setupEventHandlers();
    this.logger.info('GameManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing GameManager...');

    // Load saved game data
    await this.loadGameData();

    // Set up level
    this.setupLevel(this.state.currentLevel);
    this.logger.info('GameManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up GameManager...');

    // Save game data
    this.saveGameData();

    // Remove event listeners
    this.removeEventHandlers();
    this.logger.info('GameManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime, gameState) {
    // Update level timer
    if (this.state.levelStartTime && !this.state.levelCompleted) {
      const levelTime = Date.now() - this.state.levelStartTime;

      // Check for level timeout
      const levelConfig = this.levelConfigs[this.state.currentLevel - 1];
      if (levelConfig.timeLimit && levelTime > levelConfig.timeLimit) {
        this.handleLevelTimeout();
      }
    }

    // Update game objects based on level
    this.updateLevelSpecificLogic(deltaTime, gameState);
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Player events
    this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));
    this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));
    this.eventBus.on('player:itemCollected', this.handleItemCollected.bind(this));
    this.eventBus.on('player:levelCompleted', this.handleLevelCompleted.bind(this));

    // Game events
    this.eventBus.on('game:input', this.handleGameInput.bind(this));
    this.eventBus.on('game:configChanged', this.handleConfigChange.bind(this));

    // Achievement events
    this.eventBus.on('achievement:unlocked', this.handleAchievementUnlock.bind(this));
    this.eventBus.on('dailyChallenge:completed', this.handleDailyChallengeCompletion.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.off('player:scoreChanged', this.handleScoreChange.bind(this));
    this.eventBus.off('player:damaged', this.handlePlayerDamaged.bind(this));
    this.eventBus.off('player:itemCollected', this.handleItemCollected.bind(this));
    this.eventBus.off('player:levelCompleted', this.handleLevelCompleted.bind(this));
    this.eventBus.off('game:input', this.handleGameInput.bind(this));
    this.eventBus.removeListener('game:configChanged', this.handleConfigChange.bind(this));
    this.eventBus.removeListener('achievement:unlocked', this.handleAchievementUnlock.bind(this));
    this.eventBus.removeListener('dailyChallenge:completed', this.handleDailyChallengeCompletion.bind(this));
  }

  /**
   * Initialize level configurations
   */
  initializeLevelConfigs() {
    return [{
      timeLimit: 60000,
      targetScore: 1000,
      difficulty: 'easy'
    }, {
      timeLimit: 90000,
      targetScore: 2500,
      difficulty: 'easy'
    }, {
      timeLimit: 120000,
      targetScore: 5000,
      difficulty: 'medium'
    }, {
      timeLimit: 150000,
      targetScore: 7500,
      difficulty: 'medium'
    }, {
      timeLimit: 180000,
      targetScore: 10000,
      difficulty: 'hard'
    }, {
      timeLimit: 200000,
      targetScore: 15000,
      difficulty: 'hard'
    }, {
      timeLimit: 220000,
      targetScore: 20000,
      difficulty: 'expert'
    }, {
      timeLimit: 240000,
      targetScore: 25000,
      difficulty: 'expert'
    }, {
      timeLimit: 260000,
      targetScore: 30000,
      difficulty: 'master'
    }, {
      timeLimit: 300000,
      targetScore: 40000,
      difficulty: 'master'
    }];
  }

  /**
   * Set up a level
   */
  setupLevel(levelNumber) {
    this.state.currentLevel = levelNumber;
    this.state.levelStartTime = Date.now();
    this.state.levelCompleted = false;
    this.state.gameOver = false;
    const levelConfig = this.levelConfigs[levelNumber - 1];
    if (!levelConfig) {
      this.logger.error(`Invalid level number: ${levelNumber}`);
      return;
    }
    this.logger.info(`Setting up level ${levelNumber} (${levelConfig.difficulty})`);

    // Emit level start event
    this.eventBus.emit('level:started', {
      level: levelNumber,
      config: levelConfig,
      timestamp: Date.now()
    });
  }

  /**
   * Handle score changes
   */
  handleScoreChange(data) {
    this.state.score += data.scoreChange || 0;

    // Update high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
    }

    // Check level completion based on score
    const levelConfig = this.levelConfigs[this.state.currentLevel - 1];
    if (levelConfig && this.state.score >= levelConfig.targetScore && !this.state.levelCompleted) {
      this.completeLevel();
    }
    this.eventBus.emit('game:scoreUpdated', {
      score: this.state.score,
      highScore: this.state.highScore,
      timestamp: Date.now()
    });
  }

  /**
   * Handle player damage
   */
  handlePlayerDamaged(data) {
    this.state.lives -= data.damage || 1;
    if (this.state.lives <= 0) {
      this.gameOver();
    } else {
      this.eventBus.emit('game:livesUpdated', {
        lives: this.state.lives,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle item collection
   */
  handleItemCollected(data) {
    const scoreValue = data.scoreValue || 0;
    this.handleScoreChange({
      scoreChange: scoreValue
    });
    this.logger.info(`Item collected: ${data.itemType}, +${scoreValue} points`);
  }

  /**
   * Handle level completion
   */
  handleLevelCompleted(data) {
    this.completeLevel();
  }

  /**
   * Complete the current level
   */
  completeLevel() {
    if (this.state.levelCompleted) {
      return;
    }
    this.state.levelCompleted = true;
    const levelTime = Date.now() - this.state.levelStartTime;
    this.logger.info(`Level ${this.state.currentLevel} completed in ${levelTime}ms`);

    // Emit level completion event
    this.eventBus.emit('level:completed', {
      level: this.state.currentLevel,
      score: this.state.score,
      time: levelTime,
      timestamp: Date.now()
    });

    // Check if game is complete
    if (this.state.currentLevel >= this.state.maxLevel) {
      this.completeGame();
    } else {
      // Advance to next level after delay
      setTimeout(() => {
        this.setupLevel(this.state.currentLevel + 1);
      }, 2000);
    }
  }

  /**
   * Handle level timeout
   */
  handleLevelTimeout() {
    this.logger.info(`Level ${this.state.currentLevel} timed out`);
    this.eventBus.emit('level:timeout', {
      level: this.state.currentLevel,
      timestamp: Date.now()
    });

    // Lose a life and restart level
    this.handlePlayerDamaged({
      damage: 1
    });
    if (!this.state.gameOver) {
      this.setupLevel(this.state.currentLevel);
    }
  }

  /**
   * Complete the entire game
   */
  completeGame() {
    this.logger.info('Game completed!');
    this.eventBus.emit('game:completed', {
      finalScore: this.state.score,
      finalLevel: this.state.currentLevel,
      timestamp: Date.now()
    });
  }

  /**
   * Handle game over
   */
  gameOver() {
    this.state.gameOver = true;
    this.logger.info('Game Over');
    this.eventBus.emit('game:gameOver', {
      finalScore: this.state.score,
      finalLevel: this.state.currentLevel,
      timestamp: Date.now()
    });
  }

  /**
   * Handle game input
   */
  handleGameInput(data) {
    // Handle specific game inputs
    switch (data.type) {
      case 'restart':
        this.restartGame();
        break;
      case 'nextLevel':
        if (this.state.levelCompleted) {
          this.setupLevel(this.state.currentLevel + 1);
        }
        break;
      case 'pause':
        this.eventBus.emit('game:pauseRequested', {
          timestamp: Date.now()
        });
        break;
    }
  }

  /**
   * Handle config changes
   */
  handleConfigChange(data) {
    this.config = {
      ...this.config,
      ...data.config
    };
    this.logger.info('GameManager config updated');
  }

  /**
   * Handle achievement unlock
   */
  handleAchievementUnlock(data) {
    // Award bonus points for achievements
    const bonusScore = data.bonusScore || 0;
    if (bonusScore > 0) {
      this.handleScoreChange({
        scoreChange: bonusScore
      });
    }

    // Apply achievement effects
    if (data.effects) {
      this.applyAchievementEffects(data.effects);
    }
  }

  /**
   * Handle daily challenge completion
   */
  handleDailyChallengeCompletion(data) {
    // Award bonus points for daily challenges
    const bonusScore = data.bonusScore || 0;
    if (bonusScore > 0) {
      this.handleScoreChange({
        scoreChange: bonusScore
      });
    }

    // Apply challenge effects
    if (data.effects) {
      this.applyChallengeEffects(data.effects);
    }
  }

  /**
   * Apply achievement effects
   */
  applyAchievementEffects(effects) {
    if (effects.extraLives) {
      this.state.lives += effects.extraLives;
    }
    if (effects.scoreMultiplier) {
      // Apply score multiplier for a limited time
      this.temporaryScoreMultiplier = effects.scoreMultiplier;
      setTimeout(() => {
        this.temporaryScoreMultiplier = 1;
      }, effects.duration || 30000);
    }
  }

  /**
   * Apply challenge effects
   */
  applyChallengeEffects(effects) {
    if (effects.temporaryPowerUp) {
      this.eventBus.emit('game:powerUpActivated', {
        type: effects.temporaryPowerUp,
        duration: effects.duration || 30000,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Restart the game
   */
  restartGame() {
    this.state = {
      currentLevel: 1,
      maxLevel: 10,
      score: 0,
      highScore: this.state.highScore,
      // Keep high score
      lives: 3,
      levelStartTime: null,
      levelCompleted: false,
      gameOver: false
    };
    this.setupLevel(1);
    this.eventBus.emit('game:restarted', {
      timestamp: Date.now()
    });
  }

  /**
   * Update level-specific logic
   */
  updateLevelSpecificLogic(deltaTime, gameState) {
    const levelConfig = this.levelConfigs[this.state.currentLevel - 1];
    if (!levelConfig) return;

    // Level-specific behaviors based on difficulty
    switch (levelConfig.difficulty) {
          }
  }

  /**
   * Load game data from storage
   */
  async loadGameData() {
    try {
      const savedData = localStorage.getItem('gameData');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.state.highScore = data.highScore || 0;
        this.logger.info('Game data loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load game data:', error);
    }
  }

  /**
   * Save game data to storage
   */
  saveGameData() {
    try {
      const data = {
        highScore: this.state.highScore,
        lastPlayed: Date.now()
      };
      localStorage.setItem('gameData', JSON.stringify(data));
      this.logger.info('Game data saved to storage');
    } catch (error) {
      this.logger.error('Failed to save game data:', error);
    }
  }

  /**
   * Get current game state
   */
  getState() {
    return {
      ...this.state
    };
  }

  /**
   * Get level configuration
   */
  getLevelConfig(levelNumber) {
    return this.levelConfigs[levelNumber - 1];
  }

  /**
   * Set level configuration
   */
  setLevelConfig(levelNumber, config) {
    if (levelNumber >= 1 && levelNumber <= this.levelConfigs.length) {
      this.levelConfigs[levelNumber - 1] = {
        ...this.levelConfigs[levelNumber - 1],
        ...config
      };
    }
  }
}

/**
 * AchievementManager.js - Achievement system with gameplay integration
 *
 * This manager handles:
 * - Achievement definitions and tracking
 * - Progress monitoring
 * - Achievement unlocking
 * - Integration with gameplay events
 */

class AchievementManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.gameState = dependencies.gameState;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('AchievementManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('AchievementManager requires logger dependency');
    }

    // Achievement state
    this.achievements = new Map();
    this.unlockedAchievements = new Set();
    this.progress = new Map();

    // Initialize achievements
    this.initializeAchievements();

    // Set up event handlers
    this.setupEventHandlers();
    this.logger.info('AchievementManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing AchievementManager...');

    // Load saved achievement data
    await this.loadAchievementData();
    this.logger.info('AchievementManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up AchievementManager...');

    // Save achievement data
    this.saveAchievementData();

    // Remove event listeners
    this.removeEventHandlers();
    this.logger.info('AchievementManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime, gameState) {
    // Check for time-based achievements
    this.checkTimeBasedAchievements(gameState);

    // Check for combo achievements
    this.checkComboAchievements(gameState);
  }

  /**
   * Initialize achievement definitions
   */
  initializeAchievements() {
    // Score-based achievements
    this.defineAchievement('first_score', {
      name: 'First Steps',
      description: 'Score your first 100 points',
      type: 'score',
      target: 100,
      reward: {
        score: 50,
        title: 'Beginner'
      },
      icon: 'star'
    });
    this.defineAchievement('score_master', {
      name: 'Score Master',
      description: 'Reach 10,000 points',
      type: 'score',
      target: 10000,
      reward: {
        score: 500,
        title: 'Score Master'
      },
      icon: 'trophy'
    });
    this.defineAchievement('high_score_king', {
      name: 'High Score King',
      description: 'Reach 50,000 points',
      type: 'score',
      target: 50000,
      reward: {
        score: 2000,
        title: 'High Score King'
      },
      icon: 'crown'
    });

    // Level-based achievements
    this.defineAchievement('level_5', {
      name: 'Level 5 Complete',
      description: 'Complete level 5',
      type: 'level',
      target: 5,
      reward: {
        extraLives: 1,
        title: 'Level 5 Veteran'
      },
      icon: 'medal'
    });
    this.defineAchievement('level_10', {
      name: 'Level 10 Complete',
      description: 'Complete level 10',
      type: 'level',
      target: 10,
      reward: {
        score: 1000,
        title: 'Level 10 Master'
      },
      icon: 'diamond'
    });

    // Collection achievements
    this.defineAchievement('collector', {
      name: 'Collector',
      description: 'Collect 50 items',
      type: 'collection',
      target: 50,
      reward: {
        score: 300,
        title: 'Collector'
      },
      icon: 'bag'
    });
    this.defineAchievement('hoarder', {
      name: 'Hoarder',
      description: 'Collect 200 items',
      type: 'collection',
      target: 200,
      reward: {
        score: 1000,
        title: 'Hoarder'
      },
      icon: 'treasure'
    });

    // Time-based achievements
    this.defineAchievement('speed_demon', {
      name: 'Speed Demon',
      description: 'Complete a level in under 30 seconds',
      type: 'speed',
      target: 30000,
      // 30 seconds in milliseconds
      reward: {
        score: 500,
        title: 'Speed Demon'
      },
      icon: 'lightning'
    });
    this.defineAchievement('marathon_runner', {
      name: 'Marathon Runner',
      description: 'Play for 30 minutes straight',
      type: 'playtime',
      target: 1800000,
      // 30 minutes in milliseconds
      reward: {
        score: 1000,
        title: 'Marathon Runner'
      },
      icon: 'clock'
    });

    // Combo achievements
    this.defineAchievement('combo_master', {
      name: 'Combo Master',
      description: 'Achieve a 10x combo',
      type: 'combo',
      target: 10,
      reward: {
        score: 200,
        title: 'Combo Master'
      },
      icon: 'fire'
    });
    this.defineAchievement('combo_legend', {
      name: 'Combo Legend',
      description: 'Achieve a 25x combo',
      type: 'combo',
      target: 25,
      reward: {
        score: 1000,
        title: 'Combo Legend'
      },
      icon: 'explosion'
    });

    // Special achievements
    this.defineAchievement('perfect_level', {
      name: 'Perfect Level',
      description: 'Complete a level without taking damage',
      type: 'perfect',
      target: 1,
      reward: {
        score: 750,
        title: 'Perfect Player'
      },
      icon: 'shield'
    });
    this.defineAchievement('comeback_kid', {
      name: 'Comeback Kid',
      description: 'Complete a level with only 1 life remaining',
      type: 'comeback',
      target: 1,
      reward: {
        score: 500,
        title: 'Comeback Kid'
      },
      icon: 'heart'
    });
  }

  /**
   * Define an achievement
   */
  defineAchievement(id, definition) {
    this.achievements.set(id, {
      id,
      ...definition,
      unlocked: false,
      unlockedAt: null,
      progress: 0
    });

    // Initialize progress tracking
    this.progress.set(id, 0);
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Score events
    this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));

    // Level events
    this.eventBus.on('player:levelCompleted', this.handleLevelCompleted.bind(this));

    // Collection events
    this.eventBus.on('player:itemCollected', this.handleItemCollected.bind(this));

    // Game events
    this.eventBus.on('game:started', this.handleGameStarted.bind(this));
    this.eventBus.on('level:completed', this.handleLevelCompleted.bind(this));

    // Combo events
    this.eventBus.on('player:comboChanged', this.handleComboChanged.bind(this));

    // Damage events
    this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('player:scoreChanged', this.handleScoreChange.bind(this));
    this.eventBus.removeListener('player:levelCompleted', this.handleLevelCompleted.bind(this));
    this.eventBus.removeListener('player:itemCollected', this.handleItemCollected.bind(this));
    this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
    this.eventBus.removeListener('level:completed', this.handleLevelCompleted.bind(this));
    this.eventBus.removeListener('player:comboChanged', this.handleComboChanged.bind(this));
    this.eventBus.removeListener('player:damaged', this.handlePlayerDamaged.bind(this));
  }

  /**
   * Handle score changes
   */
  handleScoreChange(data) {
    const currentScore = this.gameState().score;
    this.checkScoreAchievements(currentScore);
  }

  /**
   * Handle level completion
   */
  handleLevelCompleted(data) {
    this.checkLevelAchievements(data.level);
    this.checkSpeedAchievements(data.time);
    this.checkPerfectLevelAchievements(data);
  }

  /**
   * Handle item collection
   */
  handleItemCollected(data) {
    this.checkCollectionAchievements(data.itemType);
  }

  /**
   * Handle game start
   */
  handleGameStarted(data) {
    this.gameStartTime = data.timestamp;
  }

  /**
   * Handle combo changes
   */
  handleComboChanged(data) {
    this.checkComboAchievements(data.combo);
  }

  /**
   * Handle player damage
   */
  handlePlayerDamaged(data) {
    this.currentLevelPerfect = false;
  }

  /**
   * Check score-based achievements
   */
  checkScoreAchievements(currentScore) {
    this.checkAchievementsByType('score', currentScore);
  }

  /**
   * Check level-based achievements
   */
  checkLevelAchievements(level) {
    this.checkAchievementsByType('level', level);
  }

  /**
   * Check collection-based achievements
   */
  checkCollectionAchievements(itemType) {
    // Increment collection count
    const currentCount = this.progress.get('collector') || 0;
    this.progress.set('collector', currentCount + 1);
    this.checkAchievementsByType('collection', this.progress.get('collector'));
  }

  /**
   * Check speed-based achievements
   */
  checkSpeedAchievements(levelTime) {
    this.checkAchievementsByType('speed', levelTime);
  }

  /**
   * Check combo-based achievements
   */
  checkComboAchievements(combo) {
    this.checkAchievementsByType('combo', combo);
  }

  /**
   * Check time-based achievements
   */
  checkTimeBasedAchievements(gameState) {
    if (this.gameStartTime) {
      const playTime = Date.now() - this.gameStartTime;
      this.checkAchievementsByType('playtime', playTime);
    }
  }

  /**
   * Check combo achievements
   */
  checkComboAchievements(gameState) {
    // This would check for combo achievements based on game state
    // Implementation depends on how combos are tracked in the game
  }

  /**
   * Check perfect level achievements
   */
  checkPerfectLevelAchievements(levelData) {
    if (levelData.perfect) {
      this.checkAchievementsByType('perfect', 1);
    }
  }

  /**
   * Check achievements by type
   */
  checkAchievementsByType(type, value) {
    for (const [id, achievement] of this.achievements) {
      if (achievement.type === type && !achievement.unlocked) {
        if (value >= achievement.target) {
          this.unlockAchievement(id);
        } else {
          // Update progress
          this.progress.set(id, value);
          achievement.progress = value;
        }
      }
    }
  }

  /**
   * Unlock an achievement
   */
  unlockAchievement(id) {
    const achievement = this.achievements.get(id);
    if (!achievement || achievement.unlocked) {
      return;
    }
    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    this.unlockedAchievements.add(id);
    this.logger.info(`Achievement unlocked: ${achievement.name}`);

    // Emit achievement unlocked event
    this.eventBus.emit('achievement:unlocked', {
      id,
      name: achievement.name,
      description: achievement.description,
      reward: achievement.reward,
      icon: achievement.icon,
      timestamp: Date.now()
    });

    // Apply reward
    this.applyAchievementReward(achievement);
  }

  /**
   * Apply achievement reward
   */
  applyAchievementReward(achievement) {
    if (!achievement.reward) return;
    const reward = achievement.reward;

    // Score reward
    if (reward.score) {
      this.eventBus.emit('player:scoreChanged', {
        scoreChange: reward.score,
        source: 'achievement',
        achievementId: achievement.id
      });
    }

    // Extra lives reward
    if (reward.extraLives) {
      this.eventBus.emit('player:livesChanged', {
        livesChange: reward.extraLives,
        source: 'achievement',
        achievementId: achievement.id
      });
    }

    // Title reward
    if (reward.title) {
      this.eventBus.emit('player:titleChanged', {
        title: reward.title,
        source: 'achievement',
        achievementId: achievement.id
      });
    }

    // Special effects
    if (reward.effects) {
      this.eventBus.emit('game:achievementEffect', {
        effects: reward.effects,
        achievementId: achievement.id
      });
    }
  }

  /**
   * Get achievement by ID
   */
  getAchievement(id) {
    return this.achievements.get(id);
  }

  /**
   * Get all achievements
   */
  getAllAchievements() {
    return Array.from(this.achievements.values());
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements() {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  /**
   * Get achievement progress
   */
  getAchievementProgress(id) {
    const achievement = this.achievements.get(id);
    if (!achievement) return null;
    return {
      id,
      name: achievement.name,
      description: achievement.description,
      progress: achievement.progress,
      target: achievement.target,
      percentage: Math.min(achievement.progress / achievement.target * 100, 100),
      unlocked: achievement.unlocked
    };
  }

  /**
   * Get all achievement progress
   */
  getAllAchievementProgress() {
    const progress = [];
    for (const [id, achievement] of this.achievements) {
      progress.push(this.getAchievementProgress(id));
    }
    return progress;
  }

  /**
   * Load achievement data from storage
   */
  async loadAchievementData() {
    try {
      const savedData = localStorage.getItem('achievementData');
      if (savedData) {
        const data = JSON.parse(savedData);

        // Restore unlocked achievements
        if (data.unlocked) {
          data.unlocked.forEach(id => {
            if (this.achievements.has(id)) {
              this.achievements.get(id).unlocked = true;
              this.unlockedAchievements.add(id);
            }
          });
        }

        // Restore progress
        if (data.progress) {
          for (const [id, progress] of Object.entries(data.progress)) {
            if (this.achievements.has(id)) {
              this.achievements.get(id).progress = progress;
              this.progress.set(id, progress);
            }
          }
        }
        this.logger.info('Achievement data loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load achievement data:', error);
    }
  }

  /**
   * Save achievement data to storage
   */
  saveAchievementData() {
    try {
      const data = {
        unlocked: Array.from(this.unlockedAchievements),
        progress: Object.fromEntries(this.progress)
      };
      localStorage.setItem('achievementData', JSON.stringify(data));
      this.logger.info('Achievement data saved to storage');
    } catch (error) {
      this.logger.error('Failed to save achievement data:', error);
    }
  }

  /**
   * Reset all achievements
   */
  resetAchievements() {
    this.unlockedAchievements.clear();
    this.progress.clear();
    for (const [id, achievement] of this.achievements) {
      achievement.unlocked = false;
      achievement.unlockedAt = null;
      achievement.progress = 0;
      this.progress.set(id, 0);
    }
    this.logger.info('All achievements reset');
  }
}

/**
 * DailyChallengeManager.js - Daily challenge system with gameplay integration
 *
 * This manager handles:
 * - Daily challenge generation and rotation
 * - Challenge progress tracking
 * - Challenge completion rewards
 * - Integration with gameplay events
 */

class DailyChallengeManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.gameState = dependencies.gameState;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('DailyChallengeManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('DailyChallengeManager requires logger dependency');
    }

    // Challenge state
    this.challenges = new Map();
    this.activeChallenges = [];
    this.completedChallenges = new Set();
    this.challengeProgress = new Map();
    this.lastChallengeDate = null;

    // Challenge templates
    this.challengeTemplates = this.initializeChallengeTemplates();

    // Set up event handlers
    this.setupEventHandlers();
    this.logger.info('DailyChallengeManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing DailyChallengeManager...');

    // Load saved challenge data
    await this.loadChallengeData();

    // Generate today's challenges
    this.generateDailyChallenges();
    this.logger.info('DailyChallengeManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up DailyChallengeManager...');

    // Save challenge data
    this.saveChallengeData();

    // Remove event listeners
    this.removeEventHandlers();
    this.logger.info('DailyChallengeManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime, gameState) {
    // Check if we need to generate new daily challenges
    this.checkDailyChallengeRotation();

    // Update challenge progress
    this.updateChallengeProgress(gameState);
  }

  /**
   * Initialize challenge templates
   */
  initializeChallengeTemplates() {
    return {
      score: [{
        name: 'Score Hunter',
        description: 'Score {target} points in a single game',
        type: 'score',
        difficulty: 'easy',
        target: 1000,
        reward: {
          score: 200,
          coins: 10
        }
      }, {
        name: 'Score Master',
        description: 'Score {target} points in a single game',
        type: 'score',
        difficulty: 'medium',
        target: 5000,
        reward: {
          score: 500,
          coins: 25
        }
      }, {
        name: 'Score Legend',
        description: 'Score {target} points in a single game',
        type: 'score',
        difficulty: 'hard',
        target: 15000,
        reward: {
          score: 1000,
          coins: 50
        }
      }],
      level: [{
        name: 'Level Climber',
        description: 'Reach level {target}',
        type: 'level',
        difficulty: 'easy',
        target: 3,
        reward: {
          score: 300,
          coins: 15
        }
      }, {
        name: 'Level Master',
        description: 'Reach level {target}',
        type: 'level',
        difficulty: 'medium',
        target: 7,
        reward: {
          score: 750,
          coins: 35
        }
      }, {
        name: 'Level Legend',
        description: 'Reach level {target}',
        type: 'level',
        difficulty: 'hard',
        target: 10,
        reward: {
          score: 1500,
          coins: 75
        }
      }],
      collection: [{
        name: 'Item Collector',
        description: 'Collect {target} items in a single game',
        type: 'collection',
        difficulty: 'easy',
        target: 10,
        reward: {
          score: 150,
          coins: 8
        }
      }, {
        name: 'Item Hoarder',
        description: 'Collect {target} items in a single game',
        type: 'collection',
        difficulty: 'medium',
        target: 25,
        reward: {
          score: 400,
          coins: 20
        }
      }, {
        name: 'Item Master',
        description: 'Collect {target} items in a single game',
        type: 'collection',
        difficulty: 'hard',
        target: 50,
        reward: {
          score: 800,
          coins: 40
        }
      }],
      combo: [{
        name: 'Combo Starter',
        description: 'Achieve a {target}x combo',
        type: 'combo',
        difficulty: 'easy',
        target: 5,
        reward: {
          score: 100,
          coins: 5
        }
      }, {
        name: 'Combo Master',
        description: 'Achieve a {target}x combo',
        type: 'combo',
        difficulty: 'medium',
        target: 15,
        reward: {
          score: 300,
          coins: 15
        }
      }, {
        name: 'Combo Legend',
        description: 'Achieve a {target}x combo',
        type: 'combo',
        difficulty: 'hard',
        target: 30,
        reward: {
          score: 600,
          coins: 30
        }
      }],
      time: [{
        name: 'Speed Runner',
        description: 'Complete a level in under {target} seconds',
        type: 'time',
        difficulty: 'easy',
        target: 60,
        reward: {
          score: 200,
          coins: 10
        }
      }, {
        name: 'Speed Master',
        description: 'Complete a level in under {target} seconds',
        type: 'time',
        difficulty: 'medium',
        target: 30,
        reward: {
          score: 500,
          coins: 25
        }
      }, {
        name: 'Speed Legend',
        description: 'Complete a level in under {target} seconds',
        type: 'time',
        difficulty: 'hard',
        target: 15,
        reward: {
          score: 1000,
          coins: 50
        }
      }],
      survival: [{
        name: 'Survivor',
        description: 'Complete {target} levels without dying',
        type: 'survival',
        difficulty: 'easy',
        target: 3,
        reward: {
          score: 400,
          coins: 20
        }
      }, {
        name: 'Survival Master',
        description: 'Complete {target} levels without dying',
        type: 'survival',
        difficulty: 'medium',
        target: 7,
        reward: {
          score: 1000,
          coins: 50
        }
      }, {
        name: 'Survival Legend',
        description: 'Complete {target} levels without dying',
        type: 'survival',
        difficulty: 'hard',
        target: 10,
        reward: {
          score: 2000,
          coins: 100
        }
      }]
    };
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Score events
    this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));

    // Level events
    this.eventBus.on('player:levelCompleted', this.handleLevelCompleted.bind(this));

    // Collection events
    this.eventBus.on('player:itemCollected', this.handleItemCollected.bind(this));

    // Combo events
    this.eventBus.on('player:comboChanged', this.handleComboChanged.bind(this));

    // Game events
    this.eventBus.on('game:started', this.handleGameStarted.bind(this));
    this.eventBus.on('level:completed', this.handleLevelCompleted.bind(this));

    // Damage events
    this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('player:scoreChanged', this.handleScoreChange.bind(this));
    this.eventBus.removeListener('player:levelCompleted', this.handleLevelCompleted.bind(this));
    this.eventBus.removeListener('player:itemCollected', this.handleItemCollected.bind(this));
    this.eventBus.removeListener('player:comboChanged', this.handleComboChanged.bind(this));
    this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
    this.eventBus.removeListener('level:completed', this.handleLevelCompleted.bind(this));
    this.eventBus.removeListener('player:damaged', this.handlePlayerDamaged.bind(this));
  }

  /**
   * Generate daily challenges
   */
  generateDailyChallenges() {
    const today = new Date().toDateString();

    // Check if we need to generate new challenges
    if (this.lastChallengeDate === today) {
      return;
    }

    // Clear previous challenges
    this.activeChallenges = [];
    this.completedChallenges.clear();
    this.challengeProgress.clear();

    // Generate 3 random challenges
    const challengeTypes = Object.keys(this.challengeTemplates);
    const selectedTypes = this.getRandomElements(challengeTypes, 3);
    selectedTypes.forEach((type, index) => {
      const template = this.getRandomElement(this.challengeTemplates[type]);
      const challenge = this.createChallenge(template, index);
      this.activeChallenges.push(challenge);
      this.challenges.set(challenge.id, challenge);
    });
    this.lastChallengeDate = today;
    this.logger.info(`Generated ${this.activeChallenges.length} daily challenges for ${today}`);

    // Emit challenges generated event
    this.eventBus.emit('dailyChallenges:generated', {
      challenges: this.activeChallenges,
      date: today,
      timestamp: Date.now()
    });
  }

  /**
   * Create a challenge from template
   */
  createChallenge(template, index) {
    const id = `daily_${Date.now()}_${index}`;
    const challenge = {
      id,
      name: template.name,
      description: template.description.replace('{target}', template.target),
      type: template.type,
      difficulty: template.difficulty,
      target: template.target,
      reward: template.reward,
      progress: 0,
      completed: false,
      completedAt: null,
      createdAt: Date.now()
    };
    return challenge;
  }

  /**
   * Check daily challenge rotation
   */
  checkDailyChallengeRotation() {
    const today = new Date().toDateString();
    if (this.lastChallengeDate !== today) {
      this.generateDailyChallenges();
    }
  }

  /**
   * Update challenge progress
   */
  updateChallengeProgress(gameState) {
    // This method can be used for real-time progress updates
    // that don't require specific events
  }

  /**
   * Handle score changes
   */
  handleScoreChange(data) {
    this.checkScoreChallenges(data.score);
  }

  /**
   * Handle level completion
   */
  handleLevelCompleted(data) {
    this.checkLevelChallenges(data.level);
    this.checkTimeChallenges(data.time);
    this.checkSurvivalChallenges(data);
  }

  /**
   * Handle item collection
   */
  handleItemCollected(data) {
    this.checkCollectionChallenges(data.itemType);
  }

  /**
   * Handle combo changes
   */
  handleComboChanged(data) {
    this.checkComboChallenges(data.combo);
  }

  /**
   * Handle game start
   */
  handleGameStarted(data) {
    this.gameStartTime = data.timestamp;
    this.currentGameScore = 0;
    this.currentGameLevel = 0;
    this.currentGameItems = 0;
    this.currentGameCombo = 0;
    this.survivalCount = 0;
  }

  /**
   * Handle player damage
   */
  handlePlayerDamaged(data) {
    this.survivalCount = 0; // Reset survival count on damage
  }

  /**
   * Check score-based challenges
   */
  checkScoreChallenges(currentScore) {
    this.currentGameScore = currentScore;
    this.checkChallengesByType('score', currentScore);
  }

  /**
   * Check level-based challenges
   */
  checkLevelChallenges(level) {
    this.currentGameLevel = level;
    this.checkChallengesByType('level', level);
  }

  /**
   * Check collection-based challenges
   */
  checkCollectionChallenges(itemType) {
    this.currentGameItems++;
    this.checkChallengesByType('collection', this.currentGameItems);
  }

  /**
   * Check combo-based challenges
   */
  checkComboChallenges(combo) {
    this.currentGameCombo = combo;
    this.checkChallengesByType('combo', combo);
  }

  /**
   * Check time-based challenges
   */
  checkTimeChallenges(levelTime) {
    const timeInSeconds = Math.floor(levelTime / 1000);
    this.checkChallengesByType('time', timeInSeconds);
  }

  /**
   * Check survival challenges
   */
  checkSurvivalChallenges(levelData) {
    this.survivalCount++;
    this.checkChallengesByType('survival', this.survivalCount);
  }

  /**
   * Check challenges by type
   */
  checkChallengesByType(type, value) {
    for (const challenge of this.activeChallenges) {
      if (challenge.type === type && !challenge.completed) {
        if (value >= challenge.target) {
          this.completeChallenge(challenge.id);
        } else {
          // Update progress
          challenge.progress = value;
          this.challengeProgress.set(challenge.id, value);
        }
      }
    }
  }

  /**
   * Complete a challenge
   */
  completeChallenge(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.completed) {
      return;
    }
    challenge.completed = true;
    challenge.completedAt = Date.now();
    this.completedChallenges.add(challengeId);
    this.logger.info(`Daily challenge completed: ${challenge.name}`);

    // Emit challenge completed event
    this.eventBus.emit('dailyChallenge:completed', {
      id: challengeId,
      name: challenge.name,
      description: challenge.description,
      reward: challenge.reward,
      timestamp: Date.now()
    });

    // Apply reward
    this.applyChallengeReward(challenge);
  }

  /**
   * Apply challenge reward
   */
  applyChallengeReward(challenge) {
    if (!challenge.reward) return;
    const reward = challenge.reward;

    // Score reward
    if (reward.score) {
      this.eventBus.emit('player:scoreChanged', {
        scoreChange: reward.score,
        source: 'dailyChallenge',
        challengeId: challenge.id
      });
    }

    // Coins reward
    if (reward.coins) {
      this.eventBus.emit('player:coinsChanged', {
        coinsChange: reward.coins,
        source: 'dailyChallenge',
        challengeId: challenge.id
      });
    }

    // Special effects
    if (reward.effects) {
      this.eventBus.emit('game:challengeEffect', {
        effects: reward.effects,
        challengeId: challenge.id
      });
    }
  }

  /**
   * Get active challenges
   */
  getActiveChallenges() {
    return this.activeChallenges.filter(c => !c.completed);
  }

  /**
   * Get completed challenges
   */
  getCompletedChallenges() {
    return this.activeChallenges.filter(c => c.completed);
  }

  /**
   * Get all challenges
   */
  getAllChallenges() {
    return this.activeChallenges;
  }

  /**
   * Get challenge progress
   */
  getChallengeProgress(challengeId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;
    return {
      id: challengeId,
      name: challenge.name,
      description: challenge.description,
      progress: challenge.progress,
      target: challenge.target,
      percentage: Math.min(challenge.progress / challenge.target * 100, 100),
      completed: challenge.completed,
      difficulty: challenge.difficulty,
      reward: challenge.reward
    };
  }

  /**
   * Get all challenge progress
   */
  getAllChallengeProgress() {
    const progress = [];
    for (const challenge of this.activeChallenges) {
      progress.push(this.getChallengeProgress(challenge.id));
    }
    return progress;
  }

  /**
   * Get random elements from array
   */
  getRandomElements(array, count) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get random element from array
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Load challenge data from storage
   */
  async loadChallengeData() {
    try {
      const savedData = localStorage.getItem('dailyChallengeData');
      if (savedData) {
        const data = JSON.parse(savedData);

        // Restore last challenge date
        this.lastChallengeDate = data.lastChallengeDate;

        // Restore completed challenges
        if (data.completed) {
          data.completed.forEach(id => {
            this.completedChallenges.add(id);
          });
        }

        // Restore progress
        if (data.progress) {
          for (const [id, progress] of Object.entries(data.progress)) {
            this.challengeProgress.set(id, progress);
          }
        }
        this.logger.info('Daily challenge data loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load daily challenge data:', error);
    }
  }

  /**
   * Save challenge data to storage
   */
  saveChallengeData() {
    try {
      const data = {
        lastChallengeDate: this.lastChallengeDate,
        completed: Array.from(this.completedChallenges),
        progress: Object.fromEntries(this.challengeProgress)
      };
      localStorage.setItem('dailyChallengeData', JSON.stringify(data));
      this.logger.info('Daily challenge data saved to storage');
    } catch (error) {
      this.logger.error('Failed to save daily challenge data:', error);
    }
  }

  /**
   * Reset all challenges
   */
  resetChallenges() {
    this.activeChallenges = [];
    this.completedChallenges.clear();
    this.challengeProgress.clear();
    this.lastChallengeDate = null;
    this.logger.info('All daily challenges reset');
  }
}

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

class AccessibilityManager {
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
      colorblindMode: 'none',
      // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
      keyboardNavigation: false,
      audioCues: true,
      audioDescriptions: false,
      textScaling: 1.0,
      motionReduction: false,
      reducedAnimations: false,
      largeText: false,
      focusIndicators: true
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
    this.eventBus.on('player:itemCollected', this.handleItemCollected.bind(this));

    // Level events
    this.eventBus.on('level:started', this.handleLevelStarted.bind(this));
    this.eventBus.on('level:completed', this.handleLevelCompleted.bind(this));

    // Achievement events
    this.eventBus.on('achievement:unlocked', this.handleAchievementUnlocked.bind(this));
    this.eventBus.on('dailyChallenge:completed', this.handleDailyChallengeCompleted.bind(this));

    // Input events
    this.eventBus.on('game:input', this.handleInput.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
    this.eventBus.removeListener('game:paused', this.handleGamePaused.bind(this));
    this.eventBus.removeListener('game:resumed', this.handleGameResumed.bind(this));
    this.eventBus.removeListener('game:stopped', this.handleGameStopped.bind(this));
    this.eventBus.removeListener('player:scoreChanged', this.handleScoreChanged.bind(this));
    this.eventBus.removeListener('player:damaged', this.handlePlayerDamaged.bind(this));
    this.eventBus.removeListener('player:itemCollected', this.handleItemCollected.bind(this));
    this.eventBus.removeListener('level:started', this.handleLevelStarted.bind(this));
    this.eventBus.removeListener('level:completed', this.handleLevelCompleted.bind(this));
    this.eventBus.removeListener('achievement:unlocked', this.handleAchievementUnlocked.bind(this));
    this.eventBus.removeListener('dailyChallenge:completed', this.handleDailyChallengeCompleted.bind(this));
    this.eventBus.removeListener('game:input', this.handleInput.bind(this));
  }

  /**
   * Initialize audio context
   */
  initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    document.addEventListener('keydown', event => {
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
    document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

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
      timestamp: Date.now()
    });
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowNavigation(event) {
    // Emit arrow navigation event
    this.eventBus.emit('accessibility:arrowNavigation', {
      direction: event.key.replace('Arrow', '').toLowerCase(),
      timestamp: Date.now()
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
    root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
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
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    this.applyAccessibilitySettings();
    this.logger.info('Accessibility settings updated');

    // Emit settings changed event
    this.eventBus.emit('accessibility:settingsChanged', {
      settings: this.settings,
      timestamp: Date.now()
    });
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      ...this.settings
    };
  }

  /**
   * Announce text to screen readers
   */
  announce(text, priority = 'polite') {
    if (!this.settings.screenReader) return;
    const announcement = {
      text,
      priority,
      timestamp: Date.now()
    };
    this.announcementQueue.push(announcement);
  }

  /**
   * Process announcement queue
   */
  processAnnouncementQueue() {
    if (this.announcementQueue.length === 0) return;
    const announcement = this.announcementQueue.shift();
    const announcementRegion = document.getElementById('accessibility-announcements');
    if (announcementRegion) {
      announcementRegion.setAttribute('aria-live', announcement.priority);
      announcementRegion.textContent = announcement.text;
    }
  }

  /**
   * Play audio cue
   */
  playAudioCue(cueType, frequency = 440, duration = 200) {
    if (!this.settings.audioCues || !this.audioEnabled || !this.audioContext) return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);
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
      this.announce(`Score increased by ${data.scoreChange}. Total score: ${data.score}`);
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
    this.announce(`Level ${data.level} completed in ${Math.floor(data.time / 1000)} seconds`);
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
        this.settings = {
          ...this.settings,
          ...settings
        };
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
      localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
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
      focusIndicators: true
    };
    this.applyAccessibilitySettings();
    this.logger.info('Accessibility settings reset to defaults');
  }
}

/**
 * EventBus.js - Central event management system
 *
 * This class provides:
 * - Event emission and listening
 * - Event filtering and transformation
 * - Event history and debugging
 * - Performance monitoring
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.debug = false;
    this.performanceMetrics = {
      totalEvents: 0,
      averageProcessingTime: 0,
      slowestEvent: null,
      eventCounts: new Map()
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
      context: options.context || null
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
    this.on(event, callback, {
      ...options,
      once: true
    });
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    const eventListeners = this.listeners.get(event);
    const index = eventListeners.findIndex(listener => listener.callback === callback);
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
      id: this.generateEventId()
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
        resolve({
          data,
          eventData
        });
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
    const totalTime = this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalEvents - 1);
    this.performanceMetrics.averageProcessingTime = (totalTime + processingTime) / this.performanceMetrics.totalEvents;

    // Update slowest event
    if (!this.performanceMetrics.slowestEvent || processingTime > this.performanceMetrics.slowestEvent.time) {
      this.performanceMetrics.slowestEvent = {
        event,
        time: processingTime,
        timestamp: Date.now()
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
      history = history.filter(item => item.event === filter.event);
    }
    if (filter.since) {
      history = history.filter(item => item.timestamp >= filter.since);
    }
    if (filter.until) {
      history = history.filter(item => item.timestamp <= filter.until);
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
      eventCounts: Object.fromEntries(this.performanceMetrics.eventCounts)
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
      eventCounts: new Map()
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
      eventCounts: new Map()
    };
    this.log('EventBus destroyed');
  }
}

/**
 * Logger.js - Centralized logging system
 *
 * This class provides:
 * - Multiple log levels
 * - Log filtering and formatting
 * - Performance monitoring
 * - Log persistence
 * - Debug utilities
 */

class Logger {
  constructor(debug = false) {
    this.debug = debug;
    this.logLevel = debug ? 'debug' : 'info';
    this.logHistory = [];
    this.maxHistorySize = 1000;
    this.performanceMetrics = {
      totalLogs: 0,
      logsByLevel: new Map(),
      averageLogTime: 0
    };

    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    // Initialize performance monitoring
    this.startTime = Date.now();
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (Object.prototype.hasOwnProperty.call(this.levels, level)) {
      this.logLevel = level;
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug = true;
    this.setLevel('debug');
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debug = false;
    this.setLevel('info');
  }

  /**
   * Check if log level should be processed
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Log a message
   */
  log(level, message, data = null, context = null) {
    if (!this.shouldLog(level)) {
      return;
    }
    const timestamp = Date.now();
    const logEntry = {
      level,
      message,
      data,
      context,
      timestamp,
      id: this.generateLogId()
    };

    // Add to history
    this.addToHistory(logEntry);

    // Update performance metrics
    this.updatePerformanceMetrics(level);

    // Format and output log
    this.outputLog(logEntry);
  }

  /**
   * Add log entry to history
   */
  addToHistory(logEntry) {
    this.logHistory.push(logEntry);

    // Maintain history size limit
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(level) {
    this.performanceMetrics.totalLogs++;
    const count = this.performanceMetrics.logsByLevel.get(level) || 0;
    this.performanceMetrics.logsByLevel.set(level, count + 1);

    // Update average log time
    const totalTime = this.performanceMetrics.averageLogTime * (this.performanceMetrics.totalLogs - 1);
    this.performanceMetrics.averageLogTime = (totalTime + 1) / this.performanceMetrics.totalLogs;
  }

  /**
   * Output log to console
   */
  outputLog(logEntry) {
    const {
      level,
      message,
      data,
      context,
      timestamp
    } = logEntry;
    const timeString = new Date(timestamp).toISOString();
    const contextString = context ? `[${context}]` : '';
    const prefix = `[${timeString}] ${level.toUpperCase()}${contextString}`;
    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'trace':
        console.trace(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Error level logging
   */
  error(message, data = null, context = null) {
    this.log('error', message, data, context);
  }

  /**
   * Warning level logging
   */
  warn(message, data = null, context = null) {
    this.log('warn', message, data, context);
  }

  /**
   * Info level logging
   */
  info(message, data = null, context = null) {
    this.log('info', message, data, context);
  }

  /**
   * Debug level logging
   */
  debug(message, data = null, context = null) {
    this.log('debug', message, data, context);
  }

  /**
   * Trace level logging
   */
  trace(message, data = null, context = null) {
    this.log('trace', message, data, context);
  }

  /**
   * Log performance metrics
   */
  performance(operation, startTime, endTime = null) {
    const duration = (endTime || performance.now()) - startTime;
    this.debug(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Log memory usage
   */
  memory() {
    if (performance.memory) {
      const memory = performance.memory;
      this.debug('Memory usage:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }
  }

  /**
   * Log function execution
   */
  function(name, fn, context = null) {
    const startTime = performance.now();
    this.debug(`Function started: ${name}`, null, context);
    try {
      const result = fn();
      const duration = this.performance(name, startTime);
      this.debug(`Function completed: ${name}`, {
        duration
      }, context);
      return result;
    } catch (error) {
      const duration = this.performance(name, startTime);
      this.error(`Function failed: ${name}`, {
        error: error.message,
        duration
      }, context);
      throw error;
    }
  }

  /**
   * Log async function execution
   */
  async functionAsync(name, fn, context = null) {
    const startTime = performance.now();
    this.debug(`Async function started: ${name}`, null, context);
    try {
      const result = await fn();
      const duration = this.performance(name, startTime);
      this.debug(`Async function completed: ${name}`, {
        duration
      }, context);
      return result;
    } catch (error) {
      const duration = this.performance(name, startTime);
      this.error(`Async function failed: ${name}`, {
        error: error.message,
        duration
      }, context);
      throw error;
    }
  }

  /**
   * Log event
   */
  event(eventName, data = null, context = null) {
    this.debug(`Event: ${eventName}`, data, context);
  }

  /**
   * Log state change
   */
  stateChange(from, to, data = null, context = null) {
    this.info(`State changed: ${from} -> ${to}`, data, context);
  }

  /**
   * Log user action
   */
  userAction(action, data = null, context = null) {
    this.info(`User action: ${action}`, data, context);
  }

  /**
   * Log API call
   */
  apiCall(method, url, data = null, context = null) {
    this.debug(`API call: ${method} ${url}`, data, context);
  }

  /**
   * Log API response
   */
  apiResponse(method, url, status, data = null, context = null) {
    const level = status >= 400 ? 'error' : 'debug';
    this.log(level, `API response: ${method} ${url} - ${status}`, data, context);
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message, error, context = null) {
    this.error(message, {
      error: error.message,
      stack: error.stack
    }, context);
  }

  /**
   * Log group of related messages
   */
  group(name, fn, context = null) {
    const startTime = performance.now();
    this.debug(`Group started: ${name}`, null, context);
    try {
      const result = fn();
      const duration = this.performance(name, startTime);
      this.debug(`Group completed: ${name}`, {
        duration
      }, context);
      return result;
    } catch (error) {
      const duration = this.performance(name, startTime);
      this.error(`Group failed: ${name}`, {
        error: error.message,
        duration
      }, context);
      throw error;
    }
  }

  /**
   * Log async group of related messages
   */
  async groupAsync(name, fn, context = null) {
    const startTime = performance.now();
    this.debug(`Async group started: ${name}`, null, context);
    try {
      const result = await fn();
      const duration = this.performance(name, startTime);
      this.debug(`Async group completed: ${name}`, {
        duration
      }, context);
      return result;
    } catch (error) {
      const duration = this.performance(name, startTime);
      this.error(`Async group failed: ${name}`, {
        error: error.message,
        duration
      }, context);
      throw error;
    }
  }

  /**
   * Get log history
   */
  getHistory(filter = {}) {
    let history = [...this.logHistory];
    if (filter.level) {
      history = history.filter(entry => entry.level === filter.level);
    }
    if (filter.context) {
      history = history.filter(entry => entry.context === filter.context);
    }
    if (filter.since) {
      history = history.filter(entry => entry.timestamp >= filter.since);
    }
    if (filter.until) {
      history = history.filter(entry => entry.timestamp <= filter.until);
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
      logsByLevel: Object.fromEntries(this.performanceMetrics.logsByLevel),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
    this.debug('Log history cleared');
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalLogs: 0,
      logsByLevel: new Map(),
      averageLogTime: 0
    };
    this.startTime = Date.now();
    this.debug('Performance metrics reset');
  }

  /**
   * Export logs to JSON
   */
  exportLogs(filter = {}) {
    const history = this.getHistory(filter);
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import logs from JSON
   */
  importLogs(jsonString) {
    try {
      const logs = JSON.parse(jsonString);
      if (Array.isArray(logs)) {
        this.logHistory = logs;
        this.debug(`Imported ${logs.length} log entries`);
      }
    } catch (error) {
      this.error('Failed to import logs:', error);
    }
  }

  /**
   * Create a child logger with context
   */
  child(context) {
    const childLogger = new Logger(this.debug);
    childLogger.logLevel = this.logLevel;
    childLogger.context = context;
    return childLogger;
  }
}

/**
 * PerformanceMonitor.js - Comprehensive performance monitoring and optimization system
 *
 * This monitor handles:
 * - FPS monitoring and frame time analysis
 * - Memory usage tracking and leak detection
 * - Audio context performance monitoring
 * - Rendering performance analysis
 * - Input lag measurement
 * - Network performance tracking
 * - Performance bottleneck identification
 * - Automatic optimization suggestions
 */

class PerformanceMonitor {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('PerformanceMonitor requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('PerformanceMonitor requires logger dependency');
    }

    // Performance configuration
    this.config = {
      enableFPSMonitoring: true,
      enableMemoryMonitoring: true,
      enableAudioMonitoring: true,
      enableRenderingMonitoring: true,
      enableInputMonitoring: true,
      enableNetworkMonitoring: true,
      enableAutoOptimization: true,
      fpsTarget: 60,
      fpsWarningThreshold: 45,
      fpsCriticalThreshold: 30,
      memoryWarningThreshold: 100 * 1024 * 1024,
      // 100MB
      memoryCriticalThreshold: 200 * 1024 * 1024,
      // 200MB
      frameTimeWarningThreshold: 16.67,
      // 60fps = 16.67ms per frame
      frameTimeCriticalThreshold: 33.33,
      // 30fps = 33.33ms per frame
      reportInterval: 5000,
      // Report every 5 seconds
      maxHistorySize: 1000,
      ...dependencies.config
    };

    // Performance metrics
    this.metrics = {
      fps: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        history: [],
        droppedFrames: 0
      },
      frameTime: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        history: []
      },
      memory: {
        used: 0,
        total: 0,
        available: 0,
        history: [],
        leakDetected: false,
        leakCount: 0
      },
      audio: {
        contextState: 'suspended',
        contextRecreations: 0,
        bufferUnderruns: 0,
        latency: 0,
        performanceScore: 0
      },
      rendering: {
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        shaders: 0,
        batchCount: 0,
        cullingTime: 0,
        lightingTime: 0,
        postProcessingTime: 0
      },
      input: {
        lag: 0,
        eventCount: 0,
        droppedEvents: 0,
        averageResponseTime: 0
      },
      network: {
        latency: 0,
        bandwidth: 0,
        packetLoss: 0,
        connectionQuality: 'good'
      }
    };

    // Performance state
    this.isMonitoring = false;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.lastReportTime = 0;
    this.optimizationSuggestions = [];
    this.performanceAlerts = [];

    // Performance observers
    this.observers = {
      fps: null,
      memory: null,
      audio: null,
      rendering: null,
      input: null,
      network: null
    };

    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    this.setupEventHandlers();
    this.logger.info('PerformanceMonitor initialized');
  }

  /**
   * Initialize the monitor
   */
  async initialize() {
    this.logger.info('Initializing PerformanceMonitor...');

    // Start monitoring if enabled
    if (this.config.enableFPSMonitoring || this.config.enableMemoryMonitoring) {
      this.startMonitoring();
    }
    this.logger.info('PerformanceMonitor initialized successfully');
  }

  /**
   * Cleanup the monitor
   */
  cleanup() {
    this.logger.info('Cleaning up PerformanceMonitor...');

    // Stop monitoring
    this.stopMonitoring();

    // Disconnect observers
    this.disconnectObservers();
    this.logger.info('PerformanceMonitor cleaned up');
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Set up FPS monitoring
    if (this.config.enableFPSMonitoring) {
      this.setupFPSMonitoring();
    }

    // Set up memory monitoring
    if (this.config.enableMemoryMonitoring) {
      this.setupMemoryMonitoring();
    }

    // Set up audio monitoring
    if (this.config.enableAudioMonitoring) {
      this.setupAudioMonitoring();
    }

    // Set up rendering monitoring
    if (this.config.enableRenderingMonitoring) {
      this.setupRenderingMonitoring();
    }

    // Set up input monitoring
    if (this.config.enableInputMonitoring) {
      this.setupInputMonitoring();
    }

    // Set up network monitoring
    if (this.config.enableNetworkMonitoring) {
      this.setupNetworkMonitoring();
    }
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Game events
    this.eventBus.on('game:started', this.handleGameStarted.bind(this));
    this.eventBus.on('game:paused', this.handleGamePaused.bind(this));
    this.eventBus.on('game:resumed', this.handleGameResumed.bind(this));
    this.eventBus.on('game:stopped', this.handleGameStopped.bind(this));

    // Performance events
    this.eventBus.on('performance:frame', this.handleFrame.bind(this));
    this.eventBus.on('performance:memory', this.handleMemoryUpdate.bind(this));
    this.eventBus.on('performance:audio', this.handleAudioUpdate.bind(this));
    this.eventBus.on('performance:rendering', this.handleRenderingUpdate.bind(this));
    this.eventBus.on('performance:input', this.handleInputUpdate.bind(this));
    this.eventBus.on('performance:network', this.handleNetworkUpdate.bind(this));
  }

  /**
   * Set up FPS monitoring
   */
  setupFPSMonitoring() {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    const measureFPS = currentTime => {
      if (!this.isMonitoring) return;
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Calculate FPS
      const fps = 1000 / deltaTime;
      this.updateFPSMetrics(fps, deltaTime);

      // Continue monitoring
      requestAnimationFrame(measureFPS);
    };
    this.observers.fps = measureFPS;
  }

  /**
   * Set up memory monitoring
   */
  setupMemoryMonitoring() {
    if (!performance.memory) {
      this.logger.warn('Performance.memory API not available');
      return;
    }
    const measureMemory = () => {
      if (!this.isMonitoring) return;
      const memory = performance.memory;
      this.updateMemoryMetrics(memory);

      // Check for memory leaks
      this.detectMemoryLeaks();

      // Continue monitoring
      setTimeout(measureMemory, 1000);
    };
    this.observers.memory = measureMemory;
  }

  /**
   * Set up audio monitoring
   */
  setupAudioMonitoring() {
    // Monitor audio context state
    const measureAudio = () => {
      if (!this.isMonitoring) return;

      // Check for audio context recreations
      this.checkAudioContextHealth();

      // Continue monitoring
      setTimeout(measureAudio, 2000);
    };
    this.observers.audio = measureAudio;
  }

  /**
   * Set up rendering monitoring
   */
  setupRenderingMonitoring() {
    // This would integrate with the rendering system
    // For now, we'll set up basic monitoring
    const measureRendering = () => {
      if (!this.isMonitoring) return;

      // Monitor rendering performance
      this.updateRenderingMetrics();

      // Continue monitoring
      requestAnimationFrame(measureRendering);
    };
    this.observers.rendering = measureRendering;
  }

  /**
   * Set up input monitoring
   */
  setupInputMonitoring() {
    let lastInputTime = 0;
    const measureInput = event => {
      if (!this.isMonitoring) return;
      const currentTime = performance.now();
      const responseTime = currentTime - lastInputTime;
      this.updateInputMetrics(responseTime);
      lastInputTime = currentTime;
    };

    // Listen for input events
    document.addEventListener('keydown', measureInput);
    document.addEventListener('mousedown', measureInput);
    document.addEventListener('touchstart', measureInput);
    this.observers.input = measureInput;
  }

  /**
   * Set up network monitoring
   */
  setupNetworkMonitoring() {
    const measureNetwork = () => {
      if (!this.isMonitoring) return;

      // Monitor network performance
      this.updateNetworkMetrics();

      // Continue monitoring
      setTimeout(measureNetwork, 5000);
    };
    this.observers.network = measureNetwork;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.lastReportTime = performance.now();

    // Start FPS monitoring
    if (this.observers.fps) {
      requestAnimationFrame(this.observers.fps);
    }

    // Start other monitoring
    if (this.observers.memory) {
      this.observers.memory();
    }
    if (this.observers.audio) {
      this.observers.audio();
    }
    if (this.observers.rendering) {
      requestAnimationFrame(this.observers.rendering);
    }
    if (this.observers.network) {
      this.observers.network();
    }
    this.logger.info('Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Disconnect observers
   */
  disconnectObservers() {
    // Remove input event listeners
    if (this.observers.input) {
      document.removeEventListener('keydown', this.observers.input);
      document.removeEventListener('mousedown', this.observers.input);
      document.removeEventListener('touchstart', this.observers.input);
    }
  }

  /**
   * Update FPS metrics
   */
  updateFPSMetrics(fps, frameTime) {
    this.metrics.fps.current = fps;
    this.metrics.fps.history.push(fps);
    this.metrics.fps.min = Math.min(this.metrics.fps.min, fps);
    this.metrics.fps.max = Math.max(this.metrics.fps.max, fps);

    // Calculate average FPS
    if (this.metrics.fps.history.length > 0) {
      this.metrics.fps.average = this.metrics.fps.history.reduce((a, b) => a + b, 0) / this.metrics.fps.history.length;
    }

    // Update frame time metrics
    this.metrics.frameTime.current = frameTime;
    this.metrics.frameTime.history.push(frameTime);
    this.metrics.frameTime.min = Math.min(this.metrics.frameTime.min, frameTime);
    this.metrics.frameTime.max = Math.max(this.metrics.frameTime.max, frameTime);
    if (this.metrics.frameTime.history.length > 0) {
      this.metrics.frameTime.average = this.metrics.frameTime.history.reduce((a, b) => a + b, 0) / this.metrics.frameTime.history.length;
    }

    // Check for dropped frames
    if (frameTime > this.config.frameTimeCriticalThreshold) {
      this.metrics.fps.droppedFrames++;
    }

    // Maintain history size
    if (this.metrics.fps.history.length > this.config.maxHistorySize) {
      this.metrics.fps.history.shift();
      this.metrics.frameTime.history.shift();
    }

    // Check for performance issues
    this.checkFPSPerformance();
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics(memory) {
    this.metrics.memory.used = memory.usedJSHeapSize;
    this.metrics.memory.total = memory.totalJSHeapSize;
    this.metrics.memory.available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    this.metrics.memory.history.push({
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      timestamp: performance.now()
    });

    // Maintain history size
    if (this.metrics.memory.history.length > this.config.maxHistorySize) {
      this.metrics.memory.history.shift();
    }

    // Check for memory issues
    this.checkMemoryPerformance();
  }

  /**
   * Update audio metrics
   */
  updateAudioMetrics(audioData) {
    this.metrics.audio = {
      ...this.metrics.audio,
      ...audioData
    };

    // Check for audio performance issues
    this.checkAudioPerformance();
  }

  /**
   * Update rendering metrics
   */
  updateRenderingMetrics() {
    // This would be populated by the rendering system
    // For now, we'll use placeholder values
    this.metrics.rendering.drawCalls = 0;
    this.metrics.rendering.triangles = 0;
    this.metrics.rendering.textures = 0;
    this.metrics.rendering.shaders = 0;
  }

  /**
   * Update input metrics
   */
  updateInputMetrics(responseTime) {
    this.metrics.input.eventCount++;
    this.metrics.input.lag = responseTime;

    // Calculate average response time
    if (this.metrics.input.eventCount > 0) {
      this.metrics.input.averageResponseTime = (this.metrics.input.averageResponseTime * (this.metrics.input.eventCount - 1) + responseTime) / this.metrics.input.eventCount;
    }

    // Check for input performance issues
    this.checkInputPerformance();
  }

  /**
   * Update network metrics
   */
  updateNetworkMetrics() {
    // This would integrate with network monitoring
    // For now, we'll use placeholder values
    this.metrics.network.latency = 0;
    this.metrics.network.bandwidth = 0;
    this.metrics.network.packetLoss = 0;
    this.metrics.network.connectionQuality = 'good';
  }

  /**
   * Check FPS performance
   */
  checkFPSPerformance() {
    const fps = this.metrics.fps.current;
    const frameTime = this.metrics.frameTime.current;
    if (fps < this.config.fpsCriticalThreshold) {
      this.addPerformanceAlert('critical', 'FPS critically low', {
        fps,
        threshold: this.config.fpsCriticalThreshold
      });
      this.suggestOptimization('fps', 'Consider reducing graphics quality or disabling non-essential features');
    } else if (fps < this.config.fpsWarningThreshold) {
      this.addPerformanceAlert('warning', 'FPS below target', {
        fps,
        threshold: this.config.fpsWarningThreshold
      });
    }
    if (frameTime > this.config.frameTimeCriticalThreshold) {
      this.addPerformanceAlert('critical', 'Frame time too high', {
        frameTime,
        threshold: this.config.frameTimeCriticalThreshold
      });
    } else if (frameTime > this.config.frameTimeWarningThreshold) {
      this.addPerformanceAlert('warning', 'Frame time above target', {
        frameTime,
        threshold: this.config.frameTimeWarningThreshold
      });
    }
  }

  /**
   * Check memory performance
   */
  checkMemoryPerformance() {
    const used = this.metrics.memory.used;
    if (used > this.config.memoryCriticalThreshold) {
      this.addPerformanceAlert('critical', 'Memory usage critically high', {
        used,
        threshold: this.config.memoryCriticalThreshold
      });
      this.suggestOptimization('memory', 'Consider reducing texture quality or clearing unused assets');
    } else if (used > this.config.memoryWarningThreshold) {
      this.addPerformanceAlert('warning', 'Memory usage high', {
        used,
        threshold: this.config.memoryWarningThreshold
      });
    }
  }

  /**
   * Check audio performance
   */
  checkAudioPerformance() {
    if (this.metrics.audio.contextRecreations > 5) {
      this.addPerformanceAlert('warning', 'Audio context recreated multiple times', {
        recreations: this.metrics.audio.contextRecreations
      });
      this.suggestOptimization('audio', 'Consider implementing audio context pooling or lazy initialization');
    }
    if (this.metrics.audio.bufferUnderruns > 10) {
      this.addPerformanceAlert('warning', 'Audio buffer underruns detected', {
        underruns: this.metrics.audio.bufferUnderruns
      });
    }
  }

  /**
   * Check input performance
   */
  checkInputPerformance() {
    const lag = this.metrics.input.lag;
    if (lag > 100) {
      this.addPerformanceAlert('warning', 'Input lag detected', {
        lag
      });
      this.suggestOptimization('input', 'Consider optimizing input handling or reducing input processing overhead');
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    const history = this.metrics.memory.history;
    if (history.length < 10) return;

    // Check if memory usage is consistently increasing
    const recent = history.slice(-10);
    const isIncreasing = recent.every((entry, index) => {
      if (index === 0) return true;
      return entry.used > recent[index - 1].used;
    });
    if (isIncreasing) {
      this.metrics.memory.leakDetected = true;
      this.metrics.memory.leakCount++;
      this.addPerformanceAlert('warning', 'Potential memory leak detected', {
        leakCount: this.metrics.memory.leakCount
      });
      this.suggestOptimization('memory', 'Check for circular references or unremoved event listeners');
    }
  }

  /**
   * Check audio context health
   */
  checkAudioContextHealth() {
    // This would check the actual audio context state
    // For now, we'll simulate the check
    const contextState = 'running'; // This would be the actual context state

    if (contextState !== this.metrics.audio.contextState) {
      if (this.metrics.audio.contextState === 'suspended' && contextState === 'running') {
        this.metrics.audio.contextRecreations++;
        this.addPerformanceAlert('info', 'Audio context recreated', {
          recreations: this.metrics.audio.contextRecreations
        });
      }
      this.metrics.audio.contextState = contextState;
    }
  }

  /**
   * Add performance alert
   */
  addPerformanceAlert(level, message, data) {
    const alert = {
      level,
      message,
      data,
      timestamp: performance.now()
    };
    this.performanceAlerts.push(alert);

    // Emit alert event
    this.eventBus.emit('performance:alert', alert);

    // Log alert
    switch (level) {
      case 'critical':
        this.logger.error(`Performance Alert: ${message}`, data);
        break;
      case 'warning':
        this.logger.warn(`Performance Alert: ${message}`, data);
        break;
      case 'info':
        this.logger.info(`Performance Alert: ${message}`, data);
        break;
    }
  }

  /**
   * Suggest optimization
   */
  suggestOptimization(category, suggestion) {
    const optimization = {
      category,
      suggestion,
      timestamp: performance.now()
    };
    this.optimizationSuggestions.push(optimization);

    // Emit optimization event
    this.eventBus.emit('performance:optimization', optimization);
    this.logger.info(`Performance Optimization: ${suggestion}`);
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      metrics: this.metrics,
      alerts: this.performanceAlerts,
      suggestions: this.optimizationSuggestions,
      timestamp: performance.now()
    };
  }

  /**
   * Get performance score
   */
  getPerformanceScore() {
    let score = 100;

    // FPS score
    const fps = this.metrics.fps.current;
    if (fps < this.config.fpsCriticalThreshold) {
      score -= 40;
    } else if (fps < this.config.fpsWarningThreshold) {
      score -= 20;
    }

    // Memory score
    const memoryUsage = this.metrics.memory.used / this.metrics.memory.total;
    if (memoryUsage > 0.9) {
      score -= 30;
    } else if (memoryUsage > 0.7) {
      score -= 15;
    }

    // Frame time score
    const frameTime = this.metrics.frameTime.current;
    if (frameTime > this.config.frameTimeCriticalThreshold) {
      score -= 20;
    } else if (frameTime > this.config.frameTimeWarningThreshold) {
      score -= 10;
    }
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Handle game started
   */
  handleGameStarted(data) {
    this.startMonitoring();
  }

  /**
   * Handle game paused
   */
  handleGamePaused(data) {
    // Continue monitoring but reduce frequency
  }

  /**
   * Handle game resumed
   */
  handleGameResumed(data) {
    // Resume normal monitoring
  }

  /**
   * Handle game stopped
   */
  handleGameStopped(data) {
    this.stopMonitoring();
  }

  /**
   * Handle frame event
   */
  handleFrame(data) {
    // This would be called by the rendering system
  }

  /**
   * Handle memory update
   */
  handleMemoryUpdate(data) {
    this.updateMemoryMetrics(data);
  }

  /**
   * Handle audio update
   */
  handleAudioUpdate(data) {
    this.updateAudioMetrics(data);
  }

  /**
   * Handle rendering update
   */
  handleRenderingUpdate(data) {
    this.metrics.rendering = {
      ...this.metrics.rendering,
      ...data
    };
  }

  /**
   * Handle input update
   */
  handleInputUpdate(data) {
    this.updateInputMetrics(data.responseTime);
  }

  /**
   * Handle network update
   */
  handleNetworkUpdate(data) {
    this.metrics.network = {
      ...this.metrics.network,
      ...data
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get alerts
   */
  getAlerts() {
    return this.performanceAlerts;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    return this.optimizationSuggestions;
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.performanceAlerts = [];
  }

  /**
   * Clear optimization suggestions
   */
  clearOptimizationSuggestions() {
    this.optimizationSuggestions = [];
  }
}

/**
 * InputManager.js - Comprehensive input handling with accessibility support
 *
 * This manager handles:
 * - Keyboard input with accessibility support
 * - Mouse input and touch events
 * - Gamepad support
 * - Input mapping and customization
 * - Accessibility features (keyboard navigation, focus management)
 * - Input event normalization
 */

class InputManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('InputManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('InputManager requires logger dependency');
    }

    // Input state
    this.keys = new Map();
    this.mouse = {
      x: 0,
      y: 0,
      buttons: new Map(),
      wheel: 0
    };
    this.touch = {
      touches: new Map(),
      gestures: new Map(),
      activeGestures: new Map(),
      lastTapTime: 0,
      lastTapPosition: {
        x: 0,
        y: 0
      },
      longPressTimer: null,
      doubleTapTimer: null
    };

    // Mobile UI state
    this.mobileUI = {
      virtualJoystick: {
        active: false,
        center: {
          x: 0,
          y: 0
        },
        position: {
          x: 0,
          y: 0
        },
        radius: 60,
        touchId: null
      },
      actionButtons: new Map(),
      isVisible: false,
      orientation: 'portrait'
    };
    this.gamepad = {
      controllers: new Map(),
      lastUpdate: 0
    };

    // Input mapping
    this.keyMappings = new Map();
    this.mouseMappings = new Map();
    this.gamepadMappings = new Map();
    this.touchMappings = new Map();

    // Accessibility features
    this.accessibility = {
      keyboardNavigation: false,
      focusManagement: true,
      tabOrder: [],
      currentFocusIndex: 0,
      focusableElements: new Set(),
      skipLinks: new Map()
    };

    // Input configuration
    this.settings = {
      mouseSensitivity: 1.0,
      keyboardLayout: 'qwerty',
      enableMouseLook: true,
      enableKeyboardNavigation: true,
      enableGamepad: true,
      enableTouch: true,
      invertY: false,
      deadzone: 0.1,
      repeatDelay: 500,
      repeatRate: 50,
      // Mobile-specific settings
      mobileControls: {
        enabled: true,
        layout: 'default',
        // 'default', 'compact', 'custom'
        size: 'medium',
        // 'small', 'medium', 'large'
        opacity: 0.8,
        position: 'bottom',
        // 'bottom', 'top', 'left', 'right', 'custom'
        showLabels: true,
        hapticFeedback: true,
        gestureSensitivity: 1.0,
        touchDeadzone: 0.05,
        multiTouch: true,
        pinchToZoom: true,
        swipeThreshold: 50,
        longPressDelay: 500,
        doubleTapDelay: 300
      },
      // Touch gesture settings
      gestures: {
        enableSwipe: true,
        enablePinch: true,
        enableRotate: true,
        enableLongPress: true,
        enableDoubleTap: true,
        swipeDirections: ['up', 'down', 'left', 'right'],
        pinchThreshold: 0.1,
        rotateThreshold: 5 // degrees
      },
      // Mobile UI controls
      mobileUI: {
        showVirtualJoystick: true,
        showActionButtons: true,
        showMenuButton: true,
        showPauseButton: true,
        buttonSpacing: 10,
        buttonSize: 60,
        joystickSize: 120,
        joystickDeadzone: 0.1,
        buttonOpacity: 0.8,
        buttonPressScale: 0.9,
        enableButtonHaptics: true
      }
    };

    // Event handling
    this.boundHandlers = new Map();
    this.isEnabled = true;
    this.isCaptured = false;

    // Initialize input system
    this.initializeInputMappings();
    this.setupEventHandlers();
    this.setupAccessibility();
    this.setupMobileControls();
    this.logger.info('InputManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing InputManager...');

    // Load input settings from config
    if (this.config) {
      this.loadSettingsFromConfig();
    }

    // Set up focus management
    this.setupFocusManagement();
    this.logger.info('InputManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up InputManager...');

    // Remove event listeners
    this.removeEventHandlers();

    // Clear state
    this.keys.clear();
    this.mouse.buttons.clear();
    this.touch.touches.clear();
    this.gamepad.controllers.clear();
    this.logger.info('InputManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime) {
    if (!this.isEnabled) return;

    // Update gamepad state
    this.updateGamepadState();

    // Update accessibility features
    this.updateAccessibilityFeatures();

    // Process input events
    this.processInputEvents();
  }

  /**
   * Initialize input mappings
   */
  initializeInputMappings() {
    // Keyboard mappings
    this.keyMappings.set('moveUp', ['KeyW', 'ArrowUp']);
    this.keyMappings.set('moveDown', ['KeyS', 'ArrowDown']);
    this.keyMappings.set('moveLeft', ['KeyA', 'ArrowLeft']);
    this.keyMappings.set('moveRight', ['KeyD', 'ArrowRight']);
    this.keyMappings.set('jump', ['Space']);
    this.keyMappings.set('crouch', ['KeyC', 'ShiftLeft']);
    this.keyMappings.set('run', ['ShiftLeft']);
    this.keyMappings.set('interact', ['KeyE', 'Enter']);
    this.keyMappings.set('pause', ['Escape', 'KeyP']);
    this.keyMappings.set('inventory', ['KeyI', 'Tab']);
    this.keyMappings.set('menu', ['Escape', 'KeyM']);
    this.keyMappings.set('confirm', ['Enter', 'Space']);
    this.keyMappings.set('cancel', ['Escape', 'Backspace']);
    this.keyMappings.set('next', ['Tab', 'ArrowDown']);
    this.keyMappings.set('previous', ['ShiftLeft+Tab', 'ArrowUp']);

    // Mouse mappings
    this.mouseMappings.set('leftClick', 0);
    this.mouseMappings.set('rightClick', 2);
    this.mouseMappings.set('middleClick', 1);
    this.mouseMappings.set('scrollUp', 'wheelUp');
    this.mouseMappings.set('scrollDown', 'wheelDown');

    // Gamepad mappings
    this.gamepadMappings.set('moveUp', 'dpadUp');
    this.gamepadMappings.set('moveDown', 'dpadDown');
    this.gamepadMappings.set('moveLeft', 'dpadLeft');
    this.gamepadMappings.set('moveRight', 'dpadRight');
    this.gamepadMappings.set('jump', 'buttonA');
    this.gamepadMappings.set('interact', 'buttonX');
    this.gamepadMappings.set('pause', 'buttonStart');
    this.gamepadMappings.set('menu', 'buttonSelect');
    this.gamepadMappings.set('confirm', 'buttonA');
    this.gamepadMappings.set('cancel', 'buttonB');

    // Touch mappings
    this.touchMappings.set('tap', 'tap');
    this.touchMappings.set('doubleTap', 'doubleTap');
    this.touchMappings.set('longPress', 'longPress');
    this.touchMappings.set('swipe', 'swipe');
    this.touchMappings.set('pinch', 'pinch');
    this.touchMappings.set('rotate', 'rotate');
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Keyboard events
    this.boundHandlers.set('keydown', this.handleKeyDown.bind(this));
    this.boundHandlers.set('keyup', this.handleKeyUp.bind(this));
    this.boundHandlers.set('keypress', this.handleKeyPress.bind(this));

    // Mouse events
    this.boundHandlers.set('mousedown', this.handleMouseDown.bind(this));
    this.boundHandlers.set('mouseup', this.handleMouseUp.bind(this));
    this.boundHandlers.set('mousemove', this.handleMouseMove.bind(this));
    this.boundHandlers.set('wheel', this.handleWheel.bind(this));
    this.boundHandlers.set('contextmenu', this.handleContextMenu.bind(this));

    // Touch events
    this.boundHandlers.set('touchstart', this.handleTouchStart.bind(this));
    this.boundHandlers.set('touchend', this.handleTouchEnd.bind(this));
    this.boundHandlers.set('touchmove', this.handleTouchMove.bind(this));
    this.boundHandlers.set('touchcancel', this.handleTouchCancel.bind(this));

    // Gamepad events
    this.boundHandlers.set('gamepadconnected', this.handleGamepadConnected.bind(this));
    this.boundHandlers.set('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));

    // Focus events
    this.boundHandlers.set('focusin', this.handleFocusIn.bind(this));
    this.boundHandlers.set('focusout', this.handleFocusOut.bind(this));

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    for (const [event, handler] of this.boundHandlers) {
      document.addEventListener(event, handler, {
        passive: false
      });
    }
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    for (const [event, handler] of this.boundHandlers) {
      document.removeEventListener(event, handler);
    }
    this.boundHandlers.clear();
  }

  /**
   * Set up accessibility features
   */
  setupAccessibility() {
    // Set up keyboard navigation
    if (this.settings.enableKeyboardNavigation) {
      this.accessibility.keyboardNavigation = true;
    }

    // Set up focus management
    this.setupFocusManagement();
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Find all focusable elements
    this.updateFocusableElements();

    // Set up tab order
    this.updateTabOrder();

    // Set up skip links
    this.setupSkipLinks();
  }

  /**
   * Update focusable elements
   */
  updateFocusableElements() {
    this.accessibility.focusableElements.clear();
    const focusableSelectors = ['button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', 'a[href]', '[tabindex]:not([tabindex="-1"])', '[role="button"]:not([disabled])', '[role="link"]', '[role="menuitem"]', '[role="tab"]', '[role="option"]'];
    const elements = document.querySelectorAll(focusableSelectors.join(', '));
    elements.forEach(element => {
      this.accessibility.focusableElements.add(element);
    });
  }

  /**
   * Update tab order
   */
  updateTabOrder() {
    this.accessibility.tabOrder = Array.from(this.accessibility.focusableElements).sort((a, b) => {
      const aTabIndex = parseInt(a.getAttribute('tabindex') || '0');
      const bTabIndex = parseInt(b.getAttribute('tabindex') || '0');
      return aTabIndex - bTabIndex;
    });
  }

  /**
   * Set up skip links
   */
  setupSkipLinks() {
    // Create skip links for accessibility
    const skipLinks = [{
      id: 'skip-main',
      text: 'Skip to main content',
      target: 'main'
    }, {
      id: 'skip-nav',
      text: 'Skip to navigation',
      target: 'nav'
    }, {
      id: 'skip-content',
      text: 'Skip to content',
      target: 'content'
    }];
    skipLinks.forEach(link => {
      this.accessibility.skipLinks.set(link.id, link);
    });
  }

  /**
   * Set up mobile controls
   */
  setupMobileControls() {
    if (!this.settings.enableTouch || !this.settings.mobileControls.enabled) {
      return;
    }

    // Skip mobile controls setup in test environments
    if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent.includes('jsdom')) {
      this.logger.info('Skipping mobile controls setup in test environment');
      return;
    }

    // Detect mobile device
    this.detectMobileDevice();

    // Create mobile UI elements
    this.createMobileUI();

    // Set up orientation handling
    this.setupOrientationHandling();

    // Set up gesture recognition
    this.setupGestureRecognition();
    this.logger.info('Mobile controls initialized');
  }

  /**
   * Detect mobile device
   */
  detectMobileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobile = isMobile || isTouch;
    if (this.isMobile) {
      this.logger.info('Mobile device detected');
    }
  }

  /**
   * Create mobile UI elements
   */
  createMobileUI() {
    if (!this.isMobile) return;

    // Create mobile controls container
    this.mobileControlsContainer = document.createElement('div');
    this.mobileControlsContainer.id = 'mobile-controls';
    this.mobileControlsContainer.className = 'mobile-controls';
    this.mobileControlsContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      pointer-events: none;
      z-index: 1000;
      display: ${this.settings.mobileControls.enabled ? 'block' : 'none'};
    `;

    // Ensure the element is properly initialized
    if (!this.mobileControlsContainer.nodeType) {
      this.mobileControlsContainer = null;
      return;
    }

    // Create virtual joystick
    if (this.settings.mobileUI.showVirtualJoystick) {
      this.createVirtualJoystick();
    }

    // Create action buttons
    if (this.settings.mobileUI.showActionButtons) {
      this.createActionButtons();
    }

    // Create menu button
    if (this.settings.mobileUI.showMenuButton) {
      this.createMenuButton();
    }

    // Create pause button
    if (this.settings.mobileUI.showPauseButton) {
      this.createPauseButton();
    }
    if (document.body) {
      document.body.appendChild(this.mobileControlsContainer);
    }
  }

  /**
   * Create virtual joystick
   */
  createVirtualJoystick() {
    const joystickContainer = document.createElement('div');
    joystickContainer.className = 'virtual-joystick';
    joystickContainer.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      width: ${this.settings.mobileUI.joystickSize}px;
      height: ${this.settings.mobileUI.joystickSize}px;
      pointer-events: auto;
    `;
    const joystickBase = document.createElement('div');
    joystickBase.className = 'joystick-base';
    joystickBase.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, ${this.settings.mobileUI.buttonOpacity});
      border: 2px solid rgba(0, 0, 0, 0.3);
      position: relative;
    `;
    const joystickKnob = document.createElement('div');
    joystickKnob.className = 'joystick-knob';
    joystickKnob.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease;
    `;
    joystickBase.appendChild(joystickKnob);
    joystickContainer.appendChild(joystickBase);
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.appendChild(joystickContainer);
    }

    // Store references
    this.mobileUI.virtualJoystick.element = joystickContainer;
    this.mobileUI.virtualJoystick.base = joystickBase;
    this.mobileUI.virtualJoystick.knob = joystickKnob;
    this.mobileUI.virtualJoystick.center = {
      x: this.settings.mobileUI.joystickSize / 2,
      y: this.settings.mobileUI.joystickSize / 2
    };
  }

  /**
   * Create action buttons
   */
  createActionButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'action-buttons';
    buttonContainer.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: ${this.settings.mobileUI.buttonSpacing}px;
      pointer-events: auto;
    `;
    const buttons = [{
      id: 'jump',
      label: 'Jump',
      key: 'Space'
    }, {
      id: 'interact',
      label: 'Interact',
      key: 'KeyE'
    }, {
      id: 'crouch',
      label: 'Crouch',
      key: 'KeyC'
    }, {
      id: 'run',
      label: 'Run',
      key: 'ShiftLeft'
    }];
    buttons.forEach(button => {
      const buttonElement = document.createElement('button');
      buttonElement.className = `action-button ${button.id}`;
      buttonElement.textContent = this.settings.mobileControls.showLabels ? button.label : '';
      buttonElement.style.cssText = `
        width: ${this.settings.mobileUI.buttonSize}px;
        height: ${this.settings.mobileUI.buttonSize}px;
        border-radius: 50%;
        background: rgba(255, 255, 255, ${this.settings.mobileUI.buttonOpacity});
        border: 2px solid rgba(0, 0, 0, 0.3);
        color: #000;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
        transition: transform 0.1s ease;
      `;

      // Add touch event handlers
      buttonElement.addEventListener('touchstart', e => {
        e.preventDefault();
        this.handleMobileButtonPress(button.id, button.key, 'down');
        buttonElement.style.transform = `scale(${this.settings.mobileUI.buttonPressScale})`;
      });
      buttonElement.addEventListener('touchend', e => {
        e.preventDefault();
        this.handleMobileButtonPress(button.id, button.key, 'up');
        buttonElement.style.transform = 'scale(1)';
      });
      buttonContainer.appendChild(buttonElement);
      this.mobileUI.actionButtons.set(button.id, buttonElement);
    });
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.appendChild(buttonContainer);
    }
  }

  /**
   * Create menu button
   */
  createMenuButton() {
    const menuButton = document.createElement('button');
    menuButton.className = 'menu-button';
    menuButton.innerHTML = '☰';
    menuButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: ${this.settings.mobileUI.buttonSize}px;
      height: ${this.settings.mobileUI.buttonSize}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, ${this.settings.mobileUI.buttonOpacity});
      border: 2px solid rgba(0, 0, 0, 0.3);
      color: #000;
      font-size: 20px;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
    `;
    menuButton.addEventListener('touchstart', e => {
      e.preventDefault();
      this.handleMobileButtonPress('menu', 'KeyM', 'down');
    });
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.appendChild(menuButton);
    }
  }

  /**
   * Create pause button
   */
  createPauseButton() {
    const pauseButton = document.createElement('button');
    pauseButton.className = 'pause-button';
    pauseButton.innerHTML = '⏸';
    pauseButton.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: ${this.settings.mobileUI.buttonSize}px;
      height: ${this.settings.mobileUI.buttonSize}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, ${this.settings.mobileUI.buttonOpacity});
      border: 2px solid rgba(0, 0, 0, 0.3);
      color: #000;
      font-size: 20px;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
    `;
    pauseButton.addEventListener('touchstart', e => {
      e.preventDefault();
      this.handleMobileButtonPress('pause', 'Escape', 'down');
    });
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.appendChild(pauseButton);
    }
  }

  /**
   * Set up orientation handling
   */
  setupOrientationHandling() {
    const updateOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      this.mobileUI.orientation = isPortrait ? 'portrait' : 'landscape';

      // Adjust mobile controls for orientation
      this.adjustMobileControlsForOrientation();
    };
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);
    updateOrientation();
  }

  /**
   * Adjust mobile controls for orientation
   */
  adjustMobileControlsForOrientation() {
    if (!this.mobileControlsContainer) return;
    if (this.mobileUI.orientation === 'landscape') {
      // Adjust for landscape mode
      this.mobileControlsContainer.style.height = '150px';
    } else {
      // Adjust for portrait mode
      this.mobileControlsContainer.style.height = '200px';
    }
  }

  /**
   * Set up gesture recognition
   */
  setupGestureRecognition() {
    if (!this.settings.gestures.enableSwipe && !this.settings.gestures.enablePinch && !this.settings.gestures.enableRotate) {
      return;
    }

    // This would integrate with a gesture recognition library
    // For now, we'll implement basic gesture detection
    this.setupBasicGestureDetection();
  }

  /**
   * Set up basic gesture detection
   */
  setupBasicGestureDetection() {
    let startTouches = [];
    let startDistance = 0;
    let startAngle = 0;
    const handleTouchStart = e => {
      startTouches = Array.from(e.touches);
      if (startTouches.length === 2) {
        startDistance = this.getDistance(startTouches[0], startTouches[1]);
        startAngle = this.getAngle(startTouches[0], startTouches[1]);
      }
    };
    const handleTouchMove = e => {
      if (e.touches.length === 2 && this.settings.gestures.enablePinch) {
        const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / startDistance;
        if (Math.abs(scale - 1) > this.settings.gestures.pinchThreshold) {
          this.handlePinchGesture(scale);
        }
      }
      if (e.touches.length === 2 && this.settings.gestures.enableRotate) {
        const currentAngle = this.getAngle(e.touches[0], e.touches[1]);
        const rotation = currentAngle - startAngle;
        if (Math.abs(rotation) > this.settings.gestures.rotateThreshold) {
          this.handleRotateGesture(rotation);
        }
      }
    };
    const handleTouchEnd = e => {
      if (e.touches.length === 0 && startTouches.length === 1) {
        // Single touch ended - check for swipe
        this.checkForSwipe(startTouches[0], e.changedTouches[0]);
      }
    };
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });
    document.addEventListener('touchmove', handleTouchMove, {
      passive: true
    });
    document.addEventListener('touchend', handleTouchEnd, {
      passive: true
    });
  }

  /**
   * Handle keyboard down events
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return;
    const key = event.code;
    const keyName = this.getKeyName(key);

    // Update key state
    this.keys.set(key, {
      pressed: true,
      timestamp: Date.now(),
      repeat: this.keys.has(key)
    });

    // Handle accessibility features
    if (this.accessibility.keyboardNavigation) {
      this.handleAccessibilityKeyDown(event);
    }

    // Emit input event
    this.eventBus.emit('input:keyDown', {
      key,
      keyName,
      code: event.code,
      keyCode: event.keyCode,
      repeat: this.keys.get(key).repeat,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });

    // Handle mapped actions
    this.handleMappedAction('keyboard', key, 'down', event);
  }

  /**
   * Handle keyboard up events
   */
  handleKeyUp(event) {
    if (!this.isEnabled) return;
    const key = event.code;
    const keyName = this.getKeyName(key);

    // Update key state
    this.keys.set(key, {
      pressed: false,
      timestamp: Date.now(),
      repeat: false
    });

    // Emit input event
    this.eventBus.emit('input:keyUp', {
      key,
      keyName,
      code: event.code,
      keyCode: event.keyCode,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });

    // Handle mapped actions
    this.handleMappedAction('keyboard', key, 'up', event);
  }

  /**
   * Handle keyboard press events
   */
  handleKeyPress(event) {
    if (!this.isEnabled) return;
    const key = event.key;
    const charCode = event.charCode;

    // Emit input event
    this.eventBus.emit('input:keyPress', {
      key,
      charCode,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });
  }

  /**
   * Handle mouse down events
   */
  handleMouseDown(event) {
    if (!this.isEnabled) return;
    const button = event.button;
    const buttonName = this.getMouseButtonName(button);

    // Update mouse state
    this.mouse.buttons.set(button, {
      pressed: true,
      timestamp: Date.now()
    });

    // Update mouse position
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    // Emit input event
    this.eventBus.emit('input:mouseDown', {
      button,
      buttonName,
      x: event.clientX,
      y: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });

    // Handle mapped actions
    this.handleMappedAction('mouse', button, 'down', event);
  }

  /**
   * Handle mouse up events
   */
  handleMouseUp(event) {
    if (!this.isEnabled) return;
    const button = event.button;
    const buttonName = this.getMouseButtonName(button);

    // Update mouse state
    this.mouse.buttons.set(button, {
      pressed: false,
      timestamp: Date.now()
    });

    // Update mouse position
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    // Emit input event
    this.eventBus.emit('input:mouseUp', {
      button,
      buttonName,
      x: event.clientX,
      y: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });

    // Handle mapped actions
    this.handleMappedAction('mouse', button, 'up', event);
  }

  /**
   * Handle mouse move events
   */
  handleMouseMove(event) {
    if (!this.isEnabled) return;

    // Update mouse position
    const deltaX = event.clientX - this.mouse.x;
    const deltaY = event.clientY - this.mouse.y;
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    // Apply sensitivity
    const sensitivity = this.settings.mouseSensitivity;
    const adjustedDeltaX = deltaX * sensitivity;
    const adjustedDeltaY = this.settings.invertY ? -deltaY * sensitivity : deltaY * sensitivity;

    // Emit input event
    this.eventBus.emit('input:mouseMove', {
      x: event.clientX,
      y: event.clientY,
      deltaX: adjustedDeltaX,
      deltaY: adjustedDeltaY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });
  }

  /**
   * Handle wheel events
   */
  handleWheel(event) {
    if (!this.isEnabled) return;
    const deltaY = event.deltaY;
    const direction = deltaY > 0 ? 'down' : 'up';
    this.mouse.wheel = deltaY;

    // Emit input event
    this.eventBus.emit('input:wheel', {
      deltaY,
      direction,
      x: event.clientX,
      y: event.clientY,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: Date.now()
    });

    // Handle mapped actions
    this.handleMappedAction('mouse', direction, 'wheel', event);
  }

  /**
   * Handle context menu events
   */
  handleContextMenu(event) {
    if (!this.isEnabled) return;

    // Prevent context menu if needed
    if (this.isCaptured) {
      event.preventDefault();
    }

    // Emit input event
    this.eventBus.emit('input:contextMenu', {
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    });
  }

  /**
   * Handle touch start events
   */
  handleTouchStart(event) {
    if (!this.isEnabled || !this.settings.enableTouch) return;

    // Prevent default to avoid mouse events
    event.preventDefault();

    // Update touch state
    for (const touch of event.changedTouches) {
      this.touch.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        pressure: touch.force || 1.0
      });

      // Handle mobile-specific touch events
      if (this.isMobile) {
        this.handleMobileTouchStart(touch, event);
      }
    }

    // Emit input event
    this.eventBus.emit('input:touchStart', {
      touches: Array.from(event.changedTouches).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        pressure: touch.force || 1.0
      })),
      timestamp: Date.now()
    });
  }

  /**
   * Handle touch end events
   */
  handleTouchEnd(event) {
    if (!this.isEnabled || !this.settings.enableTouch) return;

    // Prevent default
    event.preventDefault();

    // Update touch state
    for (const touch of event.changedTouches) {
      // Handle mobile-specific touch events
      if (this.isMobile) {
        this.handleMobileTouchEnd(touch, event);
      }
      this.touch.touches.delete(touch.identifier);
    }

    // Emit input event
    this.eventBus.emit('input:touchEnd', {
      touches: Array.from(event.changedTouches).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY
      })),
      timestamp: Date.now()
    });
  }

  /**
   * Handle touch move events
   */
  handleTouchMove(event) {
    if (!this.isEnabled || !this.settings.enableTouch) return;

    // Prevent default to avoid scrolling
    event.preventDefault();

    // Update touch state
    for (const touch of event.changedTouches) {
      if (this.touch.touches.has(touch.identifier)) {
        const touchData = this.touch.touches.get(touch.identifier);
        touchData.x = touch.clientX;
        touchData.y = touch.clientY;

        // Handle mobile-specific touch events
        if (this.isMobile) {
          this.handleMobileTouchMove(touch, event);
        }
      }
    }

    // Emit input event
    this.eventBus.emit('input:touchMove', {
      touches: Array.from(event.changedTouches).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        pressure: touch.force || 1.0
      })),
      timestamp: Date.now()
    });
  }

  /**
   * Handle touch cancel events
   */
  handleTouchCancel(event) {
    if (!this.isEnabled || !this.settings.enableTouch) return;

    // Update touch state
    for (const touch of event.changedTouches) {
      this.touch.touches.delete(touch.identifier);
    }

    // Emit input event
    this.eventBus.emit('input:touchCancel', {
      touches: Array.from(event.changedTouches).map(touch => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY
      })),
      timestamp: Date.now()
    });
  }

  /**
   * Handle gamepad connected events
   */
  handleGamepadConnected(event) {
    if (!this.settings.enableGamepad) return;
    const gamepad = event.gamepad;
    this.gamepad.controllers.set(gamepad.index, {
      id: gamepad.id,
      index: gamepad.index,
      connected: true,
      buttons: new Map(),
      axes: new Map()
    });
    this.logger.info(`Gamepad connected: ${gamepad.id}`);

    // Emit input event
    this.eventBus.emit('input:gamepadConnected', {
      id: gamepad.id,
      index: gamepad.index,
      timestamp: Date.now()
    });
  }

  /**
   * Handle gamepad disconnected events
   */
  handleGamepadDisconnected(event) {
    const gamepad = event.gamepad;
    this.gamepad.controllers.delete(gamepad.index);
    this.logger.info(`Gamepad disconnected: ${gamepad.id}`);

    // Emit input event
    this.eventBus.emit('input:gamepadDisconnected', {
      id: gamepad.id,
      index: gamepad.index,
      timestamp: Date.now()
    });
  }

  /**
   * Handle focus in events
   */
  handleFocusIn(event) {
    if (!this.accessibility.focusManagement) return;
    const element = event.target;
    const index = this.accessibility.tabOrder.indexOf(element);
    if (index !== -1) {
      this.accessibility.currentFocusIndex = index;
    }

    // Emit input event
    this.eventBus.emit('input:focusIn', {
      element,
      index,
      timestamp: Date.now()
    });
  }

  /**
   * Handle focus out events
   */
  handleFocusOut(event) {
    if (!this.accessibility.focusManagement) return;
    const element = event.target;

    // Emit input event
    this.eventBus.emit('input:focusOut', {
      element,
      timestamp: Date.now()
    });
  }

  /**
   * Handle accessibility key down events
   */
  handleAccessibilityKeyDown(event) {
    const key = event.key;
    switch (key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Enter':
      case ' ':
        this.handleActivation(event);
        break;
      case 'Escape':
        this.handleEscape(event);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleArrowNavigation(event);
        break;
    }
  }

  /**
   * Handle tab navigation
   */
  handleTabNavigation(event) {
    if (this.accessibility.tabOrder.length === 0) return;
    const direction = event.shiftKey ? -1 : 1;
    const newIndex = (this.accessibility.currentFocusIndex + direction + this.accessibility.tabOrder.length) % this.accessibility.tabOrder.length;
    const nextElement = this.accessibility.tabOrder[newIndex];
    if (nextElement) {
      nextElement.focus();
      this.accessibility.currentFocusIndex = newIndex;
    }
  }

  /**
   * Handle activation
   */
  handleActivation(event) {
    const element = document.activeElement;
    if (element && element.click) {
      element.click();
    }
  }

  /**
   * Handle escape key
   */
  handleEscape(event) {
    // Emit escape event for game to handle
    this.eventBus.emit('input:escape', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle arrow navigation
   */
  handleArrowNavigation(event) {
    // Emit arrow navigation event
    this.eventBus.emit('input:arrowNavigation', {
      direction: event.key.replace('Arrow', '').toLowerCase(),
      timestamp: Date.now()
    });
  }

  /**
   * Update gamepad state
   */
  updateGamepadState() {
    if (!this.settings.enableGamepad) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;
      const controller = this.gamepad.controllers.get(i);
      if (!controller) continue;

      // Update button states
      for (let j = 0; j < gamepad.buttons.length; j++) {
        const button = gamepad.buttons[j];
        const wasPressed = controller.buttons.get(j)?.pressed || false;
        const isPressed = button.pressed;
        if (isPressed !== wasPressed) {
          controller.buttons.set(j, {
            pressed: isPressed,
            value: button.value,
            timestamp: Date.now()
          });

          // Emit button event
          this.eventBus.emit('input:gamepadButton', {
            controller: i,
            button: j,
            pressed: isPressed,
            value: button.value,
            timestamp: Date.now()
          });
        }
      }

      // Update axis states
      for (let j = 0; j < gamepad.axes.length; j++) {
        const axis = gamepad.axes[j];
        const previousAxis = controller.axes.get(j) || 0;

        // Apply deadzone
        const deadzone = this.settings.deadzone;
        const adjustedAxis = Math.abs(axis) < deadzone ? 0 : axis;
        if (Math.abs(adjustedAxis - previousAxis) > 0.01) {
          controller.axes.set(j, adjustedAxis);

          // Emit axis event
          this.eventBus.emit('input:gamepadAxis', {
            controller: i,
            axis: j,
            value: adjustedAxis,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Update accessibility features
   */
  updateAccessibilityFeatures() {
    // Update focusable elements if DOM has changed
    this.updateFocusableElements();
    this.updateTabOrder();
  }

  /**
   * Process input events
   */
  processInputEvents() {
    // Process any queued input events
    // This could include input buffering, input prediction, etc.
  }

  /**
   * Handle mapped actions
   */
  handleMappedAction(inputType, input, action, event) {
    let mapping;
    switch (inputType) {
      case 'keyboard':
        mapping = this.keyMappings;
        break;
      case 'mouse':
        mapping = this.mouseMappings;
        break;
      case 'gamepad':
        mapping = this.gamepadMappings;
        break;
      case 'touch':
        mapping = this.touchMappings;
        break;
      default:
        return;
    }

    // Find mapped action
    for (const [actionName, inputs] of mapping) {
      if (inputs.includes(input)) {
        this.eventBus.emit('input:action', {
          action: actionName,
          inputType,
          input,
          state: action,
          event,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Get key name from key code
   */
  getKeyName(keyCode) {
    const keyNames = {
      KeyA: 'A',
      KeyB: 'B',
      KeyC: 'C',
      KeyD: 'D',
      KeyE: 'E',
      KeyF: 'F',
      KeyG: 'G',
      KeyH: 'H',
      KeyI: 'I',
      KeyJ: 'J',
      KeyK: 'K',
      KeyL: 'L',
      KeyM: 'M',
      KeyN: 'N',
      KeyO: 'O',
      KeyP: 'P',
      KeyQ: 'Q',
      KeyR: 'R',
      KeyS: 'S',
      KeyT: 'T',
      KeyU: 'U',
      KeyV: 'V',
      KeyW: 'W',
      KeyX: 'X',
      KeyY: 'Y',
      KeyZ: 'Z',
      Digit0: '0',
      Digit1: '1',
      Digit2: '2',
      Digit3: '3',
      Digit4: '4',
      Digit5: '5',
      Digit6: '6',
      Digit7: '7',
      Digit8: '8',
      Digit9: '9',
      Space: 'Space',
      Enter: 'Enter',
      Escape: 'Escape',
      Backspace: 'Backspace',
      Tab: 'Tab',
      ShiftLeft: 'Left Shift',
      ShiftRight: 'Right Shift',
      ControlLeft: 'Left Ctrl',
      ControlRight: 'Right Ctrl',
      AltLeft: 'Left Alt',
      AltRight: 'Right Alt',
      ArrowUp: 'Up Arrow',
      ArrowDown: 'Down Arrow',
      ArrowLeft: 'Left Arrow',
      ArrowRight: 'Right Arrow'
    };
    return keyNames[keyCode] || keyCode;
  }

  /**
   * Get mouse button name
   */
  getMouseButtonName(button) {
    const buttonNames = {
      0: 'Left',
      1: 'Middle',
      2: 'Right',
      3: 'Back',
      4: 'Forward'
    };
    return buttonNames[button] || `Button ${button}`;
  }

  /**
   * Load settings from config
   */
  loadSettingsFromConfig() {
    if (!this.config) return;
    this.settings = {
      ...this.settings,
      mouseSensitivity: this.config.getConfigValue('input.mouseSensitivity') || this.settings.mouseSensitivity,
      keyboardLayout: this.config.getConfigValue('input.keyboardLayout') || this.settings.keyboardLayout,
      enableMouseLook: this.config.getConfigValue('input.enableMouseLook') ?? this.settings.enableMouseLook,
      enableKeyboardNavigation: this.config.getConfigValue('input.enableKeyboardNavigation') ?? this.settings.enableKeyboardNavigation,
      enableGamepad: this.config.getConfigValue('input.enableGamepad') ?? this.settings.enableGamepad,
      enableTouch: this.config.getConfigValue('input.enableTouch') ?? this.settings.enableTouch,
      invertY: this.config.getConfigValue('input.invertY') ?? this.settings.invertY,
      deadzone: this.config.getConfigValue('input.deadzone') || this.settings.deadzone
    };
  }

  /**
   * Enable input
   */
  enable() {
    this.isEnabled = true;
    this.logger.info('Input enabled');
  }

  /**
   * Disable input
   */
  disable() {
    this.isEnabled = false;
    this.logger.info('Input disabled');
  }

  /**
   * Capture input
   */
  capture() {
    this.isCaptured = true;
    document.body.style.cursor = 'none';
    this.logger.info('Input captured');
  }

  /**
   * Release input
   */
  release() {
    this.isCaptured = false;
    document.body.style.cursor = 'default';
    this.logger.info('Input released');
  }

  /**
   * Get input state
   */
  getInputState() {
    return {
      keyboard: Object.fromEntries(this.keys),
      mouse: this.mouse,
      touch: Object.fromEntries(this.touch.touches),
      gamepad: Object.fromEntries(this.gamepad.controllers),
      accessibility: this.accessibility
    };
  }

  /**
   * Set key mapping
   */
  setKeyMapping(action, keys) {
    this.keyMappings.set(action, keys);
  }

  /**
   * Get key mapping
   */
  getKeyMapping(action) {
    return this.keyMappings.get(action) || [];
  }

  /**
   * Check if key is pressed
   */
  isKeyPressed(key) {
    const keyState = this.keys.get(key);
    return keyState ? keyState.pressed : false;
  }

  /**
   * Check if mouse button is pressed
   */
  isMouseButtonPressed(button) {
    const buttonState = this.mouse.buttons.get(button);
    return buttonState ? buttonState.pressed : false;
  }

  /**
   * Get mouse position
   */
  getMousePosition() {
    return {
      x: this.mouse.x,
      y: this.mouse.y
    };
  }

  /**
   * Get gamepad state
   */
  getGamepadState(index) {
    return this.gamepad.controllers.get(index);
  }

  /**
   * Get all gamepads
   */
  getAllGamepads() {
    return Array.from(this.gamepad.controllers.values());
  }

  /**
   * Handle mobile touch start
   */
  handleMobileTouchStart(touch, event) {
    // Check if touch is on virtual joystick
    if (this.isTouchOnVirtualJoystick(touch)) {
      this.activateVirtualJoystick(touch);
      return;
    }

    // Check if touch is on action buttons
    const button = this.getTouchedButton(touch);
    if (button) {
      this.handleMobileButtonPress(button.id, button.key, 'down');
      return;
    }

    // Handle gesture recognition
    this.handleGestureStart(touch, event);
  }

  /**
   * Handle mobile touch move
   */
  handleMobileTouchMove(touch, event) {
    // Update virtual joystick if active
    if (this.mobileUI.virtualJoystick.active && this.mobileUI.virtualJoystick.touchId === touch.identifier) {
      this.updateVirtualJoystick(touch);
    }

    // Handle gesture recognition
    this.handleGestureMove(touch, event);
  }

  /**
   * Handle mobile touch end
   */
  handleMobileTouchEnd(touch, event) {
    // Deactivate virtual joystick if it was active
    if (this.mobileUI.virtualJoystick.active && this.mobileUI.virtualJoystick.touchId === touch.identifier) {
      this.deactivateVirtualJoystick();
    }

    // Handle gesture recognition
    this.handleGestureEnd(touch, event);
  }

  /**
   * Check if touch is on virtual joystick
   */
  isTouchOnVirtualJoystick(touch) {
    if (!this.mobileUI.virtualJoystick.element) return false;
    const rect = this.mobileUI.virtualJoystick.element.getBoundingClientRect();
    return touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom;
  }

  /**
   * Activate virtual joystick
   */
  activateVirtualJoystick(touch) {
    this.mobileUI.virtualJoystick.active = true;
    this.mobileUI.virtualJoystick.touchId = touch.identifier;
    const rect = this.mobileUI.virtualJoystick.element.getBoundingClientRect();
    this.mobileUI.virtualJoystick.center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    this.logger.info('Virtual joystick activated');
  }

  /**
   * Update virtual joystick
   */
  updateVirtualJoystick(touch) {
    if (!this.mobileUI.virtualJoystick.active) return;
    const center = this.mobileUI.virtualJoystick.center;
    const deltaX = touch.clientX - center.x;
    const deltaY = touch.clientY - center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = this.settings.mobileUI.joystickSize / 2;

    // Clamp to joystick radius
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    // Update knob position
    if (this.mobileUI.virtualJoystick.knob) {
      this.mobileUI.virtualJoystick.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    // Calculate normalized values
    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;

    // Apply deadzone
    const deadzone = this.settings.mobileUI.joystickDeadzone;
    const finalX = Math.abs(normalizedX) < deadzone ? 0 : normalizedX;
    const finalY = Math.abs(normalizedY) < deadzone ? 0 : normalizedY;

    // Emit joystick movement event
    this.eventBus.emit('input:joystickMove', {
      x: finalX,
      y: finalY,
      angle: angle * 180 / Math.PI,
      distance: clampedDistance / maxDistance,
      timestamp: Date.now()
    });

    // Map to keyboard events for compatibility
    this.mapJoystickToKeyboard(finalX, finalY);
  }

  /**
   * Deactivate virtual joystick
   */
  deactivateVirtualJoystick() {
    this.mobileUI.virtualJoystick.active = false;
    this.mobileUI.virtualJoystick.touchId = null;

    // Reset knob position
    if (this.mobileUI.virtualJoystick.knob) {
      this.mobileUI.virtualJoystick.knob.style.transform = 'translate(-50%, -50%)';
    }

    // Emit joystick release event
    this.eventBus.emit('input:joystickRelease', {
      timestamp: Date.now()
    });
    this.logger.info('Virtual joystick deactivated');
  }

  /**
   * Map joystick movement to keyboard events
   */
  mapJoystickToKeyboard(x, y) {
    const threshold = 0.3;

    // Horizontal movement
    if (x > threshold) {
      this.handleMappedAction('keyboard', 'KeyD', 'down', {
        synthetic: true
      });
    } else if (x < -threshold) {
      this.handleMappedAction('keyboard', 'KeyA', 'down', {
        synthetic: true
      });
    }

    // Vertical movement
    if (y > threshold) {
      this.handleMappedAction('keyboard', 'KeyS', 'down', {
        synthetic: true
      });
    } else if (y < -threshold) {
      this.handleMappedAction('keyboard', 'KeyW', 'down', {
        synthetic: true
      });
    }
  }

  /**
   * Get touched button
   */
  getTouchedButton(touch) {
    for (const [id, button] of this.mobileUI.actionButtons) {
      const rect = button.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        return {
          id,
          key: this.getButtonKey(id)
        };
      }
    }
    return null;
  }

  /**
   * Get button key mapping
   */
  getButtonKey(buttonId) {
    const keyMap = {
      jump: 'Space',
      interact: 'KeyE',
      crouch: 'KeyC',
      run: 'ShiftLeft',
      menu: 'KeyM',
      pause: 'Escape'
    };
    return keyMap[buttonId] || null;
  }

  /**
   * Handle mobile button press
   */
  handleMobileButtonPress(buttonId, key, action) {
    // Emit haptic feedback if enabled
    if (this.settings.mobileControls.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Emit input event
    this.eventBus.emit('input:mobileButton', {
      buttonId,
      key,
      action,
      timestamp: Date.now()
    });

    // Map to keyboard event for compatibility
    if (key) {
      this.handleMappedAction('keyboard', key, action, {
        synthetic: true
      });
    }
    this.logger.info(`Mobile button ${action}: ${buttonId}`);
  }

  /**
   * Handle gesture start
   */
  handleGestureStart(touch, event) {
    const currentTime = Date.now();

    // Check for double tap
    if (this.settings.gestures.enableDoubleTap) {
      const timeDiff = currentTime - this.touch.lastTapTime;
      const distance = this.getDistance(touch, this.touch.lastTapPosition);
      if (timeDiff < this.settings.mobileControls.doubleTapDelay && distance < 50) {
        this.handleDoubleTap(touch);
        return;
      }
    }

    // Set up long press timer
    if (this.settings.gestures.enableLongPress) {
      this.touch.longPressTimer = setTimeout(() => {
        this.handleLongPress(touch);
      }, this.settings.mobileControls.longPressDelay);
    }

    // Update last tap info
    this.touch.lastTapTime = currentTime;
    this.touch.lastTapPosition = {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  /**
   * Handle gesture move
   */
  handleGestureMove(touch, event) {
    // Clear long press timer if moving
    if (this.touch.longPressTimer) {
      clearTimeout(this.touch.longPressTimer);
      this.touch.longPressTimer = null;
    }
  }

  /**
   * Handle gesture end
   */
  handleGestureEnd(touch, event) {
    // Clear long press timer
    if (this.touch.longPressTimer) {
      clearTimeout(this.touch.longPressTimer);
      this.touch.longPressTimer = null;
    }

    // Check for swipe
    if (this.settings.gestures.enableSwipe) {
      this.checkForSwipe(touch, touch);
    }
  }

  /**
   * Check for swipe gesture
   */
  checkForSwipe(startTouch, endTouch) {
    const deltaX = endTouch.clientX - startTouch.startX;
    const deltaY = endTouch.clientY - startTouch.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < this.settings.mobileControls.swipeThreshold) {
      return; // Not a swipe
    }
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    let direction = '';
    if (angle > -45 && angle <= 45) {
      direction = 'right';
    } else if (angle > 45 && angle <= 135) {
      direction = 'down';
    } else if (angle > 135 || angle <= -135) {
      direction = 'left';
    } else if (angle > -135 && angle <= -45) {
      direction = 'up';
    }
    if (this.settings.gestures.swipeDirections.includes(direction)) {
      this.handleSwipeGesture(direction, distance);
    }
  }

  /**
   * Handle swipe gesture
   */
  handleSwipeGesture(direction, distance) {
    this.eventBus.emit('input:swipe', {
      direction,
      distance,
      timestamp: Date.now()
    });
    this.logger.info(`Swipe detected: ${direction}`);
  }

  /**
   * Handle pinch gesture
   */
  handlePinchGesture(scale) {
    this.eventBus.emit('input:pinch', {
      scale,
      timestamp: Date.now()
    });
    this.logger.info(`Pinch detected: ${scale.toFixed(2)}`);
  }

  /**
   * Handle rotate gesture
   */
  handleRotateGesture(rotation) {
    this.eventBus.emit('input:rotate', {
      rotation,
      timestamp: Date.now()
    });
    this.logger.info(`Rotate detected: ${rotation.toFixed(2)}°`);
  }

  /**
   * Handle double tap
   */
  handleDoubleTap(touch) {
    this.eventBus.emit('input:doubleTap', {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    });
    this.logger.info('Double tap detected');
  }

  /**
   * Handle long press
   */
  handleLongPress(touch) {
    this.eventBus.emit('input:longPress', {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    });
    this.logger.info('Long press detected');
  }

  /**
   * Get distance between two touch points
   */
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get angle between two touch points
   */
  getAngle(touch1, touch2) {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  }

  /**
   * Update mobile controls visibility
   */
  updateMobileControlsVisibility(visible) {
    this.mobileUI.isVisible = visible;
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Update mobile controls settings
   */
  updateMobileSettings(newSettings) {
    this.settings.mobileControls = {
      ...this.settings.mobileControls,
      ...newSettings
    };
    this.settings.gestures = {
      ...this.settings.gestures,
      ...newSettings.gestures
    };
    this.settings.mobileUI = {
      ...this.settings.mobileUI,
      ...newSettings.mobileUI
    };

    // Recreate mobile UI if needed
    if (this.mobileControlsContainer) {
      this.mobileControlsContainer.remove();
      this.createMobileUI();
    }
    this.logger.info('Mobile settings updated');
  }

  /**
   * Get mobile controls state
   */
  getMobileControlsState() {
    return {
      isMobile: this.isMobile,
      isVisible: this.mobileUI.isVisible,
      orientation: this.mobileUI.orientation,
      virtualJoystick: {
        active: this.mobileUI.virtualJoystick.active,
        position: this.mobileUI.virtualJoystick.position
      },
      settings: {
        mobileControls: this.settings.mobileControls,
        gestures: this.settings.gestures,
        mobileUI: this.settings.mobileUI
      }
    };
  }
}

/**
 * MobileTesting.js - Mobile UX testing and validation utilities
 *
 * This utility provides:
 * - Mobile device detection and testing
 * - Touch gesture validation
 * - Mobile controls testing
 * - Performance testing on mobile devices
 * - Accessibility testing for mobile
 * - Mobile-specific UI validation
 */

class MobileTesting {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.inputManager = dependencies.inputManager;
    this.performanceMonitor = dependencies.performanceMonitor;

    // Test configuration
    this.config = {
      enableAutoTesting: true,
      testInterval: 5000,
      gestureTestTimeout: 2000,
      performanceTestDuration: 10000,
      enableAccessibilityTesting: true,
      enablePerformanceTesting: true,
      enableGestureTesting: true,
      enableControlTesting: true,
      ...dependencies.config
    };

    // Test state
    this.isTesting = false;
    this.testResults = {
      device: null,
      gestures: new Map(),
      controls: new Map(),
      performance: null,
      accessibility: null,
      overall: null
    };

    // Test listeners
    this.testListeners = new Map();
    this.logger.info('MobileTesting initialized');
  }

  /**
   * Initialize the testing utility
   */
  async initialize() {
    this.logger.info('Initializing MobileTesting...');

    // Detect mobile device
    this.detectMobileDevice();

    // Set up test listeners
    this.setupTestListeners();

    // Start auto-testing if enabled
    if (this.config.enableAutoTesting) {
      this.startAutoTesting();
    }
    this.logger.info('MobileTesting initialized successfully');
  }

  /**
   * Cleanup the testing utility
   */
  cleanup() {
    this.logger.info('Cleaning up MobileTesting...');

    // Stop auto-testing
    this.stopAutoTesting();

    // Remove test listeners
    this.removeTestListeners();
    this.logger.info('MobileTesting cleaned up');
  }

  /**
   * Detect mobile device and capabilities
   */
  detectMobileDevice() {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isTablet = /iPad|Android/i.test(userAgent) && 'ontouchstart' in window;
    this.testResults.device = {
      isMobile,
      isTouch,
      isTablet,
      userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hasVibration: 'vibrate' in navigator,
      hasHaptics: 'vibrate' in navigator,
      hasGeolocation: 'geolocation' in navigator,
      hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      hasAccelerometer: 'DeviceMotionEvent' in window,
      hasGyroscope: 'DeviceOrientationEvent' in window
    };
    this.logger.info('Mobile device detected:', this.testResults.device);
  }

  /**
   * Set up test listeners
   */
  setupTestListeners() {
    // Gesture test listeners
    if (this.config.enableGestureTesting) {
      this.setupGestureTestListeners();
    }

    // Control test listeners
    if (this.config.enableControlTesting) {
      this.setupControlTestListeners();
    }

    // Performance test listeners
    if (this.config.enablePerformanceTesting) {
      this.setupPerformanceTestListeners();
    }

    // Accessibility test listeners
    if (this.config.enableAccessibilityTesting) {
      this.setupAccessibilityTestListeners();
    }
  }

  /**
   * Set up gesture test listeners
   */
  setupGestureTestListeners() {
    const gestureTests = [{
      name: 'tap',
      test: this.testTapGesture.bind(this)
    }, {
      name: 'doubleTap',
      test: this.testDoubleTapGesture.bind(this)
    }, {
      name: 'longPress',
      test: this.testLongPressGesture.bind(this)
    }, {
      name: 'swipe',
      test: this.testSwipeGesture.bind(this)
    }, {
      name: 'pinch',
      test: this.testPinchGesture.bind(this)
    }, {
      name: 'rotate',
      test: this.testRotateGesture.bind(this)
    }];
    gestureTests.forEach(({
      name,
      test
    }) => {
      this.testListeners.set(`gesture:${name}`, test);
    });
  }

  /**
   * Set up control test listeners
   */
  setupControlTestListeners() {
    const controlTests = [{
      name: 'virtualJoystick',
      test: this.testVirtualJoystick.bind(this)
    }, {
      name: 'actionButtons',
      test: this.testActionButtons.bind(this)
    }, {
      name: 'menuButton',
      test: this.testMenuButton.bind(this)
    }, {
      name: 'pauseButton',
      test: this.testPauseButton.bind(this)
    }];
    controlTests.forEach(({
      name,
      test
    }) => {
      this.testListeners.set(`control:${name}`, test);
    });
  }

  /**
   * Set up performance test listeners
   */
  setupPerformanceTestListeners() {
    this.testListeners.set('performance:test', this.testPerformance.bind(this));
  }

  /**
   * Set up accessibility test listeners
   */
  setupAccessibilityTestListeners() {
    this.testListeners.set('accessibility:test', this.testAccessibility.bind(this));
  }

  /**
   * Remove test listeners
   */
  removeTestListeners() {
    this.testListeners.clear();
  }

  /**
   * Start auto-testing
   */
  startAutoTesting() {
    if (this.isTesting) return;
    this.isTesting = true;
    this.autoTestInterval = setInterval(() => {
      this.runAllTests();
    }, this.config.testInterval);
    this.logger.info('Auto-testing started');
  }

  /**
   * Stop auto-testing
   */
  stopAutoTesting() {
    if (!this.isTesting) return;
    this.isTesting = false;
    if (this.autoTestInterval) {
      clearInterval(this.autoTestInterval);
      this.autoTestInterval = null;
    }
    this.logger.info('Auto-testing stopped');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.logger.info('Running mobile tests...');
    try {
      // Test gestures
      if (this.config.enableGestureTesting) {
        await this.testAllGestures();
      }

      // Test controls
      if (this.config.enableControlTesting) {
        await this.testAllControls();
      }

      // Test performance
      if (this.config.enablePerformanceTesting) {
        await this.testPerformance();
      }

      // Test accessibility
      if (this.config.enableAccessibilityTesting) {
        await this.testAccessibility();
      }

      // Calculate overall score
      this.calculateOverallScore();

      // Emit test results
      this.eventBus.emit('mobileTesting:results', this.testResults);
      this.logger.info('Mobile tests completed');
    } catch (error) {
      this.logger.error('Error running mobile tests:', error);
    }
  }

  /**
   * Test all gestures
   */
  async testAllGestures() {
    const gestureNames = ['tap', 'doubleTap', 'longPress', 'swipe', 'pinch', 'rotate'];
    for (const gestureName of gestureNames) {
      try {
        const result = await this.testGesture(gestureName);
        this.testResults.gestures.set(gestureName, result);
      } catch (error) {
        this.logger.error(`Error testing gesture ${gestureName}:`, error);
        this.testResults.gestures.set(gestureName, {
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Test a specific gesture
   */
  async testGesture(gestureName) {
    const testFunction = this.testListeners.get(`gesture:${gestureName}`);
    if (!testFunction) {
      throw new Error(`No test function found for gesture: ${gestureName}`);
    }
    return await testFunction();
  }

  /**
   * Test tap gesture
   */
  async testTapGesture() {
    return new Promise(resolve => {
      let tapDetected = false;
      let startTime = Date.now();
      const handleTap = () => {
        tapDetected = true;
        const responseTime = Date.now() - startTime;
        document.removeEventListener('touchstart', handleTap);
        resolve({
          success: true,
          responseTime,
          timestamp: Date.now()
        });
      };
      document.addEventListener('touchstart', handleTap, {
        once: true
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        if (!tapDetected) {
          document.removeEventListener('touchstart', handleTap);
          resolve({
            success: false,
            error: 'Timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test double tap gesture
   */
  async testDoubleTapGesture() {
    return new Promise(resolve => {
      let tapCount = 0;
      let lastTapTime = 0;
      const handleTap = () => {
        const currentTime = Date.now();
        tapCount++;
        if (tapCount === 1) {
          lastTapTime = currentTime;
        } else if (tapCount === 2) {
          const timeDiff = currentTime - lastTapTime;
          const success = timeDiff < 500; // Double tap within 500ms

          document.removeEventListener('touchstart', handleTap);
          resolve({
            success,
            timeDiff,
            timestamp: Date.now()
          });
        }
      };
      document.addEventListener('touchstart', handleTap);

      // Timeout after 2 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTap);
        resolve({
          success: false,
          error: 'Timeout',
          timestamp: Date.now()
        });
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test long press gesture
   */
  async testLongPressGesture() {
    return new Promise(resolve => {
      let longPressDetected = false;
      let startTime = Date.now();
      const handleTouchStart = () => {
        startTime = Date.now();
      };
      const handleTouchEnd = () => {
        const duration = Date.now() - startTime;
        const success = duration >= 500; // Long press >= 500ms

        if (success) {
          longPressDetected = true;
          resolve({
            success: true,
            duration,
            timestamp: Date.now()
          });
        }
      };
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);

      // Timeout after 2 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        if (!longPressDetected) {
          resolve({
            success: false,
            error: 'Timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test swipe gesture
   */
  async testSwipeGesture() {
    return new Promise(resolve => {
      let swipeDetected = false;
      let startTouch = null;
      const handleTouchStart = e => {
        startTouch = e.touches[0];
      };
      const handleTouchEnd = e => {
        if (!startTouch) return;
        const endTouch = e.changedTouches[0];
        const deltaX = endTouch.clientX - startTouch.clientX;
        const deltaY = endTouch.clientY - startTouch.clientY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const success = distance >= 50; // Swipe distance >= 50px

        if (success) {
          swipeDetected = true;
          resolve({
            success: true,
            distance,
            direction: Math.atan2(deltaY, deltaX) * 180 / Math.PI,
            timestamp: Date.now()
          });
        }
      };
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);

      // Timeout after 2 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        if (!swipeDetected) {
          resolve({
            success: false,
            error: 'Timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test pinch gesture
   */
  async testPinchGesture() {
    return new Promise(resolve => {
      let pinchDetected = false;
      let startTouches = [];
      const handleTouchStart = e => {
        if (e.touches.length === 2) {
          startTouches = Array.from(e.touches);
        }
      };
      const handleTouchMove = e => {
        if (e.touches.length === 2 && startTouches.length === 2) {
          const currentTouches = Array.from(e.touches);
          const startDistance = this.getDistance(startTouches[0], startTouches[1]);
          const currentDistance = this.getDistance(currentTouches[0], currentTouches[1]);
          const scale = currentDistance / startDistance;
          if (Math.abs(scale - 1) > 0.1) {
            // Pinch threshold
            pinchDetected = true;
            resolve({
              success: true,
              scale,
              timestamp: Date.now()
            });
          }
        }
      };
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);

      // Timeout after 2 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        if (!pinchDetected) {
          resolve({
            success: false,
            error: 'Timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test rotate gesture
   */
  async testRotateGesture() {
    return new Promise(resolve => {
      let rotateDetected = false;
      let startTouches = [];
      const handleTouchStart = e => {
        if (e.touches.length === 2) {
          startTouches = Array.from(e.touches);
        }
      };
      const handleTouchMove = e => {
        if (e.touches.length === 2 && startTouches.length === 2) {
          const currentTouches = Array.from(e.touches);
          const startAngle = this.getAngle(startTouches[0], startTouches[1]);
          const currentAngle = this.getAngle(currentTouches[0], currentTouches[1]);
          const rotation = currentAngle - startAngle;
          if (Math.abs(rotation) > 0.1) {
            // Rotation threshold
            rotateDetected = true;
            resolve({
              success: true,
              rotation: rotation * 180 / Math.PI,
              timestamp: Date.now()
            });
          }
        }
      };
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);

      // Timeout after 2 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        if (!rotateDetected) {
          resolve({
            success: false,
            error: 'Timeout',
            timestamp: Date.now()
          });
        }
      }, this.config.gestureTestTimeout);
    });
  }

  /**
   * Test all controls
   */
  async testAllControls() {
    const controlNames = ['virtualJoystick', 'actionButtons', 'menuButton', 'pauseButton'];
    for (const controlName of controlNames) {
      try {
        const result = await this.testControl(controlName);
        this.testResults.controls.set(controlName, result);
      } catch (error) {
        this.logger.error(`Error testing control ${controlName}:`, error);
        this.testResults.controls.set(controlName, {
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Test a specific control
   */
  async testControl(controlName) {
    const testFunction = this.testListeners.get(`control:${controlName}`);
    if (!testFunction) {
      throw new Error(`No test function found for control: ${controlName}`);
    }
    return await testFunction();
  }

  /**
   * Test virtual joystick
   */
  async testVirtualJoystick() {
    if (!this.inputManager || !this.inputManager.mobileUI.virtualJoystick.element) {
      return {
        success: false,
        error: 'Virtual joystick not available',
        timestamp: Date.now()
      };
    }
    const joystick = this.inputManager.mobileUI.virtualJoystick;
    const rect = joystick.element.getBoundingClientRect();
    return {
      success: true,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      active: joystick.active,
      timestamp: Date.now()
    };
  }

  /**
   * Test action buttons
   */
  async testActionButtons() {
    if (!this.inputManager || !this.inputManager.mobileUI.actionButtons) {
      return {
        success: false,
        error: 'Action buttons not available',
        timestamp: Date.now()
      };
    }
    const buttons = Array.from(this.inputManager.mobileUI.actionButtons.entries()).map(([id, button]) => {
      const rect = button.getBoundingClientRect();
      return {
        id,
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        visible: button.offsetParent !== null
      };
    });
    return {
      success: true,
      buttons,
      count: buttons.length,
      timestamp: Date.now()
    };
  }

  /**
   * Test menu button
   */
  async testMenuButton() {
    const menuButton = document.querySelector('.menu-button');
    if (!menuButton) {
      return {
        success: false,
        error: 'Menu button not found',
        timestamp: Date.now()
      };
    }
    const rect = menuButton.getBoundingClientRect();
    return {
      success: true,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      visible: menuButton.offsetParent !== null,
      timestamp: Date.now()
    };
  }

  /**
   * Test pause button
   */
  async testPauseButton() {
    const pauseButton = document.querySelector('.pause-button');
    if (!pauseButton) {
      return {
        success: false,
        error: 'Pause button not found',
        timestamp: Date.now()
      };
    }
    const rect = pauseButton.getBoundingClientRect();
    return {
      success: true,
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      visible: pauseButton.offsetParent !== null,
      timestamp: Date.now()
    };
  }

  /**
   * Test performance
   */
  async testPerformance() {
    if (!this.performanceMonitor) {
      return {
        success: false,
        error: 'Performance monitor not available',
        timestamp: Date.now()
      };
    }
    const metrics = this.performanceMonitor.getMetrics();
    const score = this.performanceMonitor.getPerformanceScore();
    this.testResults.performance = {
      success: true,
      score,
      metrics: {
        fps: metrics.fps.current,
        frameTime: metrics.frameTime.current,
        memory: metrics.memory.used,
        audio: metrics.audio.contextState
      },
      timestamp: Date.now()
    };
    return this.testResults.performance;
  }

  /**
   * Test accessibility
   */
  async testAccessibility() {
    const accessibilityTests = [this.testScreenReaderSupport(), this.testKeyboardNavigation(), this.testHighContrast(), this.testTextScaling()];
    const results = await Promise.all(accessibilityTests);
    this.testResults.accessibility = {
      success: true,
      tests: results,
      overallScore: results.reduce((sum, test) => sum + (test.success ? 1 : 0), 0) / results.length,
      timestamp: Date.now()
    };
    return this.testResults.accessibility;
  }

  /**
   * Test screen reader support
   */
  async testScreenReaderSupport() {
    const hasScreenReader = 'speechSynthesis' in window;
    const hasAriaSupport = document.querySelector('[aria-label]') !== null;
    return {
      name: 'screenReader',
      success: hasScreenReader && hasAriaSupport,
      details: {
        hasScreenReader,
        hasAriaSupport
      }
    };
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return {
      name: 'keyboardNavigation',
      success: focusableElements.length > 0,
      details: {
        focusableElements: focusableElements.length
      }
    };
  }

  /**
   * Test high contrast
   */
  async testHighContrast() {
    const hasHighContrast = document.documentElement.classList.contains('high-contrast');
    return {
      name: 'highContrast',
      success: true,
      // Always available
      details: {
        enabled: hasHighContrast
      }
    };
  }

  /**
   * Test text scaling
   */
  async testTextScaling() {
    const textScale = getComputedStyle(document.documentElement).getPropertyValue('--text-scale') || '1';
    return {
      name: 'textScaling',
      success: true,
      // Always available
      details: {
        scale: parseFloat(textScale)
      }
    };
  }

  /**
   * Calculate overall score
   */
  calculateOverallScore() {
    let totalScore = 0;
    let testCount = 0;

    // Device score (always 1 if mobile detected)
    if (this.testResults.device?.isMobile) {
      totalScore += 1;
      testCount += 1;
    }

    // Gesture scores
    for (const [name, result] of this.testResults.gestures) {
      totalScore += result.success ? 1 : 0;
      testCount += 1;
    }

    // Control scores
    for (const [name, result] of this.testResults.controls) {
      totalScore += result.success ? 1 : 0;
      testCount += 1;
    }

    // Performance score
    if (this.testResults.performance) {
      totalScore += this.testResults.performance.score / 100;
      testCount += 1;
    }

    // Accessibility score
    if (this.testResults.accessibility) {
      totalScore += this.testResults.accessibility.overallScore;
      testCount += 1;
    }
    this.testResults.overall = {
      score: testCount > 0 ? totalScore / testCount : 0,
      totalTests: testCount,
      passedTests: Math.round(totalScore),
      timestamp: Date.now()
    };
  }

  /**
   * Get distance between two touch points
   */
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get angle between two touch points
   */
  getAngle(touch1, touch2) {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Get test report
   */
  getTestReport() {
    return {
      device: this.testResults.device,
      gestures: Object.fromEntries(this.testResults.gestures),
      controls: Object.fromEntries(this.testResults.controls),
      performance: this.testResults.performance,
      accessibility: this.testResults.accessibility,
      overall: this.testResults.overall,
      timestamp: Date.now()
    };
  }

  /**
   * Export test results
   */
  exportTestResults() {
    return JSON.stringify(this.getTestReport(), null, 2);
  }

  /**
   * Update test configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}

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

class GameRefactored {
  constructor(config = {}) {
    // Validate and normalize config
    this.config = this.validateConfig({
      debug: false,
      enableAchievements: true,
      enableDailyChallenges: true,
      enableAccessibility: true,
      ...config
    });

    // Assert config validation
    if (typeof this.config.debug !== 'boolean') {
      throw new Error('GameRefactored: config.debug must be a boolean');
    }
    if (typeof this.config.enableAchievements !== 'boolean') {
      throw new Error('GameRefactored: config.enableAchievements must be a boolean');
    }
    if (typeof this.config.enableDailyChallenges !== 'boolean') {
      throw new Error('GameRefactored: config.enableDailyChallenges must be a boolean');
    }
    if (typeof this.config.enableAccessibility !== 'boolean') {
      throw new Error('GameRefactored: config.enableAccessibility must be a boolean');
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
      activePowerUps: new Map() // Track active power-ups
    };

    // Assert game state structure
    if (typeof this.gameState.isRunning !== 'boolean') {
      throw new Error('GameRefactored: gameState.isRunning must be a boolean');
    }
    if (typeof this.gameState.currentLevel !== 'number' || this.gameState.currentLevel < 1) {
      throw new Error('GameRefactored: gameState.currentLevel must be a positive number');
    }
    if (typeof this.gameState.score !== 'number' || this.gameState.score < 0) {
      throw new Error('GameRefactored: gameState.score must be a non-negative number');
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
      config: this.config
    });

    // Input management
    this.inputManager = new InputManager({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });

    // Mobile testing
    this.mobileTesting = new MobileTesting({
      eventBus: this.eventBus,
      logger: this.logger,
      inputManager: this.inputManager,
      performanceMonitor: this.performanceMonitor,
      config: this.config
    });

    // Assert managers were initialized
    if (!this.managers.game) {
      throw new Error('GameRefactored: GameManager initialization failed');
    }
    if (this.config.enableAchievements && !this.managers.achievements) {
      throw new Error('GameRefactored: AchievementManager initialization failed when enabled');
    }
    if (this.config.enableDailyChallenges && !this.managers.dailyChallenges) {
      throw new Error('GameRefactored: DailyChallengeManager initialization failed when enabled');
    }
    if (this.config.enableAccessibility && !this.managers.accessibility) {
      throw new Error('GameRefactored: AccessibilityManager initialization failed when enabled');
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
    const validatedConfig = {
      ...config
    };

    // Normalize boolean values
    validatedConfig.debug = Boolean(validatedConfig.debug);
    validatedConfig.enableAchievements = Boolean(validatedConfig.enableAchievements);
    validatedConfig.enableDailyChallenges = Boolean(validatedConfig.enableDailyChallenges);
    validatedConfig.enableAccessibility = Boolean(validatedConfig.enableAccessibility);
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
      config: this.config
    });

    // Cross-cutting feature managers
    if (this.config.enableAchievements) {
      this.managers.achievements = new AchievementManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState
      });
    }
    if (this.config.enableDailyChallenges) {
      this.managers.dailyChallenges = new DailyChallengeManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState
      });
    }
    if (this.config.enableAccessibility) {
      this.managers.accessibility = new AccessibilityManager({
        eventBus: this.eventBus,
        logger: this.logger,
        gameState: () => this.gameState
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
    this.eventBus.on('player:scoreChanged', data => {
      if (this.managers.achievements) {
        this.managers.achievements.checkScoreAchievements(data.score);
      }
    });
    this.eventBus.on('player:levelCompleted', data => {
      if (this.managers.achievements) {
        this.managers.achievements.checkLevelAchievements(data.level);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkLevelChallenge(data.level);
      }
    });
    this.eventBus.on('player:itemCollected', data => {
      if (this.managers.achievements) {
        this.managers.achievements.checkCollectionAchievements(data.itemType);
      }
      if (this.managers.dailyChallenges) {
        this.managers.dailyChallenges.checkCollectionChallenge(data.itemType);
      }
    });

    // Accessibility events
    this.eventBus.on('game:stateChanged', data => {
      if (this.managers.accessibility) {
        this.managers.accessibility.announceStateChange(data);
      }
    });

    // Achievement events that affect gameplay
    this.eventBus.on('achievement:unlocked', data => {
      this.logger.info(`Achievement unlocked: ${data.name}`);
      if (this.managers.game) {
        this.managers.game.handleAchievementUnlock(data);
      }
    });

    // Daily challenge events
    this.eventBus.on('dailyChallenge:completed', data => {
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
        config: this.config
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
        pauseTime: this.gameState.startTime
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
        timestamp: Date.now()
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
      finalLevel: this.gameState.currentLevel
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
    this.gameState.gameObjects.forEach(obj => {
      if (obj.update) {
        obj.update(deltaTime);
      }
    });

    // Remove destroyed objects
    this.gameState.gameObjects = this.gameState.gameObjects.filter(obj => !obj.destroyed);
  }

  /**
   * Render the game
   */
  render() {
    // This would typically be handled by a rendering system
    // For now, we'll emit render events for managers to handle
    this.eventBus.emit('game:render', {
      gameState: this.gameState,
      timestamp: performance.now()
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
      timestamp: Date.now()
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
      timestamp: Date.now()
    });
  }

  /**
   * Remove a game object from the game
   */
  removeGameObject(gameObjectId) {
    const index = this.gameState.gameObjects.findIndex(obj => obj.id === gameObjectId);
    if (index !== -1) {
      const removedObject = this.gameState.gameObjects.splice(index, 1)[0];
      this.eventBus.emit('game:objectRemoved', {
        object: removedObject,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get current game state (for external access)
   */
  getGameState() {
    return {
      ...this.gameState
    };
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
    return this.performanceMonitor ? this.performanceMonitor.getPerformanceReport() : null;
  }

  /**
   * Get mobile controls state
   */
  getMobileControlsState() {
    return this.inputManager ? this.inputManager.getMobileControlsState() : null;
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
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Notify managers of config changes
    this.eventBus.emit('game:configChanged', {
      config: this.config,
      timestamp: Date.now()
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

export { GameRefactored, GameRefactored as default };
//# sourceMappingURL=game.js.map
