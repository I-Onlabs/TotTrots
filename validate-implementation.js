/**
 * validate-implementation.js - Final validation script for the refactored architecture
 *
 * This script validates:
 * - All required files exist
 * - Dependencies are properly injected
 * - Event handlers are correctly set up
 * - Lifecycle methods are implemented
 * - Cross-cutting features are integrated
 */

import fs from 'fs';
import path from 'path';

class ImplementationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  validate() {
    console.log('🔍 Validating Angry Dogs Game Implementation...\n');

    this.validateFileStructure();
    this.validateDependencies();
    this.validateLifecycleMethods();
    this.validateEventHandlers();
    this.validateCrossCuttingFeatures();
    this.validateTestCoverage();

    this.printResults();
    return this.errors.length === 0;
  }

  validateFileStructure() {
    console.log('📁 Validating file structure...');
    
    const requiredFiles = [
      'src/GameRefactored.js',
      'src/managers/GameManager.js',
      'src/managers/AchievementManager.js',
      'src/managers/DailyChallengeManager.js',
      'src/managers/AccessibilityManager.js',
      'src/systems/SaveManager.js',
      'src/systems/ShopSystem.js',
      'src/systems/ARPGUISystem.js',
      'src/scenes/GameScene.js',
      'src/scenes/EndlessModeScene.js',
      'src/utils/Logger.js',
      'src/core/EventBus.js',
      'tests/GameRefactored.test.js',
      'tests/GameManager.test.js',
      'tests/Logger.test.js',
      'tests/Integration.test.js'
    ];

    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.success.push(`✅ ${file} exists`);
      } else {
        this.errors.push(`❌ ${file} missing`);
      }
    });
  }

  validateDependencies() {
    console.log('🔗 Validating dependency injection...');

    const filesToCheck = [
      'src/GameRefactored.js',
      'src/managers/GameManager.js',
      'src/systems/SaveManager.js',
      'src/systems/ShopSystem.js',
      'src/scenes/GameScene.js',
      'src/scenes/EndlessModeScene.js'
    ];

    filesToCheck.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for dependency injection pattern
        if (content.includes('constructor(dependencies = {})') || 
            content.includes('this.eventBus = dependencies.eventBus')) {
          this.success.push(`✅ ${file} uses dependency injection`);
        } else {
          this.warnings.push(`⚠️ ${file} may not use proper dependency injection`);
        }

        // Check for dependency validation
        if (content.includes('if (!this.eventBus)') || 
            content.includes('throw new Error') && content.includes('requires')) {
          this.success.push(`✅ ${file} validates dependencies`);
        } else {
          this.warnings.push(`⚠️ ${file} may not validate dependencies`);
        }
      }
    });
  }

  validateLifecycleMethods() {
    console.log('🔄 Validating lifecycle methods...');

    const filesToCheck = [
      'src/GameRefactored.js',
      'src/managers/GameManager.js',
      'src/systems/SaveManager.js',
      'src/systems/ShopSystem.js',
      'src/scenes/GameScene.js',
      'src/scenes/EndlessModeScene.js'
    ];

    filesToCheck.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        const hasInitialize = content.includes('async initialize()') || content.includes('initialize()');
        const hasUpdate = content.includes('update(');
        const hasCleanup = content.includes('cleanup()');

        if (hasInitialize && hasUpdate && hasCleanup) {
          this.success.push(`✅ ${file} implements full lifecycle`);
        } else {
          this.errors.push(`❌ ${file} missing lifecycle methods`);
        }
      }
    });
  }

  validateEventHandlers() {
    console.log('📡 Validating event handlers...');

    if (fs.existsSync('src/GameRefactored.js')) {
      const content = fs.readFileSync('src/GameRefactored.js', 'utf8');
      
      const requiredEvents = [
        'player:scoreChanged',
        'player:levelCompleted',
        'player:itemCollected',
        'player:comboChanged',
        'achievement:unlocked',
        'dailyChallenge:completed',
        'endless:waveStarted',
        'endless:scoreChanged',
        'endless:comboChanged'
      ];

      requiredEvents.forEach(event => {
        if (content.includes(`'${event}'`)) {
          this.success.push(`✅ Event handler for ${event} exists`);
        } else {
          this.errors.push(`❌ Event handler for ${event} missing`);
        }
      });
    }
  }

  validateCrossCuttingFeatures() {
    console.log('🎯 Validating cross-cutting features integration...');

    if (fs.existsSync('src/GameRefactored.js')) {
      const content = fs.readFileSync('src/GameRefactored.js', 'utf8');
      
      // Check for achievement effects
      if (content.includes('applyAchievementEffects')) {
        this.success.push('✅ Achievement effects integration exists');
      } else {
        this.errors.push('❌ Achievement effects integration missing');
      }

      // Check for challenge effects
      if (content.includes('applyChallengeEffects')) {
        this.success.push('✅ Challenge effects integration exists');
      } else {
        this.errors.push('❌ Challenge effects integration missing');
      }

      // Check for endless mode integration
      if (content.includes('endless:waveStarted') && content.includes('checkSurvivalAchievements')) {
        this.success.push('✅ Endless mode integration exists');
      } else {
        this.errors.push('❌ Endless mode integration missing');
      }
    }
  }

  validateTestCoverage() {
    console.log('🧪 Validating test coverage...');

    const testFiles = [
      'tests/GameRefactored.test.js',
      'tests/GameManager.test.js',
      'tests/Logger.test.js',
      'tests/Integration.test.js'
    ];

    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('describe(') && content.includes('it(')) {
          this.success.push(`✅ ${file} contains proper tests`);
        } else {
          this.warnings.push(`⚠️ ${file} may not contain proper tests`);
        }
      }
    });
  }

  printResults() {
    console.log('\n📊 Validation Results:\n');

    if (this.success.length > 0) {
      console.log('✅ Successes:');
      this.success.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      this.warnings.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    console.log(`📈 Summary:`);
    console.log(`  ✅ Successes: ${this.success.length}`);
    console.log(`  ⚠️ Warnings: ${this.warnings.length}`);
    console.log(`  ❌ Errors: ${this.errors.length}`);

    if (this.errors.length === 0) {
      console.log('\n🎉 All validations passed! Implementation is ready for production.');
    } else {
      console.log('\n💥 Validation failed. Please fix the errors before proceeding.');
    }
  }
}

// Run validation
const validator = new ImplementationValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);