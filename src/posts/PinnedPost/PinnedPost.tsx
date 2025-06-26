import { Context, Devvit, useAsync, useState } from '@devvit/public-api';

import { HowToPlayPage } from '../../components/HowToPlayPage.js';
import { LeaderboardPage } from '../../components/LeaderboardPage.js';
import { LoadingState } from '../../components/LoadingState.js';
import { PixelText } from '../../components/PixelText.js';
import { StyledButton } from '../../components/StyledButton.js';
import { Service } from '../../service/Service.js';
import Settings from '../../settings.json' with { type: 'json' };
import type { Dictionary, GameSettings, PostData, UserData, WolfPostData } from '../../types.js';
import { getLevelByScore } from '../../utils.js';
import { RoleAssignmentPage } from './RoleAssignmentPage.js';

interface PinnedPostProps {
  postData: PostData;
  userData: UserData | null;
  username: string | null;
  gameSettings: GameSettings;
  dictionaries: Dictionary[];
}

export const PinnedPost = (props: PinnedPostProps, context: Context): JSX.Element => {
  const service = new Service(context);
  const [page, setPage] = useState('menu');
  const buttonWidth = '256px';
  const buttonHeight = '48px';

  const { data: user, loading } = useAsync<{
    rank: number;
    score: number;
  }>(async () => {
    return await service.getUserScore(props.username);
  });

  const { data: wolfGames, loading: wolfGamesLoading } = useAsync<WolfPostData[]>(async () => {
    return await service.getActiveWolfGames();
  });

  if (user === null || loading) {
    return <LoadingState />;
  }

  // For now we assume that there is only one takeover active at a time
  const isTakeoverActive = props.dictionaries.some((dictionary) => dictionary.name !== 'main');
  const dictionary = props.dictionaries.find((dictionary) => dictionary.name !== 'main');

  const handleStartNewGame = () => {
    if (!context.userId) {
      context.ui.showToast('You must be logged in to create a game');
      return;
    }
    
    if (!props.username) {
      context.ui.showToast('Username is required to create a game');
      return;
    }
    
    // Navigate to role assignment page
    setPage('role-assignment');
  };

  const handleGameCreated = (postId: string) => {
    // Navigate to the created game post
    context.ui.navigateTo(`/r/${props.gameSettings.subredditName}/comments/${postId.substring(3)}`);
  };

  const handleJoinWolfGame = async (postId: string) => {
    if (!context.userId || !props.username) {
      context.ui.showToast('You must be logged in to join a game');
      return;
    }

    const success = await service.joinWolfGame(postId as any, context.userId, props.username);
    if (success) {
      context.ui.showToast('Joined the game!');
      context.ui.navigateTo(`/r/${props.gameSettings.subredditName}/comments/${postId.substring(3)}`);
    } else {
      context.ui.showToast('Could not join game - it may be full or already started');
    }
  };

  const WolfGamesPage = (
    <vstack width="100%" height="100%" padding="medium">
      <hstack alignment="center middle" gap="medium">
        <button onPress={() => setPage('menu')} appearance="secondary">
          ← Back
        </button>
        <text size="xlarge" weight="bold">🐺 Active Games</text>
        <spacer grow />
      </hstack>
      
      <spacer height="24px" />
      
      <text size="large" weight="bold">Join a Game</text>
      <spacer height="16px" />
      
      {wolfGamesLoading ? (
        <LoadingState />
      ) : wolfGames && wolfGames.length > 0 ? (
        <vstack gap="medium">
          {wolfGames.map((game) => (
            <hstack 
              key={game.postId} 
              padding="medium" 
              backgroundColor="white" 
              cornerRadius="medium"
              gap="medium"
              alignment="center middle"
            >
              <vstack grow>
                <text weight="bold">Game #{game.gameData.gameId.split('_')[1]}</text>
                <text size="small" color="gray">
                  Players: {game.gameData.players.length}/{game.gameData.maxPlayers}
                </text>
                <text size="small" color="gray">
                  Created by: {game.gameData.players[0]?.username || 'Unknown'}
                </text>
              </vstack>
              <StyledButton
                appearance="secondary"
                onPress={() => handleJoinWolfGame(game.postId)}
                label="JOIN"
              />
            </hstack>
          ))}
        </vstack>
      ) : (
        <vstack alignment="center middle" gap="medium">
          <text size="medium" color="gray">No active games</text>
          <text size="small" color="gray">Create a new one to get started!</text>
        </vstack>
      )}
    </vstack>
  );

  const Menu = (
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

      {/* Takeover banner */}
      {isTakeoverActive && dictionary?.name ? (
        <>
          <spacer height="8px" />
          <PixelText
            color="#FFFFFF"
            scale={2}
          >{`${dictionary?.name} ${dictionary?.name.startsWith('r/') ? 'takeover' : 'event'}`}</PixelText>
        </>
      ) : null}

      <spacer grow />

      {/* Menu */}
      <vstack alignment="center middle" gap="small">
        <StyledButton
          width={buttonWidth}
          appearance="primary"
          height={buttonHeight}
          onPress={handleStartNewGame}
          leadingIcon="+"
          label="START NEW GAME"
        />
        <StyledButton
          width={buttonWidth}
          appearance="secondary"
          height={buttonHeight}
          onPress={() => setPage('wolf-games')}
          label="JOIN GAME"
        />
        <StyledButton
          width={buttonWidth}
          appearance="secondary"
          height={buttonHeight}
          onPress={() => setPage('leaderboard')}
          label="LEADERBOARD"
        />
        <StyledButton
          width={buttonWidth}
          appearance="secondary"
          height={buttonHeight}
          onPress={() => setPage('how-to-play')}
          label="HOW TO PLAY"
        />
      </vstack>
      <spacer grow />
    </vstack>
  );

  const onClose = (): void => {
    setPage('menu');
  };

  const pages: Record<string, JSX.Element> = {
    menu: Menu,
    'wolf-games': WolfGamesPage,
    'role-assignment': (
      <RoleAssignmentPage
        username={props.username!}
        gameSettings={props.gameSettings}
        onClose={onClose}
        onGameCreated={handleGameCreated}
      />
    ),
    leaderboard: <LeaderboardPage {...props} onClose={onClose} />,
    'how-to-play': <HowToPlayPage onClose={onClose} />,
  };

  return pages[page] || Menu;
};
