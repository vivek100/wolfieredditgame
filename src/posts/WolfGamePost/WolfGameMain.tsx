import type { Context } from '@devvit/public-api';
import { Devvit, useState, useWebView } from '@devvit/public-api';

import { Service } from '../../service/Service.js';
import Settings from '../../settings.json' with { type: 'json' };
import type { 
  WolfDevvitMessage, 
  WolfWebViewMessage, 
  WolfGameData, 
  WolfPlayer,
  PlayerRole,
  GameSettings 
} from '../../types.js';
import { PixelText } from '../../components/PixelText.js';
import { StyledButton } from '../../components/StyledButton.js';

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

function getRandomWordPair(): { sheep: string; wolf: string; index: number } {
  const index = Math.floor(Math.random() * WORD_PAIRS.length);
  return {
    ...WORD_PAIRS[index],
    index,
  };
}

interface WolfGameMainProps {
  gameSettings: GameSettings;
}

export const WolfGameMain = (props: WolfGameMainProps, context: Context): JSX.Element => {
  const service = new Service(context);
  
  // Load username
  const [username] = useState(async () => {
    return (await context.reddit.getCurrentUsername()) ?? 'anon';
  });

  // For now, don't load existing game data to avoid type conflicts
  const [gameData, setGameData] = useState<any>(null);

  const webView = useWebView<WolfWebViewMessage, WolfDevvitMessage>({
    url: 'wolf-game.html',
    async onMessage(message, webView) {
      try {
        switch (message.type) {
          case 'webViewReady':
            // Send initial data to web view
            webView.postMessage({
              type: 'initialData',
              data: {
                username: username,
                userId: context.userId ?? '',
                gameData: gameData
              },
            });
            break;

          case 'createGame':
            await handleCreateGame(message.data, webView);
            break;

          case 'joinGame':
            await handleJoinGame(message.data, webView);
            break;

          case 'startVoting':
            await handleStartVoting(message.data, webView);
            break;

          case 'submitVote':
            await handleSubmitVote(message.data, webView);
            break;

          case 'getGameData':
            await handleGetGameData(message.data, webView);
            break;

          case 'unmount':
            webView.unmount();
            break;

          default:
            console.warn('Unknown message type:', (message as any).type);
        }
      } catch (error) {
        console.error('Error handling web view message:', error);
        webView.postMessage({
          type: 'error',
          data: { message: 'An error occurred. Please try again.' }
        });
      }
    },
    onUnmount() {
      context.ui.showToast('Wolf game closed');
    },
  });

  async function handleCreateGame(data: any, webView: any) {
    if (!context.userId || !username) {
      webView.postMessage({
        type: 'error',
        data: { message: 'Please log in to create a game' }
      });
      return;
    }

    // Generate game ID
    const gameId = `wolf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the game post
    const community = await context.reddit.getCurrentSubreddit();
    
    const post = await context.reddit.submitPost({
      title: `🐺 Who is the Wolf? - Game #${gameId.split('_')[1]}`,
      subredditName: community.name,
      preview: (
        <vstack height="100%" width="100%" alignment="center middle" padding="medium">
          <text size="xlarge" weight="bold">🐺 Who is the Wolf?</text>
          <text size="medium">A social deduction game</text>
          <spacer height="16px" />
          <text size="medium" color="gray">Players: 1/6</text>
          <spacer height="16px" />
          <text size="small" alignment="center">
            Click to join the game! The game starts automatically when 6 players join.
          </text>
          <spacer height="16px" />
          <hstack alignment="center" gap="medium">
            <text size="small">🟢 Waiting for players...</text>
          </hstack>
        </vstack>
      ),
    });

    // Create simple game data  
    const newGameData = {
      gameId,
      postId: post.id,
      creatorId: context.userId,
      status: 'waiting',
      wordPairIndex: 0,
      players: [{
        userId: context.userId,
        username: username,
        role: 'sheep',
        word: 'Apple',
        clues: [],
        isAlive: true,
        joinedAt: Date.now(),
      }],
      maxPlayers: 6,
      createdAt: Date.now(),
    };

    // For now, skip saving to Redis to avoid service method issues
    // await service.saveWolfGame(post.id, newGameData);
    setGameData(newGameData);

    webView.postMessage({
      type: 'gameCreated',
      data: { postId: post.id, gameData: newGameData }
    });

    // Navigate to the new post
    context.ui.navigateTo(post);
  }

  async function handleJoinGame(data: { gameId: string }, webView: any) {
    // For now, just return an error since we're focusing on game creation
    webView.postMessage({
      type: 'error',
      data: { message: 'Join game feature coming soon! For now, create a new game.' }
    });
  }

  async function handleStartVoting(data: { gameId: string }, webView: any) {
    webView.postMessage({
      type: 'error',
      data: { message: 'Voting feature coming soon!' }
    });
  }

  async function handleSubmitVote(data: { gameId: string; targetUserId: string }, webView: any) {
    webView.postMessage({
      type: 'error',
      data: { message: 'Voting feature coming soon!' }
    });
  }

  async function handleGetGameData(data: { gameId: string }, webView: any) {
    if (gameData) {
      webView.postMessage({
        type: 'gameUpdated',
        data: { gameData }
      });
    }
  }

  // Render the Devvit UI with same styling as PinnedPost
  return (
    <zstack width="100%" height="100%" alignment="top start">
      <image
        imageHeight={1024}
        imageWidth={2048}
        height="100%"
        width="100%"
        url="background.png"
        description="Striped blue background"
        resizeMode="cover"
      />
      <vstack width="100%" height="100%" alignment="center middle">
        <spacer grow />
        
        {/* Wolf Logo */}
        <image
          url="wolfie.png"
          imageHeight={256}
          imageWidth={256}
          width="128px"
          height="128px"
          description="Wolf Game Logo"
        />
        <spacer height="16px" />

        {/* Wordmark */}
        <PixelText scale={4} color="#FFFFFF">Who is the Wolf?</PixelText>
        <spacer height="8px" />
        <PixelText scale={1} color="#FFFFFF">
          A social deduction game
        </PixelText>

        <spacer grow />

        {/* Game Status Display */}
        {gameData ? (
          <vstack alignment="center" gap="small">
            <PixelText color="#FFFFFF">
              Game Status: {gameData.status}
            </PixelText>
            <PixelText color="#FFFFFF">
              Players: {gameData.players.length}/{gameData.maxPlayers}
            </PixelText>
            <spacer height="16px" />
          </vstack>
        ) : null}

        {/* Launch Button */}
        <vstack alignment="center middle" gap="small">
          <StyledButton
            width="256px"
            appearance="primary"
            height="48px"
            onPress={() => webView.mount()}
            leadingIcon="+"
            label="LAUNCH WOLF GAME"
          />
        </vstack>
        
        <spacer grow />
      </vstack>
    </zstack>
  );
}; 