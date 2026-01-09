import type { WarOfWalls } from '../api/WarOfWalls';
import { BaseBot, type BaseBotOptions } from './BaseBot';
import { logger, type Logger } from '../utils/logger';
import { delay } from '../utils/time';

export type PvPShadowBotOptions = BaseBotOptions & {
	minHealth: number;
	levelRange?: number;
	/** delay in milliseconds before entering shadow battle and after entering battle queue */
	enterShadowBattleDelay?: number;
	logger?: Logger;
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

	get #logger(): Logger {
		return this.opts.logger ?? logger;
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
		const syncData = await this.wowApi.sync();
		try {
			this.cycleCount++;
			this.status = 'idle';

			this.#logger.info(`Starting Shadow PvP cycle #${this.cycleCount}`);
			this.#logger.divider();

			// Execute cycleStarted hooks
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
				this.#logger.info(`not in battle, entering...`);
				if ((this.opts.enterShadowBattleDelay ?? 0) > 0) {
					this.#logger.info(`waiting ${this.opts.enterShadowBattleDelay}ms before entering shadow battle...`);
					const { enterShadowBattleDelay } = this.opts;
					await this.wowApi.joinArenaQueue(this.opts.levelRange ?? 2);
					setTimeout(async () => {
						const { inBattle } = await this.wowApi.getPlayerState();
						if (!inBattle) {
							await this.wowApi.skipArenaQueue().catch(() => {});
						}
					}, enterShadowBattleDelay);
				} else {
					this.#logger.info(`entering shadow battle immediately...`);
					await this.wowApi.joinShadowBattle(this.opts.levelRange ?? 2);
				}
				this.status = 'waiting';
				this.#logger.info('Waiting for battle to start...');
				await this.combatController.waitForBattle();

				this.status = 'attacking';
				await this.combatController.executeAttackLoop();
			}
		} finally {
			this.#logger.success(`Shadow PvP cycle #${this.cycleCount} complete!`);
			// Execute cycleCompleted hooks
			await this.executeHooks('cycleCompleted', syncData);
			this.#logger.divider();
		}
	}

	/**
	 * Start the Shadow PvP bot
	 */
	async start(): Promise<void> {
		this.#logger.info('Shadow PvP Bot starting...');
		this.#logger.divider();

		while (true) {
			try {
				await this.executeCycle();
			} catch (err) {
				this.status = 'error';
				this.#logger.error('Error during bot execution:', err instanceof Error ? err.message : err);
				this.#logger.warn('Restarting in 2 seconds...');
				await delay(2000);
			}
		}
	}
}
