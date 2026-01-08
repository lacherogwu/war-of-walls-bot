import pMap from 'p-map';
import { WarOfWalls, type SyncResponse } from './api/WarOfWalls';
import { PvEBot } from './bots/PvEBot';
import { PvPShadowBot } from './bots/PvPShadowBot';
import { CombatController } from './combat/CombatController';
import { logger } from './utils/logger';
import users from '../users.json';

// Configuration
const CONFIG = {
	token: users.asaf,
	pveBot: {
		targetPath: [
			10, //
			11,
			28,
		], // Destination IDs to reach battle zone
		restPath: [
			11,
			10, //
			3,
		], // Destination IDs to return to rest area
		minHealth: 130, // Minimum health required to start a battle
	},
};

async function main() {
	try {
		logger.divider();
		logger.info('War of Walls Bot v2.0 - Modular Architecture');
		logger.divider();

		// Initialize API client
		const wowApi = new WarOfWalls(CONFIG.token, {
			auth: {
				username: 'asaf',
				password: '26314471As',
			},
		});

		// Initialize and start PvE bot
		// const pveBot = new PvEBot(wowApi, CONFIG.pveBot);
		// await pveBot.start();

		const MIN_HEATLH = 250;

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

		const bot = new PvPShadowBot(wowApi, {
			minHealth: MIN_HEATLH,
			levelRange: 5,
			hooks: {
				afterAttack: [findAndUseLargeHpPotion],
				cycleStarted: [findAndUseLargeHpPotion],
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

// const wowApi = new WarOfWalls(CONFIG.token);
// await wowApi.useItem('cmk2j8pb800qts601jdse9mrd', 'cmk4ktctg001xs601ask141bk');
// const itemId = 'potion-heal-large';
// for (let i = 0; i < 40; i++) {
// 	wowApi.buyItem(itemId).catch(() => {});
// }
