import type {
  Post,
  RedditAPIClient,
  RedisClient,
  Scheduler,
  ZRangeOptions,
} from '@devvit/public-api';
import { Devvit } from '@devvit/public-api';

import { GuessScreenSkeleton } from '../posts/DrawingPost/GuessScreenSkeleton.js';
import Settings from '../settings.json';
import type {
  CollectionData,
  CollectionPostData,
  CommentId,
  Dictionary,
  DrawingPostData,
  GameSettings,
  PinnedPostData,
  PostGuesses,
  PostId,
  PostType,
  ScoreBoardEntry,
  UserData,
  WordSelectionEvent,
  WolfGameData,
  WolfPlayer,
  WolfPostData,
  WordPair,
  WolfGameStatus,
  PlayerRole,
} from '../types.js';
import { getLevelByScore } from '../utils.js';

// Keep the size of the word selection events within a maximum event count.
const maxWordSelectionEvents = 1_000_000;

// Trimming (to enforce maxWordSelectionEvents) will only be done on this fraction of event emissions.
const trimWordSelectionEventsProbability = 0.01;

// Service that handles the backbone logic for the application
// This service is responsible for:
// * Storing and fetching post data for drawings
// * Storing and fetching the score board
// * Storing and fetching user settings
// * Storing and fetching game settings
// * Storing and fetching dynamic dictionaries
// * Managing Wolf games

export class Service {
  readonly redis: RedisClient;
  readonly reddit?: RedditAPIClient;
  readonly scheduler?: Scheduler;

  constructor(context: { redis: RedisClient; reddit?: RedditAPIClient; scheduler?: Scheduler }) {
    this.redis = context.redis;
    this.reddit = context.reddit;
    this.scheduler = context.scheduler;
  }

  readonly tags = {
    scores: 'default',
  };

  readonly keys = {
    dictionary: (dictionaryName: string) => `dictionary:${dictionaryName}`,
    dictionaries: 'dictionaries',
    gameSettings: 'game-settings',
    guessComments: (postId: PostId) => `guess-comments:${postId}`,
    postData: (postId: PostId) => `post:${postId}`,
    postGuesses: (postId: PostId) => `guesses:${postId}`,
    postSkipped: (postId: PostId) => `skipped:${postId}`,
    postSolved: (postId: PostId) => `solved:${postId}`,
    postUserGuessCounter: (postId: PostId) => `user-guess-counter:${postId}`,
    scores: `pixels:${this.tags.scores}`,
    userData: (username: string) => `users:${username}`,
    userDrawings: (username: string) => `user-drawings:${username}`,
    wordDrawings: (word: string) => `word-drawings:${word}`,
    wordSelectionEvents: 'word-selection-events-v2',
    // Wolf game keys
    wolfGame: (postId: PostId) => `wolf-game:${postId}`,
    wolfGamePlayers: (postId: PostId) => `wolf-game-players:${postId}`,
    wolfGameClues: (postId: PostId) => `wolf-game-clues:${postId}`,
    wolfGameVotes: (postId: PostId) => `wolf-game-votes:${postId}`,
    activeWolfGames: 'active-wolf-games',
  };

  /*
   * Submit Guess
   */

  async submitGuess(event: {
    postData: DrawingPostData;
    username: string;
    guess: string;
    createComment: boolean;
  }): Promise<number> {
    if (!this.reddit || !this.scheduler) {
      console.error('Reddit API client or Scheduler not available in Service');
      return 0;
    }

    const [comment, guessCount] = await Promise.all([
      // Comment guess
      event.createComment
        ? this.reddit.submitComment({
            id: event.postData.postId,
            text: `I tried **${event.guess}**`,
          })
        : Promise.resolve(undefined),
      // Increment the counter for this guess
      this.redis.zIncrBy(this.keys.postGuesses(event.postData.postId), event.guess, 1),
    ]);

    const isCorrect = event.postData.word.toLowerCase() === event.guess;
    const isFirstSolve = isCorrect && guessCount === 1;
    const userPoints = isCorrect
      ? isFirstSolve
        ? Settings.guesserRewardForSolve + Settings.guesserRewardForFirstSolve
        : Settings.guesserRewardForSolve
      : 0;

    const promises: Promise<unknown>[] = [
      // Increment the user's guess count
      this.redis.zIncrBy(this.keys.postUserGuessCounter(event.postData.postId), event.username, 1),
    ];

    // Save guess comment
    if (comment) {
      promises.push(this.saveGuessComment(event.postData.postId, event.guess, comment.id));
    }

    if (isCorrect) {
      // Persist that the user has solved the post and give points to drawer and guesser
      promises.push(
        this.redis.zAdd(this.keys.postSolved(event.postData.postId), {
          member: event.username,
          score: Date.now(),
        }),
        this.incrementUserScore(
          event.postData.authorUsername,
          Settings.authorRewardForCorrectGuess
        ),
        this.incrementUserScore(event.username, userPoints)
      );
    }

    // Comment to credit the first solver
    if (isFirstSolve) {
      const in5Min = new Date(Date.now() + 5 * 60 * 1000);
      promises.push(
        this.scheduler.runJob({
          name: 'FIRST_SOLVER_COMMENT',
          data: {
            postId: event.postData.postId,
            username: event.username,
          },
          runAt: in5Min,
        })
      );
    }

    await Promise.all(promises);
    return userPoints;
  }

  /*
   * Post User Guess Counter
   * A sorted set with the number of guesses made by each player
   * - Member: Username
   * - Score: Number of guesses made
   */

  async getPlayerCount(postId: PostId): Promise<number> {
    const key = this.keys.postUserGuessCounter(postId);
    return await this.redis.zCard(key);
  }

  /*
   * Post Guess Comments
   * A hash map of guesses with the commentIds backing them.
   */

  async getGuessComments(postId: PostId): Promise<{ [guess: string]: string[] }> {
    const key = this.keys.guessComments(postId);
    const data = await this.redis.hGetAll(key);
    // TODO: Update this so it doesn't blow up at scale
    const parsedData: { [guess: string]: CommentId[] } = {};
    Object.entries(data).forEach(([guess, commentId]) => {
      if (!parsedData[guess]) {
        parsedData[guess] = [];
      }
      parsedData[guess].push(commentId as CommentId);
    });

    return parsedData;
  }

  async getGuessComment(postId: PostId, commentId: CommentId): Promise<string | undefined> {
    const key = this.keys.guessComments(postId);
    return await this.redis.hGet(key, commentId);
  }

  async saveGuessComment(postId: PostId, guess: string, commentId: string): Promise<void> {
    await this.redis.hSet(this.keys.guessComments(postId), { [guess]: commentId });
  }

  async removeGuessComment(postId: PostId, commentId: CommentId): Promise<void> {
    const key = this.keys.guessComments(postId);
    await this.redis.hDel(key, [commentId]);
  }

  /*
   * Pixels
   *
   * A sorted set for the in-game currency and scoreboard unit
   * - Member: Username
   * - Score: Number of pixels currently held
   */

  async getScores(maxLength: number = 10): Promise<ScoreBoardEntry[]> {
    const options: ZRangeOptions = { reverse: true, by: 'rank' };
    return await this.redis.zRange(this.keys.scores, 0, maxLength - 1, options);
  }

  async getUserScore(username: string | null): Promise<{
    rank: number;
    score: number;
  }> {
    const defaultValue = { rank: -1, score: 0 };
    if (!username) return defaultValue;
    try {
      const [rank, score] = await Promise.all([
        this.redis.zRank(this.keys.scores, username),
        // TODO: Remove .zScore when .zRank supports the WITHSCORE option
        this.redis.zScore(this.keys.scores, username),
      ]);
      return {
        rank: rank === undefined ? -1 : rank,
        score: score === undefined ? 0 : score,
      };
    } catch (error) {
      if (error) {
        console.error('Error fetching user score board entry', error);
      }
      return defaultValue;
    }
  }

  async incrementUserScore(username: string, amount: number): Promise<number> {
    if (this.scheduler === undefined) {
      console.error('Scheduler not available in Service');
      return 0;
    }
    const key = this.keys.scores;
    const prevScore = (await this.redis.zScore(key, username)) ?? 0;
    const nextScore = await this.redis.zIncrBy(key, username, amount);
    const prevLevel = getLevelByScore(prevScore);
    const nextLevel = getLevelByScore(nextScore);
    if (nextLevel.rank > prevLevel.rank) {
      await this.scheduler.runJob({
        name: 'USER_LEVEL_UP',
        data: {
          username,
          score: nextScore,
          prevLevel,
          nextLevel,
        },
        runAt: new Date(),
      });
    }

    return nextScore;
  }

  /*
   * Post Guesses
   *
   * A sorted set that tracks how many times each guess has been made:
   * - Member: Guess
   * - Score: Count
   */

  async getPostGuesses(postId: PostId): Promise<PostGuesses> {
    const key = this.keys.postGuesses(postId);
    const data = await this.redis.zRange(key, 0, -1);

    const parsedData: PostGuesses = {
      guesses: {},
      wordCount: 0,
      guessCount: 0,
    };

    data.forEach((value) => {
      const { member: guess, score: count } = value;
      parsedData.guesses[guess] = count;
      parsedData.guessCount += count;
      parsedData.wordCount += 1;
    });

    return parsedData;
  }

  /*
   * User Drawings
   *
   * All shared drawings are stored in a sorted set for each player:
   * - Member: Post ID
   * - Score: Unix epoch time
   */

  async getUserDrawings(
    username: string,
    options?: {
      min?: number;
      max?: number;
    }
  ): Promise<PostId[]> {
    try {
      const key = this.keys.userDrawings(username);
      const start = options?.min ?? 0;
      const stop = options?.max ?? -1;
      const data = await this.redis.zRange(key, start, stop, {
        reverse: true,
        by: 'rank',
      });
      if (!data || data === undefined) return [];
      return data.map((value) => value.member as PostId);
    } catch (error) {
      if (error) {
        console.error('Error fetching user drawings:', error);
      }
      return [];
    }
  }

  /*
   * Post data
   */

  async getPostType(postId: PostId) {
    // Check if it's a wolf game first
    const wolfGameKey = this.keys.wolfGame(postId);
    const wolfGameData = await this.redis.hGet(wolfGameKey, 'postType');
    if (wolfGameData === 'wolf_game') {
      return 'wolf_game' as PostType;
    }
    
    const key = this.keys.postData(postId);
    const postType = await this.redis.hGet(key, 'postType');
    const defaultPostType = 'drawing';
    return (postType ?? defaultPostType) as PostType;
  }

  /*
   * Drawing Post data
   */

  async getDrawingPost(postId: PostId): Promise<DrawingPostData> {
    const [postData, solvedCount, skippedCount] = await Promise.all([
      // TODO: Use hMGet to only fetch needed fields when available
      this.redis.hGetAll(this.keys.postData(postId)),
      this.redis.zCard(this.keys.postSolved(postId)),
      this.redis.zCard(this.keys.postSkipped(postId)),
    ]);
    return {
      postId: postId,
      authorUsername: postData.authorUsername,
      data: JSON.parse(postData.data),
      date: parseInt(postData.date),
      word: postData.word,
      dictionaryName: postData.dictionaryName,
      solves: solvedCount,
      skips: skippedCount,
      postType: postData.postType,
    };
  }

  async getDrawingPosts(postIds: PostId[]): Promise<Pick<DrawingPostData, 'postId' | 'data'>[]> {
    return await Promise.all(
      postIds.map(async (postId) => {
        const key = this.keys.postData(postId);
        const stringifiedData = await this.redis.hGet(key, 'data');
        return {
          postId,
          data: stringifiedData ? JSON.parse(stringifiedData) : [],
        };
      })
    );
  }

  async updateDrawingPostPreview(
    postId: PostId,
    drawing: number[],
    playerCount: number,
    dictionaryName: string
  ): Promise<void> {
    const post = await this.reddit?.getPostById(postId);
    try {
      await post?.setCustomPostPreview(() => (
        <GuessScreenSkeleton
          drawing={drawing}
          playerCount={playerCount}
          dictionaryName={dictionaryName}
        />
      ));
    } catch (error) {
      console.error('Failed updating drawing preview', error);
    }
  }

  /*
   * Skip Post
   */

  async skipPost(postId: PostId, username: string): Promise<void> {
    const key = this.keys.postSkipped(postId);
    await this.redis.zAdd(key, {
      member: username,
      score: Date.now(),
    });
  }

  /*
   * Handle drawing submissions
   */

  async submitDrawing(data: {
    postId: PostId;
    word: string;
    dictionaryName: string;
    data: number[];
    authorUsername: string;
    subreddit: string;
  }): Promise<void> {
    if (!this.scheduler || !this.reddit) {
      console.error('submitDrawing: Scheduler/Reddit API client not available');
      return;
    }
    const key = this.keys.postData(data.postId);
    await Promise.all([
      // Save post object
      this.redis.hSet(key, {
        postId: data.postId,
        data: JSON.stringify(data.data),
        authorUsername: data.authorUsername,
        date: Date.now().toString(),
        word: data.word,
        dictionaryName: data.dictionaryName,
        postType: 'drawing',
      }),
      // Save the post to the user's drawings
      this.redis.zAdd(this.keys.userDrawings(data.authorUsername), {
        member: data.postId,
        score: Date.now(),
      }),
      // Save the post to the word's drawings
      this.redis.zAdd(this.keys.wordDrawings(data.word), {
        member: data.postId,
        score: Date.now(),
      }),
      // Schedule a job to pin the TLDR comment
      this.scheduler.runJob({
        name: 'DRAWING_PINNED_TLDR_COMMENT',
        data: { postId: data.postId },
        runAt: new Date(Date.now()),
      }),
      // Give points to the user for posting
      this.incrementUserScore(data.authorUsername, Settings.authorRewardForSubmit),
    ]);
  }

  /*
   * Game settings
   */

  async storeGameSettings(settings: { [field: string]: string }): Promise<void> {
    const key = this.keys.gameSettings;
    await this.redis.hSet(key, settings);
  }

  async getGameSettings(): Promise<GameSettings> {
    const key = this.keys.gameSettings;
    return (await this.redis.hGetAll(key)) as GameSettings;
  }

  /*
   * Dictionary
   */

  /**
   * Saves a list of words to the specified dictionary. If the dictionary does not exist, it will be created.
   *
   * @param dictionaryName The name of the dictionary to save the words to.
   * @param newWords The list of words to save to the dictionary.
   * @returns The number of words that were added to the dictionary.
   */
  async upsertDictionary(
    dictionaryName: string,
    newWords: string[]
  ): Promise<{ rows: number; uniqueNewWords: string[]; duplicatesNotAdded: string[] }> {
    const key = this.keys.dictionary(dictionaryName);
    const existingJSON = await this.redis.get(key);
    const existingWords = existingJSON ? JSON.parse(existingJSON) : [];

    const uniqueNewWords = newWords.filter((word) => !existingWords.includes(word));
    const duplicatesNotAdded = newWords.filter((word) => existingWords.includes(word));

    const updatedWordsJson = JSON.stringify(Array.from(new Set([...existingWords, ...newWords])));
    await this.saveDictionary(dictionaryName, JSON.parse(updatedWordsJson));
    return { rows: uniqueNewWords.length, uniqueNewWords, duplicatesNotAdded };
  }

  async removeWordFromDictionary(
    dictionaryName: string,
    wordsToRemove: string[]
  ): Promise<{ removedCount: number; removedWords: string[]; notFoundWords: string[] }> {
    const key = this.keys.dictionary(dictionaryName);
    const existingJSON = await this.redis.get(key);
    const existingWords: string[] = existingJSON ? JSON.parse(existingJSON) : [];
    const updatedWords = existingWords.filter((word) => !wordsToRemove.includes(word));

    const removedCount = existingWords.length - updatedWords.length;
    const removedWords = wordsToRemove.filter((word) => existingWords.includes(word));
    const notFoundWords = wordsToRemove.filter((word) => !removedWords.includes(word));

    await this.saveDictionary(dictionaryName, updatedWords);
    return { removedCount, removedWords, notFoundWords };
  }

  async getActiveDictionaries(): Promise<Dictionary[]> {
    // Determine which dictionaries to fetch
    const gameSettings = await this.getGameSettings();
    const defaultDictionary = 'main';
    const dictionaries = [gameSettings.selectedDictionary];
    if (gameSettings.selectedDictionary !== defaultDictionary) {
      dictionaries.push(defaultDictionary);
    }

    // Fetch and parse the dictionaries
    return await Promise.all(
      dictionaries.map(async (dictionaryName) => {
        const key = this.keys.dictionary(dictionaryName);
        const dictionaryJsonString = await this.redis.get(key);
        const parsedDictionary: string[] = dictionaryJsonString
          ? JSON.parse(dictionaryJsonString)
          : [];
        return {
          name: dictionaryName,
          words: parsedDictionary,
        };
      })
    );
  }

  async selectDictionary(dictionaryName: string): Promise<void> {
    const gameSettings = await this.getGameSettings();
    gameSettings.selectedDictionary = dictionaryName;
    await this.storeGameSettings(gameSettings);
    await this.redis.zAdd(this.keys.dictionaries, {
      member: dictionaryName,
      score: Date.now(),
    });
  }

  async logDictionary(dictionaryName: string, username: string): Promise<void> {
    const data = await this.redis.get(this.keys.dictionary(dictionaryName));
    if (!data) return;
    const parsedData: string[] = JSON.parse(data);
    await this.reddit?.sendPrivateMessage({
      to: username,
      subject: `Dictionary: ${dictionaryName}`,
      text: `# Dictionary

#### **Details**
- Name: ${dictionaryName}
- Word Count: ${parsedData.length}

#### **Words**
${parsedData.map((word) => `- ${word}`).join('\n')}
`,
    });
  }

  async getAllDictionaryNames(): Promise<string[]> {
    const data =
      (await this.redis.zRange(this.keys.dictionaries, 0, -1, {
        by: 'rank',
        reverse: true,
      })) ?? [];
    return data.map((value) => value.member);
  }

  async registerDictionary(dictionaryName: string): Promise<void> {
    await this.redis.zAdd(this.keys.dictionaries, {
      member: dictionaryName,
      score: Date.now(),
    });
  }

  async deleteDictionary(dictionaryName: string): Promise<void> {
    const defaultDictionary = 'main';
    if (!dictionaryName || dictionaryName === defaultDictionary) return;
    const currentDictionary = await this.redis.hGet(this.keys.gameSettings, 'selectedDictionary');
    await Promise.all([
      await this.redis.del(this.keys.dictionary(dictionaryName)),
      await this.redis.zRem(this.keys.dictionaries, [dictionaryName]),
      currentDictionary === dictionaryName
        ? await this.redis.hSet(this.keys.gameSettings, {
            selectedDictionary: defaultDictionary,
          })
        : Promise.resolve(undefined),
    ]);
  }

  async saveDictionary(dictionaryName: string, words: string[]): Promise<void> {
    const json = JSON.stringify(words);
    const key = this.keys.dictionary(dictionaryName);
    await Promise.all([
      this.redis.set(key, json),
      this.redis.zAdd(this.keys.dictionaries, {
        member: dictionaryName,
        score: Date.now(),
      }),
    ]);
  }

  /*
   * Collections
   */

  async getPostDataFromSubredditPosts(posts: Post[], limit: number): Promise<CollectionData[]> {
    return await Promise.all(
      posts.map(async (post: Post) => {
        const postType = await this.getPostType(post.id);
        if (postType === 'drawing') {
          return await this.getDrawingPost(post.id);
        }
        return null;
      })
    ).then((results) =>
      results.filter((postData): postData is DrawingPostData => postData !== null).slice(0, limit)
    );
  }

  async storeCollectionPostData(data: {
    postId: PostId;
    data: CollectionData[];
    timeframe: string;
    postType: string;
  }): Promise<void> {
    const key = this.keys.postData(data.postId);
    await this.redis.hSet(key, {
      postId: data.postId,
      data: JSON.stringify(data.data),
      timeframe: data.timeframe,
      postType: data.postType,
    });
  }

  async getCollectionPost(postId: PostId): Promise<CollectionPostData> {
    const key = this.keys.postData(postId);
    const post = await this.redis.hGetAll(key);
    return {
      postId,
      postType: 'collection',
      data: JSON.parse(post.data),
      timeframe: post.timeframe,
    };
  }

  /*
   * Pinned Post
   */

  async savePinnedPost(postId: PostId): Promise<void> {
    const key = this.keys.postData(postId);
    await this.redis.hSet(key, {
      postId,
      postType: 'pinned',
    });
  }

  async getPinnedPost(postId: PostId): Promise<PinnedPostData> {
    const key = this.keys.postData(postId);
    const postType = await this.redis.hGet(key, 'postType');
    return {
      postId,
      postType: postType ?? 'pinned',
    };
  }

  /*
   * User Data and State Persistence
   */

  async saveUserData(
    username: string,
    data: { [field: string]: string | number | boolean }
  ): Promise<void> {
    const key = this.keys.userData(username);
    const stringConfig = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    );
    await this.redis.hSet(key, stringConfig);
  }

  async getUser(username: string | null, postId: PostId): Promise<UserData | null> {
    if (!username) return null;
    const data = await this.redis.hGetAll(this.keys.userData(username));
    const solved = !!(await this.redis.zScore(this.keys.postSolved(postId), username));
    const skipped = !!(await this.redis.zScore(this.keys.postSkipped(postId), username));
    const guessCount =
      (await this.redis.zScore(this.keys.postUserGuessCounter(postId), username)) ?? 0;

    const user = await this.getUserScore(username);
    const level = getLevelByScore(user.score);
    const parsedData: UserData = {
      score: user.score,
      levelRank: data.levelRank ? parseInt(data.levelRank) : level.rank,
      levelName: data.levelName ?? level.name,
      solved,
      skipped,
      guessCount,
    };
    return parsedData;
  }

  /*
   * Collect gameplay metrics to improve the game
   */

  async emitWordSelectionEvent(data: WordSelectionEvent): Promise<number> {
    // Occasionally trim the events collection if needed.
    if (Math.random() < trimWordSelectionEventsProbability) {
      await this.trimWordSelectionEvents(maxWordSelectionEvents);
    }

    const key = this.keys.wordSelectionEvents;
    return await this.redis.zAdd(key, {
      member: JSON.stringify(data),
      score: Date.now(),
    });
  }

  async getRecentWordSelectionEvents(count: number): Promise<WordSelectionEvent[]> {
    const key = this.keys.wordSelectionEvents;
    const data = await this.redis.zRange(key, 0, count - 1, { reverse: true, by: 'rank' });
    return data.map((value) => JSON.parse(value.member));
  }

  async trimWordSelectionEvents(maxCount: number): Promise<void> {
    const key = this.keys.wordSelectionEvents;
    const currentCount = await this.redis.zCard(key);
    if (currentCount > maxCount) {
      const n = await this.redis.zRemRangeByRank(key, 0, currentCount - maxCount - 1);
      console.log(`trimmed ${n} word selection events from ${key}`);
    }
  }

  /*
   * Wolf Game Methods
   */

  async saveWolfGame(postId: PostId, gameData: WolfGameData): Promise<void> {
    const key = this.keys.wolfGame(postId);
    await this.redis.hSet(key, {
      postId,
      postType: 'wolf_game',
      gameData: JSON.stringify(gameData),
    });

    // Add to active games list
    await this.redis.zAdd(this.keys.activeWolfGames, {
      member: postId,
      score: Date.now(),
    });
  }

  async getWolfGame(postId: PostId): Promise<WolfPostData | null> {
    const key = this.keys.wolfGame(postId);
    const data = await this.redis.hGetAll(key);
    if (!data.gameData) return null;

    return {
      postId,
      postType: 'wolf_game',
      gameData: JSON.parse(data.gameData),
    };
  }

  async updateWolfGameStatus(postId: PostId, status: WolfGameStatus): Promise<void> {
    const wolfPost = await this.getWolfGame(postId);
    if (!wolfPost) return;

    wolfPost.gameData.status = status;
    await this.saveWolfGame(postId, wolfPost.gameData);
  }

  async joinWolfGame(postId: PostId, userId: string, username: string): Promise<boolean> {
    const wolfPost = await this.getWolfGame(postId);
    if (!wolfPost) return false;

    const gameData = wolfPost.gameData;
    
    // Check if game is full or already started
    if (gameData.players.length >= gameData.maxPlayers || gameData.status !== WolfGameStatus.WAITING) {
      return false;
    }

    // Check if user already joined
    const existingPlayer = gameData.players.find(p => p.userId === userId);
    if (existingPlayer) return false;

    // Add player
    const newPlayer: WolfPlayer = {
      userId,
      username,
      clues: [],
      isAlive: true,
      joinedAt: Date.now(),
    };

    gameData.players.push(newPlayer);

    // Start game if we have 6 players
    if (gameData.players.length === 6) {
      gameData.status = WolfGameStatus.CLUES;
      gameData.startedAt = Date.now();
      await this.assignWolfRoles(gameData);
    }

    await this.saveWolfGame(postId, gameData);
    return true;
  }

  async leaveWolfGame(postId: PostId, userId: string): Promise<boolean> {
    const wolfPost = await this.getWolfGame(postId);
    if (!wolfPost) return false;

    const gameData = wolfPost.gameData;
    const playerIndex = gameData.players.findIndex(p => p.userId === userId);
    
    if (playerIndex === -1) return false;

    // If game hasn't started, just remove player
    if (gameData.status === WolfGameStatus.WAITING) {
      gameData.players.splice(playerIndex, 1);
      await this.saveWolfGame(postId, gameData);
      return true;
    }

    // If game has started, check if leaving player was the wolf
    const leavingPlayer = gameData.players[playerIndex];
    if (leavingPlayer.role === PlayerRole.WOLF) {
      gameData.status = WolfGameStatus.ENDED;
      gameData.winner = 'villagers';
      gameData.endedAt = Date.now();
    } else {
      // Mark player as not alive
      leavingPlayer.isAlive = false;
    }

    await this.saveWolfGame(postId, gameData);
    return true;
  }

  private async assignWolfRoles(gameData: WolfGameData): Promise<void> {
    const wordPairs = await this.getWolfWordPairs();
    const randomPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    
    // Randomly select wolf
    const wolfIndex = Math.floor(Math.random() * gameData.players.length);
    
    gameData.players.forEach((player, index) => {
      if (index === wolfIndex) {
        player.role = PlayerRole.WOLF;
        player.word = randomPair.wolfWord;
        gameData.wolfId = player.userId;
      } else {
        player.role = PlayerRole.VILLAGER;
        player.word = randomPair.villageWord;
      }
    });

    gameData.villageWord = randomPair.villageWord;
    gameData.wolfWord = randomPair.wolfWord;
  }

  private async getWolfWordPairs(): Promise<WordPair[]> {
    // For now, return hardcoded word pairs. Later this could be from Redis/settings
    return [
      { villageWord: 'Apple', wolfWord: 'Orange' },
      { villageWord: 'Cat', wolfWord: 'Dog' },
      { villageWord: 'Fire', wolfWord: 'Water' },
      { villageWord: 'Sun', wolfWord: 'Moon' },
      { villageWord: 'Mountain', wolfWord: 'Ocean' },
      { villageWord: 'Book', wolfWord: 'Movie' },
      { villageWord: 'Winter', wolfWord: 'Summer' },
      { villageWord: 'Coffee', wolfWord: 'Tea' },
    ];
  }

  async submitWolfClues(postId: PostId, userId: string, clues: string[]): Promise<boolean> {
    const wolfPost = await this.getWolfGame(postId);
    if (!wolfPost || wolfPost.gameData.status !== WolfGameStatus.CLUES) return false;

    const player = wolfPost.gameData.players.find(p => p.userId === userId);
    if (!player || clues.length !== 3) return false;

    player.clues = clues.map(c => c.trim());

    // Check if all players submitted clues
    const allSubmitted = wolfPost.gameData.players.every(p => p.clues.length === 3);
    if (allSubmitted) {
      wolfPost.gameData.status = WolfGameStatus.VOTING;
      wolfPost.gameData.votingDeadline = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    }

    await this.saveWolfGame(postId, wolfPost.gameData);
    return true;
  }

  async submitWolfVote(postId: PostId, voterId: string, targetId: string): Promise<boolean> {
    const wolfPost = await this.getWolfGame(postId);
    if (!wolfPost || wolfPost.gameData.status !== WolfGameStatus.VOTING) return false;

    const voter = wolfPost.gameData.players.find(p => p.userId === voterId && p.isAlive);
    const target = wolfPost.gameData.players.find(p => p.userId === targetId && p.isAlive);
    
    if (!voter || !target) return false;

    voter.votedFor = targetId;

    // Check if all alive players voted
    const alivePlayers = wolfPost.gameData.players.filter(p => p.isAlive);
    const votedPlayers = alivePlayers.filter(p => p.votedFor);
    
    if (votedPlayers.length === alivePlayers.length) {
      await this.processWolfVoting(wolfPost.gameData);
    }

    await this.saveWolfGame(postId, wolfPost.gameData);
    return true;
  }

  private async processWolfVoting(gameData: WolfGameData): Promise<void> {
    const alivePlayers = gameData.players.filter(p => p.isAlive);
    const voteCounts: { [userId: string]: number } = {};

    // Count votes
    alivePlayers.forEach(player => {
      if (player.votedFor) {
        voteCounts[player.votedFor] = (voteCounts[player.votedFor] || 0) + 1;
      }
    });

    // Find player with most votes
    let eliminatedPlayerId: string | null = null;
    let maxVotes = 0;
    
    Object.entries(voteCounts).forEach(([userId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedPlayerId = userId;
      }
    });

    if (eliminatedPlayerId) {
      const eliminatedPlayer = gameData.players.find(p => p.userId === eliminatedPlayerId);
      if (eliminatedPlayer) {
        eliminatedPlayer.isAlive = false;

        // Check win conditions
        if (eliminatedPlayer.role === PlayerRole.WOLF) {
          gameData.status = WolfGameStatus.ENDED;
          gameData.winner = 'villagers';
          gameData.endedAt = Date.now();
        } else {
          const aliveVillagers = gameData.players.filter(p => p.isAlive && p.role === PlayerRole.VILLAGER);
          const aliveWolves = gameData.players.filter(p => p.isAlive && p.role === PlayerRole.WOLF);
          
          if (aliveWolves.length >= aliveVillagers.length) {
            gameData.status = WolfGameStatus.ENDED;
            gameData.winner = 'wolf';
            gameData.endedAt = Date.now();
          } else {
            // Continue to next round
            gameData.status = WolfGameStatus.VOTING;
            gameData.votingDeadline = Date.now() + 24 * 60 * 60 * 1000;
            // Reset votes
            gameData.players.forEach(p => p.votedFor = undefined);
          }
        }
      }
    }
  }

  async getWolfGameByGameId(gameId: string): Promise<WolfGameData | null> {
    // For simplicity, we'll search through active games
    // In production, you might want a more efficient lookup
    const activeGames = await this.getActiveWolfGames();
    const game = activeGames.find(g => g.gameId === gameId);
    return game ? {
      gameId: game.gameId,
      postId: game.postId,
      creatorId: game.creatorId,
      status: game.status,
      wordPairIndex: game.wordPairIndex || 0,
      players: game.players,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      currentRound: game.currentRound,
      votingEndTime: game.votingEndTime,
    } : null;
  }

  async getActiveWolfGames(): Promise<WolfPostData[]> {
    const gameIds = await this.redis.zRange(this.keys.activeWolfGames, 0, -1, { reverse: true });
    const games: WolfPostData[] = [];

    for (const gameId of gameIds) {
      const game = await this.getWolfGame(gameId.member as PostId);
      if (game && game.gameData.status === WolfGameStatus.WAITING) {
        games.push(game);
      }
    }

    return games;
  }
}
