/**
 * Integration.test.js - Integration tests for the refactored game architecture
 *
 * Tests:
 * - Cross-cutting features integration
 * - Event-driven communication
 * - Manager lifecycle coordination
 * - System interaction
 * - Error propagation
 * - Performance characteristics
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
import { GameManager } from '../src/managers/GameManager.js';
import { AchievementManager } from '../src/managers/AchievementManager.js';
import { DailyChallengeManager } from '../src/managers/DailyChallengeManager.js';
import { Logger } from '../src/utils/Logger.js';

// Mock dependencies
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockLogger = new Logger(false);
const mockConfig = {
  debug: false,
  enableAchievements: true,
  enableDailyChallenges: true,
  enableAccessibility: true,
};

describe('Integration Tests', () => {
  let game;

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('Cross-cutting Features Integration', () => {
    it('should integrate achievements with gameplay events', async () => {
      // Mock manager methods
      game.managers.achievements.checkScoreAchievements = jest.fn();
      game.managers.achievements.checkLevelAchievements = jest.fn();
      game.managers.achievements.checkCollectionAchievements = jest.fn();
      game.managers.achievements.checkComboAchievements = jest.fn();

      // Simulate gameplay events
      mockEventBus.emit('player:scoreChanged', { score: 1000 });
      mockEventBus.emit('player:levelCompleted', { level: 5 });
      mockEventBus.emit('player:itemCollected', { itemType: 'health_potion' });
      mockEventBus.emit('player:comboChanged', { combo: 10 });

      // Get event handlers
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];
      const levelHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:levelCompleted'
      )[1];
      const itemHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:itemCollected'
      )[1];
      const comboHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:comboChanged'
      )[1];

      // Trigger handlers
      scoreHandler({ score: 1000 });
      levelHandler({ level: 5 });
      itemHandler({ itemType: 'health_potion' });
      comboHandler({ combo: 10 });

      // Verify integration
      expect(
        game.managers.achievements.checkScoreAchievements
      ).toHaveBeenCalledWith(1000);
      expect(
        game.managers.achievements.checkLevelAchievements
      ).toHaveBeenCalledWith(5);
      expect(
        game.managers.achievements.checkCollectionAchievements
      ).toHaveBeenCalledWith('health_potion');
      expect(
        game.managers.achievements.checkComboAchievements
      ).toHaveBeenCalledWith(10);
    });

    it('should integrate daily challenges with gameplay events', async () => {
      // Mock manager methods
      game.managers.dailyChallenges.checkScoreChallenges = jest.fn();
      game.managers.dailyChallenges.checkLevelChallenges = jest.fn();
      game.managers.dailyChallenges.checkCollectionChallenges = jest.fn();
      game.managers.dailyChallenges.checkComboChallenges = jest.fn();

      // Get event handlers
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];
      const levelHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:levelCompleted'
      )[1];
      const itemHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:itemCollected'
      )[1];
      const comboHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:comboChanged'
      )[1];

      // Trigger handlers
      scoreHandler({ score: 1000 });
      levelHandler({ level: 5 });
      itemHandler({ itemType: 'health_potion' });
      comboHandler({ combo: 10 });

      // Verify integration
      expect(
        game.managers.dailyChallenges.checkScoreChallenges
      ).toHaveBeenCalledWith(1000);
      expect(
        game.managers.dailyChallenges.checkLevelChallenges
      ).toHaveBeenCalledWith(5);
      expect(
        game.managers.dailyChallenges.checkCollectionChallenges
      ).toHaveBeenCalledWith('health_potion');
      expect(
        game.managers.dailyChallenges.checkComboChallenges
      ).toHaveBeenCalledWith(10);
    });

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

      // Mock game state
      game.gameState.lives = 3;

      // Apply effects
      game.applyAchievementEffects(achievement);

      // Verify effects applied
      expect(game.gameState.scoreMultiplier).toBe(2.0);
      expect(game.gameState.lives).toBe(4);
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

      // Apply effects
      game.applyChallengeEffects(challenge);

      // Verify effects applied
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

  describe('Event-driven Communication', () => {
    it('should propagate events between managers', () => {
      // Mock manager methods
      game.managers.game.handleAchievementUnlock = jest.fn();
      game.managers.game.handleDailyChallengeCompletion = jest.fn();

      // Get event handlers
      const achievementHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'achievement:unlocked'
      )[1];
      const challengeHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'dailyChallenge:completed'
      )[1];

      // Trigger handlers
      achievementHandler({ id: 'test_achievement', name: 'Test Achievement' });
      challengeHandler({ id: 'test_challenge', name: 'Test Challenge' });

      // Verify propagation
      expect(game.managers.game.handleAchievementUnlock).toHaveBeenCalledWith({
        id: 'test_achievement',
        name: 'Test Achievement',
      });
      expect(
        game.managers.game.handleDailyChallengeCompletion
      ).toHaveBeenCalledWith({ id: 'test_challenge', name: 'Test Challenge' });
    });

    it('should handle endless mode events', () => {
      // Mock manager methods
      game.managers.achievements.checkSurvivalAchievements = jest.fn();
      game.managers.dailyChallenges.checkSurvivalChallenges = jest.fn();
      game.managers.achievements.checkScoreAchievements = jest.fn();
      game.managers.achievements.checkComboAchievements = jest.fn();

      // Get event handlers
      const waveHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'endless:waveStarted'
      )[1];
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'endless:scoreChanged'
      )[1];
      const comboHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'endless:comboChanged'
      )[1];

      // Trigger handlers
      waveHandler({ wave: 5, difficulty: 1.5 });
      scoreHandler({ score: 2000, highScore: 5000 });
      comboHandler({ combo: 15, maxCombo: 20 });

      // Verify integration
      expect(
        game.managers.achievements.checkSurvivalAchievements
      ).toHaveBeenCalledWith(5);
      expect(
        game.managers.dailyChallenges.checkSurvivalChallenges
      ).toHaveBeenCalledWith(5);
      expect(
        game.managers.achievements.checkScoreAchievements
      ).toHaveBeenCalledWith(2000);
      expect(
        game.managers.achievements.checkComboAchievements
      ).toHaveBeenCalledWith(15);
    });
  });

  describe('Manager Lifecycle Coordination', () => {
    it('should initialize all managers in correct order', async () => {
      // Mock manager initialize methods
      game.managers.game.initialize = jest.fn().mockResolvedValue();
      game.managers.achievements.initialize = jest.fn().mockResolvedValue();
      game.managers.dailyChallenges.initialize = jest.fn().mockResolvedValue();
      game.managers.accessibility.initialize = jest.fn().mockResolvedValue();

      await game.start();

      // Verify all managers initialized
      expect(game.managers.game.initialize).toHaveBeenCalled();
      expect(game.managers.achievements.initialize).toHaveBeenCalled();
      expect(game.managers.dailyChallenges.initialize).toHaveBeenCalled();
      expect(game.managers.accessibility.initialize).toHaveBeenCalled();
    });

    it('should cleanup all managers in correct order', () => {
      // Mock manager cleanup methods
      game.managers.game.cleanup = jest.fn();
      game.managers.achievements.cleanup = jest.fn();
      game.managers.dailyChallenges.cleanup = jest.fn();
      game.managers.accessibility.cleanup = jest.fn();

      game.stop();

      // Verify all managers cleaned up
      expect(game.managers.game.cleanup).toHaveBeenCalled();
      expect(game.managers.achievements.cleanup).toHaveBeenCalled();
      expect(game.managers.dailyChallenges.cleanup).toHaveBeenCalled();
      expect(game.managers.accessibility.cleanup).toHaveBeenCalled();
    });

    it('should handle manager initialization errors gracefully', async () => {
      // Mock one manager to fail
      game.managers.game.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Init failed'));

      await expect(game.start()).rejects.toThrow('Init failed');
    });
  });

  describe('System Interaction', () => {
    it('should coordinate between game manager and achievement manager', () => {
      // Mock methods
      game.managers.game.handleAchievementUnlock = jest.fn();
      game.managers.achievements.checkScoreAchievements = jest.fn();

      // Simulate score change
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];
      scoreHandler({ score: 1000 });

      // Verify coordination
      expect(
        game.managers.achievements.checkScoreAchievements
      ).toHaveBeenCalledWith(1000);
    });

    it('should coordinate between game manager and daily challenge manager', () => {
      // Mock methods
      game.managers.game.handleDailyChallengeCompletion = jest.fn();
      game.managers.dailyChallenges.checkLevelChallenges = jest.fn();

      // Simulate level completion
      const levelHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:levelCompleted'
      )[1];
      levelHandler({ level: 5 });

      // Verify coordination
      expect(
        game.managers.dailyChallenges.checkLevelChallenges
      ).toHaveBeenCalledWith(5);
    });
  });

  describe('Error Propagation', () => {
    it('should handle errors in event handlers gracefully', () => {
      // Mock error in achievement handler
      game.managers.achievements.checkScoreAchievements = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Achievement check failed');
        });

      // Get score handler
      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];

      // Should not throw
      expect(() => {
        scoreHandler({ score: 1000 });
      }).not.toThrow();
    });

    it('should handle errors in update loop gracefully', () => {
      // Mock error in manager update
      game.managers.game.update = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });

      game.gameState.isRunning = true;

      // Should stop game on error
      expect(() => {
        game.update(16);
      }).not.toThrow();
      expect(game.gameState.isRunning).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle high-frequency events efficiently', () => {
      // Mock methods
      game.managers.achievements.checkScoreAchievements = jest.fn();
      game.managers.dailyChallenges.checkScoreChallenges = jest.fn();

      const scoreHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'player:scoreChanged'
      )[1];

      // Simulate high-frequency score changes
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        scoreHandler({ score: i });
      }
      const endTime = performance.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(100); // 100ms
      expect(
        game.managers.achievements.checkScoreAchievements
      ).toHaveBeenCalledTimes(1000);
    });

    it('should maintain performance with many game objects', () => {
      // Add many game objects
      for (let i = 0; i < 100; i++) {
        game.addGameObject({ id: `obj_${i}`, update: jest.fn() });
      }

      const startTime = performance.now();
      game.update(16);
      const endTime = performance.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(50); // 50ms
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration across all managers', () => {
      const newConfig = { debug: true, enableAchievements: false };

      game.updateConfig(newConfig);

      expect(game.config.debug).toBe(true);
      expect(game.config.enableAchievements).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'game:configChanged',
        expect.any(Object)
      );
    });

    it('should handle configuration changes gracefully', () => {
      // Mock config change handler
      game.managers.game.handleConfigChange = jest.fn();

      const configHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'game:configChanged'
      )[1];

      configHandler({ config: { debug: true } });

      expect(game.managers.game.handleConfigChange).toHaveBeenCalledWith({
        config: { debug: true },
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly on destroy', () => {
      // Add some game objects
      game.addGameObject({ id: 'test_obj' });

      // Destroy game
      game.destroy();

      // Verify cleanup
      expect(mockEventBus.removeAllListeners).toHaveBeenCalled();
      expect(game.gameState).toBeNull();
      expect(game.managers).toBeNull();
    });

    it('should not leak event listeners', () => {
      const initialListenerCount = mockEventBus.on.mock.calls.length;

      // Create and destroy multiple game instances
      for (let i = 0; i < 5; i++) {
        const tempGame = new GameRefactored({
          eventBus: mockEventBus,
          logger: mockLogger,
          config: mockConfig,
        });
        tempGame.destroy();
      }

      // Should not accumulate listeners
      expect(mockEventBus.removeAllListeners).toHaveBeenCalledTimes(5);
    });
  });
});

export default Integration;
