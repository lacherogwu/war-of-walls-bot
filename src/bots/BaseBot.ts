import type { SyncResponse, WarOfWalls } from '../api/WarOfWalls';
import { CombatController } from '../combat/CombatController';
import { logger } from '../utils/logger';
import { delay } from '../utils/time';
import { COMBAT_CONFIG } from '../constants';

export type BotStatus = 'idle' | 'traveling' | 'waiting' | 'attacking' | 'resting' | 'error';

export type BotHook = (syncData: SyncResponse) => void | Promise<void>;

export type BotHooks = {
	beforeAttack?: BotHook[];
	afterAttack?: BotHook[];
	cycleStarted?: BotHook[];
	cycleCompleted?: BotHook[];
	battleStarted?: BotHook[];
	battleEnded?: BotHook[];
};

export type BaseBotOptions = {
	hooks?: BotHooks;
};

/**
 * BaseBot provides common functionality for all bot types
 */
export abstract class BaseBot {
	protected wowApi: WarOfWalls;
	protected combatController: CombatController;
	protected hooks: BotHooks;
	protected status: BotStatus = 'idle';
	protected cycleCount = 0;

	constructor(wowApi: WarOfWalls, options?: BaseBotOptions) {
		this.wowApi = wowApi;
		this.hooks = options?.hooks || {};
		this.combatController = new CombatController(wowApi, this.hooks);
	}

	/**
	 * Execute hooks for a specific event
	 */
	protected async executeHooks(hookName: keyof BotHooks, syncData: SyncResponse): Promise<void> {
		const hooks = this.hooks[hookName];
		if (!hooks || hooks.length === 0) return;

		for (const hook of hooks) {
			await hook(syncData);
		}
	}

	/**
	 * Get current bot status
	 */
	getStatus(): BotStatus {
		return this.status;
	}

	/**
	 * Get current cycle count
	 */
	getCycleCount(): number {
		return this.cycleCount;
	}

	/**
	 * Check player's current health status
	 */
	async checkHealth(minHealth: number): Promise<{ hasEnoughHealth: boolean; currentHp: number; maxHp: number }> {
		const syncData = await this.wowApi.sync();
		const currentHp = syncData.player.health.current;
		const maxHp = syncData.player.health.max;
		const hpPercent = Math.round((currentHp / maxHp) * 100);

		if (currentHp < minHealth) {
			logger.warn(`Low health: ${currentHp}/${maxHp} HP (${hpPercent}%) - minimum required: ${minHealth}`);
			return { hasEnoughHealth: false, currentHp, maxHp };
		}

		logger.info(`Health check passed: ${currentHp}/${maxHp} HP (${hpPercent}%)`);
		return { hasEnoughHealth: true, currentHp, maxHp };
	}

	/**
	 * Rest for a specified amount of time
	 */
	async rest(duration: number = COMBAT_CONFIG.REST_CHECK_INTERVAL): Promise<void> {
		this.status = 'resting';
		logger.info(`Resting for ${duration / 1000} seconds...`);
		await delay(duration);
	}

	/**
	 * Travel to a destination following a path
	 */
	async travelPath(path: number[], description: string): Promise<void> {
		this.status = 'traveling';
		logger.travel(`${description} (${path.length} locations)`);

		for (let i = 0; i < path.length; i++) {
			const destId = path[i]!;
			await this.wowApi.move(destId);
			logger.travel(`Moving to location ${destId} (${i + 1}/${path.length})`);
		}

		logger.success(`Arrived at destination`);
	}

	/**
	 * Main bot execution - must be implemented by subclasses
	 */
	abstract start(): Promise<void>;

	/**
	 * Execute a single cycle - must be implemented by subclasses
	 */
	protected abstract executeCycle(): Promise<void>;
}
