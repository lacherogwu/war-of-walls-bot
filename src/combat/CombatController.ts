import type { AttackResponse, SyncResponse, WarOfWalls } from '../api/WarOfWalls';
import type { BotHooks } from '../bots/BaseBot';
import { logger } from '../utils/logger';
import { generateCombatPositions } from '../utils/random';
import { delay } from '../utils/time';
import { COMBAT_CONFIG, getPositionName } from '../constants';

/**
 * CombatController handles the core battle mechanics
 * Can be used by any bot type (PvE, PvP, Arena, etc.)
 */
export class CombatController {
	#wowApi: WarOfWalls;
	#hooks: BotHooks;

	constructor(wowApi: WarOfWalls, hooks: BotHooks = {}) {
		this.#wowApi = wowApi;
		this.#hooks = hooks;
	}

	/**
	 * Execute hooks for a specific event
	 */
	async #executeHooks(hookName: keyof BotHooks, syncData: SyncResponse): Promise<void> {
		const hooks = this.#hooks[hookName];
		if (!hooks || hooks.length === 0) return;

		for (const hook of hooks) {
			await hook(syncData);
		}
	}

	/**
	 * Check if currently in a battle
	 */
	async isInBattle(): Promise<boolean> {
		const syncData = await this.#wowApi.sync();
		return syncData.battle.inBattle;
	}

	/**
	 * Execute the main attack loop during battle
	 * This is the core combat logic that can be used by any bot
	 */
	async executeAttackLoop(): Promise<void> {
		logger.success('Entering combat!');
		logger.divider();

		let turnCount = 0;
		let isFirstTurn = true;

		while (true) {
			const syncData = await this.#wowApi.sync();

			// Check if battle ended
			if (!syncData.battle.inBattle) {
				logger.success('Battle ended!');
				await this.#executeHooks('battleEnded', syncData);
				logger.divider();
				break;
			}

			// Execute battleStarted hook on first turn
			if (isFirstTurn) {
				await this.#executeHooks('battleStarted', syncData);
				isFirstTurn = false;
			}

			const { myTeam, id: battleId, participants } = syncData.battle;
			const target = this.#findTarget(participants, myTeam);

			if (!target) {
				logger.error('No target found in battle');
				throw new Error('No target found in battle');
			}

			// Execute beforeAttack hooks
			await this.#executeHooks('beforeAttack', syncData);

			// Generate attack positions
			const { attackPos, defPos1, defPos2 } = generateCombatPositions();

			// Execute attack
			turnCount++;
			logger.battle(`Turn ${turnCount} - Attacking ${getPositionName(attackPos)}, defending ${getPositionName(defPos1)} & ${getPositionName(defPos2)}`);

			const attack = async () => {
				const attackResponse = await this.#wowApi.attack(battleId, target.id, attackPos, [defPos1, defPos2]);
				if (!attackResponse.success) return;
				if (!attackResponse.resolved) {
					await delay(COMBAT_CONFIG.ATTACK_DELAY * 2);
					return attack();
				}
				return attackResponse;
			};
			const attackResponse = await attack();

			// Log battle results
			if (attackResponse) {
				this.#logBattleResults(attackResponse, target.maxHealth, syncData.player.health.max);
			}

			// Execute afterAttack hooks
			const afterAttackData = { ...syncData, attackResponse };
			await this.#executeHooks('afterAttack', afterAttackData);

			await delay(COMBAT_CONFIG.ATTACK_DELAY);
		}
	}

	/**
	 * Wait for a battle to begin
	 */
	async waitForBattle(): Promise<void> {
		logger.info('Waiting for battle to begin...');

		await delay(COMBAT_CONFIG.BATTLE_CHECK_INTERVAL);
		const inBattle = await this.isInBattle();

		if (!inBattle) {
			logger.debug('No battle detected, continuing to wait...');
			return this.waitForBattle();
		}

		logger.success('Battle started!');
		logger.divider();
	}

	/**
	 * Find the enemy target in battle
	 */
	#findTarget(participants: any[], myTeam: number) {
		return participants.find(p => p.team !== myTeam);
	}

	/**
	 * Log detailed battle results
	 */
	#logBattleResults(response: AttackResponse, targetMaxHp: number, playerMaxHp: number): void {
		if (!response.resolved) return;
		const { youDealt, youReceived, targetHealth, yourHealth } = response.result;

		// Format damage dealt
		const dealtModifiers = [];
		if (youDealt.isCrit) dealtModifiers.push('CRIT');
		if (youReceived.isDodged) dealtModifiers.push('DODGED');
		if (youReceived.isBlocked) dealtModifiers.push('BLOCKED');
		const dealtSuffix = dealtModifiers.length > 0 ? ` [${dealtModifiers.join(', ')}]` : '';

		// Format damage received
		const receivedModifiers = [];
		if (youReceived.isCrit) receivedModifiers.push('CRIT');
		if (youDealt.isDodged) receivedModifiers.push('DODGED');
		if (youDealt.isBlocked) receivedModifiers.push('BLOCKED');
		const receivedSuffix = receivedModifiers.length > 0 ? ` [${receivedModifiers.join(', ')}]` : '';

		const targetHpPercent = Math.round((targetHealth / targetMaxHp) * 100);
		const yourHpPercent = Math.round((yourHealth / playerMaxHp) * 100);

		logger.battle(`  ⚔️  Dealt: ${youDealt.damage} damage${dealtSuffix} → Target: ${targetHealth}/${targetMaxHp} HP (${targetHpPercent}%)`);
		logger.battle(`  🛡️  Received: ${youReceived.damage} damage${receivedSuffix} → You: ${yourHealth}/${playerMaxHp} HP (${yourHpPercent}%)`);

		if (response.result.targetDied) {
			logger.success('  💀 Target defeated!');
		}
		if (response.result.youDied) {
			logger.error('  💀 You were defeated!');
		}
	}
}
