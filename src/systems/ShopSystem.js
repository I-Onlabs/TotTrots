/**
 * ShopSystem.js - Comprehensive Shop and Commerce System
 *
 * This system handles:
 * - Item shop management
 * - Player transactions
 * - Currency management
 * - Inventory integration
 * - Shop UI management
 * - Price calculations and discounts
 */

export class ShopSystem {
  constructor(dependencies = {}) {
    // Dependency injection
    this.eventBus = dependencies.eventBus;
    this.logger = dependencies.logger;
    this.config = dependencies.config;

    // Validate required dependencies
    if (!this.eventBus) {
      throw new Error('ShopSystem requires eventBus dependency');
    }
    if (!this.logger) {
      throw new Error('ShopSystem requires logger dependency');
    }

    // Shop state
    this.state = {
      isOpen: false,
      currentShop: null,
      playerCurrency: {
        coins: 1000,
        gems: 50,
        tokens: 0
      },
      shopInventory: new Map(),
      playerInventory: new Map(),
      cart: new Map(),
      discounts: new Map(),
      reputation: 0,
      shopLevel: 1,
      unlockedShops: new Set(['basic']),
      dailyDeals: new Map(),
      lastDailyReset: null
    };

    // Shop configuration
    this.shopConfig = {
      maxShopItems: 20,
      refreshInterval: 300000, // 5 minutes
      dailyDealCount: 3,
      reputationLevels: [
        { level: 0, name: 'Novice', discount: 0 },
        { level: 1, name: 'Regular', discount: 0.05 },
        { level: 2, name: 'Valued', discount: 0.10 },
        { level: 3, name: 'VIP', discount: 0.15 },
        { level: 4, name: 'Elite', discount: 0.20 }
      ],
      currencyTypes: ['coins', 'gems', 'tokens'],
      shopTypes: {
        basic: {
          name: 'Basic Shop',
          level: 1,
          items: ['health_potion', 'mana_potion', 'basic_weapon', 'basic_armor']
        },
        advanced: {
          name: 'Advanced Shop',
          level: 3,
          items: ['advanced_weapon', 'advanced_armor', 'skill_book', 'magic_item']
        },
        premium: {
          name: 'Premium Shop',
          level: 5,
          items: ['legendary_weapon', 'legendary_armor', 'rare_gem', 'special_item']
        }
      }
    };

    // Item database
    this.itemDatabase = this.initializeItemDatabase();

    // Set up event handlers
    this.setupEventHandlers();

    this.logger.info('ShopSystem initialized');
  }

  /**
   * Initialize the system
   */
  async initialize() {
    this.logger.info('Initializing ShopSystem...');

    // Load shop data
    await this.loadShopData();

    // Generate daily deals
    this.generateDailyDeals();

    // Initialize shop inventory
    this.initializeShopInventory();

    this.logger.info('ShopSystem initialized successfully');
  }

  /**
   * Cleanup the system
   */
  cleanup() {
    this.logger.info('Cleaning up ShopSystem...');

    // Save shop data
    this.saveShopData();

    // Remove event listeners
    this.removeEventHandlers();

    this.logger.info('ShopSystem cleaned up');
  }

  /**
   * Update the system
   */
  update(deltaTime, gameState) {
    // Update shop refresh timer
    this.updateShopRefresh(deltaTime);

    // Update daily deals
    this.updateDailyDeals(deltaTime);

    // Update reputation
    this.updateReputation(deltaTime);
  }

  /**
   * Initialize item database
   */
  initializeItemDatabase() {
    return {
      // Consumables
      health_potion: {
        id: 'health_potion',
        name: 'Health Potion',
        type: 'consumable',
        rarity: 'common',
        price: { coins: 50 },
        effects: { health: 50 },
        description: 'Restores 50 health points',
        stackable: true,
        maxStack: 99
      },
      mana_potion: {
        id: 'mana_potion',
        name: 'Mana Potion',
        type: 'consumable',
        rarity: 'common',
        price: { coins: 75 },
        effects: { mana: 50 },
        description: 'Restores 50 mana points',
        stackable: true,
        maxStack: 99
      },
      // Weapons
      basic_weapon: {
        id: 'basic_weapon',
        name: 'Iron Sword',
        type: 'weapon',
        rarity: 'common',
        price: { coins: 200 },
        stats: { damage: 15, speed: 1.0 },
        description: 'A basic iron sword',
        level: 1
      },
      advanced_weapon: {
        id: 'advanced_weapon',
        name: 'Steel Blade',
        type: 'weapon',
        rarity: 'uncommon',
        price: { coins: 500, gems: 5 },
        stats: { damage: 25, speed: 1.2 },
        description: 'A well-crafted steel blade',
        level: 3
      },
      legendary_weapon: {
        id: 'legendary_weapon',
        name: 'Dragon Slayer',
        type: 'weapon',
        rarity: 'legendary',
        price: { gems: 100, tokens: 10 },
        stats: { damage: 50, speed: 1.5, critical: 0.2 },
        description: 'A legendary weapon forged in dragon fire',
        level: 10
      },
      // Armor
      basic_armor: {
        id: 'basic_armor',
        name: 'Leather Armor',
        type: 'armor',
        rarity: 'common',
        price: { coins: 150 },
        stats: { defense: 10, health: 20 },
        description: 'Basic leather protection',
        level: 1
      },
      advanced_armor: {
        id: 'advanced_armor',
        name: 'Chain Mail',
        type: 'armor',
        rarity: 'uncommon',
        price: { coins: 400, gems: 3 },
        stats: { defense: 20, health: 40 },
        description: 'Sturdy chain mail armor',
        level: 3
      },
      legendary_armor: {
        id: 'legendary_armor',
        name: 'Dragon Scale Armor',
        type: 'armor',
        rarity: 'legendary',
        price: { gems: 80, tokens: 8 },
        stats: { defense: 40, health: 100, resistance: 0.1 },
        description: 'Armor crafted from dragon scales',
        level: 10
      },
      // Special items
      skill_book: {
        id: 'skill_book',
        name: 'Skill Book',
        type: 'special',
        rarity: 'rare',
        price: { coins: 1000, gems: 10 },
        effects: { skillPoints: 1 },
        description: 'Increases available skill points',
        level: 5
      },
      magic_item: {
        id: 'magic_item',
        name: 'Magic Ring',
        type: 'accessory',
        rarity: 'rare',
        price: { gems: 25 },
        stats: { mana: 30, manaRegen: 0.5 },
        description: 'A ring that enhances magical abilities',
        level: 5
      },
      rare_gem: {
        id: 'rare_gem',
        name: 'Rare Gem',
        type: 'gem',
        rarity: 'epic',
        price: { gems: 50, tokens: 5 },
        effects: { socketable: true, power: 10 },
        description: 'A rare gem that can be socketed into equipment',
        level: 8
      },
      special_item: {
        id: 'special_item',
        name: 'Special Item',
        type: 'special',
        rarity: 'legendary',
        price: { tokens: 20 },
        effects: { special: true },
        description: 'A mysterious special item',
        level: 10
      }
    };
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Shop events
    this.eventBus.on('shop:open', this.handleShopOpen.bind(this));
    this.eventBus.on('shop:close', this.handleShopClose.bind(this));
    this.eventBus.on('shop:buy', this.handleBuyItem.bind(this));
    this.eventBus.on('shop:sell', this.handleSellItem.bind(this));
    this.eventBus.on('shop:refresh', this.handleShopRefresh.bind(this));

    // Currency events
    this.eventBus.on('currency:changed', this.handleCurrencyChanged.bind(this));
    this.eventBus.on('currency:earned', this.handleCurrencyEarned.bind(this));
    this.eventBus.on('currency:spent', this.handleCurrencySpent.bind(this));

    // Inventory events
    this.eventBus.on('inventory:itemAdded', this.handleItemAdded.bind(this));
    this.eventBus.on('inventory:itemRemoved', this.handleItemRemoved.bind(this));

    // Player events
    this.eventBus.on('player:levelUp', this.handlePlayerLevelUp.bind(this));
    this.eventBus.on('player:reputationChanged', this.handleReputationChanged.bind(this));
  }

  /**
   * Remove event handlers
   */
  removeEventHandlers() {
    this.eventBus.removeListener('shop:open', this.handleShopOpen.bind(this));
    this.eventBus.removeListener('shop:close', this.handleShopClose.bind(this));
    this.eventBus.removeListener('shop:buy', this.handleBuyItem.bind(this));
    this.eventBus.removeListener('shop:sell', this.handleSellItem.bind(this));
    this.eventBus.removeListener('shop:refresh', this.handleShopRefresh.bind(this));
    this.eventBus.removeListener('currency:changed', this.handleCurrencyChanged.bind(this));
    this.eventBus.removeListener('currency:earned', this.handleCurrencyEarned.bind(this));
    this.eventBus.removeListener('currency:spent', this.handleCurrencySpent.bind(this));
    this.eventBus.removeListener('inventory:itemAdded', this.handleItemAdded.bind(this));
    this.eventBus.removeListener('inventory:itemRemoved', this.handleItemRemoved.bind(this));
    this.eventBus.removeListener('player:levelUp', this.handlePlayerLevelUp.bind(this));
    this.eventBus.removeListener('player:reputationChanged', this.handleReputationChanged.bind(this));
  }

  /**
   * Open shop
   */
  openShop(shopType = 'basic') {
    if (!this.state.unlockedShops.has(shopType)) {
      this.logger.warn(`Shop type ${shopType} not unlocked`);
      return false;
    }

    this.state.isOpen = true;
    this.state.currentShop = shopType;

    // Generate shop inventory
    this.generateShopInventory(shopType);

    this.eventBus.emit('shop:opened', {
      shopType: shopType,
      inventory: this.getShopInventory(),
      playerCurrency: this.state.playerCurrency,
      timestamp: Date.now()
    });

    this.logger.info(`Shop opened: ${shopType}`);
    return true;
  }

  /**
   * Close shop
   */
  closeShop() {
    this.state.isOpen = false;
    this.state.currentShop = null;
    this.state.cart.clear();

    this.eventBus.emit('shop:closed', {
      timestamp: Date.now()
    });

    this.logger.info('Shop closed');
  }

  /**
   * Buy item
   */
  buyItem(itemId, quantity = 1) {
    if (!this.state.isOpen) {
      this.logger.warn('Shop is not open');
      return false;
    }

    const shopItem = this.state.shopInventory.get(itemId);
    if (!shopItem) {
      this.logger.warn(`Item ${itemId} not found in shop`);
      return false;
    }

    const totalPrice = this.calculatePrice(shopItem, quantity);
    if (!this.canAfford(totalPrice)) {
      this.logger.warn('Insufficient currency');
      return false;
    }

    // Deduct currency
    this.deductCurrency(totalPrice);

    // Add to player inventory
    this.addToPlayerInventory(itemId, quantity, shopItem);

    // Remove from shop inventory
    this.removeFromShopInventory(itemId, quantity);

    this.eventBus.emit('shop:itemBought', {
      itemId: itemId,
      quantity: quantity,
      price: totalPrice,
      timestamp: Date.now()
    });

    this.logger.info(`Bought ${quantity}x ${itemId} for ${JSON.stringify(totalPrice)}`);
    return true;
  }

  /**
   * Sell item
   */
  sellItem(itemId, quantity = 1) {
    const playerItem = this.state.playerInventory.get(itemId);
    if (!playerItem) {
      this.logger.warn(`Item ${itemId} not found in player inventory`);
      return false;
    }

    if (playerItem.quantity < quantity) {
      this.logger.warn(`Not enough ${itemId} to sell`);
      return false;
    }

    const sellPrice = this.calculateSellPrice(itemId, quantity);
    
    // Add currency
    this.addCurrency(sellPrice);

    // Remove from player inventory
    this.removeFromPlayerInventory(itemId, quantity);

    this.eventBus.emit('shop:itemSold', {
      itemId: itemId,
      quantity: quantity,
      price: sellPrice,
      timestamp: Date.now()
    });

    this.logger.info(`Sold ${quantity}x ${itemId} for ${JSON.stringify(sellPrice)}`);
    return true;
  }

  /**
   * Calculate item price
   */
  calculatePrice(item, quantity = 1) {
    const basePrice = { ...item.price };
    const discount = this.getDiscount();
    
    // Apply discount
    for (const currency in basePrice) {
      basePrice[currency] = Math.floor(basePrice[currency] * (1 - discount) * quantity);
    }

    return basePrice;
  }

  /**
   * Calculate sell price
   */
  calculateSellPrice(itemId, quantity = 1) {
    const item = this.itemDatabase[itemId];
    if (!item) return { coins: 0 };

    const sellPrice = { ...item.price };
    
    // Sell for 50% of buy price
    for (const currency in sellPrice) {
      sellPrice[currency] = Math.floor(sellPrice[currency] * 0.5 * quantity);
    }

    return sellPrice;
  }

  /**
   * Get discount based on reputation
   */
  getDiscount() {
    const reputationLevel = this.getReputationLevel();
    return this.shopConfig.reputationLevels[reputationLevel].discount;
  }

  /**
   * Get reputation level
   */
  getReputationLevel() {
    for (let i = this.shopConfig.reputationLevels.length - 1; i >= 0; i--) {
      if (this.state.reputation >= i * 100) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Check if player can afford price
   */
  canAfford(price) {
    for (const currency in price) {
      if (this.state.playerCurrency[currency] < price[currency]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Deduct currency
   */
  deductCurrency(price) {
    for (const currency in price) {
      this.state.playerCurrency[currency] -= price[currency];
    }

    this.eventBus.emit('currency:spent', {
      amount: price,
      newBalance: this.state.playerCurrency,
      timestamp: Date.now()
    });
  }

  /**
   * Add currency
   */
  addCurrency(amount) {
    for (const currency in amount) {
      this.state.playerCurrency[currency] += amount[currency];
    }

    this.eventBus.emit('currency:earned', {
      amount: amount,
      newBalance: this.state.playerCurrency,
      timestamp: Date.now()
    });
  }

  /**
   * Add to player inventory
   */
  addToPlayerInventory(itemId, quantity, itemData) {
    const existingItem = this.state.playerInventory.get(itemId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.state.playerInventory.set(itemId, {
        ...itemData,
        quantity: quantity
      });
    }

    this.eventBus.emit('inventory:itemAdded', {
      itemId: itemId,
      quantity: quantity,
      item: itemData,
      timestamp: Date.now()
    });
  }

  /**
   * Remove from player inventory
   */
  removeFromPlayerInventory(itemId, quantity) {
    const item = this.state.playerInventory.get(itemId);
    if (!item) return;

    item.quantity -= quantity;
    
    if (item.quantity <= 0) {
      this.state.playerInventory.delete(itemId);
    }

    this.eventBus.emit('inventory:itemRemoved', {
      itemId: itemId,
      quantity: quantity,
      timestamp: Date.now()
    });
  }

  /**
   * Add to shop inventory
   */
  addToShopInventory(itemId, quantity, itemData) {
    this.state.shopInventory.set(itemId, {
      ...itemData,
      quantity: quantity
    });
  }

  /**
   * Remove from shop inventory
   */
  removeFromShopInventory(itemId, quantity) {
    const item = this.state.shopInventory.get(itemId);
    if (!item) return;

    item.quantity -= quantity;
    
    if (item.quantity <= 0) {
      this.state.shopInventory.delete(itemId);
    }
  }

  /**
   * Generate shop inventory
   */
  generateShopInventory(shopType) {
    this.state.shopInventory.clear();
    
    const shopConfig = this.shopConfig.shopTypes[shopType];
    if (!shopConfig) return;

    const availableItems = shopConfig.items;
    const itemCount = Math.min(availableItems.length, this.shopConfig.maxShopItems);

    for (let i = 0; i < itemCount; i++) {
      const itemId = availableItems[i];
      const itemData = this.itemDatabase[itemId];
      
      if (itemData) {
        const quantity = itemData.stackable ? Math.floor(Math.random() * 10) + 1 : 1;
        this.addToShopInventory(itemId, quantity, itemData);
      }
    }

    // Add daily deals
    this.addDailyDealsToShop();
  }

  /**
   * Add daily deals to shop
   */
  addDailyDealsToShop() {
    for (const [itemId, deal] of this.state.dailyDeals) {
      this.addToShopInventory(itemId, deal.quantity, {
        ...deal.item,
        price: deal.price,
        isDailyDeal: true
      });
    }
  }

  /**
   * Generate daily deals
   */
  generateDailyDeals() {
    const today = new Date().toDateString();
    
    if (this.state.lastDailyReset === today) {
      return; // Already generated today
    }

    this.state.dailyDeals.clear();
    this.state.lastDailyReset = today;

    const allItems = Object.values(this.itemDatabase);
    const dealCount = Math.min(this.shopConfig.dailyDealCount, allItems.length);

    for (let i = 0; i < dealCount; i++) {
      const item = allItems[Math.floor(Math.random() * allItems.length)];
      const discount = 0.3 + Math.random() * 0.4; // 30-70% discount
      const quantity = item.stackable ? Math.floor(Math.random() * 5) + 1 : 1;
      
      const dealPrice = { ...item.price };
      for (const currency in dealPrice) {
        dealPrice[currency] = Math.floor(dealPrice[currency] * discount);
      }

      this.state.dailyDeals.set(item.id, {
        item: item,
        price: dealPrice,
        quantity: quantity,
        discount: discount
      });
    }

    this.logger.info(`Generated ${dealCount} daily deals`);
  }

  /**
   * Initialize shop inventory
   */
  initializeShopInventory() {
    this.generateShopInventory('basic');
  }

  /**
   * Update shop refresh
   */
  updateShopRefresh(deltaTime) {
    // Shop refresh logic
  }

  /**
   * Update daily deals
   */
  updateDailyDeals(deltaTime) {
    const today = new Date().toDateString();
    if (this.state.lastDailyReset !== today) {
      this.generateDailyDeals();
    }
  }

  /**
   * Update reputation
   */
  updateReputation(deltaTime) {
    // Reputation update logic
  }

  /**
   * Get shop inventory
   */
  getShopInventory() {
    return Array.from(this.state.shopInventory.values());
  }

  /**
   * Get player inventory
   */
  getPlayerInventory() {
    return Array.from(this.state.playerInventory.values());
  }

  /**
   * Get player currency
   */
  getPlayerCurrency() {
    return { ...this.state.playerCurrency };
  }

  /**
   * Get daily deals
   */
  getDailyDeals() {
    return Array.from(this.state.dailyDeals.values());
  }

  /**
   * Load shop data
   */
  async loadShopData() {
    try {
      const savedData = localStorage.getItem('shopSystemData');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.state = { ...this.state, ...data };
        this.logger.info('Shop data loaded');
      }
    } catch (error) {
      this.logger.error('Failed to load shop data:', error);
    }
  }

  /**
   * Save shop data
   */
  saveShopData() {
    try {
      const data = {
        playerCurrency: this.state.playerCurrency,
        reputation: this.state.reputation,
        shopLevel: this.state.shopLevel,
        unlockedShops: Array.from(this.state.unlockedShops),
        lastDailyReset: this.state.lastDailyReset
      };
      
      localStorage.setItem('shopSystemData', JSON.stringify(data));
      this.logger.info('Shop data saved');
    } catch (error) {
      this.logger.error('Failed to save shop data:', error);
    }
  }

  // Event handlers
  handleShopOpen(data) {
    this.openShop(data.shopType);
  }

  handleShopClose(data) {
    this.closeShop();
  }

  handleBuyItem(data) {
    this.buyItem(data.itemId, data.quantity);
  }

  handleSellItem(data) {
    this.sellItem(data.itemId, data.quantity);
  }

  handleShopRefresh(data) {
    this.generateShopInventory(this.state.currentShop);
  }

  handleCurrencyChanged(data) {
    this.state.playerCurrency = { ...this.state.playerCurrency, ...data.currency };
  }

  handleCurrencyEarned(data) {
    this.addCurrency(data.amount);
  }

  handleCurrencySpent(data) {
    this.deductCurrency(data.amount);
  }

  handleItemAdded(data) {
    // Handle item added to inventory
  }

  handleItemRemoved(data) {
    // Handle item removed from inventory
  }

  handlePlayerLevelUp(data) {
    // Unlock new shops based on level
    if (data.level >= 3 && !this.state.unlockedShops.has('advanced')) {
      this.state.unlockedShops.add('advanced');
      this.logger.info('Advanced shop unlocked');
    }
    
    if (data.level >= 5 && !this.state.unlockedShops.has('premium')) {
      this.state.unlockedShops.add('premium');
      this.logger.info('Premium shop unlocked');
    }
  }

  handleReputationChanged(data) {
    this.state.reputation = data.reputation;
  }

  /**
   * Get shop state
   */
  getState() {
    return { ...this.state };
  }
}

export default ShopSystem;