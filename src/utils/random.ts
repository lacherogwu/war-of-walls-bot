/**
 * Generate a random number between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 * @param exclude - Array of numbers to exclude from the result
 * @returns A random number between min and max, excluding any specified values
 */
export function generateRandomNumber(min: number, max: number, exclude?: number[]): number {
	if (min > max) {
		throw new Error('Min value cannot be greater than max value');
	}

	let randNum = Math.floor(Math.random() * (max - min + 1)) + min;

	// Avoid infinite loop if all possible numbers are excluded
	const possibleNumbers = max - min + 1;
	const excludedCount = exclude?.length || 0;

	if (excludedCount >= possibleNumbers) {
		throw new Error('Cannot generate a number: all values are excluded');
	}

	while (exclude?.includes(randNum)) {
		randNum = Math.floor(Math.random() * (max - min + 1)) + min;
	}

	return randNum;
}

/**
 * Generate random attack and defense positions for combat
 * @returns Object containing attackPos and two unique defensePositions
 */
export function generateCombatPositions(): { attackPos: number; defPos1: number; defPos2: number } {
	const attackPos = generateRandomNumber(0, 3);
	const defPos1 = generateRandomNumber(0, 3);
	const defPos2 = generateRandomNumber(0, 3, [defPos1]);

	return { attackPos, defPos1, defPos2 };
}
