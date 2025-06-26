import type { Context } from '@devvit/public-api';
import { Devvit, useState } from '@devvit/public-api';

import { LoadingState } from '../../components/LoadingState.js';
import { Service } from '../../service/Service.js';
import type { Dictionary, GameSettings, UserData, WolfPostData } from '../../types.js';
import { WolfGameStatus, PlayerRole } from '../../types.js';

interface WolfGamePostProps {
  postData: WolfPostData;
  userData: UserData | null;
  username: string | null;
  gameSettings: GameSettings;
  dictionaries: Dictionary[];
}

export const WolfGamePost = (props: WolfGamePostProps, context: Context): JSX.Element => {
  const service = new Service(context);
  const gameData = props.postData.gameData;
  const [refreshKey, setRefreshKey] = useState(0);

  const currentPlayer = gameData.players.find(p => p.userId === context.userId);
  const isInGame = !!currentPlayer;
  const isAlive = currentPlayer?.isAlive ?? false;

  const handleJoinGame = async () => {
    if (!context.userId || !props.username) {
      context.ui.showToast('You must be logged in to join');
      return;
    }

    const success = await service.joinWolfGame(props.postData.postId, context.userId, props.username);
    if (success) {
      context.ui.showToast('Joined the game!');
      setRefreshKey(prev => prev + 1); // Force refresh
    } else {
      context.ui.showToast('Could not join - game may be full or started');
    }
  };

  const handleLeaveGame = async () => {
    if (!context.userId) return;

    const success = await service.leaveWolfGame(props.postData.postId, context.userId);
    if (success) {
      context.ui.showToast('Left the game');
      setRefreshKey(prev => prev + 1); // Force refresh
    }
  };

  const handleSubmitClues = async (clues: string[]) => {
    if (!context.userId) return;

    const success = await service.submitWolfClues(props.postData.postId, context.userId, clues);
    if (success) {
      context.ui.showToast('Clues submitted!');
      setRefreshKey(prev => prev + 1); // Force refresh
    } else {
      context.ui.showToast('Could not submit clues');
    }
  };

  const handleVote = async (targetId: string) => {
    if (!context.userId) return;

    const success = await service.submitWolfVote(props.postData.postId, context.userId, targetId);
    if (success) {
      context.ui.showToast('Vote submitted!');
      setRefreshKey(prev => prev + 1); // Force refresh
    } else {
      context.ui.showToast('Could not submit vote');
    }
  };

  // Waiting Phase
  if (gameData.status === WolfGameStatus.WAITING) {
    return (
      <vstack width="100%" height="100%" padding="medium" alignment="center middle">
        <text size="xxlarge">🐺</text>
        <spacer height="16px" />
        <text size="xlarge" weight="bold">Who is the Wolf?</text>
        <text size="medium" color="gray">A social deduction game</text>
        <spacer height="24px" />
        
        <text size="large">Players: {gameData.players.length}/{gameData.maxPlayers}</text>
        <spacer height="16px" />
        
        <vstack gap="small" alignment="center">
          {gameData.players.map((player, index) => (
            <hstack key={player.userId} gap="small" alignment="center">
              <text>{index + 1}.</text>
              <text weight="bold">{player.username}</text>
              {player.userId === gameData.creatorId && <text color="gold">👑</text>}
            </hstack>
          ))}
        </vstack>
        
        <spacer height="24px" />
        
        {gameData.players.length < gameData.maxPlayers && (
          <text size="medium" color="gray">
            Waiting for {gameData.maxPlayers - gameData.players.length} more players...
          </text>
        )}
        
        <spacer height="16px" />
        
        {!isInGame && gameData.players.length < gameData.maxPlayers && (
          <button appearance="primary" onPress={handleJoinGame}>
            Join Game
          </button>
        )}
        
        {isInGame && (
          <button appearance="secondary" onPress={handleLeaveGame}>
            Leave Game
          </button>
        )}
        
        <spacer height="16px" />
        <text size="small" color="gray" alignment="center">
          The game starts automatically when 6 players join.
          Everyone gets a word and must give 3 one-word clues.
          The wolf gets a different word - find them!
        </text>
      </vstack>
    );
  }

  // Clues Phase
  if (gameData.status === WolfGameStatus.CLUES) {
    if (!isInGame) {
      return (
        <vstack width="100%" height="100%" padding="medium" alignment="center middle">
          <text size="xlarge">🔍 Game in Progress</text>
          <text>This game has already started</text>
        </vstack>
      );
    }

    const hasSubmittedClues = currentPlayer!.clues.length === 3;
    const [clue1, setClue1] = useState(currentPlayer!.clues[0] || '');
    const [clue2, setClue2] = useState(currentPlayer!.clues[1] || '');
    const [clue3, setClue3] = useState(currentPlayer!.clues[2] || '');

    return (
      <vstack width="100%" height="100%" padding="medium">
        <text size="xlarge" weight="bold">🔍 Give Clues</text>
        <spacer height="16px" />
        
        <text size="large">Your word: <text weight="bold">{currentPlayer!.word}</text></text>
        <spacer height="16px" />
        
        <text>Give 3 one-word clues about your word:</text>
        <spacer height="16px" />
        
        {hasSubmittedClues ? (
          <vstack gap="small">
            <text>Your clues:</text>
            {currentPlayer!.clues.map((clue, index) => (
              <text key={index} weight="bold">• {clue}</text>
            ))}
          </vstack>
        ) : (
          <vstack gap="medium">
            <textInput 
              value={clue1} 
              onChangeText={setClue1} 
              placeholder="First clue" 
            />
            <textInput 
              value={clue2} 
              onChangeText={setClue2} 
              placeholder="Second clue" 
            />
            <textInput 
              value={clue3} 
              onChangeText={setClue3} 
              placeholder="Third clue" 
            />
            <button 
              appearance="primary" 
              onPress={() => handleSubmitClues([clue1.trim(), clue2.trim(), clue3.trim()])}
              disabled={!clue1.trim() || !clue2.trim() || !clue3.trim()}
            >
              Submit Clues
            </button>
          </vstack>
        )}
        
        <spacer height="24px" />
        
        <text size="large" weight="bold">Player Status:</text>
        <spacer height="8px" />
        {gameData.players.map(player => (
          <hstack key={player.userId} gap="medium" alignment="center">
            <text>{player.username}</text>
            <text color={player.clues.length === 3 ? 'green' : 'orange'}>
              {player.clues.length === 3 ? '✅ Ready' : '⏳ Thinking...'}
            </text>
          </hstack>
        ))}
      </vstack>
    );
  }

  // Voting Phase
  if (gameData.status === WolfGameStatus.VOTING) {
    if (!isInGame || !isAlive) {
      return (
        <vstack width="100%" height="100%" padding="medium" alignment="center middle">
          <text size="xlarge">🗳️ Voting in Progress</text>
          <text>Players are voting on who they think is the wolf</text>
        </vstack>
      );
    }

    const [selectedTarget, setSelectedTarget] = useState<string | null>(currentPlayer!.votedFor || null);
    const hasVoted = !!currentPlayer!.votedFor;

    return (
      <vstack width="100%" height="100%" padding="medium">
        <text size="xlarge" weight="bold">🗳️ Vote Phase</text>
        <spacer height="16px" />
        
        <text size="medium">Who do you think is the wolf?</text>
        <spacer height="16px" />
        
        <text size="large" weight="bold">All Clues:</text>
        <spacer height="8px" />
        
        {gameData.players.map(player => (
          <vstack key={player.userId} padding="small" gap="small">
            <text weight="bold">{player.username}:</text>
            <hstack gap="medium">
              {player.clues.map((clue, index) => (
                <text key={index} color="blue">"{clue}"</text>
              ))}
            </hstack>
          </vstack>
        ))}
        
        <spacer height="24px" />
        
        {hasVoted ? (
          <text>You voted for: <text weight="bold">{gameData.players.find(p => p.userId === currentPlayer!.votedFor)?.username}</text></text>
        ) : (
          <vstack gap="medium">
            <text weight="bold">Vote to eliminate:</text>
            {gameData.players.filter(p => p.isAlive && p.userId !== context.userId).map(player => (
              <hstack key={player.userId} gap="medium" alignment="center">
                <button 
                  appearance={selectedTarget === player.userId ? 'primary' : 'secondary'}
                  onPress={() => setSelectedTarget(player.userId)}
                >
                  {player.username}
                </button>
              </hstack>
            ))}
            {selectedTarget && (
              <button 
                appearance="primary" 
                onPress={() => handleVote(selectedTarget)}
              >
                Confirm Vote
              </button>
            )}
          </vstack>
        )}
      </vstack>
    );
  }

  // Game Ended
  if (gameData.status === WolfGameStatus.ENDED) {
    const wolfPlayer = gameData.players.find(p => p.role === PlayerRole.WOLF);
    
    return (
      <vstack width="100%" height="100%" padding="medium" alignment="center middle">
        <text size="xxlarge">{gameData.winner === 'wolf' ? '🐺' : '🎉'}</text>
        <spacer height="16px" />
        
        <text size="xlarge" weight="bold">Game Over!</text>
        <spacer height="16px" />
        
        <text size="large">
          {gameData.winner === 'wolf' ? 'Wolf Wins!' : 'Villagers Win!'}
        </text>
        <spacer height="16px" />
        
        <text>The wolf was: <text weight="bold">{wolfPlayer?.username || 'Unknown'}</text></text>
        <spacer height="8px" />
        <text>Wolf word: <text weight="bold">"{gameData.wolfWord}"</text></text>
        <text>Village word: <text weight="bold">"{gameData.villageWord}"</text></text>
        
        <spacer height="24px" />
        
        <text size="large" weight="bold">Final Players:</text>
        <spacer height="8px" />
        {gameData.players.map(player => (
          <hstack key={player.userId} gap="medium" alignment="center">
            <text>{player.username}</text>
            <text color={player.role === PlayerRole.WOLF ? 'red' : 'green'}>
              {player.role === PlayerRole.WOLF ? '🐺 Wolf' : '👤 Villager'}
            </text>
            <text color={player.isAlive ? 'green' : 'gray'}>
              {player.isAlive ? '✅ Alive' : '💀 Eliminated'}
            </text>
          </hstack>
        ))}
      </vstack>
    );
  }

  return <LoadingState />;
}; 