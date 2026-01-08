import type { WarOfWalls } from '../api/WarOfWalls';
import { BaseBot, type BaseBotOptions } from './BaseBot';
import { logger } from '../utils/logger';
import { delay } from '../utils/time';
import { COMBAT_CONFIG } from '../constants';

export type PvEBotOptions = BaseBotOptions & {
	targetPath: number[];
	restPath: number[];
	minHealth: number;
};

/**
 * PvEBot handles Player vs Environment combat
 * Travels to target location, waits for battle, attacks, then returns to rest
 */
export class PvEBot extends BaseBot {
	private opts: PvEBotOptions;

	constructor(wowApi: WarOfWalls, opts: PvEBotOptions) {
		super(wowApi, opts);
		this.opts = opts;
		this.validateOptions();
	}

	/**
	 * Validate bot configuration options
	 */
	private validateOptions(): void {
		if (this.opts.targetPath.length === 0) {
			throw new Error('Target path cannot be empty');
		}
		if (this.opts.restPath.length === 0) {
			throw new Error('Rest path cannot be empty');
		}
		if (this.opts.minHealth <= 0) {
			throw new Error('Min health must be greater than 0');
		}
	}

	/**
	 * Check player state including health and battle status
	 */
	private async checkPlayerState(): Promise<{ hasEnoughHealth: boolean; inBattle: boolean }> {
		const syncData = await this.wowApi.sync();
		const currentHp = syncData.player.health.current;
		const maxHp = syncData.player.health.max;
		const hpPercent = Math.round((currentHp / maxHp) * 100);
		const inBattle = syncData.battle.inBattle;

		if (currentHp < this.opts.minHealth) {
			this.status = 'resting';
			logger.warn(`Low health: ${currentHp}/${maxHp} HP (${hpPercent}%) - minimum required: ${this.opts.minHealth}`);
			logger.info(`Resting for ${COMBAT_CONFIG.REST_CHECK_INTERVAL / 1000} seconds...`);
			await delay(COMBAT_CONFIG.REST_CHECK_INTERVAL);
			return { hasEnoughHealth: false, inBattle };
		}

		logger.info(`Health check passed: ${currentHp}/${maxHp} HP (${hpPercent}%)`);

		if (inBattle) {
			logger.warn('Already in battle! Jumping straight to attack loop...');
			logger.divider();
		}

		return { hasEnoughHealth: true, inBattle };
	}

	/**
	 * Execute a single PvE cycle
	 */
	protected async executeCycle(): Promise<void> {
		this.cycleCount++;
		this.status = 'idle';

		logger.info(`Starting PvE cycle #${this.cycleCount}`);
		logger.divider();

		// Execute cycleStarted hooks
		const initialSyncData = await this.wowApi.sync();
		await this.executeHooks('cycleStarted', initialSyncData);

		// Check health and battle status before starting
		const { hasEnoughHealth, inBattle } = await this.checkPlayerState();
		if (!hasEnoughHealth) {
			return;
		}

		// Execute battle cycle
		if (inBattle) {
			// Already in battle, skip travel and waiting
			this.status = 'attacking';
			await this.combatController.executeAttackLoop();
		} else {
			// Normal flow: travel, wait, attack
			await this.travelPath(this.opts.targetPath, 'Starting journey to target');

			this.status = 'waiting';
			await this.combatController.waitForBattle();

			this.status = 'attacking';
			await this.combatController.executeAttackLoop();
		}

		await this.travelPath(this.opts.restPath, 'Returning to rest area');

		logger.success(`PvE cycle #${this.cycleCount} complete!`);
		// Execute cycleCompleted hooks
		const finalSyncData = await this.wowApi.sync();
		await this.executeHooks('cycleCompleted', finalSyncData);
		logger.divider();
	}

	/**
	 * Start the PvE bot
	 */
	async start(): Promise<void> {
		logger.info('PvE Bot starting...');
		logger.divider();

		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				this.status = 'error';
				logger.error('Error during bot execution:', err instanceof Error ? err.message : err);
				logger.warn('Restarting in 2 seconds...');
				await delay(2000);
			}
		}
	}
}
