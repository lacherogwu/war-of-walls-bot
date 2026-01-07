import pMap from 'p-map';
import { WarOfWalls } from './api/WarOfWalls';
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
		const bot = new PvPShadowBot(wowApi, {
			minHealth: 250,
			levelRange: 5,
			useHpPotions: true,
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
// const itemId = 'potion-heal-large';
// await wowApi.buyItem(itemId);
// for (let i = 0; i < 100; i++) {
// }
