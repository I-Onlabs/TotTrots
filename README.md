# TotTrots - Game Refactoring Project

A comprehensive game architecture refactoring project featuring modular design, cross-cutting concerns integration, and advanced accessibility features.

## 🎮 Project Overview

This project demonstrates a complete refactoring of a game architecture with the following key features:

- **Modular Component Architecture** with explicit lifecycle management
- **Dependency Injection** for loose coupling and testability
- **Cross-cutting Features** integration (achievements, daily challenges, accessibility)
- **Event-driven Architecture** with centralized event management
- **Comprehensive Logging** and performance monitoring
- **Accessibility Support** with screen reader compatibility and keyboard navigation

## 🏗️ Architecture

### Core Components

#### GameRefactored.js
The main game controller that orchestrates all systems:
- Central game state management
- Manager initialization and lifecycle
- Cross-cutting feature integration
- Event-driven communication between systems

#### Managers
- **GameManager.js** - Core game logic, level progression, score management
- **AchievementManager.js** - Achievement system with gameplay integration
- **DailyChallengeManager.js** - Daily challenge generation and tracking
- **AccessibilityManager.js** - Accessibility features and screen reader support

#### Core Utilities
- **EventBus.js** - Centralized event management system
- **Logger.js** - Comprehensive logging with performance monitoring

## 🚀 Features

### Cross-cutting Concerns Integration

#### Achievements System
- **Score-based achievements** - Track player scoring milestones
- **Level-based achievements** - Reward level completion
- **Collection achievements** - Track item collection progress
- **Time-based achievements** - Speed and endurance challenges
- **Combo achievements** - Reward skill-based gameplay
- **Special achievements** - Perfect runs and comeback scenarios

#### Daily Challenges
- **Dynamic challenge generation** - New challenges every day
- **Multiple challenge types** - Score, level, collection, combo, time, survival
- **Difficulty scaling** - Easy, medium, hard challenge variants
- **Reward system** - Points and coins for completion
- **Progress tracking** - Real-time progress updates

#### Accessibility Features
- **Screen reader support** - Full ARIA compatibility
- **High contrast mode** - Enhanced visibility
- **Colorblind support** - Multiple colorblind modes
- **Keyboard navigation** - Complete keyboard accessibility
- **Audio cues** - Sound feedback for actions
- **Text scaling** - Adjustable text size
- **Motion reduction** - Reduced animations for sensitivity
- **Focus management** - Proper focus handling

### Modular Architecture

#### Dependency Injection
All managers receive their dependencies through constructor injection:
```javascript
const gameManager = new GameManager({
    eventBus: this.eventBus,
    logger: this.logger,
    config: this.config
});
```

#### Explicit Lifecycle Management
Each manager implements a clear lifecycle:
- `initialize()` - Setup and configuration
- `update(deltaTime, gameState)` - Per-frame updates
- `cleanup()` - Resource cleanup and persistence

#### Event-driven Communication
Managers communicate through a centralized event bus:
```javascript
// Emit events
this.eventBus.emit('player:scoreChanged', { score: 1000 });

// Listen for events
this.eventBus.on('player:scoreChanged', this.handleScoreChange.bind(this));
```

## 📁 Project Structure

```
src/
├── GameRefactored.js          # Main game controller
├── managers/
│   ├── GameManager.js         # Core game management
│   ├── AchievementManager.js  # Achievement system
│   ├── DailyChallengeManager.js # Daily challenges
│   └── AccessibilityManager.js # Accessibility features
├── core/
│   └── EventBus.js           # Event management system
└── utils/
    └── Logger.js             # Logging utility
```

## 🛠️ Usage

### Basic Setup
```javascript
import GameRefactored from './src/GameRefactored.js';

const game = new GameRefactored({
    debug: true,
    enableAchievements: true,
    enableDailyChallenges: true,
    enableAccessibility: true
});

// Start the game
await game.start();
```

### Configuration Options
```javascript
const config = {
    debug: false,                    // Enable debug logging
    enableAchievements: true,        // Enable achievement system
    enableDailyChallenges: true,     // Enable daily challenges
    enableAccessibility: true        // Enable accessibility features
};
```

### Event Handling
```javascript
// Listen for game events
game.eventBus.on('game:started', (data) => {
    console.log('Game started!');
});

// Listen for achievement unlocks
game.eventBus.on('achievement:unlocked', (data) => {
    console.log(`Achievement unlocked: ${data.name}`);
});
```

## 🎯 Key Benefits

### Maintainability
- **Separation of Concerns** - Each manager handles specific functionality
- **Loose Coupling** - Dependencies injected, not hardcoded
- **Clear Interfaces** - Well-defined APIs between components

### Testability
- **Dependency Injection** - Easy to mock dependencies for testing
- **Event-driven** - Components can be tested in isolation
- **Explicit Lifecycles** - Clear setup and teardown for tests

### Extensibility
- **Plugin Architecture** - New managers can be easily added
- **Event System** - New features can listen to existing events
- **Configuration-driven** - Features can be enabled/disabled via config

### Accessibility
- **WCAG Compliance** - Follows web accessibility guidelines
- **Screen Reader Support** - Full compatibility with assistive technologies
- **Keyboard Navigation** - Complete keyboard accessibility
- **Customizable** - Users can adjust settings to their needs

## 🔧 Development

### Adding New Managers
1. Create a new manager class in `src/managers/`
2. Implement the required lifecycle methods
3. Add dependency injection in `GameRefactored.js`
4. Set up event communication

### Adding New Events
1. Define event names with consistent naming convention
2. Emit events from appropriate managers
3. Listen for events in consuming managers
4. Document event data structure

### Adding New Accessibility Features
1. Add settings to `AccessibilityManager.settings`
2. Implement the feature logic
3. Add UI controls for configuration
4. Test with screen readers and keyboard navigation

## 📊 Performance Monitoring

The system includes comprehensive performance monitoring:
- **Event processing times** - Track event bus performance
- **Logging metrics** - Monitor logging overhead
- **Memory usage** - Track memory consumption
- **Function execution times** - Profile critical functions

## 🧪 Testing

The modular architecture makes testing straightforward:
- **Unit tests** - Test individual managers in isolation
- **Integration tests** - Test manager interactions
- **Event tests** - Test event flow and data
- **Accessibility tests** - Test with assistive technologies

## 📝 License

This project is part of a code quality and architecture refactoring demonstration.

## 🤝 Contributing

This is a demonstration project showcasing advanced JavaScript architecture patterns and accessibility implementation.