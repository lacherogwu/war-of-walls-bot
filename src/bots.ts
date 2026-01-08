import { WarOfWalls, type PlayerStat, type SyncResponse } from './api/WarOfWalls';
import { logger } from './utils/logger';
import { PvPShadowBot } from './bots/PvPShadowBot';
import { PvEBot } from './bots/PvEBot';
import users from '../users.json';

async function main() {
	try {
		logger.divider();
		logger.info('War of Walls Bot v2.0');
		logger.divider();

		for (const { username, password, token } of Object.values(users).filter(({ username }) => username === 'elran')) {
			// Initialize API client
			const wowApi = new WarOfWalls(token, {
				auth: {
					username,
					password,
				},
			});

			/* =========== Constants =========== */
			const MIN_HEATLH = 500;
			const LEVEL_RANGE = 5;
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
				await wowApi.useItem(syncData.player.id, largeHpPotion.userItemId);
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

			// Initialize and start attack bot
			const bot = new PvPShadowBot(wowApi, {
				minHealth: MIN_HEATLH,
				levelRange: LEVEL_RANGE,
				hooks: {
					afterAttack: [findAndUseLargeHpPotion],
					cycleStarted: [findAndUseLargeHpPotion],
					battleEnded: [addStats],
				},
			});
			bot.start();

			// const pveBot = new PvEBot(wowApi, {
			// 	minHealth: 80,
			// 	targetPath: [10],
			// 	restPath: [3],
			// });
			// pveBot.start();
		}
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

// const wowApi = new WarOfWalls(users.elran.token);
// for (let i = 0; i < 999; i++) {
// 	await wowApi.reduceStat('luck');
// 	await wowApi.addStat('vitality');
// }
