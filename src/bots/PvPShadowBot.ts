import type { WarOfWalls } from '../api/WarOfWalls';
import { BaseBot, type BaseBotOptions } from './BaseBot';
import { logger } from '../utils/logger';
import { delay } from '../utils/time';

export type PvPShadowBotOptions = BaseBotOptions & {
	minHealth: number;
	levelRange?: number;
};

/**
 * PvPShadowBot handles Player vs Player shadow combat
 * Regenerate HP, waits for battle, attacks, repeat.
 */
export class PvPShadowBot extends BaseBot {
	private opts: PvPShadowBotOptions;

	constructor(wowApi: WarOfWalls, opts: PvPShadowBotOptions) {
		super(wowApi, opts);
		this.opts = opts;
		this.validateOptions();
	}

	/**
	 * Validate bot configuration options
	 */
	private validateOptions(): void {
		if (this.opts.minHealth <= 0) {
			throw new Error('Min health must be greater than 0');
		}
	}

	/**
	 * Execute a single shadow PvP cycle
	 */
	protected async executeCycle(): Promise<void> {
		this.cycleCount++;
		this.status = 'idle';

		logger.info(`Starting Shadow PvP cycle #${this.cycleCount}`);
		logger.divider();

		// Execute cycleStarted hooks
		const syncData = await this.wowApi.sync();
		await this.executeHooks('cycleStarted', syncData);

		// Check health and battle status before starting
		const { health, inBattle } = await this.wowApi.getPlayerState();
		const hasEnoughHealth = health.current >= this.opts.minHealth;
		if (!inBattle && !hasEnoughHealth) {
			await delay(5000);
			return;
		}

		// Execute battle cycle
		if (inBattle) {
			// Already in battle, skip travel and waiting
			this.status = 'attacking';
			await this.combatController.executeAttackLoop();
		} else {
			await this.wowApi.joinShadowBattle(this.opts.levelRange ?? 2);
			this.status = 'waiting';
			await this.combatController.waitForBattle();

			this.status = 'attacking';
			await this.combatController.executeAttackLoop();
		}

		logger.success(`Shadow PvP cycle #${this.cycleCount} complete!`);
		// Execute cycleCompleted hooks
		await this.executeHooks('cycleCompleted', syncData);
		logger.divider();
	}

	/**
	 * Start the Shadow PvP bot
	 */
	async start(): Promise<void> {
		logger.info('Shadow PvP Bot starting...');
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
