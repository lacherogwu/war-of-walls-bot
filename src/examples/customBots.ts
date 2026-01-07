/**
 * Example custom bot implementations
 *
 * These examples show how to create different bot types
 * using the modular architecture.
 */

import { BaseBot } from '../bots/BaseBot';
import { WarOfWalls } from '../api/WarOfWalls';
import { logger } from '../utils/logger';
import { delay } from '../utils/time';

// ============================================
// Example 1: Simple Rest Bot
// Just rests at a location, useful for health regeneration
// ============================================

export class RestBot extends BaseBot {
	private restLocation: number[];
	private restDuration: number;

	constructor(wowApi: WarOfWalls, restLocation: number[], restDuration: number = 60000) {
		super(wowApi);
		this.restLocation = restLocation;
		this.restDuration = restDuration;
	}

	protected async executeCycle(): Promise<void> {
		this.cycleCount++;

		// Travel to rest location
		await this.travelPath(this.restLocation, 'Going to rest location');

		// Rest for specified duration
		await this.rest(this.restDuration);

		logger.info(`Rest cycle #${this.cycleCount} complete`);
	}

	async start(): Promise<void> {
		logger.info('Rest Bot starting...');
		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				logger.error('Rest bot error:', err);
				await delay(5000);
			}
		}
	}
}

// ============================================
// Example 2: Patrol Bot
// Patrols between multiple locations and fights when encountered
// ============================================

export class PatrolBot extends BaseBot {
	private patrolPath: number[][];
	private currentPathIndex = 0;

	constructor(wowApi: WarOfWalls, patrolPath: number[][]) {
		super(wowApi);
		this.patrolPath = patrolPath;
	}

	protected async executeCycle(): Promise<void> {
		this.cycleCount++;

		const currentPath = this.patrolPath[this.currentPathIndex]!;
		logger.info(`Patrol cycle #${this.cycleCount} - Route ${this.currentPathIndex + 1}/${this.patrolPath.length}`);

		// Travel current segment
		await this.travelPath(currentPath, `Patrolling segment ${this.currentPathIndex + 1}`);

		// Check if in battle
		const inBattle = await this.combatController.isInBattle();
		if (inBattle) {
			logger.info('Encountered battle during patrol!');
			this.status = 'attacking';
			await this.combatController.executeAttackLoop();
		}

		// Move to next path
		this.currentPathIndex = (this.currentPathIndex + 1) % this.patrolPath.length;

		// Small delay between patrols
		await delay(2000);
	}

	async start(): Promise<void> {
		logger.info(`Patrol Bot starting with ${this.patrolPath.length} routes`);
		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				logger.error('Patrol bot error:', err);
				await delay(5000);
			}
		}
	}
}

// ============================================
// Example 3: Health-Aware PvE Bot
// Only fights when health is above threshold, otherwise rests
// ============================================

export class SmartPvEBot extends BaseBot {
	private targetPath: number[];
	private restPath: number[];
	private minHealth: number;
	private optimalHealth: number;

	constructor(
		wowApi: WarOfWalls,
		config: {
			targetPath: number[];
			restPath: number[];
			minHealth: number;
			optimalHealth: number;
		},
	) {
		super(wowApi);
		this.targetPath = config.targetPath;
		this.restPath = config.restPath;
		this.minHealth = config.minHealth;
		this.optimalHealth = config.optimalHealth;
	}

	protected async executeCycle(): Promise<void> {
		this.cycleCount++;

		// Check health status
		const { hasEnoughHealth, currentHp, maxHp } = await this.checkHealth(this.minHealth);

		if (!hasEnoughHealth) {
			logger.warn('Health too low, resting...');
			await this.rest(10000);
			return;
		}

		// If health is below optimal, rest a bit before fighting
		if (currentHp < this.optimalHealth) {
			const hpPercent = Math.round((currentHp / maxHp) * 100);
			logger.info(`Health at ${hpPercent}%, resting to optimal level...`);
			await this.rest(5000);
			return;
		}

		// Health is good, proceed with battle
		await this.travelPath(this.targetPath, 'Traveling to battle zone');

		this.status = 'waiting';
		await this.combatController.waitForBattle();

		this.status = 'attacking';
		await this.combatController.executeAttackLoop();

		await this.travelPath(this.restPath, 'Returning to rest area');
	}

	async start(): Promise<void> {
		logger.info('Smart PvE Bot starting...');
		logger.info(`Min Health: ${this.minHealth}, Optimal: ${this.optimalHealth}`);

		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				logger.error('Smart PvE bot error:', err);
				await delay(10000);
			}
		}
	}
}

// ============================================
// Example 4: Conditional Battle Bot
// Only engages in battle if certain conditions are met
// ============================================

type BattleCondition = (syncData: any) => boolean;

export class ConditionalBattleBot extends BaseBot {
	private targetPath: number[];
	private conditions: BattleCondition[];

	constructor(wowApi: WarOfWalls, targetPath: number[], conditions: BattleCondition[]) {
		super(wowApi);
		this.targetPath = targetPath;
		this.conditions = conditions;
	}

	private async checkConditions(): Promise<boolean> {
		const syncData = await this.wowApi.sync();

		for (const condition of this.conditions) {
			if (!condition(syncData)) {
				return false;
			}
		}

		return true;
	}

	protected async executeCycle(): Promise<void> {
		this.cycleCount++;

		// Check if conditions are met
		const conditionsMet = await this.checkConditions();

		if (!conditionsMet) {
			logger.warn('Battle conditions not met, waiting...');
			await delay(30000);
			return;
		}

		// Conditions met, proceed with battle
		await this.travelPath(this.targetPath, 'Conditions met - going to battle');
		await this.combatController.waitForBattle();
		await this.combatController.executeAttackLoop();
	}

	async start(): Promise<void> {
		logger.info(`Conditional Battle Bot starting with ${this.conditions.length} conditions`);

		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				logger.error('Conditional bot error:', err);
				await delay(10000);
			}
		}
	}
}

// ============================================
// Example Usage in index.ts
// ============================================

/*
import { WarOfWalls } from './api/WarOfWalls';
import { PatrolBot, SmartPvEBot, ConditionalBattleBot } from './examples/customBots';

const wowApi = new WarOfWalls('your_token');

// Example 1: Patrol Bot
const patrolBot = new PatrolBot(wowApi, [
	[3, 10],      // Path 1
	[10, 11],     // Path 2
	[11, 28],     // Path 3
	[28, 11],     // Path 4 (return)
	[11, 3],      // Path 5 (return)
]);

// Example 2: Smart PvE Bot
const smartBot = new SmartPvEBot(wowApi, {
	targetPath: [10, 11, 28],
	restPath: [11, 10, 3],
	minHealth: 100,
	optimalHealth: 200,
});

// Example 3: Conditional Battle Bot
const conditionalBot = new ConditionalBattleBot(
	wowApi,
	[10, 11, 28],
	[
		// Only fight during certain hours
		(syncData) => {
			const hour = new Date().getHours();
			return hour >= 9 && hour <= 17; // 9 AM to 5 PM
		},
		// Only fight when energy is above 50
		(syncData) => syncData.player.energy > 50,
		// Only fight when health is above 80%
		(syncData) => {
			const hpPercent = (syncData.player.health.current / syncData.player.health.max) * 100;
			return hpPercent > 80;
		},
	]
);

// Start your chosen bot
await smartBot.start();
*/
