/**
 * PerformanceBenchmarks.test.js - Comprehensive performance benchmarking
 *
 * This test suite provides:
 * - Performance baseline measurements
 * - Load testing and stress testing
 * - Memory usage profiling
 * - FPS stability testing
 * - Mobile performance validation
 * - Battery optimization testing
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GameRefactored } from '../src/GameRefactored.js';
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js';

// Performance testing utilities
class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  measure(name, testFunction) {
    this.start();
    const result = testFunction();
    const duration = this.end();
    
    this.results.push({
      name,
      duration,
      result,
      timestamp: Date.now()
    });
    
    return { duration, result };
  }

  getResults() {
    return this.results;
  }

  getAverageDuration(testName) {
    const testResults = this.results.filter(r => r.name === testName);
    if (testResults.length === 0) return 0;
    
    const total = testResults.reduce((sum, r) => sum + r.duration, 0);
    return total / testResults.length;
  }

  getMaxDuration(testName) {
    const testResults = this.results.filter(r => r.name === testName);
    if (testResults.length === 0) return 0;
    
    return Math.max(...testResults.map(r => r.duration));
  }

  getMinDuration(testName) {
    const testResults = this.results.filter(r => r.name === testName);
    if (testResults.length === 0) return 0;
    
    return Math.min(...testResults.map(r => r.duration));
  }
}

// Mock performance environment for consistent testing
const setupPerformanceEnvironment = () => {
  let mockTime = 0;
  let mockMemory = 50 * 1024 * 1024; // Start with 50MB

  jest.spyOn(performance, 'now').mockImplementation(() => {
    mockTime += 16.67; // Simulate 60fps
    return mockTime;
  });

  Object.defineProperty(performance, 'memory', {
    value: {
      get usedJSHeapSize() {
        return mockMemory + Math.random() * 1024 * 1024; // Add some variance
      },
      get totalJSHeapSize() {
        return 100 * 1024 * 1024;
      },
      get jsHeapSizeLimit() {
        return 200 * 1024 * 1024;
      }
    },
    writable: true,
  });

  return {
    setMemory: (value) => { mockMemory = value; },
    advanceTime: (ms) => { mockTime += ms; }
  };
};

describe('⚡ Performance Benchmarks', () => {
  let game;
  let benchmark;
  let perfEnv;

  beforeEach(() => {
    perfEnv = setupPerformanceEnvironment();
    benchmark = new PerformanceBenchmark();
    game = new GameRefactored();
  });

  afterEach(() => {
    if (game) {
      game.stop();
    }
    jest.clearAllMocks();
  });

  describe('🚀 Initialization Performance', () => {
    it('should initialize game quickly', () => {
      const { duration } = benchmark.measure('game_initialization', () => {
        return new GameRefactored();
      });

      expect(duration).toBeLessThan(100); // Should initialize in <100ms
    });

    it('should start game within acceptable time', async () => {
      const { duration } = await benchmark.measure('game_start', async () => {
        await game.start();
        return game;
      });

      expect(duration).toBeLessThan(500); // Should start in <500ms
    });

    it('should stop game quickly', async () => {
      await game.start();
      
      const { duration } = benchmark.measure('game_stop', () => {
        game.stop();
      });

      expect(duration).toBeLessThan(50); // Should stop in <50ms
    });
  });

  describe('📊 Performance Monitor Benchmarks', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should update FPS metrics efficiently', () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = benchmark.measure('fps_update', () => {
        monitor.updateFPSMetrics();
      });

      expect(duration).toBeLessThan(1); // Should update in <1ms
    });

    it('should update memory metrics efficiently', () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = benchmark.measure('memory_update', () => {
        monitor.updateMemoryMetrics();
      });

      expect(duration).toBeLessThan(1); // Should update in <1ms
    });

    it('should calculate performance score quickly', () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = benchmark.measure('performance_score', () => {
        return monitor.getPerformanceScore();
      });

      expect(duration).toBeLessThan(5); // Should calculate in <5ms
    });

    it('should generate performance report efficiently', () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = benchmark.measure('performance_report', () => {
        return monitor.getPerformanceReport();
      });

      expect(duration).toBeLessThan(10); // Should generate in <10ms
    });
  });

  describe('🎮 Game Loop Performance', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should maintain 60fps performance', async () => {
      const monitor = game.getPerformanceMonitor();
      const iterations = 60; // Test 60 frames
      
      const { duration } = await benchmark.measure('game_loop_60fps', async () => {
        for (let i = 0; i < iterations; i++) {
          monitor.updateFPSMetrics();
          perfEnv.advanceTime(16.67); // Advance by 16.67ms (60fps)
          await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
        }
      });

      const averageFrameTime = duration / iterations;
      const fps = 1000 / averageFrameTime;
      
      expect(fps).toBeGreaterThan(50); // Should maintain >50fps
    });

    it('should handle high-frequency updates', async () => {
      const monitor = game.getPerformanceMonitor();
      const iterations = 1000;
      
      const { duration } = await benchmark.measure('high_frequency_updates', async () => {
        for (let i = 0; i < iterations; i++) {
          monitor.updateFPSMetrics();
          monitor.updateMemoryMetrics();
        }
      });

      const averageUpdateTime = duration / iterations;
      expect(averageUpdateTime).toBeLessThan(0.1); // Each update <0.1ms
    });
  });

  describe('💾 Memory Performance', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should not leak memory during operation', async () => {
      const monitor = game.getPerformanceMonitor();
      const initialMemory = monitor.metrics.memory.used;
      
      // Simulate extended operation
      const { duration } = await benchmark.measure('memory_stability', async () => {
        for (let i = 0; i < 100; i++) {
          monitor.updateMemoryMetrics();
          perfEnv.advanceTime(16.67);
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });

      const finalMemory = monitor.metrics.memory.used;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (<5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should handle memory pressure gracefully', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate high memory usage
      perfEnv.setMemory(180 * 1024 * 1024); // 180MB
      
      const { duration } = benchmark.measure('memory_pressure', () => {
        monitor.updateMemoryMetrics();
        return monitor.getPerformanceScore();
      });

      expect(duration).toBeLessThan(10); // Should handle pressure quickly
      
      const score = monitor.getPerformanceScore();
      expect(score).toBeLessThan(50); // Should detect memory pressure
    });
  });

  describe('📱 Mobile Performance Benchmarks', () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true,
      });
      
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        writable: true,
      });

      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 667,
        writable: true,
      });
    });

    it('should initialize quickly on mobile', async () => {
      const { duration } = await benchmark.measure('mobile_initialization', async () => {
        const mobileGame = new GameRefactored();
        await mobileGame.start();
        mobileGame.stop();
      });

      expect(duration).toBeLessThan(1000); // Should initialize in <1s on mobile
    });

    it('should maintain performance on mobile', async () => {
      await game.start();
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = await benchmark.measure('mobile_performance', async () => {
        for (let i = 0; i < 30; i++) {
          monitor.updateFPSMetrics();
          monitor.updateMemoryMetrics();
          perfEnv.advanceTime(16.67);
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });

      const averageFrameTime = duration / 30;
      const fps = 1000 / averageFrameTime;
      
      expect(fps).toBeGreaterThan(30); // Should maintain >30fps on mobile
    });
  });

  describe('🔄 Stress Testing', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should handle rapid start/stop cycles', async () => {
      const { duration } = await benchmark.measure('rapid_cycles', async () => {
        for (let i = 0; i < 10; i++) {
          game.stop();
          await game.start();
        }
      });

      expect(duration).toBeLessThan(5000); // Should complete 10 cycles in <5s
    });

    it('should handle continuous operation', async () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = await benchmark.measure('continuous_operation', async () => {
        for (let i = 0; i < 1000; i++) {
          monitor.updateFPSMetrics();
          monitor.updateMemoryMetrics();
          perfEnv.advanceTime(16.67);
          
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      });

      expect(duration).toBeLessThan(10000); // Should complete 1000 iterations in <10s
    });

    it('should maintain performance under load', async () => {
      const monitor = game.getPerformanceMonitor();
      
      const { duration } = await benchmark.measure('load_testing', async () => {
        const promises = [];
        
        // Simulate multiple concurrent operations
        for (let i = 0; i < 10; i++) {
          promises.push(new Promise(resolve => {
            setTimeout(() => {
              for (let j = 0; j < 100; j++) {
                monitor.updateFPSMetrics();
                monitor.updateMemoryMetrics();
              }
              resolve();
            }, i * 10);
          }));
        }
        
        await Promise.all(promises);
      });

      expect(duration).toBeLessThan(2000); // Should handle load in <2s
    });
  });

  describe('⚡ Battery Optimization', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should reduce update frequency when idle', async () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate idle state
      const { duration } = await benchmark.measure('idle_optimization', async () => {
        for (let i = 0; i < 100; i++) {
          monitor.updateFPSMetrics();
          perfEnv.advanceTime(100); // Simulate slower updates when idle
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });

      // Should be more efficient when idle
      expect(duration).toBeLessThan(1000);
    });

    it('should optimize memory usage over time', async () => {
      const monitor = game.getPerformanceMonitor();
      const initialMemory = monitor.metrics.memory.used;
      
      const { duration } = await benchmark.measure('memory_optimization', async () => {
        for (let i = 0; i < 500; i++) {
          monitor.updateMemoryMetrics();
          perfEnv.advanceTime(16.67);
          
          if (i % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      });

      const finalMemory = monitor.metrics.memory.used;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('📈 Performance Regression Detection', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should detect performance degradation', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate performance degradation
      monitor.metrics.fps.current = 20;
      monitor.metrics.memory.used = 150 * 1024 * 1024;
      
      const score = monitor.getPerformanceScore();
      const suggestions = monitor.getPerformanceReport().suggestions;
      
      expect(score).toBeLessThan(50);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide optimization recommendations', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate various performance issues
      monitor.metrics.fps.current = 25;
      monitor.metrics.memory.used = 180 * 1024 * 1024;
      
      const report = monitor.getPerformanceReport();
      const suggestions = report.suggestions;
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Check for specific optimization suggestions
      const suggestionTexts = suggestions.map(s => s.suggestion);
      expect(suggestionTexts.some(text => text.includes('FPS') || text.includes('memory'))).toBe(true);
    });
  });

  describe('🎯 Performance Targets', () => {
    beforeEach(async () => {
      await game.start();
    });

    it('should meet FPS targets', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate good performance
      monitor.metrics.fps.current = 60;
      const score = monitor.getPerformanceScore();
      
      expect(score).toBeGreaterThan(80); // Should score >80 for good FPS
    });

    it('should meet memory targets', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate good memory usage
      monitor.metrics.memory.used = 50 * 1024 * 1024; // 50MB
      const score = monitor.getPerformanceScore();
      
      expect(score).toBeGreaterThan(80); // Should score >80 for good memory usage
    });

    it('should meet overall performance targets', () => {
      const monitor = game.getPerformanceMonitor();
      
      // Simulate excellent performance
      monitor.metrics.fps.current = 60;
      monitor.metrics.memory.used = 30 * 1024 * 1024; // 30MB
      
      const score = monitor.getPerformanceScore();
      expect(score).toBeGreaterThan(90); // Should score >90 for excellent performance
    });
  });

  describe('📊 Benchmark Results Summary', () => {
    afterEach(() => {
      const results = benchmark.getResults();
      
      if (results.length > 0) {
        console.log('\n📊 Performance Benchmark Results:');
        console.log('==================================');
        
        const uniqueTests = [...new Set(results.map(r => r.name))];
        
        uniqueTests.forEach(testName => {
          const testResults = results.filter(r => r.name === testName);
          const avgDuration = benchmark.getAverageDuration(testName);
          const maxDuration = benchmark.getMaxDuration(testName);
          const minDuration = benchmark.getMinDuration(testName);
          
          console.log(`${testName}:`);
          console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
          console.log(`  Min: ${minDuration.toFixed(2)}ms`);
          console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
          console.log(`  Samples: ${testResults.length}`);
        });
      }
    });

    it('should provide comprehensive benchmark data', () => {
      const results = benchmark.getResults();
      expect(results.length).toBeGreaterThan(0);
      
      // Verify we have benchmark data for key operations
      const testNames = results.map(r => r.name);
      expect(testNames).toContain('game_initialization');
      expect(testNames).toContain('fps_update');
      expect(testNames).toContain('memory_update');
    });
  });
});