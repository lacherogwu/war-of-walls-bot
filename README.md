# War of Walls Bot 🤖

An automated bot framework for the [War of Walls](https://knights-il.com/game) browser game.

## ⚠️ Disclaimer

**THIS PROJECT IS FOR EDUCATIONAL PURPOSES ONLY**

This bot is developed as a learning project to explore automation, game mechanics, and TypeScript development. Using automated bots in online games may violate the game's Terms of Service and could result in account penalties or bans.

**USE AT YOUR OWN RISK**

The authors of this project take no responsibility for any consequences that may arise from using this software, including but not limited to:

- Account suspension or termination
- Loss of game progress
- Violation of terms of service
- Any other penalties imposed by the game administrators

By using this software, you acknowledge that you understand these risks and accept full responsibility for your actions.

## 🎮 What is War of Walls?

War of Walls is a browser-based strategy game where players compete to control territory and engage in combat. Visit the game at: [https://knights-il.com/game](https://knights-il.com/game)

## ✨ Features

This bot framework provides:

- **Automated Combat**: PvE and PvP bot implementations
- **Intelligent Navigation**: Automatic pathfinding and travel
- **Combat Management**: Automated attack strategies and target selection
- **Modular Architecture**: Easy to extend with custom bot behaviors
- **Resource Management**: Automatic health monitoring and regeneration
- **Multiple Bot Types**:
  - `PvEBot`: Fights NPCs for experience and loot
  - `PvPShadowBot`: Engages in player-versus-player combat
  - Custom bots: Create your own strategies

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (package manager)
- A War of Walls game account

## 📖 Usage

UPCOMING

### Creating Custom Bots

The framework provides a modular architecture for creating custom bot behaviors. Check the [`src/examples/customBots.ts`](src/examples/customBots.ts) file for examples:

```typescript
import { BaseBot } from './bots/BaseBot';
import { WarOfWalls } from './api/WarOfWalls';

export class MyCustomBot extends BaseBot {
	protected async executeCycle(): Promise<void> {
		// Your custom bot logic here
		await this.travelPath([x, y], 'Going somewhere');
		await this.rest(5000);
	}
}
```

Available bot examples:

- **RestBot**: Simple bot that rests at a location for health regeneration
- **PatrolBot**: Patrols between multiple locations
- **FarmBot**: Farms specific enemy types in a designated area
- **HealerBot**: Monitors health and automatically finds rest locations
- **TerritoryBot**: Claims and defends territory points

## 🏗️ Project Structure

```
src/
├── api/
│   └── WarOfWalls.ts       # API client for game communication
├── bots/
│   ├── BaseBot.ts          # Base bot class with common functionality
│   ├── PvEBot.ts           # PvE (Player vs Environment) bot
│   └── PvPShadowBot.ts     # PvP (Player vs Player) bot
├── combat/
│   └── CombatController.ts # Combat logic and strategy
├── examples/
│   └── customBots.ts       # Example custom bot implementations
├── utils/
│   ├── logger.ts           # Logging utilities
│   ├── random.ts           # Random number utilities
│   └── time.ts             # Time/delay utilities
└── index.ts                # Main entry point
```

## 🔧 Development

### Building

The project uses TypeScript. Run with `tsx`:

```bash
tsx src/index.ts
```

### Extending the Bot

1. **Create a new bot class** by extending `BaseBot`
2. **Implement `executeCycle()`** with your custom logic
3. **Use inherited methods** like:
   - `travelPath(location, reason)` - Navigate to coordinates
   - `rest(duration)` - Rest for health regeneration
   - `attack(targetId)` - Engage in combat
   - `getCurrentState()` - Get player state and position

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please note that this project is for educational purposes only. When contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on the GitHub repository.

---

**Remember**: This bot is for educational purposes only. Always respect the game's Terms of Service and community guidelines.
