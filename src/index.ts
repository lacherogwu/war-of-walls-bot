import pMap from 'p-map';
import { WarOfWalls, type PlayerStat, type SyncResponse } from './api/WarOfWalls';
import { PvEBot } from './bots/PvEBot';
import { PvPShadowBot } from './bots/PvPShadowBot';
import { CombatController } from './combat/CombatController';
import { logger } from './utils/logger';
import users from '../users.json';

async function main() {
	try {
		logger.divider();
		logger.info('War of Walls Bot v2.0 - Modular Architecture');
		logger.divider();

		// Initialize API client
		const wowApi = new WarOfWalls(users.asaf.token, {
			auth: {
				username: users.asaf.username,
				password: users.asaf.password,
			},
		});

		// Initialize and start PvE bot
		// const pveBot = new PvEBot(wowApi, CONFIG.pveBot);
		// await pveBot.start();

		/* =========== Constants =========== */
		const MIN_HEATLH = 20;
		const LEVEL_RANGE = 1;
		/* ================================ */

		async function findAndUseLargeHpPotion(syncData: SyncResponse) {
			const currentHp = syncData.player.health.current;
			if (currentHp >= MIN_HEATLH) {
				return;
			}

			const LARGE_HP_POTION_ID = 'potion-heal-large';
			const allConsumables = [...(syncData.consumables.unequipped ?? []), ...(syncData.consumables.equipped ?? [])];
			const largeHpPotion = allConsumables.find(c => c.id === LARGE_HP_POTION_ID);
			if (!largeHpPotion) {
				logger.warn('No large health potions available!');
				return;
			}

			logger.info(`Using large health potion (current HP: ${currentHp})...`);
			await wowApi.useItem(syncData.player.id, largeHpPotion.userItemId).catch(() => {});
		}

		async function addStats(syncData: SyncResponse) {
			const STAT_POINT_LIMIT = 100;
			const { statPoints, baseStats } = syncData.player;
			if (statPoints < 1) return;

			const statToUpdateOrder: PlayerStat[] = ['luck', 'vitality', 'strength', 'endurance', 'wisdom', 'dexterity'];
			let statToUpdate;
			for (const stat of statToUpdateOrder) {
				if ((baseStats[stat] ?? 0) < STAT_POINT_LIMIT) {
					statToUpdate = stat;
					break;
				}
			}
			if (!statToUpdate) return;

			for (let i = 0; i < statPoints; i++) {
				await wowApi.addStat(statToUpdate).catch(() => {});
			}
		}

		const bot = new PvPShadowBot(wowApi, {
			minHealth: MIN_HEATLH,
			levelRange: LEVEL_RANGE,
			hooks: {
				// afterAttack: [findAndUseLargeHpPotion],
				// cycleStarted: [findAndUseLargeHpPotion],
				// battleEnded: [addStats],
			},
		});
		await bot.start();
	} catch (error) {
		logger.error('Fatal error in main:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	logger.warn('\nReceived SIGINT, shutting down gracefully...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	logger.warn('\nReceived SIGTERM, shutting down gracefully...');
	process.exit(0);
});

// Start the bot
main();

const wowApi = new WarOfWalls(users.asaf.token);
// const itemId = 'potion-heal-large';
// for (let i = 0; i < 500; i++) {
// 	wowApi.buyItem(itemId).catch(err => {
// 		console.log(err);
// 	});
// }

// const combatController = new CombatController(wowApi);
// await combatController.executeAttackLoop();
