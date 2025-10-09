/**
 * EndlessModeScene.js - Endless Mode Game Scene with explicit lifecycle and dependency injection
 *
 * This scene handles:
 * - Endless gameplay mode
 * - Progressive difficulty scaling
 * - Wave management
 * - Score tracking
 * - Survival mechanics
 */

export class EndlessModeScene {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;
    this.gameManager = dependencies.gameManager;
    this.inputManager = dependencies.inputManager;
    this.renderer = dependencies.renderer;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('EndlessModeScene requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('EndlessModeScene requires logger dependency');
    }

    // Scene state
    this.state = {
      isActive: false,
      isPaused: false,
      isVisible: true,
      sceneId: 'endless',
      currentWave: 1,
      difficulty: 1.0,
      score: 0,
      highScore: 0,
      survivalTime: 0,
      startTime: null,
      lastUpdateTime: null,
      lastWaveTime: 0,
      waveInterval: 30000, // 30 seconds
      enemiesSpawned: 0,
      enemiesKilled: 0,
      itemsCollected: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1.0,
      gameObjects: new Map(),
      enemies: new Map(),
      items: new Map(),
      effects: new Map(),
      powerUps: new Map(),
      background: null,
      camera: null,
      ui: null
    };

    // Endless mode configuration
    this.endlessConfig = {
      maxWaves: 999,
      difficultyIncrease: 0.1,
      waveIntervalDecrease: 1000, // 1 second per wave
      minWaveInterval: 5000, // 5 seconds minimum
      maxEnemiesPerWave: 20,
      enemySpawnRate: 1000, // 1 second
      itemSpawnRate: 0.1, // 10% chance per enemy kill
      powerUpSpawnRate: 0.05, // 5% chance per enemy kill
      comboDecayTime: 5000, // 5 seconds
      scoreMultiplier: 100,
      survivalBonus: 10 // points per second
    };

    // Wave patterns
    this.wavePatterns = [
      { name: 'Basic', enemies: ['basic_enemy'], count: 5, interval: 2000 },
      { name: 'Rush', enemies: ['basic_enemy'], count: 10, interval: 1000 },
      { name: 'Mixed', enemies: ['basic_enemy', 'fast_enemy'], count: 8, interval: 1500 },
      { name: 'Heavy', enemies: ['heavy_enemy'], count: 3, interval: 3000 },
      { name: 'Boss', enemies: ['boss_enemy'], count: 1, interval: 0 }
    ];

    // Enemy types
    this.enemyTypes = {
      basic_enemy: {
        health: 50,
        damage: 10,
        speed: 1.0,
        score: 100,
        size: 32
      },
      fast_enemy: {
        health: 30,
        damage: 15,
        speed: 2.0,
        score: 150,
        size: 24
      },
      heavy_enemy: {
        health: 200,
        damage: 25,
        speed: 0.5,
        score: 500,
        size: 64
      },
      boss_enemy: {
        health: 1000,
        damage: 50,
        speed: 0.3,
        score: 2000,
        size: 128
      }
    };

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('EndlessModeScene initialized');
  }

  /**
   * Initialize the scene
   */
  async initialize() {
    this.logger.info('Initializing EndlessModeScene...');

    // Initialize scene systems
    await this.initializeSystems();

    // Initialize scene objects
    await this.initializeSceneObjects();

    // Initialize UI
    await this.initializeUI();

    // Initialize camera
    await this.initializeCamera();

    // Load high score
    this.loadHighScore();

    this.logger.info('EndlessModeScene initialized successfully');
  }

  /**
   * Cleanup the scene
   */
  cleanup() {
    this.logger.info('Cleaning up EndlessModeScene...');

    // Save high score
    this.saveHighScore();

    // Cleanup systems
    this.cleanupSystems();

    // Cleanup objects
    this.cleanupObjects();

    // Remove event listeners
    this.removeEventHandlers();

    this.logger.info('EndlessModeScene cleaned up');
  }

  /**
   * Update the scene
   */
  update(deltaTime, gameState) {
    if (!this.state.isActive || this.state.isPaused) {
      return;
    }

    // Update survival time
    this.state.survivalTime += deltaTime;

    // Update score with survival bonus
    this.updateSurvivalScore(deltaTime);

    // Update combo decay
    this.updateComboDecay(deltaTime);

    // Update wave management
    this.updateWaveManagement(deltaTime);

    // Update enemy spawning
    this.updateEnemySpawning(deltaTime);

    // Update scene systems
    this.updateSystems(deltaTime);

    // Update game objects
    this.updateGameObjects(deltaTime);

    // Update enemies
    this.updateEnemies(deltaTime);

    // Update items
    this.updateItems(deltaTime);

    // Update effects
    this.updateEffects(deltaTime);

    // Update power-ups
    this.updatePowerUps(deltaTime);

    // Update camera
    this.updateCamera(deltaTime);

    // Update UI
    this.updateUI(deltaTime);

    // Check for collisions
    this.checkCollisions();

    // Update scene state
    this.state.lastUpdateTime = Date.now();
  }

  /**
   * Render the scene
   */
  render() {
    if (!this.state.isVisible) {
      return;
    }

    // Clear renderer
    this.renderer.clear();

    // Render background
    this.renderBackground();

    // Render game objects
    this.renderGameObjects();

    // Render enemies
    this.renderEnemies();

    // Render items
    this.renderItems();

    // Render effects
    this.renderEffects();

    // Render power-ups
    this.renderPowerUps();

    // Render UI
    this.renderUI();
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Scene events
    this.eventBus.on('scene:activate', this.handleSceneActivate.bind(this));
    this.eventBus.on('scene:deactivate', this.handleSceneDeactivate.bind(this));
    this.eventBus.on('scene:pause', this.handleScenePause.bind(this));
    this.eventBus.on('scene:resume', this.handleSceneResume.bind(this));

    // Game events
    this.eventBus.on('game:started', this.handleGameStarted.bind(this));
    this.eventBus.on('game:stopped', this.handleGameStopped.bind(this));

    // Player events
    this.eventBus.on('player:spawned', this.handlePlayerSpawned.bind(this));
    this.eventBus.on('player:destroyed', this.handlePlayerDestroyed.bind(this));
    this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));

    // Enemy events
    this.eventBus.on('enemy:spawned', this.handleEnemySpawned.bind(this));
    this.eventBus.on('enemy:destroyed', this.handleEnemyDestroyed.bind(this));

    // Item events
    this.eventBus.on('item:spawned', this.handleItemSpawned.bind(this));
    this.eventBus.on('item:collected', this.handleItemCollected.bind(this));

    // Power-up events
    this.eventBus.on('powerUp:spawned', this.handlePowerUpSpawned.bind(this));
    this.eventBus.on('powerUp:collected', this.handlePowerUpCollected.bind(this));

    // Input events
    this.eventBus.on('input:keydown', this.handleKeyDown.bind(this));
    this.eventBus.on('input:keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('scene:activate', this.handleSceneActivate.bind(this));
    this.eventBus.removeListener('scene:deactivate', this.handleSceneDeactivate.bind(this));
    this.eventBus.removeListener('scene:pause', this.handleScenePause.bind(this));
    this.eventBus.removeListener('scene:resume', this.handleSceneResume.bind(this));
    this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
    this.eventBus.removeListener('game:stopped', this.handleGameStopped.bind(this));
    this.eventBus.removeListener('player:spawned', this.handlePlayerSpawned.bind(this));
    this.eventBus.removeListener('player:destroyed', this.handlePlayerDestroyed.bind(this));
    this.eventBus.removeListener('player:damaged', this.handlePlayerDamaged.bind(this));
    this.eventBus.removeListener('enemy:spawned', this.handleEnemySpawned.bind(this));
    this.eventBus.removeListener('enemy:destroyed', this.handleEnemyDestroyed.bind(this));
    this.eventBus.removeListener('item:spawned', this.handleItemSpawned.bind(this));
    this.eventBus.removeListener('item:collected', this.handleItemCollected.bind(this));
    this.eventBus.removeListener('powerUp:spawned', this.handlePowerUpSpawned.bind(this));
    this.eventBus.removeListener('powerUp:collected', this.handlePowerUpCollected.bind(this));
    this.eventBus.removeListener('input:keydown', this.handleKeyDown.bind(this));
    this.eventBus.removeListener('input:keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Initialize scene systems
   */
  async initializeSystems() {
    // Initialize physics system
    this.systems = {
      physics: new PhysicsSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      }),
      collision: new CollisionSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      }),
      audio: new AudioSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      }),
      particles: new ParticleSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      }),
      ai: new AISystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      })
    };

    // Initialize all systems
    for (const [name, system] of Object.entries(this.systems)) {
      if (system.initialize) {
        await system.initialize();
      }
    }
  }

  /**
   * Initialize scene objects
   */
  async initializeSceneObjects() {
    // Initialize background
    this.state.background = new EndlessBackground({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    await this.state.background.initialize();

    // Initialize player
    this.state.player = new Player({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    await this.state.player.initialize();
  }

  /**
   * Initialize UI
   */
  async initializeUI() {
    this.state.ui = new EndlessUI({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    await this.state.ui.initialize();
  }

  /**
   * Initialize camera
   */
  async initializeCamera() {
    this.state.camera = new Camera({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    await this.state.camera.initialize();
  }

  /**
   * Update survival score
   */
  updateSurvivalScore(deltaTime) {
    const survivalPoints = Math.floor(deltaTime / 1000) * this.endlessConfig.survivalBonus;
    this.addScore(survivalPoints);
  }

  /**
   * Update combo decay
   */
  updateComboDecay(deltaTime) {
    if (this.state.combo > 0) {
      this.state.combo = Math.max(0, this.state.combo - deltaTime / this.endlessConfig.comboDecayTime);
    }
  }

  /**
   * Update wave management
   */
  updateWaveManagement(deltaTime) {
    const now = Date.now();
    
    if (now - this.state.lastWaveTime >= this.state.waveInterval) {
      this.startNextWave();
    }
  }

  /**
   * Update enemy spawning
   */
  updateEnemySpawning(deltaTime) {
    if (this.state.currentWavePattern && this.state.enemiesSpawned < this.state.currentWavePattern.count) {
      const now = Date.now();
      
      if (now - this.state.lastEnemySpawn >= this.state.currentWavePattern.interval) {
        this.spawnEnemy();
      }
    }
  }

  /**
   * Start next wave
   */
  startNextWave() {
    this.state.currentWave++;
    this.state.lastWaveTime = Date.now();
    
    // Increase difficulty
    this.state.difficulty += this.endlessConfig.difficultyIncrease;
    
    // Decrease wave interval
    this.state.waveInterval = Math.max(
      this.endlessConfig.minWaveInterval,
      this.state.waveInterval - this.endlessConfig.waveIntervalDecrease
    );

    // Select wave pattern
    const patternIndex = Math.min(this.state.currentWave - 1, this.wavePatterns.length - 1);
    this.state.currentWavePattern = this.wavePatterns[patternIndex];
    this.state.enemiesSpawned = 0;
    this.state.lastEnemySpawn = Date.now();

    this.eventBus.emit('endless:waveStarted', {
      wave: this.state.currentWave,
      difficulty: this.state.difficulty,
      pattern: this.state.currentWavePattern,
      timestamp: Date.now()
    });

    this.logger.info(`Wave ${this.state.currentWave} started`);
  }

  /**
   * Spawn enemy
   */
  spawnEnemy() {
    if (!this.state.currentWavePattern) return;

    const enemyType = this.state.currentWavePattern.enemies[
      Math.floor(Math.random() * this.state.currentWavePattern.enemies.length)
    ];
    
    const enemyData = this.enemyTypes[enemyType];
    if (!enemyData) return;

    // Apply difficulty scaling
    const scaledEnemy = {
      ...enemyData,
      health: Math.floor(enemyData.health * this.state.difficulty),
      damage: Math.floor(enemyData.damage * this.state.difficulty),
      speed: enemyData.speed * this.state.difficulty,
      score: Math.floor(enemyData.score * this.state.difficulty)
    };

    const enemy = new Enemy({
      type: enemyType,
      data: scaledEnemy,
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });

    this.addEnemy(enemy);
    this.state.enemiesSpawned++;
    this.state.lastEnemySpawn = Date.now();
  }

  /**
   * Add score
   */
  addScore(amount) {
    const multiplier = this.state.multiplier * (1 + this.state.combo * 0.1);
    const finalScore = Math.floor(amount * multiplier);
    
    this.state.score += finalScore;
    
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
    }

    this.eventBus.emit('endless:scoreChanged', {
      score: this.state.score,
      highScore: this.state.highScore,
      change: finalScore,
      timestamp: Date.now()
    });
  }

  /**
   * Add combo
   */
  addCombo(amount = 1) {
    this.state.combo += amount;
    this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

    this.eventBus.emit('endless:comboChanged', {
      combo: this.state.combo,
      maxCombo: this.state.maxCombo,
      timestamp: Date.now()
    });
  }

  /**
   * Update systems
   */
  updateSystems(deltaTime) {
    for (const [name, system] of Object.entries(this.systems)) {
      if (system.update) {
        system.update(deltaTime);
      }
    }
  }

  /**
   * Update game objects
   */
  updateGameObjects(deltaTime) {
    for (const [id, obj] of this.state.gameObjects) {
      if (obj.update) {
        obj.update(deltaTime);
      }
    }
  }

  /**
   * Update enemies
   */
  updateEnemies(deltaTime) {
    for (const [id, enemy] of this.state.enemies) {
      if (enemy.update) {
        enemy.update(deltaTime);
      }
    }
  }

  /**
   * Update items
   */
  updateItems(deltaTime) {
    for (const [id, item] of this.state.items) {
      if (item.update) {
        item.update(deltaTime);
      }
    }
  }

  /**
   * Update effects
   */
  updateEffects(deltaTime) {
    for (const [id, effect] of this.state.effects) {
      if (effect.update) {
        effect.update(deltaTime);
      }
    }
  }

  /**
   * Update power-ups
   */
  updatePowerUps(deltaTime) {
    for (const [id, powerUp] of this.state.powerUps) {
      if (powerUp.update) {
        powerUp.update(deltaTime);
      }
    }
  }

  /**
   * Update camera
   */
  updateCamera(deltaTime) {
    if (this.state.camera && this.state.camera.update) {
      this.state.camera.update(deltaTime);
    }
  }

  /**
   * Update UI
   */
  updateUI(deltaTime) {
    if (this.state.ui && this.state.ui.update) {
      this.state.ui.update(deltaTime);
    }
  }

  /**
   * Check collisions
   */
  checkCollisions() {
    if (!this.systems.collision) return;

    // Check player-enemy collisions
    if (this.state.player) {
      for (const [id, enemy] of this.state.enemies) {
        if (this.systems.collision.checkCollision(this.state.player, enemy)) {
          this.handlePlayerEnemyCollision(this.state.player, enemy);
        }
      }
    }

    // Check player-item collisions
    if (this.state.player) {
      for (const [id, item] of this.state.items) {
        if (this.systems.collision.checkCollision(this.state.player, item)) {
          this.handlePlayerItemCollision(this.state.player, item);
        }
      }
    }

    // Check player-power-up collisions
    if (this.state.player) {
      for (const [id, powerUp] of this.state.powerUps) {
        if (this.systems.collision.checkCollision(this.state.player, powerUp)) {
          this.handlePlayerPowerUpCollision(this.state.player, powerUp);
        }
      }
    }
  }

  /**
   * Render background
   */
  renderBackground() {
    if (this.state.background && this.state.background.render) {
      this.state.background.render();
    }
  }

  /**
   * Render game objects
   */
  renderGameObjects() {
    for (const [id, obj] of this.state.gameObjects) {
      if (obj.render) {
        obj.render();
      }
    }
  }

  /**
   * Render enemies
   */
  renderEnemies() {
    for (const [id, enemy] of this.state.enemies) {
      if (enemy.render) {
        enemy.render();
      }
    }
  }

  /**
   * Render items
   */
  renderItems() {
    for (const [id, item] of this.state.items) {
      if (item.render) {
        item.render();
      }
    }
  }

  /**
   * Render effects
   */
  renderEffects() {
    for (const [id, effect] of this.state.effects) {
      if (effect.render) {
        effect.render();
      }
    }
  }

  /**
   * Render power-ups
   */
  renderPowerUps() {
    for (const [id, powerUp] of this.state.powerUps) {
      if (powerUp.render) {
        powerUp.render();
      }
    }
  }

  /**
   * Render UI
   */
  renderUI() {
    if (this.state.ui && this.state.ui.render) {
      this.state.ui.render();
    }
  }

  /**
   * Add enemy
   */
  addEnemy(enemy) {
    const id = enemy.id || this.generateId();
    enemy.id = id;
    this.state.enemies.set(id, enemy);
    
    this.eventBus.emit('enemy:spawned', {
      id: id,
      enemy: enemy,
      timestamp: Date.now()
    });
  }

  /**
   * Remove enemy
   */
  removeEnemy(id) {
    const enemy = this.state.enemies.get(id);
    if (enemy) {
      this.state.enemies.delete(id);
      
      this.eventBus.emit('enemy:destroyed', {
        id: id,
        enemy: enemy,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Add item
   */
  addItem(item) {
    const id = item.id || this.generateId();
    item.id = id;
    this.state.items.set(id, item);
    
    this.eventBus.emit('item:spawned', {
      id: id,
      item: item,
      timestamp: Date.now()
    });
  }

  /**
   * Remove item
   */
  removeItem(id) {
    const item = this.state.items.get(id);
    if (item) {
      this.state.items.delete(id);
      
      this.eventBus.emit('item:destroyed', {
        id: id,
        item: item,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Add power-up
   */
  addPowerUp(powerUp) {
    const id = powerUp.id || this.generateId();
    powerUp.id = id;
    this.state.powerUps.set(id, powerUp);
    
    this.eventBus.emit('powerUp:spawned', {
      id: id,
      powerUp: powerUp,
      timestamp: Date.now()
    });
  }

  /**
   * Remove power-up
   */
  removePowerUp(id) {
    const powerUp = this.state.powerUps.get(id);
    if (powerUp) {
      this.state.powerUps.delete(id);
      
      this.eventBus.emit('powerUp:destroyed', {
        id: id,
        powerUp: powerUp,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load high score
   */
  loadHighScore() {
    try {
      const savedScore = localStorage.getItem('endlessHighScore');
      if (savedScore) {
        this.state.highScore = parseInt(savedScore, 10);
      }
    } catch (error) {
      this.logger.error('Failed to load high score:', error);
    }
  }

  /**
   * Save high score
   */
  saveHighScore() {
    try {
      localStorage.setItem('endlessHighScore', this.state.highScore.toString());
    } catch (error) {
      this.logger.error('Failed to save high score:', error);
    }
  }

  /**
   * Cleanup systems
   */
  cleanupSystems() {
    for (const [name, system] of Object.entries(this.systems)) {
      if (system.cleanup) {
        system.cleanup();
      }
    }
  }

  /**
   * Cleanup objects
   */
  cleanupObjects() {
    this.state.gameObjects.clear();
    this.state.enemies.clear();
    this.state.items.clear();
    this.state.effects.clear();
    this.state.powerUps.clear();
  }

  // Event handlers
  handleSceneActivate(data) {
    this.state.isActive = true;
    this.state.startTime = Date.now();
    this.state.lastWaveTime = Date.now();
    this.logger.info('EndlessModeScene activated');
  }

  handleSceneDeactivate(data) {
    this.state.isActive = false;
    this.logger.info('EndlessModeScene deactivated');
  }

  handleScenePause(data) {
    this.state.isPaused = true;
    this.logger.info('EndlessModeScene paused');
  }

  handleSceneResume(data) {
    this.state.isPaused = false;
    this.logger.info('EndlessModeScene resumed');
  }

  handleGameStarted(data) {
    this.state.score = 0;
    this.state.survivalTime = 0;
    this.state.currentWave = 1;
    this.state.difficulty = 1.0;
    this.state.combo = 0;
    this.state.enemiesKilled = 0;
    this.state.itemsCollected = 0;
    this.logger.info('Endless mode game started');
  }

  handleGameStopped(data) {
    this.saveHighScore();
    this.logger.info('Endless mode game stopped');
  }

  handlePlayerSpawned(data) {
    this.state.player = data.player;
    this.logger.info('Player spawned in EndlessModeScene');
  }

  handlePlayerDestroyed(data) {
    this.state.player = null;
    this.logger.info('Player destroyed in EndlessModeScene');
  }

  handlePlayerDamaged(data) {
    this.state.combo = 0; // Reset combo on damage
    this.logger.info('Player damaged in EndlessModeScene');
  }

  handleEnemySpawned(data) {
    this.addEnemy(data.enemy);
  }

  handleEnemyDestroyed(data) {
    this.removeEnemy(data.id);
    this.state.enemiesKilled++;
    this.addCombo();
    
    // Chance to spawn item or power-up
    if (Math.random() < this.endlessConfig.itemSpawnRate) {
      this.spawnRandomItem();
    }
    if (Math.random() < this.endlessConfig.powerUpSpawnRate) {
      this.spawnRandomPowerUp();
    }
  }

  handleItemSpawned(data) {
    this.addItem(data.item);
  }

  handleItemCollected(data) {
    this.removeItem(data.id);
    this.state.itemsCollected++;
    this.addScore(data.item.score || 50);
  }

  handlePowerUpSpawned(data) {
    this.addPowerUp(data.powerUp);
  }

  handlePowerUpCollected(data) {
    this.removePowerUp(data.id);
    this.applyPowerUp(data.powerUp);
  }

  handleKeyDown(data) {
    // Handle key down events
  }

  handleKeyUp(data) {
    // Handle key up events
  }

  handlePlayerEnemyCollision(player, enemy) {
    this.eventBus.emit('player:damaged', {
      damage: enemy.damage || 1,
      source: 'enemy',
      enemy: enemy,
      timestamp: Date.now()
    });
  }

  handlePlayerItemCollision(player, item) {
    this.eventBus.emit('player:itemCollected', {
      item: item,
      timestamp: Date.now()
    });
    this.removeItem(item.id);
  }

  handlePlayerPowerUpCollision(player, powerUp) {
    this.eventBus.emit('player:powerUpCollected', {
      powerUp: powerUp,
      timestamp: Date.now()
    });
    this.removePowerUp(powerUp.id);
  }

  /**
   * Spawn random item
   */
  spawnRandomItem() {
    const items = ['health_potion', 'mana_potion', 'score_multiplier'];
    const itemType = items[Math.floor(Math.random() * items.length)];
    
    const item = new Item({
      type: itemType,
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    
    this.addItem(item);
  }

  /**
   * Spawn random power-up
   */
  spawnRandomPowerUp() {
    const powerUps = ['speed_boost', 'damage_boost', 'shield', 'multiplier'];
    const powerUpType = powerUps[Math.floor(Math.random() * powerUps.length)];
    
    const powerUp = new PowerUp({
      type: powerUpType,
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config
    });
    
    this.addPowerUp(powerUp);
  }

  /**
   * Apply power-up effect
   */
  applyPowerUp(powerUp) {
    switch (powerUp.type) {
      case 'speed_boost':
        this.state.multiplier *= 1.5;
        setTimeout(() => {
          this.state.multiplier /= 1.5;
        }, 10000);
        break;
      case 'damage_boost':
        // Apply damage boost to player
        break;
      case 'shield':
        // Apply shield to player
        break;
      case 'multiplier':
        this.state.multiplier *= 2;
        setTimeout(() => {
          this.state.multiplier /= 2;
        }, 15000);
        break;
    }
  }

  /**
   * Get scene state
   */
  getState() {
    return { ...this.state };
  }
}

export default EndlessModeScene;