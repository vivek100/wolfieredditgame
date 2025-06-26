import type { PlayerRole } from '../types.js';

// Word pairs for the game - wolf gets one word, sheep get the other
const WORD_PAIRS = [
  { sheep: 'Apple', wolf: 'Orange' },
  { sheep: 'Cat', wolf: 'Dog' },
  { sheep: 'Coffee', wolf: 'Tea' },
  { sheep: 'Summer', wolf: 'Winter' },
  { sheep: 'Book', wolf: 'Movie' },
  { sheep: 'Beach', wolf: 'Mountain' },
  { sheep: 'Pizza', wolf: 'Burger' },
  { sheep: 'Car', wolf: 'Bike' },
  { sheep: 'Day', wolf: 'Night' },
  { sheep: 'Hot', wolf: 'Cold' },
];

// Role configuration: 4 sheep, 2 wolves for 6 players
const ROLES_CONFIG = {
  sheep: 4,
  wolf: 2,
  total: 6,
};

/**
 * Assigns a role based on player position (1-6)
 * First player gets a random role, subsequent players get assigned to maintain balance
 */
export function assignPlayerRole(playerCount: number): PlayerRole {
  if (playerCount === 1) {
    // First player gets random role
    return Math.random() < 0.33 ? 'wolf' : 'sheep'; // 33% chance of wolf for first player
  }
  
  // For subsequent players, we need to check what roles are still needed
  // This is a simplified version - in practice you'd track existing roles
  // For now, we'll alternate with bias toward sheep
  if (playerCount <= 4) {
    return Math.random() < 0.25 ? 'wolf' : 'sheep'; // 25% chance of wolf
  } else {
    return 'sheep'; // Last players are more likely to be sheep
  }
}

/**
 * Gets word pair for the current game and returns the appropriate word for the role
 */
export function getWordPairForRole(role: PlayerRole, pairIndex?: number): string {
  const index = pairIndex ?? Math.floor(Math.random() * WORD_PAIRS.length);
  const pair = WORD_PAIRS[index];
  return role === 'wolf' ? pair.wolf : pair.sheep;
}

/**
 * Gets a random word pair for starting a new game
 */
export function getRandomWordPair(): { sheep: string; wolf: string; index: number } {
  const index = Math.floor(Math.random() * WORD_PAIRS.length);
  return {
    ...WORD_PAIRS[index],
    index,
  };
}

/**
 * Validates if role distribution is correct for a full game
 */
export function validateRoleDistribution(roles: PlayerRole[]): boolean {
  const sheepCount = roles.filter(role => role === 'sheep').length;
  const wolfCount = roles.filter(role => role === 'wolf').length;
  
  return sheepCount === ROLES_CONFIG.sheep && wolfCount === ROLES_CONFIG.wolf;
}

/**
 * Gets the remaining roles needed based on current players
 */
export function getRemainingRoles(currentRoles: PlayerRole[]): { sheep: number; wolf: number } {
  const currentSheep = currentRoles.filter(role => role === 'sheep').length;
  const currentWolves = currentRoles.filter(role => role === 'wolf').length;
  
  return {
    sheep: Math.max(0, ROLES_CONFIG.sheep - currentSheep),
    wolf: Math.max(0, ROLES_CONFIG.wolf - currentWolves),
  };
}

/**
 * Assigns role for a new player joining an existing game
 */
export function assignRoleForJoiningPlayer(currentRoles: PlayerRole[]): PlayerRole | null {
  if (currentRoles.length >= ROLES_CONFIG.total) {
    return null; // Game is full
  }
  
  const remaining = getRemainingRoles(currentRoles);
  
  if (remaining.wolf > 0 && remaining.sheep > 0) {
    // Both roles available, prefer sheep but allow some wolves
    return Math.random() < 0.3 ? 'wolf' : 'sheep';
  } else if (remaining.wolf > 0) {
    return 'wolf';
  } else if (remaining.sheep > 0) {
    return 'sheep';
  }
  
  return null; // Shouldn't happen if game isn't full
} 