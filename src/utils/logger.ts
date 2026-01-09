type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';
type LoggerOptions = {
	label?: string;
};

export class Logger {
	private colors = {
		info: '\x1b[36m', // Cyan
		success: '\x1b[32m', // Green
		warn: '\x1b[33m', // Yellow
		error: '\x1b[31m', // Red
		debug: '\x1b[90m', // Gray
		reset: '\x1b[0m',
		bold: '\x1b[1m',
	};

	#opts: LoggerOptions;

	constructor(opts?: { label?: string }) {
		this.#opts = opts ?? {};
	}

	get label(): string | undefined {
		return this.#opts.label;
	}

	private formatTimestamp(): string {
		const now = new Date();
		return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	private log(level: LogLevel, message: string, data?: any) {
		const timestamp = this.formatTimestamp();
		const color = this.colors[level];
		const prefix = `${this.colors.bold}${color}[${level.toUpperCase()}]${this.colors.reset}`;
		const timePrefix = `${this.colors.debug}${timestamp}${this.colors.reset}`;
		const labelPrefix = this.label ? `${this.colors.bold}[${this.label}]${this.colors.reset} ` : '';

		console.log(`${timePrefix} ${prefix} ${labelPrefix}${message}`);
		if (data !== undefined) {
			console.log(data);
		}
	}

	info(message: string, data?: any) {
		this.log('info', message, data);
	}

	success(message: string, data?: any) {
		this.log('success', message, data);
	}

	warn(message: string, data?: any) {
		this.log('warn', message, data);
	}

	error(message: string, data?: any) {
		this.log('error', message, data);
	}

	debug(message: string, data?: any) {
		this.log('debug', message, data);
	}

	battle(message: string, data?: any) {
		const timestamp = this.formatTimestamp();
		const prefix = `${this.colors.bold}\x1b[35m[BATTLE]${this.colors.reset}`; // Magenta
		const timePrefix = `${this.colors.debug}${timestamp}${this.colors.reset}`;
		const labelPrefix = this.label ? `${this.colors.bold}[${this.label}]${this.colors.reset} ` : '';
		console.log(`${timePrefix} ${prefix} ${labelPrefix}${message}`);
		if (data !== undefined) {
			console.log(data);
		}
	}

	travel(message: string, data?: any) {
		const timestamp = this.formatTimestamp();
		const prefix = `${this.colors.bold}\x1b[34m[TRAVEL]${this.colors.reset}`; // Blue
		const timePrefix = `${this.colors.debug}${timestamp}${this.colors.reset}`;
		const labelPrefix = this.label ? `${this.colors.bold}[${this.label}]${this.colors.reset} ` : '';
		console.log(`${timePrefix} ${prefix} ${labelPrefix}${message}`);
		if (data !== undefined) {
			console.log(data);
		}
	}

	divider() {
		console.log(`${this.colors.debug}${'─'.repeat(80)}${this.colors.reset}`);
	}
}

export const logger = new Logger();
