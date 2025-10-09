/**
 * GameRefactored.test.js - Test suite for GameRefactored class
 */

import { GameRefactored } from '../src/GameRefactored.js';
import { EventBus } from '../src/core/EventBus.js';
import { Logger } from '../src/utils/Logger.js';

// Mock the managers
jest.mock('../src/managers/GameManager.js', () => ({
  GameManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    update: jest.fn(),
    cleanup: jest.fn(),
    getState: jest.fn().mockReturnValue({})
  }))
}));

jest.mock('../src/managers/AchievementManager.js', () => ({
  AchievementManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    update: jest.fn(),
    cleanup: jest.fn(),
    getAchievement: jest.fn(),
    getAllAchievements: jest.fn().mockReturnValue([])
  }))
}));

jest.mock('../src/managers/DailyChallengeManager.js', () => ({
  DailyChallengeManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    update: jest.fn(),
    cleanup: jest.fn(),
    getActiveChallenges: jest.fn().mockReturnValue([])
  }))
}));

jest.mock('../src/managers/AccessibilityManager.js', () => ({
  AccessibilityManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    update: jest.fn(),
    cleanup: jest.fn(),
    getSettings: jest.fn().mockReturnValue({})
  }))
}));

describe('GameRefactored', () => {
  let game;
  let eventBus;
  let logger;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger(true);
    
    game = new GameRefactored({
      debug: true,
      enableAchievements: true,
      enableDailyChallenges: true,
      enableAccessibility: true
    });
  });

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const defaultGame = new GameRefactored();
      expect(defaultGame.config.debug).toBe(false);
      expect(defaultGame.config.enableAchievements).toBe(true);
      expect(defaultGame.config.enableDailyChallenges).toBe(true);
      expect(defaultGame.config.enableAccessibility).toBe(true);
    });

    test('should initialize with custom config', () => {
      const customConfig = {
        debug: true,
        enableAchievements: false,
        enableDailyChallenges: false,
        enableAccessibility: false
      };
      
      const customGame = new GameRefactored(customConfig);
      expect(customGame.config).toEqual(expect.objectContaining(customConfig));
    });

    test('should initialize managers', () => {
      expect(game.managers.game).toBeDefined();
      expect(game.managers.achievements).toBeDefined();
      expect(game.managers.dailyChallenges).toBeDefined();
      expect(game.managers.accessibility).toBeDefined();
    });

    test('should set up manager communication', () => {
      // Test that event listeners are set up
      expect(game.eventBus.listeners.has('player:scoreChanged')).toBe(true);
      expect(game.eventBus.listeners.has('player:levelCompleted')).toBe(true);
      expect(game.eventBus.listeners.has('player:itemCollected')).toBe(true);
    });
  });

  describe('Game Lifecycle', () => {
    test('should start game successfully', async () => {
      await expect(game.start()).resolves.not.toThrow();
      expect(game.gameState.isRunning).toBe(true);
    });

    test('should pause game', () => {
      game.gameState.isRunning = true;
      game.pause();
      expect(game.gameState.isPaused).toBe(true);
    });

    test('should resume game', () => {
      game.gameState.isRunning = true;
      game.gameState.isPaused = true;
      game.resume();
      expect(game.gameState.isPaused).toBe(false);
    });

    test('should stop game', () => {
      game.gameState.isRunning = true;
      game.stop();
      expect(game.gameState.isRunning).toBe(false);
      expect(game.gameState.isPaused).toBe(false);
    });
  });

  describe('Game State Management', () => {
    test('should get game state', () => {
      const state = game.getGameState();
      expect(state).toEqual(expect.objectContaining({
        isRunning: false,
        isPaused: false,
        currentLevel: 1,
        score: 0,
        player: null,
        gameObjects: []
      }));
    });

    test('should add game object', () => {
      const gameObject = { id: 'test', type: 'test' };
      game.addGameObject(gameObject);
      expect(game.gameState.gameObjects).toContain(gameObject);
    });

    test('should remove game object', () => {
      const gameObject = { id: 'test', type: 'test' };
      game.addGameObject(gameObject);
      game.removeGameObject('test');
      expect(game.gameState.gameObjects).not.toContain(gameObject);
    });
  });

  describe('Input Handling', () => {
    test('should handle input events', () => {
      const inputType = 'keyDown';
      const data = { key: 'Space' };
      
      expect(() => {
        game.handleInput(inputType, data);
      }).not.toThrow();
    });
  });

  describe('Manager Access', () => {
    test('should get manager by name', () => {
      const gameManager = game.getManager('game');
      expect(gameManager).toBeDefined();
    });

    test('should return undefined for non-existent manager', () => {
      const manager = game.getManager('nonExistent');
      expect(manager).toBeUndefined();
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration', () => {
      const newConfig = { debug: false };
      game.updateConfig(newConfig);
      expect(game.config.debug).toBe(false);
    });
  });

  describe('Event System', () => {
    test('should emit game started event', async () => {
      const eventSpy = jest.fn();
      game.eventBus.on('game:started', eventSpy);
      
      await game.start();
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number),
        config: expect.any(Object)
      }));
    });

    test('should emit game paused event', () => {
      const eventSpy = jest.fn();
      game.eventBus.on('game:paused', eventSpy);
      
      game.gameState.isRunning = true;
      game.pause();
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number)
      }));
    });

    test('should emit game stopped event', () => {
      const eventSpy = jest.fn();
      game.eventBus.on('game:stopped', eventSpy);
      
      game.gameState.isRunning = true;
      game.stop();
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        timestamp: expect.any(Number),
        finalScore: expect.any(Number),
        finalLevel: expect.any(Number)
      }));
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors', async () => {
      // Mock a manager to throw an error
      game.managers.game.initialize = jest.fn().mockRejectedValue(new Error('Initialization failed'));
      
      await expect(game.start()).rejects.toThrow('Initialization failed');
    });

    test('should handle update loop errors', () => {
      // Mock a manager to throw an error during update
      game.managers.game.update = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });
      
      game.gameState.isRunning = true;
      
      // The update method should catch the error and stop the game
      expect(() => {
        game.update(performance.now());
      }).not.toThrow();
      
      expect(game.gameState.isRunning).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should destroy game properly', () => {
      game.destroy();
      expect(game.gameState).toBeNull();
      expect(game.managers).toBeNull();
    });
  });
});