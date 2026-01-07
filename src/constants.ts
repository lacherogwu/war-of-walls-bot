// Combat Configuration
export const COMBAT_CONFIG = {
	BATTLE_CHECK_INTERVAL: 3000, // ms
	ATTACK_DELAY: 1000, // ms between attacks
	REST_CHECK_INTERVAL: 5000, // ms
} as const;

// Position names for better logging
export const POSITION_NAMES = ['Head', 'Chest', 'Belly', 'Legs'] as const;

export type PositionName = (typeof POSITION_NAMES)[number];

/**
 * Get the name of a combat position
 */
export function getPositionName(position: number): PositionName | 'Unknown' {
	return POSITION_NAMES[position] || 'Unknown';
}
