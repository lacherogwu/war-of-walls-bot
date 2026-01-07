import { setTimeout } from 'node:timers/promises';
/**
 * Delay execution for a specified duration
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
export async function delay(ms: number): Promise<void> {
	await setTimeout(ms);
}
