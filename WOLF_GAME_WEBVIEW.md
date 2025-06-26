# Wolf Game - Simplified Single-Screen Implementation

## Overview

This is a streamlined Wolf game implementation where users play against 5 computer players in a single-screen experience. The game auto-assigns roles and focuses on the core game mechanics with built-in scoring and leaderboards.

## Game Flow

### 1. **Game Start**
- User clicks on Wolf game → Auto-assigned role (Wolf 20% chance, Sheep 80%)
- Auto-assigned word from predefined word pairs
- 5 computer players created with appropriate roles/words

### 2. **Clues Phase**
- User provides 3 clues about their word
- Computer players generate clues automatically (2-second delay for realism)
- All clues displayed together

### 3. **Voting Phase**
- 30-second timer for voting
- User votes for who they think is the wolf
- Computer players vote randomly (5-second delay)
- Auto-submit if timer runs out

### 4. **Results Phase**
- Vote tallies displayed
- Eliminated player revealed
- Game outcome (Wolf caught = Sheep win, Innocent eliminated = Wolf wins)
- Score calculation:
  - Win: +10 points (Sheep) / +15 points (Wolf)
  - Participation: +2 points
- Leaderboard display

### 5. **Next Round**
- Continue with new role/word assignment
- Cumulative scoring

## Architecture

### Files Structure
```
pixelary/webroot/
├── wolf-game.html    # Single-screen game interface
├── wolf-game.css     # Modern responsive styling
└── wolf-game.js      # Complete game logic

pixelary/src/posts/WolfGamePost/
└── WolfGameMain.tsx  # Devvit bridge component

pixelary/src/types.ts # Simplified message types
```

### Computer Player System
- **Names**: Alice, Bob, Charlie, Diana, Eva
- **Behavior**: Random clue generation and voting (designed for future AI integration)
- **Clue Generation**: Uses `CLUE_TEMPLATES` with word-specific hints
- **Wolf Strategy**: Slightly misleading clues to blend in

### Scoring System
- **Win Conditions**:
  - Sheep win: Wolf is eliminated (+10 points)
  - Wolf wins: Innocent eliminated (+15 points)
- **Participation**: +2 points per round
- **Persistence**: Scores saved via PostMessage to Devvit for Redis storage

## Future AI Integration Points

### 1. **AI Player Interface**
```typescript
interface AIPlayer {
  generateClues(word: string, role: 'wolf' | 'sheep', context: GameContext): string[];
  makeVote(allClues: PlayerClues[], suspicions: Suspicion[]): string;
  analyzeClues(clues: string[]): SuspicionLevel;
}
```

### 2. **Strategy Components**
- **Clue Analysis**: Pattern recognition for wolf detection
- **Deception Strategy**: Smart wolf clue generation
- **Voting Logic**: Evidence-based decision making
- **Behavioral Patterns**: Human-like timing and responses

### 3. **Integration Points**
- Replace `generateCluesForWord()` with AI clue generation
- Replace `generateComputerVotes()` with AI voting logic
- Add difficulty levels (Random → Smart → Expert)

## Technical Features

### Responsive Design
- Mobile-first responsive layout
- Touch-friendly voting buttons
- Optimized for both portrait and landscape

### Performance
- Client-side game state management
- Minimal Devvit communication (only scoring)
- Instant UI updates and smooth transitions

### User Experience
- Real-time feedback and animations
- Clear game state progression
- Visual role indicators and scoring

## Development Benefits

1. **Rapid Iteration**: Standard web technologies (HTML/CSS/JS)
2. **Easy Testing**: Direct browser testing without Devvit compilation
3. **Performance**: Client-side state management
4. **Future-Proof**: Clean architecture for AI integration
5. **Scalable**: Simple addition of new features and game modes

## Usage

1. User clicks on Wolf Game post
2. Game automatically starts with role assignment
3. Single-screen experience guides through all phases
4. Scoring and leaderboard integration with Reddit identity
5. Seamless round-to-round progression

This implementation prioritizes simplicity, performance, and future extensibility while maintaining the core social deduction gameplay that makes Wolf games engaging. 