import { FlairTextColor } from '@devvit/public-api';

export type CandidateWord = {
  dictionaryName: string;
  word: string;
};

export type Dictionary = {
  name: string;
  words: string[];
};

export type GameSettings = {
  subredditName: string;
  selectedDictionary: string;
};

export enum PostType {
  DRAWING = 'drawing',
  COLLECTION = 'collection',
  PINNED = 'pinned',
  WOLF_GAME = 'wolf_game',
}

/*
 * Thing Identifiers
 */

export type CommentId = `t1_${string}`;
export type UserId = `t2_${string}`;
export type PostId = `t3_${string}`;
export type SubredditId = `t5_${string}`;

/*
 * Scheduled Jobs
 */

export type JobData = { answer: string; postId: PostId };

/*
 * Progression
 */

export type Level = {
  rank: number;
  name: string;
  min: number;
  max: number;
  backgroundColor: string;
  textColor: FlairTextColor;
  extraTime: number;
};

/*
 * Navigation
 */

export type Page =
  | 'card-draw'
  | 'editor'
  | 'info'
  | 'leaderboard'
  | 'overview'
  | 'review'
  | 'viewer'
  | 'wolf-lobby'
  | 'wolf-games';

// Base post data
export type PostData = {
  postId: PostId;
  postType: string;
};

// Drawing post
export type DrawingPostData = {
  postId: PostId;
  postType: string;
  word: string;
  dictionaryName: string;
  data: number[];
  authorUsername: string;
  date: number;
  solves: number;
  skips: number;
};

// Collections
export type CollectionData = Pick<DrawingPostData, 'postId' | 'data' | 'authorUsername'>;
export type CollectionPostData = {
  postId: PostId;
  postType: string;
  data: CollectionData[];
  timeframe: string;
};

// Pinned post
export type PinnedPostData = {
  postId: PostId;
  postType: string;
};

// Wolf Game Types
export enum WolfGameStatus {
  WAITING = 'waiting',
  CLUES = 'clues',
  VOTING = 'voting',
  ENDED = 'ended',
}

export enum PlayerRole {
  WOLF = 'wolf',
  SHEEP = 'sheep',
}

export type WolfPlayer = {
  userId: string;
  username: string;
  role?: PlayerRole;
  word?: string;
  clues: string[];
  votedFor?: string;
  isAlive: boolean;
  joinedAt: number;
};

export type WolfGameData = {
  gameId: string;
  postId: PostId;
  creatorId: string;
  status: WolfGameStatus;
  players: WolfPlayer[];
  maxPlayers: number;
  wordPairIndex?: number; // Index of the word pair being used
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  wolfId?: string;
  villageWord?: string;
  wolfWord?: string;
  votingDeadline?: number;
  winner?: 'wolf' | 'villagers';
  currentRound?: number;
};

export type WolfPostData = {
  postId: PostId;
  postType: string;
  gameData: WolfGameData;
};

export type WordPair = {
  villageWord: string;
  wolfWord: string;
};

export type PostGuesses = {
  guesses: { [guess: string]: number };
  wordCount: number;
  guessCount: number;
  playerCount?: number;
};

export type ScoreBoardEntry = {
  member: string;
  score: number;
  description?: string;
};

export type UserData = {
  score: number;
  solved: boolean; // Has the user solved this post?
  skipped: boolean; // Has the user skipped this post?
  levelRank: number;
  levelName: string;
  guessCount: number;
};

export type WordSelectionEvent = {
  userId: UserId;
  postId: PostId;
  options: { word: string; dictionaryName: string }[];
  word?: string;
  type: 'refresh' | 'manual' | 'auto';
};

// Simplified Wolf Game Web View Messages
export interface SimpleWolfGameData {
  gameId: string;
  postId: string;
  userId: string;
  username: string;
  currentRound: number;
  userRole: 'wolf' | 'sheep';
  userWord: string;
  score: number;
}

/** Message from Devvit to the web view. */
export type WolfDevvitMessage =
  | { type: 'initialData'; data: { username: string; userId: string; gameData?: SimpleWolfGameData } }
  | { type: 'gameCreated'; data: { postId: string; gameData: SimpleWolfGameData } }
  | { type: 'scoreUpdated'; data: { score: number } }
  | { type: 'error'; data: { message: string } };

/** Message from the web view to Devvit. */
export type WolfWebViewMessage =
  | { type: 'webViewReady' }
  | { type: 'createGame' }
  | { type: 'updateScore'; data: { score: number; userId: string } }
  | { type: 'unmount' };

/**
 * Web view MessageEvent listener data type for Wolf game.
 */
export type WolfDevvitSystemMessage = {
  data: { message: WolfDevvitMessage };
  type?: 'devvit-message' | string;
};
