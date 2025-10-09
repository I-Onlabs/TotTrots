/**
 * SaveManager.js - Centralized Save/Load Management System
 *
 * This system handles:
 * - Game state persistence
 * - Save slot management
 * - Auto-save functionality
 * - Save data validation
 * - Integration with SaveSystem
 */

export class SaveManager {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;
    this.saveSystem = dependencies.saveSystem;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('SaveManager requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('SaveManager requires logger dependency');
    }

    // Save manager state
    this.state = {
      currentSlot: 1,
      autoSaveEnabled: true,
      autoSaveInterval: 300000, // 5 minutes
      lastAutoSave: 0,
      saveInProgress: false,
      loadInProgress: false,
      gameData: null,
      saveSlots: new Map(),
      autoSaveTimer: null
    };

    // Save configuration
    this.saveConfig = {
      maxAutoSaveSlots: 3,
      autoSaveFrequency: 300000, // 5 minutes
      saveDataVersion: '1.0.0',
      compressionEnabled: true,
      encryptionEnabled: false
    };

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('SaveManager initialized');
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    this.logger.info('Initializing SaveManager...');

    // Initialize save system if not provided
    if (!this.saveSystem) {
      const { SaveSystem } = await import('./SaveSystem.js');
      this.saveSystem = new SaveSystem({
        eventBus: this.eventBus,
        logger: this.logger,
        config: this.config
      });
      await this.saveSystem.initialize();
    }

    // Load save slots
    await this.loadSaveSlots();

    // Start auto-save if enabled
    if (this.state.autoSaveEnabled) {
      this.startAutoSave();
    }

    this.logger.info('SaveManager initialized successfully');
  }

  /**
   * Cleanup the manager
   */
  cleanup() {
    this.logger.info('Cleaning up SaveManager...');

    // Stop auto-save
    this.stopAutoSave();

    // Save current state
    this.saveCurrentState();

    // Remove event listeners
    this.removeEventHandlers();

    this.logger.info('SaveManager cleaned up');
  }

  /**
   * Update the manager
   */
  update(deltaTime, gameState) {
    // Update game data
    this.state.gameData = gameState;

    // Check for auto-save
    this.checkAutoSave();
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

    // Player events
    this.eventBus.on('player:levelUp', this.handlePlayerLevelUp.bind(this));
    this.eventBus.on('player:itemCollected', this.handlePlayerItemCollected.bind(this));
    this.eventBus.on('player:areaEnter', this.handlePlayerAreaEnter.bind(this));

    // Combat events
    this.eventBus.on('combat:enemyDefeated', this.handleEnemyDefeated.bind(this));

    // Quest events
    this.eventBus.on('quest:completed', this.handleQuestCompleted.bind(this));

    // Save events
    this.eventBus.on('save:request', this.handleSaveRequest.bind(this));
    this.eventBus.on('load:request', this.handleLoadRequest.bind(this));
    this.eventBus.on('save:auto', this.handleAutoSave.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
    this.eventBus.removeListener('game:paused', this.handleGamePaused.bind(this));
    this.eventBus.removeListener('game:resumed', this.handleGameResumed.bind(this));
    this.eventBus.removeListener('game:stopped', this.handleGameStopped.bind(this));
    this.eventBus.removeListener('player:levelUp', this.handlePlayerLevelUp.bind(this));
    this.eventBus.removeListener('player:itemCollected', this.handlePlayerItemCollected.bind(this));
    this.eventBus.removeListener('player:areaEnter', this.handlePlayerAreaEnter.bind(this));
    this.eventBus.removeListener('combat:enemyDefeated', this.handleEnemyDefeated.bind(this));
    this.eventBus.removeListener('quest:completed', this.handleQuestCompleted.bind(this));
    this.eventBus.removeListener('save:request', this.handleSaveRequest.bind(this));
    this.eventBus.removeListener('load:request', this.handleLoadRequest.bind(this));
    this.eventBus.removeListener('save:auto', this.handleAutoSave.bind(this));
  }

  /**
   * Save game to slot
   */
  async saveGame(slotNumber, gameData = null) {
    if (this.state.saveInProgress) {
      this.logger.warn('Save already in progress');
      return false;
    }

    this.state.saveInProgress = true;

    try {
      const dataToSave = gameData || this.state.gameData;
      if (!dataToSave) {
        throw new Error('No game data to save');
      }

      // Prepare save data
      const saveData = this.prepareSaveData(dataToSave);

      // Save using save system
      const success = await this.saveSystem.saveGame(slotNumber, saveData, {
        saveType: 'manual',
        compressionEnabled: this.saveConfig.compressionEnabled,
        encryptionEnabled: this.saveConfig.encryptionEnabled
      });

      if (success) {
        this.state.currentSlot = slotNumber;
        this.updateSaveSlotInfo(slotNumber, saveData);
        
        this.eventBus.emit('save:completed', {
          slotNumber: slotNumber,
          timestamp: Date.now()
        });

        this.logger.info(`Game saved to slot ${slotNumber}`);
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to save game:', error);
      
      this.eventBus.emit('save:failed', {
        slotNumber: slotNumber,
        error: error.message,
        timestamp: Date.now()
      });

      return false;
    } finally {
      this.state.saveInProgress = false;
    }
  }

  /**
   * Load game from slot
   */
  async loadGame(slotNumber) {
    if (this.state.loadInProgress) {
      this.logger.warn('Load already in progress');
      return null;
    }

    this.state.loadInProgress = true;

    try {
      // Load using save system
      const gameData = await this.saveSystem.loadGame(slotNumber);

      if (gameData) {
        this.state.currentSlot = slotNumber;
        this.state.gameData = gameData;

        this.eventBus.emit('load:completed', {
          slotNumber: slotNumber,
          gameData: gameData,
          timestamp: Date.now()
        });

        this.logger.info(`Game loaded from slot ${slotNumber}`);
      }

      return gameData;
    } catch (error) {
      this.logger.error('Failed to load game:', error);
      
      this.eventBus.emit('load:failed', {
        slotNumber: slotNumber,
        error: error.message,
        timestamp: Date.now()
      });

      return null;
    } finally {
      this.state.loadInProgress = false;
    }
  }

  /**
   * Delete save slot
   */
  async deleteSave(slotNumber) {
    try {
      const success = await this.saveSystem.deleteSave(slotNumber);
      
      if (success) {
        this.state.saveSlots.delete(slotNumber);
        
        this.eventBus.emit('save:deleted', {
          slotNumber: slotNumber,
          timestamp: Date.now()
        });

        this.logger.info(`Save slot ${slotNumber} deleted`);
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to delete save:', error);
      return false;
    }
  }

  /**
   * Get save slot info
   */
  getSaveSlotInfo(slotNumber) {
    return this.state.saveSlots.get(slotNumber) || {
      slotNumber: slotNumber,
      exists: false,
      timestamp: 0,
      size: 0,
      level: 0,
      score: 0,
      playTime: 0
    };
  }

  /**
   * Get all save slots
   */
  getAllSaveSlots() {
    return Array.from(this.state.saveSlots.values());
  }

  /**
   * Prepare save data
   */
  prepareSaveData(gameData) {
    return {
      version: this.saveConfig.saveDataVersion,
      timestamp: Date.now(),
      player: gameData.player || {},
      gameState: gameData.gameState || {},
      settings: gameData.settings || {},
      achievements: gameData.achievements || [],
      inventory: gameData.inventory || [],
      skills: gameData.skills || {},
      quests: gameData.quests || [],
      stats: gameData.stats || {},
      metadata: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        screenResolution: {
          width: screen.width,
          height: screen.height
        }
      }
    };
  }

  /**
   * Update save slot info
   */
  updateSaveSlotInfo(slotNumber, saveData) {
    this.state.saveSlots.set(slotNumber, {
      slotNumber: slotNumber,
      exists: true,
      timestamp: saveData.timestamp,
      size: JSON.stringify(saveData).length,
      level: saveData.gameState?.currentLevel || 0,
      score: saveData.gameState?.score || 0,
      playTime: saveData.stats?.playTime || 0
    });
  }

  /**
   * Load save slots
   */
  async loadSaveSlots() {
    try {
      const saveSlots = this.saveSystem.getAllSaveSlots();
      
      for (const slot of saveSlots) {
        this.state.saveSlots.set(slot.slotNumber, {
          slotNumber: slot.slotNumber,
          exists: slot.exists,
          timestamp: slot.timestamp,
          size: slot.size,
          level: slot.metadata?.level || 0,
          score: slot.metadata?.score || 0,
          playTime: slot.metadata?.playTime || 0
        });
      }

      this.logger.info(`Loaded ${saveSlots.length} save slots`);
    } catch (error) {
      this.logger.error('Failed to load save slots:', error);
    }
  }

  /**
   * Start auto-save
   */
  startAutoSave() {
    if (this.state.autoSaveTimer) {
      return;
    }

    this.state.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, this.state.autoSaveInterval);

    this.logger.info('Auto-save started');
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.state.autoSaveTimer) {
      clearInterval(this.state.autoSaveTimer);
      this.state.autoSaveTimer = null;
      this.logger.info('Auto-save stopped');
    }
  }

  /**
   * Perform auto-save
   */
  async performAutoSave() {
    if (this.state.saveInProgress || !this.state.gameData) {
      return;
    }

    try {
      // Find next available auto-save slot
      let autoSaveSlot = 0;
      for (let i = 1; i <= this.saveConfig.maxAutoSaveSlots; i++) {
        if (!this.state.saveSlots.has(i) || !this.state.saveSlots.get(i).exists) {
          autoSaveSlot = i;
          break;
        }
      }

      if (autoSaveSlot === 0) {
        // Use oldest auto-save slot
        autoSaveSlot = 1;
      }

      await this.saveGame(autoSaveSlot, this.state.gameData);
      this.state.lastAutoSave = Date.now();

      this.logger.debug(`Auto-save completed to slot ${autoSaveSlot}`);
    } catch (error) {
      this.logger.error('Auto-save failed:', error);
    }
  }

  /**
   * Check for auto-save
   */
  checkAutoSave() {
    if (!this.state.autoSaveEnabled || !this.state.gameData) {
      return;
    }

    const now = Date.now();
    if (now - this.state.lastAutoSave > this.state.autoSaveInterval) {
      this.performAutoSave();
    }
  }

  /**
   * Save current state
   */
  saveCurrentState() {
    try {
      const currentState = {
        state: this.state,
        timestamp: Date.now()
      };
      
      localStorage.setItem('saveManagerState', JSON.stringify(currentState));
    } catch (error) {
      this.logger.error('Failed to save current state:', error);
    }
  }

  /**
   * Load current state
   */
  loadCurrentState() {
    try {
      const savedState = localStorage.getItem('saveManagerState');
      if (savedState) {
        const currentState = JSON.parse(savedState);
        this.state = { ...this.state, ...currentState.state };
      }
    } catch (error) {
      this.logger.error('Failed to load current state:', error);
    }
  }

  // Event handlers
  handleGameStarted(data) {
    this.logger.debug('Game started - save manager ready');
  }

  handleGamePaused(data) {
    this.logger.debug('Game paused');
  }

  handleGameResumed(data) {
    this.logger.debug('Game resumed');
  }

  handleGameStopped(data) {
    this.logger.debug('Game stopped');
  }

  handlePlayerLevelUp(data) {
    this.logger.debug('Player leveled up - triggering auto-save');
    this.performAutoSave();
  }

  handlePlayerItemCollected(data) {
    this.logger.debug('Player collected item - triggering auto-save');
    this.performAutoSave();
  }

  handlePlayerAreaEnter(data) {
    this.logger.debug('Player entered area - triggering auto-save');
    this.performAutoSave();
  }

  handleEnemyDefeated(data) {
    this.logger.debug('Enemy defeated - triggering auto-save');
    this.performAutoSave();
  }

  handleQuestCompleted(data) {
    this.logger.debug('Quest completed - triggering auto-save');
    this.performAutoSave();
  }

  handleSaveRequest(data) {
    const { slotNumber, gameData } = data;
    this.saveGame(slotNumber, gameData);
  }

  handleLoadRequest(data) {
    const { slotNumber } = data;
    this.loadGame(slotNumber);
  }

  handleAutoSave(data) {
    this.performAutoSave();
  }

  /**
   * Set auto-save enabled
   */
  setAutoSaveEnabled(enabled) {
    this.state.autoSaveEnabled = enabled;
    
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  /**
   * Set auto-save interval
   */
  setAutoSaveInterval(interval) {
    this.state.autoSaveInterval = interval;
    
    if (this.state.autoSaveEnabled) {
      this.stopAutoSave();
      this.startAutoSave();
    }
  }

  /**
   * Get save manager state
   */
  getState() {
    return { ...this.state };
  }
}

export default SaveManager;