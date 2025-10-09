/**
 * GameScene.js - Main Game Scene with explicit lifecycle and dependency injection
 *
 * This scene handles:
 * - Game world rendering
 * - Player interaction
 * - Game object management
 * - Scene transitions
 * - Event handling
 */

export class GameScene {
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
      throw new Error('GameScene requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('GameScene requires logger dependency');
    }

    // Scene state
    this.state = {
      isActive: false,
      isPaused: false,
      isVisible: true,
      sceneId: 'game',
      level: 1,
      difficulty: 'normal',
      startTime: null,
      lastUpdateTime: null,
      gameObjects: new Map(),
      player: null,
      enemies: new Map(),
      items: new Map(),
      effects: new Map(),
      background: null,
      camera: null,
      ui: null,
    };

    // Scene configuration
    this.sceneConfig = {
      maxGameObjects: 1000,
      maxEnemies: 50,
      maxItems: 100,
      maxEffects: 200,
      updateRate: 60, // FPS
      renderRate: 60, // FPS
      physicsEnabled: true,
      collisionEnabled: true,
      soundEnabled: true,
      particlesEnabled: true,
    };

    // Game objects
    this.gameObjects = new Map();
    this.enemies = new Map();
    this.items = new Map();
    this.effects = new Map();

    // Scene systems
    this.systems = {
      physics: null,
      collision: null,
      audio: null,
      particles: null,
      ai: null,
    };

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('GameScene initialized');
  }

  /**
   * Initialize the scene
   */
  async initialize() {
    this.logger.info('Initializing GameScene...');

    // Initialize scene systems
    await this.initializeSystems();

    // Initialize scene objects
    await this.initializeSceneObjects();

    // Initialize UI
    await this.initializeUI();

    // Initialize camera
    await this.initializeCamera();

    this.logger.info('GameScene initialized successfully');
  }

  /**
   * Cleanup the scene
   */
  cleanup() {
    this.logger.info('Cleaning up GameScene...');

    // Cleanup systems
    this.cleanupSystems();

    // Cleanup objects
    this.cleanupObjects();

    // Remove event listeners
    this.removeEventHandlers();

    this.logger.info('GameScene cleaned up');
  }

  /**
   * Update the scene
   */
  update(deltaTime, gameState) {
    if (!this.state.isActive || this.state.isPaused) {
      return;
    }

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
    this.eventBus.on('game:levelChanged', this.handleLevelChanged.bind(this));
    this.eventBus.on(
      'game:difficultyChanged',
      this.handleDifficultyChanged.bind(this)
    );

    // Player events
    this.eventBus.on('player:spawned', this.handlePlayerSpawned.bind(this));
    this.eventBus.on('player:destroyed', this.handlePlayerDestroyed.bind(this));
    this.eventBus.on(
      'player:positionChanged',
      this.handlePlayerPositionChanged.bind(this)
    );

    // Enemy events
    this.eventBus.on('enemy:spawned', this.handleEnemySpawned.bind(this));
    this.eventBus.on('enemy:destroyed', this.handleEnemyDestroyed.bind(this));

    // Item events
    this.eventBus.on('item:spawned', this.handleItemSpawned.bind(this));
    this.eventBus.on('item:collected', this.handleItemCollected.bind(this));

    // Input events
    this.eventBus.on('input:keydown', this.handleKeyDown.bind(this));
    this.eventBus.on('input:keyup', this.handleKeyUp.bind(this));
    this.eventBus.on('input:mousedown', this.handleMouseDown.bind(this));
    this.eventBus.on('input:mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener(
      'scene:activate',
      this.handleSceneActivate.bind(this)
    );
    this.eventBus.removeListener(
      'scene:deactivate',
      this.handleSceneDeactivate.bind(this)
    );
    this.eventBus.removeListener(
      'scene:pause',
      this.handleScenePause.bind(this)
    );
    this.eventBus.removeListener(
      'scene:resume',
      this.handleSceneResume.bind(this)
    );
    this.eventBus.removeListener(
      'game:levelChanged',
      this.handleLevelChanged.bind(this)
    );
    this.eventBus.removeListener(
      'game:difficultyChanged',
      this.handleDifficultyChanged.bind(this)
    );
    this.eventBus.removeListener(
      'player:spawned',
      this.handlePlayerSpawned.bind(this)
    );
    this.eventBus.removeListener(
      'player:destroyed',
      this.handlePlayerDestroyed.bind(this)
    );
    this.eventBus.removeListener(
      'player:positionChanged',
      this.handlePlayerPositionChanged.bind(this)
    );
    this.eventBus.removeListener(
      'enemy:spawned',
      this.handleEnemySpawned.bind(this)
    );
    this.eventBus.removeListener(
      'enemy:destroyed',
      this.handleEnemyDestroyed.bind(this)
    );
    this.eventBus.removeListener(
      'item:spawned',
      this.handleItemSpawned.bind(this)
    );
    this.eventBus.removeListener(
      'item:collected',
      this.handleItemCollected.bind(this)
    );
    this.eventBus.removeListener(
      'input:keydown',
      this.handleKeyDown.bind(this)
    );
    this.eventBus.removeListener('input:keyup', this.handleKeyUp.bind(this));
    this.eventBus.removeListener(
      'input:mousedown',
      this.handleMouseDown.bind(this)
    );
    this.eventBus.removeListener(
      'input:mouseup',
      this.handleMouseUp.bind(this)
    );
  }

  /**
   * Initialize scene systems
   */
  async initializeSystems() {
    // Initialize physics system
    if (this.sceneConfig.physicsEnabled) {
      this.systems.physics = new PhysicsSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config,
      });
      await this.systems.physics.initialize();
    }

    // Initialize collision system
    if (this.sceneConfig.collisionEnabled) {
      this.systems.collision = new CollisionSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config,
      });
      await this.systems.collision.initialize();
    }

    // Initialize audio system
    if (this.sceneConfig.soundEnabled) {
      this.systems.audio = new AudioSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config,
      });
      await this.systems.audio.initialize();
    }

    // Initialize particle system
    if (this.sceneConfig.particlesEnabled) {
      this.systems.particles = new ParticleSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config,
      });
      await this.systems.particles.initialize();
    }

    // Initialize AI system
    this.systems.ai = new AISystem({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });
    await this.systems.ai.initialize();
  }

  /**
   * Initialize scene objects
   */
  async initializeSceneObjects() {
    // Initialize background
    this.state.background = new Background({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });
    await this.state.background.initialize();

    // Initialize player
    this.state.player = new Player({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    });
    await this.state.player.initialize();
  }

  /**
   * Initialize UI
   */
  async initializeUI() {
    this.state.ui = new GameUI({
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
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
      config: this.config,
    });
    await this.state.camera.initialize();
  }

  /**
   * Update systems
   */
  updateSystems(deltaTime) {
    if (this.systems.physics) {
      this.systems.physics.update(deltaTime);
    }
    if (this.systems.collision) {
      this.systems.collision.update(deltaTime);
    }
    if (this.systems.audio) {
      this.systems.audio.update(deltaTime);
    }
    if (this.systems.particles) {
      this.systems.particles.update(deltaTime);
    }
    if (this.systems.ai) {
      this.systems.ai.update(deltaTime);
    }
  }

  /**
   * Update game objects
   */
  updateGameObjects(deltaTime) {
    for (const [id, obj] of this.gameObjects) {
      if (obj.update) {
        obj.update(deltaTime);
      }
    }
  }

  /**
   * Update enemies
   */
  updateEnemies(deltaTime) {
    for (const [id, enemy] of this.enemies) {
      if (enemy.update) {
        enemy.update(deltaTime);
      }
    }
  }

  /**
   * Update items
   */
  updateItems(deltaTime) {
    for (const [id, item] of this.items) {
      if (item.update) {
        item.update(deltaTime);
      }
    }
  }

  /**
   * Update effects
   */
  updateEffects(deltaTime) {
    for (const [id, effect] of this.effects) {
      if (effect.update) {
        effect.update(deltaTime);
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
      for (const [id, enemy] of this.enemies) {
        if (this.systems.collision.checkCollision(this.state.player, enemy)) {
          this.handlePlayerEnemyCollision(this.state.player, enemy);
        }
      }
    }

    // Check player-item collisions
    if (this.state.player) {
      for (const [id, item] of this.items) {
        if (this.systems.collision.checkCollision(this.state.player, item)) {
          this.handlePlayerItemCollision(this.state.player, item);
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
    for (const [id, obj] of this.gameObjects) {
      if (obj.render) {
        obj.render();
      }
    }
  }

  /**
   * Render enemies
   */
  renderEnemies() {
    for (const [id, enemy] of this.enemies) {
      if (enemy.render) {
        enemy.render();
      }
    }
  }

  /**
   * Render items
   */
  renderItems() {
    for (const [id, item] of this.items) {
      if (item.render) {
        item.render();
      }
    }
  }

  /**
   * Render effects
   */
  renderEffects() {
    for (const [id, effect] of this.effects) {
      if (effect.render) {
        effect.render();
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
   * Add game object
   */
  addGameObject(obj) {
    const id = obj.id || this.generateId();
    obj.id = id;
    this.gameObjects.set(id, obj);

    this.eventBus.emit('gameObject:added', {
      id: id,
      object: obj,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove game object
   */
  removeGameObject(id) {
    const obj = this.gameObjects.get(id);
    if (obj) {
      this.gameObjects.delete(id);

      this.eventBus.emit('gameObject:removed', {
        id: id,
        object: obj,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add enemy
   */
  addEnemy(enemy) {
    const id = enemy.id || this.generateId();
    enemy.id = id;
    this.enemies.set(id, enemy);

    this.eventBus.emit('enemy:spawned', {
      id: id,
      enemy: enemy,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove enemy
   */
  removeEnemy(id) {
    const enemy = this.enemies.get(id);
    if (enemy) {
      this.enemies.delete(id);

      this.eventBus.emit('enemy:destroyed', {
        id: id,
        enemy: enemy,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add item
   */
  addItem(item) {
    const id = item.id || this.generateId();
    item.id = id;
    this.items.set(id, item);

    this.eventBus.emit('item:spawned', {
      id: id,
      item: item,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove item
   */
  removeItem(id) {
    const item = this.items.get(id);
    if (item) {
      this.items.delete(id);

      this.eventBus.emit('item:destroyed', {
        id: id,
        item: item,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add effect
   */
  addEffect(effect) {
    const id = effect.id || this.generateId();
    effect.id = id;
    this.effects.set(id, effect);
  }

  /**
   * Remove effect
   */
  removeEffect(id) {
    this.effects.delete(id);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup systems
   */
  cleanupSystems() {
    if (this.systems.physics) {
      this.systems.physics.cleanup();
    }
    if (this.systems.collision) {
      this.systems.collision.cleanup();
    }
    if (this.systems.audio) {
      this.systems.audio.cleanup();
    }
    if (this.systems.particles) {
      this.systems.particles.cleanup();
    }
    if (this.systems.ai) {
      this.systems.ai.cleanup();
    }
  }

  /**
   * Cleanup objects
   */
  cleanupObjects() {
    this.gameObjects.clear();
    this.enemies.clear();
    this.items.clear();
    this.effects.clear();
  }

  // Event handlers
  handleSceneActivate(data) {
    this.state.isActive = true;
    this.state.startTime = Date.now();
    this.logger.info('GameScene activated');
  }

  handleSceneDeactivate(data) {
    this.state.isActive = false;
    this.logger.info('GameScene deactivated');
  }

  handleScenePause(data) {
    this.state.isPaused = true;
    this.logger.info('GameScene paused');
  }

  handleSceneResume(data) {
    this.state.isPaused = false;
    this.logger.info('GameScene resumed');
  }

  handleLevelChanged(data) {
    this.state.level = data.level;
    this.logger.info(`GameScene level changed to ${data.level}`);
  }

  handleDifficultyChanged(data) {
    this.state.difficulty = data.difficulty;
    this.logger.info(`GameScene difficulty changed to ${data.difficulty}`);
  }

  handlePlayerSpawned(data) {
    this.state.player = data.player;
    this.logger.info('Player spawned in GameScene');
  }

  handlePlayerDestroyed(data) {
    this.state.player = null;
    this.logger.info('Player destroyed in GameScene');
  }

  handlePlayerPositionChanged(data) {
    if (this.state.camera) {
      this.state.camera.follow(data.position);
    }
  }

  handleEnemySpawned(data) {
    this.addEnemy(data.enemy);
  }

  handleEnemyDestroyed(data) {
    this.removeEnemy(data.id);
  }

  handleItemSpawned(data) {
    this.addItem(data.item);
  }

  handleItemCollected(data) {
    this.removeItem(data.id);
  }

  handleKeyDown(data) {
    // Handle key down events
  }

  handleKeyUp(data) {
    // Handle key up events
  }

  handleMouseDown(data) {
    // Handle mouse down events
  }

  handleMouseUp(data) {
    // Handle mouse up events
  }

  handlePlayerEnemyCollision(player, enemy) {
    this.eventBus.emit('player:damaged', {
      damage: enemy.damage || 1,
      source: 'enemy',
      enemy: enemy,
      timestamp: Date.now(),
    });
  }

  handlePlayerItemCollision(player, item) {
    this.eventBus.emit('player:itemCollected', {
      item: item,
      timestamp: Date.now(),
    });
    this.removeItem(item.id);
  }

  /**
   * Get scene state
   */
  getState() {
    return { ...this.state };
  }
}

export default GameScene;
