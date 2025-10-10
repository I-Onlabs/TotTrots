import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'game-core': ['src/GameRefactored.js'],
          'game-systems': [
            'src/systems/CombatSystem.js',
            'src/systems/AudioSystem.js',
            'src/systems/ARPGUISystem.js',
            'src/systems/ItemizationSystem.js',
            'src/systems/ProceduralAreaSystem.js',
            'src/systems/EndgameSystem.js',
            'src/systems/TradingSystem.js'
          ],
          'game-managers': [
            'src/managers/GameManager.js',
            'src/managers/AchievementManager.js',
            'src/managers/DailyChallengeManager.js',
            'src/managers/AccessibilityManager.js'
          ],
          'game-core-utils': [
            'src/core/EventBus.js',
            'src/core/ConfigManager.js',
            'src/core/ErrorHandler.js',
            'src/core/InputManager.js',
            'src/core/PerformanceMonitor.js',
            'src/core/PersistenceManager.js'
          ]
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: true
  },
  plugins: [
    legacy({
      targets: ['> 1%', 'last 2 versions', 'not dead'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@managers': resolve(__dirname, 'src/managers'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'src/styles')
    }
  },
  css: {
    devSourcemap: true
  },
  optimizeDeps: {
    include: [
      'src/GameRefactored.js',
      'src/ARPGIntegration.js'
    ]
  }
});