/**
 * Logger.test.js - Unit tests for Logger class
 *
 * Tests:
 * - Log level filtering
 * - Message filtering (anti-spam)
 * - Performance metrics
 * - Log history management
 * - Context handling
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
import { Logger } from '../src/utils/Logger.js';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

// Replace console methods
Object.assign(console, mockConsole);

describe('Logger', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger(false);
  });

  afterEach(() => {
    if (logger) {
      logger.clearHistory();
    }
  });

  describe('Initialization', () => {
    it('should initialize with debug disabled by default', () => {
      expect(logger.debug).toBe(false);
      expect(logger.logLevel).toBe('info');
    });

    it('should initialize with debug enabled when specified', () => {
      const debugLogger = new Logger(true);
      expect(debugLogger.debug).toBe(true);
      expect(debugLogger.logLevel).toBe('debug');
    });

    it('should initialize performance metrics', () => {
      expect(logger.performanceMetrics).toBeDefined();
      expect(logger.performanceMetrics.totalLogs).toBe(0);
      expect(logger.performanceMetrics.logsByLevel).toBeInstanceOf(Map);
    });
  });

  describe('Log Level Management', () => {
    it('should set log level correctly', () => {
      logger.setLevel('warn');
      expect(logger.logLevel).toBe('warn');
    });

    it('should warn on invalid log level', () => {
      logger.setLevel('invalid');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Invalid log level: invalid'
      );
    });

    it('should enable debug mode', () => {
      logger.enableDebug();
      expect(logger.debug).toBe(true);
      expect(logger.logLevel).toBe('debug');
    });

    it('should disable debug mode', () => {
      logger.disableDebug();
      expect(logger.debug).toBe(false);
      expect(logger.logLevel).toBe('info');
    });
  });

  describe('Log Level Filtering', () => {
    it('should log messages at or below current level', () => {
      logger.setLevel('warn');

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should not log messages above current level', () => {
      logger.setLevel('error');

      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('Message Filtering (Anti-spam)', () => {
    it('should filter repetitive save/load messages', () => {
      logger.setLevel('debug');

      logger.debug('Auto-save completed', null, 'SaveSystem');
      logger.debug('Save data loaded', null, 'SaveManager');
      logger.debug('Load slot 1', null, 'SaveSystem');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should filter repetitive shop messages', () => {
      logger.setLevel('debug');

      logger.debug('Shop data saved', null, 'ShopSystem');
      logger.debug('Currency updated', null, 'ShopSystem');
      logger.debug('Daily deals generated', null, 'ShopSystem');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should filter repetitive game object messages', () => {
      logger.setLevel('debug');

      logger.debug('Game object spawned', null, 'GameScene');
      logger.debug('Enemy spawned', null, 'EndlessModeScene');
      logger.debug('Item spawned', null, 'GameScene');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should not filter non-repetitive messages', () => {
      logger.setLevel('debug');

      logger.debug('System initialized', null, 'SaveSystem');
      logger.debug('Shop opened', null, 'ShopSystem');
      logger.debug('Player moved', null, 'GameScene');

      expect(mockConsole.debug).toHaveBeenCalledTimes(3);
    });

    it('should not filter non-debug messages', () => {
      logger.setLevel('info');

      logger.info('Auto-save completed', null, 'SaveSystem');
      logger.warn('Save data corrupted', null, 'SaveManager');
      logger.error('Load failed', null, 'SaveSystem');

      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Log Methods', () => {
    it('should log error messages', () => {
      logger.error('Test error', { code: 500 });

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        'Test error',
        { code: 500 }
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning', { value: 42 });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
        'Test warning',
        { value: 42 }
      );
    });

    it('should log info messages', () => {
      logger.info('Test info');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        'Test info',
        ''
      );
    });

    it('should log debug messages', () => {
      logger.setLevel('debug');
      logger.debug('Test debug', { data: 'test' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
        'Test debug',
        { data: 'test' }
      );
    });

    it('should log trace messages', () => {
      logger.setLevel('trace');
      logger.trace('Test trace');

      expect(mockConsole.trace).toHaveBeenCalledWith(
        expect.stringContaining('TRACE'),
        'Test trace',
        ''
      );
    });
  });

  describe('Context Handling', () => {
    it('should include context in log output', () => {
      logger.info('Test message', null, 'TestContext');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestContext]'),
        'Test message',
        ''
      );
    });

    it('should handle null context', () => {
      logger.info('Test message', null, null);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringContaining('['),
        'Test message',
        ''
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      logger.info('Test message');
      logger.warn('Test warning');
      logger.error('Test error');

      expect(logger.performanceMetrics.totalLogs).toBe(3);
      expect(logger.performanceMetrics.logsByLevel.get('info')).toBe(1);
      expect(logger.performanceMetrics.logsByLevel.get('warn')).toBe(1);
      expect(logger.performanceMetrics.logsByLevel.get('error')).toBe(1);
    });

    it('should log performance metrics', () => {
      const duration = logger.performance('test operation', 1000, 1500);

      expect(duration).toBe(500);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test operation took 500.00ms')
      );
    });

    it('should log memory usage', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024,
        },
        writable: true,
      });

      logger.setLevel('debug');
      logger.memory();

      expect(mockConsole.debug).toHaveBeenCalledWith(
        'Memory usage:',
        expect.objectContaining({
          used: '50MB',
          total: '100MB',
          limit: '200MB',
        })
      );
    });
  });

  describe('Function Logging', () => {
    it('should log function execution', () => {
      const testFunction = jest.fn().mockReturnValue('result');

      const result = logger.function(
        'testFunction',
        testFunction,
        'TestContext'
      );

      expect(result).toBe('result');
      expect(testFunction).toHaveBeenCalled();
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Function started: testFunction'),
        null,
        'TestContext'
      );
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Function completed: testFunction'),
        expect.objectContaining({ duration: expect.any(Number) }),
        'TestContext'
      );
    });

    it('should log function errors', () => {
      const testFunction = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        logger.function('testFunction', testFunction, 'TestContext');
      }).toThrow('Test error');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Function failed: testFunction'),
        expect.objectContaining({
          error: 'Test error',
          duration: expect.any(Number),
        }),
        'TestContext'
      );
    });

    it('should log async function execution', async () => {
      const testFunction = jest.fn().mockResolvedValue('async result');

      const result = await logger.functionAsync(
        'testAsyncFunction',
        testFunction,
        'TestContext'
      );

      expect(result).toBe('async result');
      expect(testFunction).toHaveBeenCalled();
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Async function started: testAsyncFunction'),
        null,
        'TestContext'
      );
    });
  });

  describe('Log History Management', () => {
    it('should add logs to history', () => {
      logger.info('Test message');

      const history = logger.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test message');
      expect(history[0].level).toBe('info');
    });

    it('should maintain history size limit', () => {
      logger.maxHistorySize = 3;

      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');
      logger.info('Message 4');

      const history = logger.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Message 2'); // First message should be removed
    });

    it('should filter history by level', () => {
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const errorHistory = logger.getHistory({ level: 'error' });
      expect(errorHistory).toHaveLength(1);
      expect(errorHistory[0].message).toBe('Error message');
    });

    it('should filter history by context', () => {
      logger.info('Message 1', null, 'Context1');
      logger.info('Message 2', null, 'Context2');

      const contextHistory = logger.getHistory({ context: 'Context1' });
      expect(contextHistory).toHaveLength(1);
      expect(contextHistory[0].message).toBe('Message 1');
    });

    it('should clear history', () => {
      logger.info('Test message');
      logger.clearHistory();

      const history = logger.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Export/Import', () => {
    it('should export logs to JSON', () => {
      logger.info('Test message', { data: 'test' });

      const json = logger.exportLogs();
      const exported = JSON.parse(json);

      expect(exported).toHaveLength(1);
      expect(exported[0].message).toBe('Test message');
      expect(exported[0].data).toEqual({ data: 'test' });
    });

    it('should import logs from JSON', () => {
      const logs = [
        { level: 'info', message: 'Imported message', timestamp: Date.now() },
      ];

      logger.importLogs(JSON.stringify(logs));

      const history = logger.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Imported message');
    });

    it('should handle import errors gracefully', () => {
      logger.importLogs('invalid json');

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to import logs:',
        expect.any(Error)
      );
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      const childLogger = logger.child('ChildContext');

      expect(childLogger).toBeInstanceOf(Logger);
      expect(childLogger.context).toBe('ChildContext');
    });
  });

  describe('Utility Methods', () => {
    it('should log events', () => {
      logger.setLevel('debug');
      logger.event('testEvent', { data: 'test' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Event: testEvent'),
        { data: 'test' },
        null
      );
    });

    it('should log state changes', () => {
      logger.stateChange('oldState', 'newState', { reason: 'test' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        'State changed: oldState -> newState',
        { reason: 'test' },
        null
      );
    });

    it('should log user actions', () => {
      logger.userAction('click', { target: 'button' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        'User action: click',
        { target: 'button' },
        null
      );
    });

    it('should log API calls', () => {
      logger.setLevel('debug');
      logger.apiCall('GET', '/api/test', { params: 'test' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        'API call: GET /api/test',
        { params: 'test' },
        null
      );
    });

    it('should log API responses', () => {
      logger.setLevel('debug');
      logger.apiResponse('GET', '/api/test', 200, { data: 'success' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        'API response: GET /api/test - 200',
        { data: 'success' },
        null
      );
    });

    it('should log errors with stack trace', () => {
      const error = new Error('Test error');
      logger.errorWithStack('Operation failed', error, 'TestContext');

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Operation failed',
        {
          error: 'Test error',
          stack: error.stack,
        },
        'TestContext'
      );
    });
  });
});

export default Logger;
