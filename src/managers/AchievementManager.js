/**
 * AchievementManager.js - Achievement system with gameplay integration
 * 
 * This manager handles:
 * - Achievement definitions and tracking
 * - Progress monitoring
 * - Achievement unlocking
 * - Integration with gameplay events
 */

export class AchievementManager {
    constructor(dependencies = {}) {
        // Dependency injection
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.gameState = dependencies.gameState;

        // Validate required dependencies
        if (!this.eventBus) {
            throw new Error('AchievementManager requires eventBus dependency');
        }
        if (!this.logger) {
            throw new Error('AchievementManager requires logger dependency');
        }

        // Achievement state
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.progress = new Map();

        // Initialize achievements
        this.initializeAchievements();

        // Set up event handlers
        this.setupEventHandlers();

        this.logger.info('AchievementManager initialized');
    }

    /**
     * Initialize the manager
     */
    async initialize() {
        this.logger.info('Initializing AchievementManager...');
        
        // Load saved achievement data
        await this.loadAchievementData();
        
        this.logger.info('AchievementManager initialized successfully');
    }

    /**
     * Cleanup the manager
     */
    cleanup() {
        this.logger.info('Cleaning up AchievementManager...');
        
        // Save achievement data
        this.saveAchievementData();
        
        // Remove event listeners
        this.removeEventHandlers();
        
        this.logger.info('AchievementManager cleaned up');
    }

    /**
     * Update the manager
     */
    update(deltaTime, gameState) {
        // Check for time-based achievements
        this.checkTimeBasedAchievements(gameState);
        
        // Check for combo achievements
        this.checkComboAchievements(gameState);
    }

    /**
     * Initialize achievement definitions
     */
    initializeAchievements() {
        // Score-based achievements
        this.defineAchievement('first_score', {
            name: 'First Steps',
            description: 'Score your first 100 points',
            type: 'score',
            target: 100,
            reward: { score: 50, title: 'Beginner' },
            icon: 'star'
        });

        this.defineAchievement('score_master', {
            name: 'Score Master',
            description: 'Reach 10,000 points',
            type: 'score',
            target: 10000,
            reward: { score: 500, title: 'Score Master' },
            icon: 'trophy'
        });

        this.defineAchievement('high_score_king', {
            name: 'High Score King',
            description: 'Reach 50,000 points',
            type: 'score',
            target: 50000,
            reward: { score: 2000, title: 'High Score King' },
            icon: 'crown'
        });

        // Level-based achievements
        this.defineAchievement('level_5', {
            name: 'Level 5 Complete',
            description: 'Complete level 5',
            type: 'level',
            target: 5,
            reward: { extraLives: 1, title: 'Level 5 Veteran' },
            icon: 'medal'
        });

        this.defineAchievement('level_10', {
            name: 'Level 10 Complete',
            description: 'Complete level 10',
            type: 'level',
            target: 10,
            reward: { score: 1000, title: 'Level 10 Master' },
            icon: 'diamond'
        });

        // Collection achievements
        this.defineAchievement('collector', {
            name: 'Collector',
            description: 'Collect 50 items',
            type: 'collection',
            target: 50,
            reward: { score: 300, title: 'Collector' },
            icon: 'bag'
        });

        this.defineAchievement('hoarder', {
            name: 'Hoarder',
            description: 'Collect 200 items',
            type: 'collection',
            target: 200,
            reward: { score: 1000, title: 'Hoarder' },
            icon: 'treasure'
        });

        // Time-based achievements
        this.defineAchievement('speed_demon', {
            name: 'Speed Demon',
            description: 'Complete a level in under 30 seconds',
            type: 'speed',
            target: 30000, // 30 seconds in milliseconds
            reward: { score: 500, title: 'Speed Demon' },
            icon: 'lightning'
        });

        this.defineAchievement('marathon_runner', {
            name: 'Marathon Runner',
            description: 'Play for 30 minutes straight',
            type: 'playtime',
            target: 1800000, // 30 minutes in milliseconds
            reward: { score: 1000, title: 'Marathon Runner' },
            icon: 'clock'
        });

        // Combo achievements
        this.defineAchievement('combo_master', {
            name: 'Combo Master',
            description: 'Achieve a 10x combo',
            type: 'combo',
            target: 10,
            reward: { score: 200, title: 'Combo Master' },
            icon: 'fire'
        });

        this.defineAchievement('combo_legend', {
            name: 'Combo Legend',
            description: 'Achieve a 25x combo',
            type: 'combo',
            target: 25,
            reward: { score: 1000, title: 'Combo Legend' },
            icon: 'explosion'
        });

        // Special achievements
        this.defineAchievement('perfect_level', {
            name: 'Perfect Level',
            description: 'Complete a level without taking damage',
            type: 'perfect',
            target: 1,
            reward: { score: 750, title: 'Perfect Player' },
            icon: 'shield'
        });

        this.defineAchievement('comeback_kid', {
            name: 'Comeback Kid',
            description: 'Complete a level with only 1 life remaining',
            type: 'comeback',
            target: 1,
            reward: { score: 500, title: 'Comeback Kid' },
            icon: 'heart'
        });
    }

    /**
     * Define an achievement
     */
    defineAchievement(id, definition) {
        this.achievements.set(id, {
            id,
            ...definition,
            unlocked: false,
            unlockedAt: null,
            progress: 0
        });
        
        // Initialize progress tracking
        this.progress.set(id, 0);
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Score events
        this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));
        
        // Level events
        this.eventBus.on('player:levelCompleted', this.handleLevelCompleted.bind(this));
        
        // Collection events
        this.eventBus.on('player:itemCollected', this.handleItemCollected.bind(this));
        
        // Game events
        this.eventBus.on('game:started', this.handleGameStarted.bind(this));
        this.eventBus.on('level:completed', this.handleLevelCompleted.bind(this));
        
        // Combo events
        this.eventBus.on('player:comboChanged', this.handleComboChanged.bind(this));
        
        // Damage events
        this.eventBus.on('player:damaged', this.handlePlayerDamaged.bind(this));
    }

    /**
     * Remove event handlers
     */
    removeEventHandlers() {
        this.eventBus.removeListener('player:scoreChanged', this.handleScoreChange.bind(this));
        this.eventBus.removeListener('player:levelCompleted', this.handleLevelCompleted.bind(this));
        this.eventBus.removeListener('player:itemCollected', this.handleItemCollected.bind(this));
        this.eventBus.removeListener('game:started', this.handleGameStarted.bind(this));
        this.eventBus.removeListener('level:completed', this.handleLevelCompleted.bind(this));
        this.eventBus.removeListener('player:comboChanged', this.handleComboChanged.bind(this));
        this.eventBus.removeListener('player:damaged', this.handlePlayerDamaged.bind(this));
    }

    /**
     * Handle score changes
     */
    handleScoreChange(data) {
        const currentScore = this.gameState().score;
        this.checkScoreAchievements(currentScore);
    }

    /**
     * Handle level completion
     */
    handleLevelCompleted(data) {
        this.checkLevelAchievements(data.level);
        this.checkSpeedAchievements(data.time);
        this.checkPerfectLevelAchievements(data);
    }

    /**
     * Handle item collection
     */
    handleItemCollected(data) {
        this.checkCollectionAchievements(data.itemType);
    }

    /**
     * Handle game start
     */
    handleGameStarted(data) {
        this.gameStartTime = data.timestamp;
    }

    /**
     * Handle combo changes
     */
    handleComboChanged(data) {
        this.checkComboAchievements(data.combo);
    }

    /**
     * Handle player damage
     */
    handlePlayerDamaged(data) {
        this.currentLevelPerfect = false;
    }

    /**
     * Check score-based achievements
     */
    checkScoreAchievements(currentScore) {
        this.checkAchievementsByType('score', currentScore);
    }

    /**
     * Check level-based achievements
     */
    checkLevelAchievements(level) {
        this.checkAchievementsByType('level', level);
    }

    /**
     * Check collection-based achievements
     */
    checkCollectionAchievements(itemType) {
        // Increment collection count
        const currentCount = this.progress.get('collector') || 0;
        this.progress.set('collector', currentCount + 1);
        
        this.checkAchievementsByType('collection', this.progress.get('collector'));
    }

    /**
     * Check speed-based achievements
     */
    checkSpeedAchievements(levelTime) {
        this.checkAchievementsByType('speed', levelTime);
    }

    /**
     * Check combo-based achievements
     */
    checkComboAchievements(combo) {
        this.checkAchievementsByType('combo', combo);
    }

    /**
     * Check time-based achievements
     */
    checkTimeBasedAchievements(gameState) {
        if (this.gameStartTime) {
            const playTime = Date.now() - this.gameStartTime;
            this.checkAchievementsByType('playtime', playTime);
        }
    }

    /**
     * Check combo achievements
     */
    checkComboAchievements(gameState) {
        // This would check for combo achievements based on game state
        // Implementation depends on how combos are tracked in the game
    }

    /**
     * Check perfect level achievements
     */
    checkPerfectLevelAchievements(levelData) {
        if (levelData.perfect) {
            this.checkAchievementsByType('perfect', 1);
        }
    }

    /**
     * Check achievements by type
     */
    checkAchievementsByType(type, value) {
        for (const [id, achievement] of this.achievements) {
            if (achievement.type === type && !achievement.unlocked) {
                if (value >= achievement.target) {
                    this.unlockAchievement(id);
                } else {
                    // Update progress
                    this.progress.set(id, value);
                    achievement.progress = value;
                }
            }
        }
    }

    /**
     * Unlock an achievement
     */
    unlockAchievement(id) {
        const achievement = this.achievements.get(id);
        if (!achievement || achievement.unlocked) {
            return;
        }

        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        this.unlockedAchievements.add(id);

        this.logger.info(`Achievement unlocked: ${achievement.name}`);

        // Emit achievement unlocked event
        this.eventBus.emit('achievement:unlocked', {
            id,
            name: achievement.name,
            description: achievement.description,
            reward: achievement.reward,
            icon: achievement.icon,
            timestamp: Date.now()
        });

        // Apply reward
        this.applyAchievementReward(achievement);
    }

    /**
     * Apply achievement reward
     */
    applyAchievementReward(achievement) {
        if (!achievement.reward) return;

        const reward = achievement.reward;

        // Score reward
        if (reward.score) {
            this.eventBus.emit('player:scoreChanged', {
                scoreChange: reward.score,
                source: 'achievement',
                achievementId: achievement.id
            });
        }

        // Extra lives reward
        if (reward.extraLives) {
            this.eventBus.emit('player:livesChanged', {
                livesChange: reward.extraLives,
                source: 'achievement',
                achievementId: achievement.id
            });
        }

        // Title reward
        if (reward.title) {
            this.eventBus.emit('player:titleChanged', {
                title: reward.title,
                source: 'achievement',
                achievementId: achievement.id
            });
        }

        // Special effects
        if (reward.effects) {
            this.eventBus.emit('game:achievementEffect', {
                effects: reward.effects,
                achievementId: achievement.id
            });
        }
    }

    /**
     * Get achievement by ID
     */
    getAchievement(id) {
        return this.achievements.get(id);
    }

    /**
     * Get all achievements
     */
    getAllAchievements() {
        return Array.from(this.achievements.values());
    }

    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements() {
        return Array.from(this.achievements.values()).filter(a => a.unlocked);
    }

    /**
     * Get achievement progress
     */
    getAchievementProgress(id) {
        const achievement = this.achievements.get(id);
        if (!achievement) return null;

        return {
            id,
            name: achievement.name,
            description: achievement.description,
            progress: achievement.progress,
            target: achievement.target,
            percentage: Math.min((achievement.progress / achievement.target) * 100, 100),
            unlocked: achievement.unlocked
        };
    }

    /**
     * Get all achievement progress
     */
    getAllAchievementProgress() {
        const progress = [];
        for (const [id, achievement] of this.achievements) {
            progress.push(this.getAchievementProgress(id));
        }
        return progress;
    }

    /**
     * Load achievement data from storage
     */
    async loadAchievementData() {
        try {
            const savedData = localStorage.getItem('achievementData');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Restore unlocked achievements
                if (data.unlocked) {
                    data.unlocked.forEach(id => {
                        if (this.achievements.has(id)) {
                            this.achievements.get(id).unlocked = true;
                            this.unlockedAchievements.add(id);
                        }
                    });
                }
                
                // Restore progress
                if (data.progress) {
                    for (const [id, progress] of Object.entries(data.progress)) {
                        if (this.achievements.has(id)) {
                            this.achievements.get(id).progress = progress;
                            this.progress.set(id, progress);
                        }
                    }
                }
                
                this.logger.info('Achievement data loaded from storage');
            }
        } catch (error) {
            this.logger.error('Failed to load achievement data:', error);
        }
    }

    /**
     * Save achievement data to storage
     */
    saveAchievementData() {
        try {
            const data = {
                unlocked: Array.from(this.unlockedAchievements),
                progress: Object.fromEntries(this.progress)
            };
            localStorage.setItem('achievementData', JSON.stringify(data));
            this.logger.info('Achievement data saved to storage');
        } catch (error) {
            this.logger.error('Failed to save achievement data:', error);
        }
    }

    /**
     * Reset all achievements
     */
    resetAchievements() {
        this.unlockedAchievements.clear();
        this.progress.clear();
        
        for (const [id, achievement] of this.achievements) {
            achievement.unlocked = false;
            achievement.unlockedAt = null;
            achievement.progress = 0;
            this.progress.set(id, 0);
        }
        
        this.logger.info('All achievements reset');
    }
}

export default AchievementManager;