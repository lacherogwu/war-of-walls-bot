import type { KyInstance } from 'ky';
import ky from 'ky';
import { logger } from '../utils/logger';

const BASE_URL = 'https://api.knights-il.com/api';
const BASE_HEADERS = {
	accept: '*/*',
	'accept-language': 'en,he;q=0.9',
	'cache-control': 'no-cache',
	'content-type': 'application/json',
	pragma: 'no-cache',
	priority: 'u=1, i',
	'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"macOS"',
	'sec-fetch-dest': 'empty',
	'sec-fetch-mode': 'cors',
	'sec-fetch-site': 'same-site',
};

class WarOfWallsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WarOfWallsError';
	}
}

export type WarOfWallsOptions = {
	auth?: {
		username: string;
		password: string;
	};
};

export class WarOfWalls {
	#client: KyInstance;
	#token: string;

	constructor(token: string, opts?: WarOfWallsOptions) {
		this.#token = token;
		this.#client = ky.create({
			prefixUrl: BASE_URL,
			headers: {
				Authorization: `Bearer ${token}`,
				...BASE_HEADERS,
			},
			hooks: {
				beforeRequest: [
					// request => {
					// 	logger.debug(`→ ${request.method} ${request.url} | TOKEN: ${request.headers.get('Authorization')?.slice(-12)}`);
					// },
				],
				afterResponse: [
					async (request, _options, response, state) => {
						const body = await response
							.clone()
							.json()
							.catch(() => null);

						if (response.status === 403 && state.retryCount === 0 && body?.message?.includes('Invalid or expired token') && opts?.auth) {
							const { username, password } = opts.auth;
							const { token: newToken } = await WarOfWalls.login(username, password);
							this.#token = newToken;
							const headers = new Headers(request.headers);
							headers.set('Authorization', `Bearer ${newToken}`);

							this.#client = this.#client.extend({
								headers,
							});

							return ky.retry({
								request: new Request(request, { headers }),
								code: 'TOKEN_REFRESHED',
							});
						}
					},
				],
				beforeError: [
					async error => {
						const { response } = error;
						if (response) {
							try {
								const body = await response
									.clone()
									.json()
									.catch(() => null);
								const message = body?.message || 'Unknown error';
								error.name = 'WarOfWallsError';
								error.message = `${message} (${response.status})`;
							} catch {
								error.message = `Request failed with status ${response.status}`;
							}

							throw new WarOfWallsError(error.message);
						}
						return error;
					},
				],
			},
		});

		logger.info('War of Walls API client initialized');
	}

	get token(): string {
		return this.#token;
	}

	static async create(username: string, password: string): Promise<WarOfWalls> {
		const loginRes = await this.login(username, password);
		return new WarOfWalls(loginRes.token);
	}

	static async login(username: string, password: string): Promise<{ token: string }> {
		const res = await ky
			.post(`${BASE_URL}/login`, {
				json: {
					username,
					password,
				},
				headers: BASE_HEADERS,
			})
			.json<{ token: string }>();

		return {
			token: res.token,
		};
	}

	/**
	 * Move to a destination
	 */
	async move(destinationId: number): Promise<void> {
		try {
			await this.#client
				.post('travel/move', {
					json: {
						destinationId: destinationId.toString(),
					},
				})
				.json();
		} catch (error) {
			logger.error(`Failed to move to destination ${destinationId}`, error);
			throw error;
		}
	}

	/**
	 * Get available travel destinations
	 */
	async getTravelDestinations(): Promise<TravelDestinationsResponse> {
		try {
			const res = await this.#client.get<TravelDestinationsResponse>('travel/destinations').json();
			return res;
		} catch (error) {
			logger.error('Failed to get travel destinations', error);
			throw error;
		}
	}

	/**
	 * Sync game state
	 */
	async sync(): Promise<SyncResponse> {
		try {
			const res = await this.#client.get<SyncResponse>('sync').json();
			return res;
		} catch (error) {
			logger.error('Failed to sync game state', error);
			throw error;
		}
	}

	/**
	 * Execute an attack in combat
	 */
	async attack(battleId: string, targetId: string, attackPosition: number, defensePositions: [number, number]): Promise<AttackResponse> {
		try {
			const res = await this.#client
				.post<AttackResponse>('combat/action', {
					json: {
						battleId,
						targetId,
						attackPosition,
						defensePositions,
					},
				})
				.json();
			return res;
		} catch (error) {
			logger.error('Failed to execute attack', error);
			throw error;
		}
	}

	async addStat(stat: PlayerStat) {
		const res = await this.#client
			.post('player/stats', {
				json: {
					stat,
				},
			})
			.json();

		console.log(res);
	}

	async reduceStat(stat: PlayerStat) {
		const res = await this.#client
			.post('player/stats/reduce', {
				json: {
					stat,
				},
			})
			.json();

		console.log(res);
	}

	async joinArenaQueue(levelRange: number): Promise<void> {
		try {
			await this.#client
				.post('arena/queue', {
					json: {
						levelRange,
					},
				})
				.json();
		} catch (err: any) {
			if (err?.message?.toLowerCase()?.includes('already in queue')) {
				return;
			}
			throw err;
		}
	}

	async skipArenaQueue() {
		const res = await this.#client.post('arena/queue/skip').json<JoinBattleResponse>();
		return res;
	}

	async joinShadowBattle(levelRange: number): Promise<JoinBattleResponse> {
		await this.joinArenaQueue(levelRange);
		return await this.skipArenaQueue();
	}

	async getPlayerState(): Promise<PlayerState> {
		const syncData = await this.sync();
		const { player, battle } = syncData;

		return {
			health: player.health,
			inBattle: battle.inBattle,
		};
	}

	async buyItem(itemId: string): Promise<void> {
		const res = await this.#client
			.post('shop/buy', {
				json: {
					itemId,
				},
			})
			.json();

		console.log(res);
	}

	async useItem(targetId: string, userItemId: string): Promise<void> {
		await this.#client
			.post('equipment/use-item', {
				json: {
					targetId,
					userItemId,
				},
			})
			.json();
	}

	async equipItem(slot: string, userItemId: string): Promise<void> {
		const res = await this.#client
			.post('equipment/equip', {
				json: {
					slot,
					userItemId,
				},
			})
			.json();

		console.log(res);
	}
}

// Types
type TravelDestinationsResponse = {
	destinations: TravelDestination[];
	currentLocation: { id: string; name: string; backgroundImage: string };
};

type TravelDestination = {
	id: string;
	name: string;
	backgroundImage: string;
	hasShop: boolean;
	hasMine: boolean;
	hasWoodcutting: boolean;
	hasBattle: boolean;
	hasMarket: boolean;
	portalId: string;
	positionX: number;
	positionY: number;
	widthPercent: number;
	heightPercent: number;
	portalType: string;
	arrowCurve: string;
	arrowDirectionDeg: number;
	arrowRotateXDeg: number;
	arrowRotateYDeg: number;
	arrowWidthPx: number;
	requiredItemId: null;
	requiredItemName: null;
	playerHasItem: boolean;
	travelTimeFreeMinutes: number;
	travelTimePaidMinutes: number;
	travelCostGold: number;
	isGuarded: boolean;
	guardedCleared: boolean;
	isTimedPortal: boolean;
	isTimedOpen: boolean;
	opensInMs: null;
	closesInMs: null;
	timedMessage: null;
};

export type SyncResponse = {
	success: boolean;
	version: string;
	timestamp: number;
	player: {
		id: string;
		username: string;
		characterImage: string;
		isAdmin: boolean;
		isMiniAdmin: boolean;
		isGuide: boolean;
		health: { current: number; max: number; percentage: number };
		energy: number;
		maxEnergy: number;
		level: number;
		experience: number;
		xp: number;
		xpToNextLevel: number;
		gold: number;
		statPoints: number;
		stats: {
			strength: number;
			dexterity: number;
			vitality: number;
			endurance: number;
			luck: number;
			wisdom: number;
			maxHealth: number;
			maxEnergy: number;
			attackBonus: number;
			minDamageBonus: number;
			maxDamageBonus: number;
			headDefenseMin: number;
			headDefenseMax: number;
			chestDefenseMin: number;
			chestDefenseMax: number;
			bellyDefenseMin: number;
			bellyDefenseMax: number;
			legsDefenseMin: number;
			legsDefenseMax: number;
			piercingChance: number;
		};
		combatStats: {
			minDamage: number;
			maxDamage: number;
			critChance: number;
			dodgeChance: number;
			maxHealth: number;
			goldBonus: number;
			xpBonus: number;
			defenseRanges: {
				head: { min: number; max: number };
				chest: { min: number; max: number };
				belly: { min: number; max: number };
				legs: { min: number; max: number };
			};
		};
		baseStats: {
			strength: number;
			dexterity: number;
			vitality: number;
			endurance: number;
			luck: number;
			wisdom: number;
		};
		statBonuses: {
			strength: number;
			dexterity: number;
			vitality: number;
			endurance: number;
			luck: number;
			wisdom: number;
		};
		location: {
			id: string;
			name: string;
			backgroundImage: string;
			hasBattle: boolean;
			hasShop: boolean;
			hasMine: boolean;
			hasMarket: boolean;
			bgmUrl: string;
		};
	};
	activeReward: null;
	battle:
		| { inBattle: false }
		| {
				inBattle: true;
				id: string;
				type: string;
				status: string;
				forcedBattle: boolean;
				currentTurn: number;
				isPlayerTurn: boolean;
				turnDeadline: string;
				myTeam: number;
				participation: {
					totalDamageDealt: number;
					attackCount: number;
				};
				participants: Array<{
					id: string;
					userId: string;
					level: number;
					health: number;
					maxHealth: number;
					totalDamageDealt: number;
					isMonster: boolean;
					team: number;
					isCurrentUser: boolean;
				}>;
				teams: Array<{
					teamId: number;
					members: Array<{
						id: string;
						userId: string;
						name: string;
						level: number;
						characterImage: string;
						health: number;
						maxHealth: number;
						totalDamageDealt: number;
						isMonster: boolean;
						team: number;
						isCurrentUser: boolean;
					}>;
				}>;
		  };
	arena: { status: string };
	challenges: { sent: any[]; received: any[] };
	friends: any;
	partyInvites: { sent: any[]; received: any[] };
	chat: any;
	players: any;
	status: any;
	activeBattleCounts: { pvp: number; pve: number; total: number };
	xpConfig: { pveDamageMultiplier: number; pvpDamageMultiplier: number };
	consumables: { equipped: Consumable[] | null; unequipped: Consumable[] | null; inventoryHash: string };
	buffs: any;
	scrollData: { joinableBattles: any[] };
	quests: any;
};

type Consumable = {
	id: string;
	userItemId: string;
	name: string;
	description: string;
	slot: string;
	createdAt: string;
};

type ResolvedAttack = {
	resolved: true;
	result: {
		youDealt: {
			damage: number;
			isBlocked: boolean;
			isDodged: boolean;
			isCrit: boolean;
		};
		youReceived: {
			damage: number;
			isBlocked: boolean;
			isDodged: boolean;
			isCrit: boolean;
		};
		targetHealth: number;
		yourHealth: number;
		targetEnergy: number;
		yourEnergy: number;
		targetDied: boolean;
		youDied: boolean;
		battleEnded: boolean;
		yourStreak: number;
		targetStreak: number;
	};
};
type UnresolvedAttack = {
	resolved: false;
	waiting: {
		targetId: string;
		targetName: string;
		deadline: string;
	};
};

export type AttackResponse = {
	success: boolean;
} & (ResolvedAttack | UnresolvedAttack);

export type PlayerStat = 'strength' | 'dexterity' | 'vitality' | 'endurance' | 'luck' | 'wisdom';

export type JoinBattleResponse = {
	success: boolean;
	status: string;
	message: string;
	battle: {
		id: string;
		type: string;
		status: string;
		currentTurn: number;
		turnDeadline: string;
		locationId: string;
		forcedBattle: boolean;
		marketThiefBattle: boolean;
		guardedPortalId: null;
		scheduledEventId: null;
		baseXpReward: number;
		baseGoldReward: number;
		winnerTeam: null;
		rewardsProcessed: boolean;
		createdAt: string;
		updatedAt: string;
	};
	isShadow: boolean;
	shadowOf: string;
};

export type PlayerState = {
	health: { current: number; max: number; percentage: number };
	inBattle: boolean;
};
