import users from '../users.json';
import { WarOfWalls } from './api/WarOfWalls';

const itemId = 'potion-xp-boost';

const wowApi = new WarOfWalls(users.asaf.token);
const syncData = await wowApi.sync();
const allConsumables = [...(syncData.consumables.unequipped ?? []), ...(syncData.consumables.equipped ?? [])];
const found = allConsumables.find(c => c.id === itemId);
if (found) {
	await wowApi.useItem(syncData.player.id, found.userItemId);
	console.log(`used ${itemId}`);
}

// for (let i = 0; i < 999; i++) {
// 	await wowApi.reduceStat('strength');
// 	await wowApi.addStat('luck');
// }

// const itemId = 'potion-heal-large';
// for (let i = 0; i < 999; i++) {
// 	wowApi.buyItem(itemId).catch(err => {
// 		console.log(err);
// 	});
// }
