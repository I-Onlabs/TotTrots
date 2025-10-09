/**
 * GameRefactored.test.js - Unit tests for GameRefactored class
 *
 * Tests:
 * - Initialization and dependency injection
 * - Manager lifecycle management
 * - Event-driven communication
 * - Cross-cutting features integration
 * - Error handling
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import GameRefactored from '../src/GameRefactored.js';

// Mock dependencies
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockConfig = {
  debug: false,
  enableAchievements: true,
  enableDailyChallenges: true,
  enableAccessibility: true,
};

describe('GameRefactored', () => {
  let game;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create game instance
    game = new GameRefactored({
      eventBus: mockEventBus,
      logger: mockLogger,
      config: mockConfig,
    });
  });

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct dependencies', () => {
      expect(game.eventBus).toBe(mockEventBus);
      expect(game.logger).toBe(mockLogger);
      expect(game.config).toEqual(mockConfig);
    });

    it('should validate required dependencies', () => {
      expect(() => {
        new GameRefactored({ logger: mockLogger });
      }).toThrow('GameRefactored: EventBus initialization failed');
    });

    it('should initialize game state correctly', () => {
      expect(game.gameState).toBeDefined();
      expect(game.gameState.isRunning).toBe(false);
      expect(game.gameState.isPaused).toBe(false);
      expect(game.gameState.currentLevel).toBe(1);
      expect(game.gameState.score).toBe(0);
    });

    it('should initialize managers with dependency injection', () => {
      expect(game.managers).toBeDefined();
      expect(game.managers.game).toBeDefined();
      expect(game.managers.achievements).toBeDefined();
      expect(game.managers.dailyChallenges).toBeDefined();
      expect(game.managers.accessibility).toBeDefined();
    });
  });

  describe('Manager Lifecycle', () => {
    it('should initialize all managers on start', async () => {
      // Mock manager initialize methods
      game.managers.game.initialize = jest.fn().mockResolvedValue();
      game.managers.achievements.initialize = jest.fn().mockResolvedValue();
      game.managers.dailyChallenges.initialize = jest.fn().mockResolvedValue();
      game.managers.accessibility.initialize = jest.fn().mockResolvedValue();

      await game.start();

      expect(game.managers.game.initialize).toHaveBeenCalled();
      expect(game.managers.achievements.initialize).toHaveBeenCalled();
      expect(game.managers.dailyChallenges.initialize).toHaveBeenCalled();
      expect(game.managers.accessibility.initialize).toHaveBeenCalled();
    });

    it('should cleanup all managers on stop', () => {
      // Mock manager cleanup methods
      game.managers.game.cleanup = jest.fn();
      game.managers.achievements.cleanup = jest.fn();
      game.managers.dailyChallenges.cleanup = jest.fn();
      game.managers.accessibility.cleanup = jest.fn();

      game.stop();

      expect(game.managers.game.cleanup).toHaveBeenCalled();
      expect(game.managers.achievements.cleanup).toHaveBeenCalled();
      expect(game.managers.dailyChallenges.cleanup).toHaveBeenCalled();
      expect(game.managers.accessibility.cleanup).toHaveBeenCalled();
    });
  });

  describe('Event-driven Communication', () => {
    it('should set up event listeners for cross-cutting features', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'player:scoreChanged',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'player:levelCompleted',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'player:itemCollected',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'player:comboChanged',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'achievement:unlocked',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'dailyChallenge:completed',
        expect.any(Function)
      );
    });

    it('should handle score changes and trigger achievements', () => {
      const scoreData = { score: 1000 };

      // Get the score change handler
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];

      scoreHandler(scoreData);

      expect(
        game.managers.achievements.checkScoreAchievements
      ).toHaveBeenCalledWith(1000);
      expect(
        game.managers.dailyChallenges.checkScoreChallenges
      ).toHaveBeenCalledWith(1000);
    });

    it('should handle level completion and trigger challenges', () => {
      const levelData = { level: 5 };

      // Get the level completion handler
      const levelHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:levelCompleted'
      )[1];

      levelHandler(levelData);

      expect(
        game.managers.achievements.checkLevelAchievements
      ).toHaveBeenCalledWith(5);
      expect(
        game.managers.dailyChallenges.checkLevelChallenges
      ).toHaveBeenCalledWith(5);
    });
  });

  describe('Cross-cutting Features Integration', () => {
    it('should apply achievement effects to gameplay', () => {
      const achievement = {
        id: 'test_achievement',
        name: 'Test Achievement',
        effects: {
          scoreMultiplier: 2.0,
          extraLives: 1,
          temporaryPowerUp: 'speed_boost',
        },
      };

      game.applyAchievementEffects(achievement);

      expect(game.gameState.scoreMultiplier).toBe(2.0);
      expect(game.gameState.lives).toBe(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'player:livesChanged',
        expect.any(Object)
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:powerUpActivated',
        expect.any(Object)
      );
    });

    it('should apply challenge effects to gameplay', () => {
      const challenge = {
        id: 'test_challenge',
        name: 'Test Challenge',
        effects: {
          scoreBonus: 500,
          currency: { coins: 100 },
          temporaryEffect: 'damage_boost',
        },
      };

      game.applyChallengeEffects(challenge);

      expect(game.gameState.score).toBe(500);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'player:scoreChanged',
        expect.any(Object)
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'player:currencyEarned',
        expect.any(Object)
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:temporaryEffect',
        expect.any(Object)
      );
    });
  });

  describe('Game State Management', () => {
    it('should start game correctly', async () => {
      // Mock manager initialize methods
      game.managers.game.initialize = jest.fn().mockResolvedValue();
      game.managers.achievements.initialize = jest.fn().mockResolvedValue();
      game.managers.dailyChallenges.initialize = jest.fn().mockResolvedValue();
      game.managers.accessibility.initialize = jest.fn().mockResolvedValue();

      await game.start();

      expect(game.gameState.isRunning).toBe(true);
      expect(game.gameState.startTime).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:started',
        expect.any(Object)
      );
    });

    it('should pause game correctly', () => {
      game.gameState.isRunning = true;

      game.pause();

      expect(game.gameState.isPaused).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:paused',
        expect.any(Object)
      );
    });

    it('should resume game correctly', () => {
      game.gameState.isRunning = true;
      game.gameState.isPaused = true;

      game.resume();

      expect(game.gameState.isPaused).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:resumed',
        expect.any(Object)
      );
    });

    it('should stop game correctly', () => {
      game.gameState.isRunning = true;

      game.stop();

      expect(game.gameState.isRunning).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:stopped',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle manager initialization errors', async () => {
      game.managers.game.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Init failed'));

      await expect(game.start()).rejects.toThrow('Init failed');
    });

    it('should handle update loop errors', () => {
      game.gameState.isRunning = true;
      game.managers.game.update = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });

      expect(() => game.update(16)).toThrow('Update failed');
      expect(game.gameState.isRunning).toBe(false);
    });
  });

  describe('Game Object Management', () => {
    it('should add game objects correctly', () => {
      const gameObject = { id: 'test_obj', update: jest.fn() };

      game.addGameObject(gameObject);

      expect(game.gameState.gameObjects).toContain(gameObject);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:objectAdded',
        expect.any(Object)
      );
    });

    it('should remove game objects correctly', () => {
      const gameObject = { id: 'test_obj' };
      game.gameState.gameObjects.push(gameObject);

      game.removeGameObject('test_obj');

      expect(game.gameState.gameObjects).not.toContain(gameObject);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:objectRemoved',
        expect.any(Object)
      );
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = { debug: true, enableAchievements: false };

      game.updateConfig(newConfig);

      expect(game.config.debug).toBe(true);
      expect(game.config.enableAchievements).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:configChanged',
        expect.any(Object)
      );
    });
  });
});

export default GameRefactored;
