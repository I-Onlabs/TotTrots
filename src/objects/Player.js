/**
 * Player.js - Player character class with accessibility support
 * 
 * This class represents the player character and handles:
 * - Player movement and physics
 * - Input handling
 * - State management
 * - Accessibility features
 * - Event emission for achievements and challenges
 */

export class Player {
    constructor(config = {}) {
        // Player properties
        this.id = config.id || this.generateId();
        this.name = config.name || 'Player';
        this.type = 'player';
        
        // Position and movement
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.z = config.z || 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        
        // Physics properties
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.depth = config.depth || 32;
        this.mass = config.mass || 1.0;
        this.friction = config.friction || 0.8;
        this.gravity = config.gravity || 0.5;
        this.maxSpeed = config.maxSpeed || 5.0;
        this.jumpPower = config.jumpPower || 12.0;
        
        // State
        this.isGrounded = false;
        this.isJumping = false;
        this.isRunning = false;
        this.isCrouching = false;
        this.isAlive = true;
        this.health = config.health || 100;
        this.maxHealth = config.maxHealth || 100;
        this.lives = config.lives || 3;
        this.score = config.score || 0;
        this.level = config.level || 1;
        
        // Input state
        this.inputState = {
            left: false,
            right: false,
            up: false,
            down: false,
            jump: false,
            run: false,
            crouch: false,
            interact: false
        };
        
        // Statistics
        this.stats = {
            distanceTraveled: 0,
            jumpsPerformed: 0,
            itemsCollected: 0,
            enemiesDefeated: 0,
            timeAlive: 0,
            perfectRuns: 0,
            combos: 0,
            maxCombo: 0
        };
        
        // Accessibility features
        this.accessibility = {
            announceMovement: false,
            announceHealth: true,
            announceScore: true,
            announceItems: true,
            announceLevel: true
        };
        
        // Event callbacks
        this.eventCallbacks = new Map();
        
        // Animation state
        this.animationState = 'idle';
        this.animationFrame = 0;
        this.animationTime = 0;
        
        // Collision detection
        this.collisionBox = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
        
        // Last position for movement calculation
        this.lastX = this.x;
        this.lastY = this.y;
        
        this.logger = config.logger || console;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update player
     */
    update(deltaTime) {
        if (!this.isAlive) return;

        // Update time alive
        this.stats.timeAlive += deltaTime;

        // Apply gravity
        if (!this.isGrounded) {
            this.velocityY += this.gravity;
        }

        // Apply friction
        this.velocityX *= this.friction;
        this.velocityZ *= this.friction;

        // Update position
        this.lastX = this.x;
        this.lastY = this.y;
        
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.z += this.velocityZ;

        // Update collision box
        this.updateCollisionBox();

        // Update distance traveled
        const distance = Math.sqrt(
            Math.pow(this.x - this.lastX, 2) + 
            Math.pow(this.y - this.lastY, 2)
        );
        this.stats.distanceTraveled += distance;

        // Update animation
        this.updateAnimation(deltaTime);

        // Check boundaries
        this.checkBoundaries();

        // Emit movement events
        this.emitMovementEvents();
    }

    /**
     * Handle input
     */
    handleInput(inputType, data) {
        if (!this.isAlive) return;

        switch (inputType) {
            case 'keyDown':
                this.handleKeyDown(data);
                break;
            case 'keyUp':
                this.handleKeyUp(data);
                break;
            case 'mouseDown':
                this.handleMouseDown(data);
                break;
            case 'mouseUp':
                this.handleMouseUp(data);
                break;
            case 'touchStart':
                this.handleTouchStart(data);
                break;
            case 'touchEnd':
                this.handleTouchEnd(data);
                break;
            case 'gamepadButton':
                this.handleGamepadButton(data);
                break;
            case 'gamepadAxis':
                this.handleGamepadAxis(data);
                break;
        }
    }

    /**
     * Handle key down
     */
    handleKeyDown(data) {
        const key = data.key;
        
        switch (key) {
            case 'KeyA':
            case 'ArrowLeft':
                this.inputState.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.inputState.right = true;
                break;
            case 'KeyW':
            case 'ArrowUp':
                this.inputState.up = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.inputState.down = true;
                break;
            case 'Space':
                this.inputState.jump = true;
                this.jump();
                break;
            case 'ShiftLeft':
                this.inputState.run = true;
                break;
            case 'KeyC':
                this.inputState.crouch = true;
                this.crouch();
                break;
            case 'KeyE':
                this.inputState.interact = true;
                this.interact();
                break;
        }
    }

    /**
     * Handle key up
     */
    handleKeyUp(data) {
        const key = data.key;
        
        switch (key) {
            case 'KeyA':
            case 'ArrowLeft':
                this.inputState.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.inputState.right = false;
                break;
            case 'KeyW':
            case 'ArrowUp':
                this.inputState.up = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.inputState.down = false;
                break;
            case 'Space':
                this.inputState.jump = false;
                break;
            case 'ShiftLeft':
                this.inputState.run = false;
                break;
            case 'KeyC':
                this.inputState.crouch = false;
                this.uncrouch();
                break;
            case 'KeyE':
                this.inputState.interact = false;
                break;
        }
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(data) {
        // Handle mouse interactions
        if (data.button === 0) { // Left click
            this.interact();
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(data) {
        // Handle mouse release
    }

    /**
     * Handle touch start
     */
    handleTouchStart(data) {
        // Handle touch interactions
        if (data.touches.length === 1) {
            this.interact();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(data) {
        // Handle touch release
    }

    /**
     * Handle gamepad button
     */
    handleGamepadButton(data) {
        const button = data.button;
        
        switch (button) {
            case 0: // A button
                this.jump();
                break;
            case 1: // B button
                this.interact();
                break;
            case 2: // X button
                this.crouch();
                break;
            case 3: // Y button
                this.run();
                break;
        }
    }

    /**
     * Handle gamepad axis
     */
    handleGamepadAxis(data) {
        const axis = data.axis;
        const value = data.value;
        
        switch (axis) {
            case 0: // Left stick X
                if (Math.abs(value) > 0.1) {
                    this.inputState.left = value < 0;
                    this.inputState.right = value > 0;
                } else {
                    this.inputState.left = false;
                    this.inputState.right = false;
                }
                break;
            case 1: // Left stick Y
                if (Math.abs(value) > 0.1) {
                    this.inputState.up = value < 0;
                    this.inputState.down = value > 0;
                } else {
                    this.inputState.up = false;
                    this.inputState.down = false;
                }
                break;
        }
    }

    /**
     * Move player
     */
    move() {
        const speed = this.isRunning ? this.maxSpeed * 1.5 : this.maxSpeed;
        
        if (this.inputState.left) {
            this.velocityX = -speed;
            this.animationState = 'walking';
        } else if (this.inputState.right) {
            this.velocityX = speed;
            this.animationState = 'walking';
        } else {
            this.velocityX = 0;
            this.animationState = 'idle';
        }
        
        if (this.inputState.up) {
            this.velocityZ = -speed;
        } else if (this.inputState.down) {
            this.velocityZ = speed;
        } else {
            this.velocityZ = 0;
        }
    }

    /**
     * Jump
     */
    jump() {
        if (this.isGrounded && !this.isJumping) {
            this.velocityY = -this.jumpPower;
            this.isJumping = true;
            this.isGrounded = false;
            this.stats.jumpsPerformed++;
            this.animationState = 'jumping';
            
            this.emit('player:jumped', {
                player: this,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Crouch
     */
    crouch() {
        if (!this.isCrouching) {
            this.isCrouching = true;
            this.height = this.height * 0.5;
            this.animationState = 'crouching';
            
            this.emit('player:crouched', {
                player: this,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Un-crouch
     */
    uncrouch() {
        if (this.isCrouching) {
            this.isCrouching = false;
            this.height = this.height * 2;
            this.animationState = 'idle';
            
            this.emit('player:uncrouched', {
                player: this,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Run
     */
    run() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animationState = 'running';
            
            this.emit('player:running', {
                player: this,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Stop running
     */
    stopRunning() {
        if (this.isRunning) {
            this.isRunning = false;
            this.animationState = 'idle';
            
            this.emit('player:stoppedRunning', {
                player: this,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Interact
     */
    interact() {
        this.emit('player:interacted', {
            player: this,
            x: this.x,
            y: this.y,
            timestamp: Date.now()
        });
    }

    /**
     * Take damage
     */
    takeDamage(amount, source = null) {
        if (!this.isAlive) return;

        this.health = Math.max(0, this.health - amount);
        
        this.emit('player:damaged', {
            player: this,
            damage: amount,
            health: this.health,
            source: source,
            timestamp: Date.now()
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    /**
     * Heal
     */
    heal(amount) {
        if (!this.isAlive) return;

        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        this.emit('player:healed', {
            player: this,
            amount: amount,
            health: this.health,
            timestamp: Date.now()
        });
    }

    /**
     * Die
     */
    die() {
        if (!this.isAlive) return;

        this.isAlive = false;
        this.lives = Math.max(0, this.lives - 1);
        this.animationState = 'dead';
        
        this.emit('player:died', {
            player: this,
            lives: this.lives,
            timestamp: Date.now()
        });

        if (this.lives > 0) {
            // Respawn after delay
            setTimeout(() => {
                this.respawn();
            }, 2000);
        } else {
            this.emit('player:gameOver', {
                player: this,
                finalScore: this.score,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Respawn
     */
    respawn() {
        this.isAlive = true;
        this.health = this.maxHealth;
        this.x = 0;
        this.y = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.animationState = 'idle';
        
        this.emit('player:respawned', {
            player: this,
            timestamp: Date.now()
        });
    }

    /**
     * Add score
     */
    addScore(amount, source = null) {
        const oldScore = this.score;
        this.score += amount;
        
        this.emit('player:scoreChanged', {
            player: this,
            scoreChange: amount,
            score: this.score,
            source: source,
            timestamp: Date.now()
        });
    }

    /**
     * Collect item
     */
    collectItem(item) {
        this.stats.itemsCollected++;
        
        // Add item score
        if (item.scoreValue) {
            this.addScore(item.scoreValue, 'item');
        }
        
        // Apply item effects
        if (item.effects) {
            this.applyItemEffects(item.effects);
        }
        
        this.emit('player:itemCollected', {
            player: this,
            item: item,
            itemType: item.type,
            scoreValue: item.scoreValue,
            timestamp: Date.now()
        });
    }

    /**
     * Apply item effects
     */
    applyItemEffects(effects) {
        if (effects.health) {
            this.heal(effects.health);
        }
        if (effects.speed) {
            this.maxSpeed *= effects.speed;
            setTimeout(() => {
                this.maxSpeed /= effects.speed;
            }, effects.duration || 5000);
        }
        if (effects.jumpPower) {
            this.jumpPower *= effects.jumpPower;
            setTimeout(() => {
                this.jumpPower /= effects.jumpPower;
            }, effects.duration || 5000);
        }
    }

    /**
     * Level up
     */
    levelUp() {
        this.level++;
        this.maxHealth += 10;
        this.health = this.maxHealth;
        this.maxSpeed += 0.5;
        
        this.emit('player:levelUp', {
            player: this,
            level: this.level,
            timestamp: Date.now()
        });
    }

    /**
     * Complete level
     */
    completeLevel() {
        this.emit('player:levelCompleted', {
            player: this,
            level: this.level,
            score: this.score,
            timestamp: Date.now()
        });
    }

    /**
     * Update collision box
     */
    updateCollisionBox() {
        this.collisionBox.x = this.x;
        this.collisionBox.y = this.y;
        this.collisionBox.width = this.width;
        this.collisionBox.height = this.height;
    }

    /**
     * Check boundaries
     */
    checkBoundaries() {
        // Simple boundary checking - would be more complex in a real game
        if (this.y > 1000) {
            this.takeDamage(100, 'fall');
        }
    }

    /**
     * Update animation
     */
    updateAnimation(deltaTime) {
        this.animationTime += deltaTime;
        
        // Simple animation system
        const animationSpeed = 100; // ms per frame
        if (this.animationTime >= animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTime = 0;
        }
    }

    /**
     * Emit movement events
     */
    emitMovementEvents() {
        // Emit movement events for accessibility
        if (this.accessibility.announceMovement) {
            const moved = Math.abs(this.x - this.lastX) > 1 || Math.abs(this.y - this.lastY) > 1;
            if (moved) {
                this.emit('player:moved', {
                    player: this,
                    x: this.x,
                    y: this.y,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error('Error in player event callback:', error);
                }
            });
        }
    }

    /**
     * Get player state
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            z: this.z,
            health: this.health,
            maxHealth: this.maxHealth,
            lives: this.lives,
            score: this.score,
            level: this.level,
            isAlive: this.isAlive,
            isGrounded: this.isGrounded,
            isJumping: this.isJumping,
            isRunning: this.isRunning,
            isCrouching: this.isCrouching,
            animationState: this.animationState,
            stats: { ...this.stats }
        };
    }

    /**
     * Set player state
     */
    setState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.z = state.z || this.z;
        this.health = state.health || this.health;
        this.maxHealth = state.maxHealth || this.maxHealth;
        this.lives = state.lives || this.lives;
        this.score = state.score || this.score;
        this.level = state.level || this.level;
        this.isAlive = state.isAlive !== undefined ? state.isAlive : this.isAlive;
        this.isGrounded = state.isGrounded !== undefined ? state.isGrounded : this.isGrounded;
        this.isJumping = state.isJumping !== undefined ? state.isJumping : this.isJumping;
        this.isRunning = state.isRunning !== undefined ? state.isRunning : this.isRunning;
        this.isCrouching = state.isCrouching !== undefined ? state.isCrouching : this.isCrouching;
        this.animationState = state.animationState || this.animationState;
        
        if (state.stats) {
            this.stats = { ...this.stats, ...state.stats };
        }
    }

    /**
     * Destroy player
     */
    destroy() {
        this.eventCallbacks.clear();
        this.isAlive = false;
    }
}

export default Player;