import users from '../users.json';
import { WarOfWalls } from './api/WarOfWalls';

const wowApi = new WarOfWalls(users['EIN'], {
	auth: {
		username: 'EIN',
		password: '26314471As',
	},
});
// await wowApi.sync();
await wowApi.move(1);
await wowApi.move(3);
