/**
 * DailyChallengeManager.js - Daily challenge system with gameplay integration
 *
 * This manager handles:
 * - Daily challenge generation and rotation
 * - Challenge progress tracking
 * - Challenge completion rewards
 * - Integration with gameplay events
 */

export class DailyChallengeManager {
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
      score: [
        {
          name: 'Score Hunter',
          description: 'Score {target} points in a single game',
          type: 'score',
          difficulty: 'easy',
          target: 1000,
          reward: { score: 200, coins: 10 },
        },
        {
          name: 'Score Master',
          description: 'Score {target} points in a single game',
          type: 'score',
          difficulty: 'medium',
          target: 5000,
          reward: { score: 500, coins: 25 },
        },
        {
          name: 'Score Legend',
          description: 'Score {target} points in a single game',
          type: 'score',
          difficulty: 'hard',
          target: 15000,
          reward: { score: 1000, coins: 50 },
        },
      ],
      level: [
        {
          name: 'Level Climber',
          description: 'Reach level {target}',
          type: 'level',
          difficulty: 'easy',
          target: 3,
          reward: { score: 300, coins: 15 },
        },
        {
          name: 'Level Master',
          description: 'Reach level {target}',
          type: 'level',
          difficulty: 'medium',
          target: 7,
          reward: { score: 750, coins: 35 },
        },
        {
          name: 'Level Legend',
          description: 'Reach level {target}',
          type: 'level',
          difficulty: 'hard',
          target: 10,
          reward: { score: 1500, coins: 75 },
        },
      ],
      collection: [
        {
          name: 'Item Collector',
          description: 'Collect {target} items in a single game',
          type: 'collection',
          difficulty: 'easy',
          target: 10,
          reward: { score: 150, coins: 8 },
        },
        {
          name: 'Item Hoarder',
          description: 'Collect {target} items in a single game',
          type: 'collection',
          difficulty: 'medium',
          target: 25,
          reward: { score: 400, coins: 20 },
        },
        {
          name: 'Item Master',
          description: 'Collect {target} items in a single game',
          type: 'collection',
          difficulty: 'hard',
          target: 50,
          reward: { score: 800, coins: 40 },
        },
      ],
      combo: [
        {
          name: 'Combo Starter',
          description: 'Achieve a {target}x combo',
          type: 'combo',
          difficulty: 'easy',
          target: 5,
          reward: { score: 100, coins: 5 },
        },
        {
          name: 'Combo Master',
          description: 'Achieve a {target}x combo',
          type: 'combo',
          difficulty: 'medium',
          target: 15,
          reward: { score: 300, coins: 15 },
        },
        {
          name: 'Combo Legend',
          description: 'Achieve a {target}x combo',
          type: 'combo',
          difficulty: 'hard',
          target: 30,
          reward: { score: 600, coins: 30 },
        },
      ],
      time: [
        {
          name: 'Speed Runner',
          description: 'Complete a level in under {target} seconds',
          type: 'time',
          difficulty: 'easy',
          target: 60,
          reward: { score: 200, coins: 10 },
        },
        {
          name: 'Speed Master',
          description: 'Complete a level in under {target} seconds',
          type: 'time',
          difficulty: 'medium',
          target: 30,
          reward: { score: 500, coins: 25 },
        },
        {
          name: 'Speed Legend',
          description: 'Complete a level in under {target} seconds',
          type: 'time',
          difficulty: 'hard',
          target: 15,
          reward: { score: 1000, coins: 50 },
        },
      ],
      survival: [
        {
          name: 'Survivor',
          description: 'Complete {target} levels without dying',
          type: 'survival',
          difficulty: 'easy',
          target: 3,
          reward: { score: 400, coins: 20 },
        },
        {
          name: 'Survival Master',
          description: 'Complete {target} levels without dying',
          type: 'survival',
          difficulty: 'medium',
          target: 7,
          reward: { score: 1000, coins: 50 },
        },
        {
          name: 'Survival Legend',
          description: 'Complete {target} levels without dying',
          type: 'survival',
          difficulty: 'hard',
          target: 10,
          reward: { score: 2000, coins: 100 },
        },
      ],
    };
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Score events
    this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));

    // Level events
    this.eventBus.on(
      'player:levelCompleted',
      this.handleLevelCompleted.bind(this)
    );

    // Collection events
    this.eventBus.on(
      'player:itemCollected',
      this.handleItemCollected.bind(this)
    );

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
    this.eventBus.removeListener(
      'player:scoreChanged',
      this.handleScoreChange.bind(this)
    );
    this.eventBus.removeListener(
      'player:levelCompleted',
      this.handleLevelCompleted.bind(this)
    );
    this.eventBus.removeListener(
      'player:itemCollected',
      this.handleItemCollected.bind(this)
    );
    this.eventBus.removeListener(
      'player:comboChanged',
      this.handleComboChanged.bind(this)
    );
    this.eventBus.removeListener(
      'game:started',
      this.handleGameStarted.bind(this)
    );
    this.eventBus.removeListener(
      'level:completed',
      this.handleLevelCompleted.bind(this)
    );
    this.eventBus.removeListener(
      'player:damaged',
      this.handlePlayerDamaged.bind(this)
    );
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
    this.logger.info(
      `Generated ${this.activeChallenges.length} daily challenges for ${today}`
    );

    // Emit challenges generated event
    this.eventBus.emit('dailyChallenges:generated', {
      challenges: this.activeChallenges,
      date: today,
      timestamp: Date.now(),
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
      createdAt: Date.now(),
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
      timestamp: Date.now(),
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
        challengeId: challenge.id,
      });
    }

    // Coins reward
    if (reward.coins) {
      this.eventBus.emit('player:coinsChanged', {
        coinsChange: reward.coins,
        source: 'dailyChallenge',
        challengeId: challenge.id,
      });
    }

    // Special effects
    if (reward.effects) {
      this.eventBus.emit('game:challengeEffect', {
        effects: reward.effects,
        challengeId: challenge.id,
      });
    }
  }

  /**
   * Get active challenges
   */
  getActiveChallenges() {
    return this.activeChallenges.filter((c) => !c.completed);
  }

  /**
   * Get completed challenges
   */
  getCompletedChallenges() {
    return this.activeChallenges.filter((c) => c.completed);
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
      percentage: Math.min((challenge.progress / challenge.target) * 100, 100),
      completed: challenge.completed,
      difficulty: challenge.difficulty,
      reward: challenge.reward,
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
          data.completed.forEach((id) => {
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
        progress: Object.fromEntries(this.challengeProgress),
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

export default DailyChallengeManager;
