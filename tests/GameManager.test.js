/**
 * GameManager.test.js - Unit tests for GameManager class
 *
 * Tests:
 * - Dependency injection
 * - Lifecycle management
 * - Game state management
 * - Event handling
 * - Level progression
 * - Score management
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GameManager } from '../src/managers/GameManager.js';

// Mock dependencies
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeListener: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockConfig = {
  debug: false,
  maxLevel: 10
};

describe('GameManager', () => {
  let gameManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    gameManager = new GameManager({
      eventBus: mockEventBus,
      logger: mockLogger,
      config: mockConfig
    });
  });

  afterEach(() => {
    if (gameManager) {
      gameManager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct dependencies', () => {
      expect(gameManager.eventBus).toBe(mockEventBus);
      expect(gameManager.logger).toBe(mockLogger);
      expect(gameManager.config).toBe(mockConfig);
    });

    it('should validate required dependencies', () => {
      expect(() => {
        new GameManager({ logger: mockLogger });
      }).toThrow('GameManager requires eventBus dependency');
    });

    it('should initialize game state correctly', () => {
      expect(gameManager.state).toBeDefined();
      expect(gameManager.state.currentLevel).toBe(1);
      expect(gameManager.state.maxLevel).toBe(10);
      expect(gameManager.state.score).toBe(0);
      expect(gameManager.state.lives).toBe(3);
    });

    it('should set up event handlers', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('player:scoreChanged', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('player:damaged', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('player:itemCollected', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('player:levelCompleted', expect.any(Function));
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize correctly', async () => {
      await gameManager.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('Initializing GameManager...');
      expect(mockLogger.info).toHaveBeenCalledWith('GameManager initialized successfully');
    });

    it('should cleanup correctly', () => {
      gameManager.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Cleaning up GameManager...');
      expect(mockEventBus.removeListener).toHaveBeenCalled();
    });
  });

  describe('Game State Management', () => {
    it('should handle score changes', () => {
      const scoreData = { scoreChange: 100 };
      
      gameManager.handleScoreChange(scoreData);

      expect(gameManager.state.score).toBe(100);
      expect(mockEventBus.emit).toHaveBeenCalledWith('game:scoreUpdated', expect.any(Object));
    });

    it('should update high score when score exceeds it', () => {
      gameManager.state.highScore = 50;
      const scoreData = { scoreChange: 100 };
      
      gameManager.handleScoreChange(scoreData);

      expect(gameManager.state.highScore).toBe(100);
    });

    it('should handle player damage', () => {
      const damageData = { damage: 1 };
      
      gameManager.handlePlayerDamaged(damageData);

      expect(gameManager.state.lives).toBe(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith('game:livesUpdated', expect.any(Object));
    });

    it('should trigger game over when lives reach zero', () => {
      gameManager.state.lives = 1;
      const damageData = { damage: 1 };
      
      gameManager.handlePlayerDamaged(damageData);

      expect(gameManager.state.gameOver).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('game:gameOver', expect.any(Object));
    });

    it('should handle item collection', () => {
      const itemData = { itemType: 'health_potion', scoreValue: 50 };
      
      gameManager.handleItemCollected(itemData);

      expect(gameManager.state.score).toBe(50);
      expect(mockLogger.info).toHaveBeenCalledWith('Item collected: health_potion, +50 points');
    });
  });

  describe('Level Progression', () => {
    it('should complete level when score target is reached', () => {
      gameManager.state.currentLevel = 1;
      gameManager.state.score = 900; // Below target
      
      const scoreData = { scoreChange: 200 }; // Should reach 1000 target
      gameManager.handleScoreChange(scoreData);

      expect(gameManager.state.levelCompleted).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('level:completed', expect.any(Object));
    });

    it('should advance to next level after completion', () => {
      gameManager.state.currentLevel = 1;
      gameManager.state.levelCompleted = true;
      
      // Mock setTimeout
      jest.useFakeTimers();
      
      gameManager.completeLevel();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('level:completed', expect.any(Object));
      
      jest.advanceTimersByTime(2000);
      
      expect(gameManager.state.currentLevel).toBe(2);
      expect(gameManager.state.levelCompleted).toBe(false);
      
      jest.useRealTimers();
    });

    it('should complete game when max level is reached', () => {
      gameManager.state.currentLevel = 10;
      gameManager.state.score = 1000;
      
      gameManager.completeLevel();

      expect(mockEventBus.emit).toHaveBeenCalledWith('game:completed', expect.any(Object));
    });

    it('should handle level timeout', () => {
      gameManager.state.currentLevel = 1;
      gameManager.state.levelStartTime = Date.now() - 70000; // 70 seconds ago
      
      gameManager.handleLevelTimeout();

      expect(mockEventBus.emit).toHaveBeenCalledWith('level:timeout', expect.any(Object));
      expect(gameManager.state.lives).toBe(2); // Should lose a life
    });
  });

  describe('Achievement Integration', () => {
    it('should handle achievement unlock', () => {
      const achievementData = {
        name: 'Test Achievement',
        bonusScore: 100,
        effects: { extraLives: 1 }
      };
      
      gameManager.handleAchievementUnlock(achievementData);

      expect(gameManager.state.score).toBe(100);
      expect(gameManager.state.lives).toBe(4); // 3 + 1
    });

    it('should apply achievement effects', () => {
      const effects = {
        extraLives: 2,
        scoreMultiplier: 1.5
      };
      
      gameManager.applyAchievementEffects(effects);

      expect(gameManager.state.lives).toBe(5); // 3 + 2
      expect(gameManager.temporaryScoreMultiplier).toBe(1.5);
    });
  });

  describe('Daily Challenge Integration', () => {
    it('should handle daily challenge completion', () => {
      const challengeData = {
        name: 'Test Challenge',
        bonusScore: 200,
        effects: { temporaryPowerUp: 'speed_boost' }
      };
      
      gameManager.handleDailyChallengeCompletion(challengeData);

      expect(gameManager.state.score).toBe(200);
      expect(mockEventBus.emit).toHaveBeenCalledWith('game:powerUpActivated', expect.any(Object));
    });

    it('should apply challenge effects', () => {
      const effects = {
        temporaryPowerUp: 'damage_boost',
        duration: 30000
      };
      
      gameManager.applyChallengeEffects(effects);

      expect(mockEventBus.emit).toHaveBeenCalledWith('game:powerUpActivated', expect.any(Object));
    });
  });

  describe('Game Restart', () => {
    it('should restart game correctly', () => {
      gameManager.state.currentLevel = 5;
      gameManager.state.score = 1000;
      gameManager.state.lives = 1;
      gameManager.state.highScore = 2000;
      
      gameManager.restartGame();

      expect(gameManager.state.currentLevel).toBe(1);
      expect(gameManager.state.score).toBe(0);
      expect(gameManager.state.lives).toBe(3);
      expect(gameManager.state.highScore).toBe(2000); // Should keep high score
      expect(mockEventBus.emit).toHaveBeenCalledWith('game:restarted', expect.any(Object));
    });
  });

  describe('Configuration Management', () => {
    it('should handle config changes', () => {
      const newConfig = { debug: true };
      
      gameManager.handleConfigChange({ config: newConfig });

      expect(gameManager.config).toEqual({ ...mockConfig, ...newConfig });
      expect(mockLogger.info).toHaveBeenCalledWith('GameManager config updated');
    });
  });

  describe('Data Persistence', () => {
    it('should load game data from storage', async () => {
      const mockData = { highScore: 5000 };
      localStorage.setItem('gameData', JSON.stringify(mockData));
      
      await gameManager.loadGameData();

      expect(gameManager.state.highScore).toBe(5000);
      expect(mockLogger.info).toHaveBeenCalledWith('Game data loaded from storage');
    });

    it('should save game data to storage', () => {
      gameManager.state.highScore = 3000;
      
      gameManager.saveGameData();

      const savedData = JSON.parse(localStorage.getItem('gameData'));
      expect(savedData.highScore).toBe(3000);
      expect(mockLogger.info).toHaveBeenCalledWith('Game data saved to storage');
    });

    it('should handle save/load errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await gameManager.loadGameData();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load game data:', expect.any(Error));
      
      // Restore original method
      localStorage.getItem = originalGetItem;
    });
  });

  describe('State Getters', () => {
    it('should return current game state', () => {
      const state = gameManager.getState();
      
      expect(state).toEqual(gameManager.state);
      expect(state).not.toBe(gameManager.state); // Should be a copy
    });

    it('should return level configuration', () => {
      const levelConfig = gameManager.getLevelConfig(1);
      
      expect(levelConfig).toBeDefined();
      expect(levelConfig.difficulty).toBe('easy');
    });

    it('should set level configuration', () => {
      const newConfig = { timeLimit: 120000, targetScore: 2000 };
      
      gameManager.setLevelConfig(1, newConfig);
      
      const levelConfig = gameManager.getLevelConfig(1);
      expect(levelConfig.timeLimit).toBe(120000);
      expect(levelConfig.targetScore).toBe(2000);
    });
  });
});

export default GameManager;