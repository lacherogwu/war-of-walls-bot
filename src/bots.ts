import { WarOfWalls } from './api/WarOfWalls';
import { logger } from './utils/logger';
import { PvPShadowBot } from './bots/PvPShadowBot';
import { PvEBot } from './bots/PvEBot';
import users from '../users.json';

async function main() {
	try {
		logger.divider();
		logger.info('War of Walls Bot v2.0');
		logger.divider();

		for (const [username, token] of Object.entries(users).filter(([name]) => ['elran', 'shimi'].includes(name))) {
			// Initialize API client
			const wowApi = new WarOfWalls(token, {
				auth: {
					username,
					password: '26314471As',
				},
			});

			// Initialize and start attack bot
			const bot = new PvPShadowBot(wowApi, {
				minHealth: 1,
				levelRange: 7,
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
// import itemsRes from '../items-res.json';

// const items = itemsRes.items.filter(item => item.buyPrice < 1 || item.buyPrice > 870);
// console.log(`About to purchase ${items.length}/${itemsRes.items.length} items`);
// await pMap(
// 	items,
// 	async (item, i) => {
// 		try {
// 			const res = await wowApi.buy(item.id);
// 			console.log(`✅ ‰Succeed buying ${item.id} (${i + 1}/${items.length})`);
// 			console.log(res);
// 		} catch (err) {
// 			console.log(`❌ Failed buying ${item.id} (${i + 1}/${items.length}):`, err instanceof Error ? err.message : err);
// 		}
// 	},
// 	{
// 		concurrency: 15,
// 	},
// );
