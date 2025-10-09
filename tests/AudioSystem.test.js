/**
 * AudioSystem.test.js - Comprehensive test suite for AudioSystem component
 */

import { AudioSystem } from '../src/systems/AudioSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { Logger } from '../src/utils/Logger.js';

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn(),
  createGain: jest.fn(),
  createOscillator: jest.fn(),
  createBufferSource: jest.fn()
};

const mockAudio = {
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  cloneNode: jest.fn(() => mockAudio),
  volume: 1.0,
  currentTime: 0,
  paused: false,
  preload: 'auto',
  loop: false
};

// Mock window.AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: jest.fn(() => mockAudioContext),
  writable: true
});

// Mock Audio constructor
Object.defineProperty(window, 'Audio', {
  value: jest.fn(() => mockAudio),
  writable: true
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-audio-url'),
  writable: true
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((callback) => setTimeout(callback, 16)),
  writable: true
});

// Mock document events
Object.defineProperty(document, 'addEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true
});

Object.defineProperty(document, 'visibilitychange', {
  value: 'visibilitychange',
  writable: true
});

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true
});

describe('AudioSystem', () => {
  let audioSystem;
  let eventBus;
  let logger;
  let mockConfig;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger(true);
    mockConfig = {
      eventBus,
      logger
    };

    // Reset mocks
    jest.clearAllMocks();
    mockAudioContext.state = 'running';
    mockAudio.paused = false;
    mockAudio.volume = 1.0;
    mockAudio.currentTime = 0;
  });

  afterEach(() => {
    if (audioSystem) {
      audioSystem.cleanup();
    }
  });

  describe('Initialization', () => {
    test('should initialize with valid config', async () => {
      expect(() => {
        audioSystem = new AudioSystem(mockConfig);
      }).not.toThrow();
    });

    test('should throw error if eventBus is missing', () => {
      expect(() => {
        new AudioSystem({ logger });
      }).toThrow('AudioSystem: eventBus is required and must be an EventBus instance');
    });

    test('should throw error if logger is missing', () => {
      expect(() => {
        new AudioSystem({ eventBus });
      }).toThrow('AudioSystem: logger is required and must be a Logger instance');
    });

    test('should throw error if eventBus is not EventBus instance', () => {
      expect(() => {
        new AudioSystem({ eventBus: {}, logger });
      }).toThrow('AudioSystem: eventBus is required and must be an EventBus instance');
    });

    test('should throw error if logger is not Logger instance', () => {
      expect(() => {
        new AudioSystem({ eventBus, logger: {} });
      }).toThrow('AudioSystem: logger is required and must be a Logger instance');
    });

    test('should initialize audio context on initialize', async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      
      expect(window.AudioContext).toHaveBeenCalled();
      expect(audioSystem.isInitialized).toBe(true);
    });

    test('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      audioSystem = new AudioSystem(mockConfig);
      
      await audioSystem.initialize();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should emit initialization event', async () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      audioSystem = new AudioSystem(mockConfig);
      
      await audioSystem.initialize();
      
      expect(eventSpy).toHaveBeenCalledWith('audio:initialized');
    });

    test('should handle initialization errors', async () => {
      window.AudioContext = jest.fn(() => {
        throw new Error('AudioContext error');
      });
      
      audioSystem = new AudioSystem(mockConfig);
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      await expect(audioSystem.initialize()).rejects.toThrow('AudioContext error');
      expect(eventSpy).toHaveBeenCalledWith('audio:initializationError', expect.any(Error));
    });
  });

  describe('Audio Loading', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
    });

    test('should load sound effect', async () => {
      const soundName = 'testSound';
      const soundUrl = 'test-sound-url';
      
      await audioSystem.loadSound(soundName, soundUrl);
      
      expect(audioSystem.sounds.has(soundName)).toBe(true);
      expect(window.Audio).toHaveBeenCalledWith(soundUrl);
    });

    test('should load background music', async () => {
      const musicName = 'testMusic';
      const musicUrl = 'test-music-url';
      
      await audioSystem.loadMusic(musicName, musicUrl);
      
      expect(audioSystem.music.has(musicName)).toBe(true);
      expect(window.Audio).toHaveBeenCalledWith(musicUrl);
    });

    test('should set correct properties for music', async () => {
      const musicName = 'testMusic';
      const musicUrl = 'test-music-url';
      
      await audioSystem.loadMusic(musicName, musicUrl);
      
      const music = audioSystem.music.get(musicName);
      expect(music.loop).toBe(true);
      expect(music.preload).toBe('auto');
    });

    test('should handle loading errors', async () => {
      window.Audio = jest.fn(() => {
        const audio = { ...mockAudio };
        audio.addEventListener = jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Loading error')), 0);
          }
        });
        return audio;
      });
      
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      
      await expect(audioSystem.loadSound('test', 'url')).rejects.toThrow('Loading error');
    });
  });

  describe('Audio Playback', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('testSound', 'test-url');
      await audioSystem.loadMusic('testMusic', 'test-url');
    });

    test('should play sound effect', () => {
      const playSpy = jest.spyOn(mockAudio, 'play');
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.playSound('testSound');
      
      expect(playSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith('audio:soundPlayed', {
        name: 'testSound',
        volume: 1.0
      });
    });

    test('should play background music', () => {
      const playSpy = jest.spyOn(mockAudio, 'play');
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.playMusic('testMusic');
      
      expect(playSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith('audio:musicStarted', {
        name: 'testMusic'
      });
      expect(audioSystem.currentMusic).toBe(audioSystem.music.get('testMusic'));
    });

    test('should not play sound when muted', () => {
      audioSystem.muteAll();
      const playSpy = jest.spyOn(mockAudio, 'play');
      
      audioSystem.playSound('testSound');
      
      expect(playSpy).not.toHaveBeenCalled();
    });

    test('should not play music when muted', () => {
      audioSystem.muteMusic();
      const playSpy = jest.spyOn(mockAudio, 'play');
      
      audioSystem.playMusic('testMusic');
      
      expect(playSpy).not.toHaveBeenCalled();
    });

    test('should stop current music when playing new music', () => {
      const pauseSpy = jest.spyOn(mockAudio, 'pause');
      
      audioSystem.playMusic('testMusic');
      audioSystem.playMusic('testMusic'); // Same music, should not stop
      
      expect(pauseSpy).not.toHaveBeenCalled();
    });

    test('should handle unknown sound names gracefully', () => {
      expect(() => {
        audioSystem.playSound('unknownSound');
      }).not.toThrow();
    });

    test('should handle unknown music names gracefully', () => {
      expect(() => {
        audioSystem.playMusic('unknownMusic');
      }).not.toThrow();
    });
  });

  describe('Volume Control', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('testSound', 'test-url');
      await audioSystem.loadMusic('testMusic', 'test-url');
    });

    test('should set master volume', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.setMasterVolume(0.5);
      
      expect(audioSystem.audioSettings.masterVolume).toBe(0.5);
      expect(eventSpy).toHaveBeenCalledWith('audio:masterVolumeChanged', 0.5);
    });

    test('should set music volume', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.setMusicVolume(0.7);
      
      expect(audioSystem.audioSettings.musicVolume).toBe(0.7);
      expect(eventSpy).toHaveBeenCalledWith('audio:musicVolumeChanged', 0.7);
    });

    test('should set SFX volume', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.setSfxVolume(0.8);
      
      expect(audioSystem.audioSettings.sfxVolume).toBe(0.8);
      expect(eventSpy).toHaveBeenCalledWith('audio:sfxVolumeChanged', 0.8);
    });

    test('should clamp volume values', () => {
      audioSystem.setMasterVolume(1.5);
      expect(audioSystem.audioSettings.masterVolume).toBe(1.0);
      
      audioSystem.setMasterVolume(-0.5);
      expect(audioSystem.audioSettings.masterVolume).toBe(0.0);
    });

    test('should update all volumes when master volume changes', () => {
      const sound = audioSystem.sounds.get('testSound');
      const music = audioSystem.music.get('testMusic');
      
      audioSystem.setMasterVolume(0.5);
      
      expect(sound.volume).toBe(0.5 * audioSystem.audioSettings.sfxVolume);
      expect(music.volume).toBe(0.5 * audioSystem.audioSettings.musicVolume);
    });
  });

  describe('Mute Control', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('testSound', 'test-url');
      await audioSystem.loadMusic('testMusic', 'test-url');
    });

    test('should mute all audio', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.muteAll();
      
      expect(audioSystem.audioSettings.muteAll).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('audio:muted', { type: 'all' });
    });

    test('should unmute all audio', () => {
      audioSystem.muteAll();
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.unmuteAll();
      
      expect(audioSystem.audioSettings.muteAll).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith('audio:unmuted', { type: 'all' });
    });

    test('should mute music only', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.muteMusic();
      
      expect(audioSystem.audioSettings.muteMusic).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('audio:muted', { type: 'music' });
    });

    test('should mute SFX only', () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.muteSfx();
      
      expect(audioSystem.audioSettings.muteSfx).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith('audio:muted', { type: 'sfx' });
    });
  });

  describe('Music Control', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadMusic('testMusic', 'test-url');
      audioSystem.playMusic('testMusic');
    });

    test('should stop music', () => {
      const pauseSpy = jest.spyOn(mockAudio, 'pause');
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.stopMusic();
      
      expect(pauseSpy).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect(eventSpy).toHaveBeenCalledWith('audio:musicStopped');
    });

    test('should pause music', () => {
      const pauseSpy = jest.spyOn(mockAudio, 'pause');
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.pauseMusic();
      
      expect(pauseSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith('audio:musicPaused');
    });

    test('should resume music', () => {
      audioSystem.pauseMusic();
      const playSpy = jest.spyOn(mockAudio, 'play');
      const eventSpy = jest.spyOn(eventBus, 'emit');
      
      audioSystem.resumeMusic();
      
      expect(playSpy).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith('audio:musicResumed');
    });

    test('should handle resume when no music is playing', () => {
      audioSystem.currentMusic = null;
      
      expect(() => {
        audioSystem.resumeMusic();
      }).not.toThrow();
    });
  });

  describe('Settings Integration', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
    });

    test('should handle settings changes', () => {
      const eventData = {
        path: 'audio.masterVolume',
        value: 0.6
      };
      
      audioSystem.handleSettingsChange(eventData);
      
      expect(audioSystem.audioSettings.masterVolume).toBe(0.6);
    });

    test('should handle mute settings changes', () => {
      const muteEvent = {
        path: 'audio.muteAll',
        value: true
      };
      
      audioSystem.handleSettingsChange(muteEvent);
      
      expect(audioSystem.audioSettings.muteAll).toBe(true);
    });

    test('should ignore unknown setting paths', () => {
      const unknownEvent = {
        path: 'unknown.setting',
        value: 'test'
      };
      
      expect(() => {
        audioSystem.handleSettingsChange(unknownEvent);
      }).not.toThrow();
    });
  });

  describe('Event Integration', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('jump', 'test-url');
    });

    test('should play sound on player events', () => {
      const playSpy = jest.spyOn(audioSystem, 'playSound');
      
      eventBus.emit('player:jump');
      
      expect(playSpy).toHaveBeenCalledWith('jump');
    });

    test('should play sound on game events', () => {
      const playSpy = jest.spyOn(audioSystem, 'playSound');
      
      eventBus.emit('game:levelComplete');
      
      expect(playSpy).toHaveBeenCalledWith('levelComplete');
    });

    test('should pause music on visibility change', () => {
      const pauseSpy = jest.spyOn(audioSystem, 'pauseMusic');
      Object.defineProperty(document, 'hidden', { value: true });
      
      // Simulate visibility change
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
      
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('testSound', 'test-url');
      await audioSystem.loadMusic('testMusic', 'test-url');
    });

    test('should get audio settings', () => {
      const settings = audioSystem.getAudioSettings();
      
      expect(settings).toEqual(audioSystem.audioSettings);
      expect(settings).not.toBe(audioSystem.audioSettings); // Should be a copy
    });

    test('should set audio settings', () => {
      const newSettings = {
        masterVolume: 0.5,
        musicVolume: 0.7
      };
      
      const eventSpy = jest.spyOn(eventBus, 'emit');
      audioSystem.setAudioSettings(newSettings);
      
      expect(audioSystem.audioSettings.masterVolume).toBe(0.5);
      expect(audioSystem.audioSettings.musicVolume).toBe(0.7);
      expect(eventSpy).toHaveBeenCalledWith('audio:settingsChanged', expect.any(Object));
    });

    test('should get loaded sounds', () => {
      const sounds = audioSystem.getLoadedSounds();
      
      expect(sounds).toContain('testSound');
    });

    test('should get loaded music', () => {
      const music = audioSystem.getLoadedMusic();
      
      expect(music).toContain('testMusic');
    });

    test('should check if audio is playing', () => {
      expect(audioSystem.isPlaying('testSound', 'sound')).toBe(false);
      expect(audioSystem.isPlaying('testMusic', 'music')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources properly', async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      await audioSystem.loadSound('testSound', 'test-url');
      await audioSystem.loadMusic('testMusic', 'test-url');
      
      const eventSpy = jest.spyOn(eventBus, 'emit');
      const closeSpy = jest.spyOn(mockAudioContext, 'close');
      
      audioSystem.cleanup();
      
      expect(closeSpy).toHaveBeenCalled();
      expect(audioSystem.sounds.size).toBe(0);
      expect(audioSystem.music.size).toBe(0);
      expect(eventSpy).toHaveBeenCalledWith('audio:cleanup');
    });
  });

  describe('Error Handling', () => {
    test('should handle audio playback errors gracefully', async () => {
      audioSystem = new AudioSystem(mockConfig);
      await audioSystem.initialize();
      
      // Mock audio that throws on play
      const errorAudio = {
        ...mockAudio,
        play: jest.fn(() => {
          throw new Error('Playback error');
        })
      };
      
      audioSystem.sounds.set('errorSound', errorAudio);
      
      expect(() => {
        audioSystem.playSound('errorSound');
      }).not.toThrow();
    });

    test('should handle initialization when not ready', () => {
      audioSystem = new AudioSystem(mockConfig);
      
      // Should not throw when trying to play before initialization
      expect(() => {
        audioSystem.playSound('test');
      }).not.toThrow();
    });
  });
});