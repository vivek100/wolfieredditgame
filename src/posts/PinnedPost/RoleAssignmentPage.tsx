import type { Context } from '@devvit/public-api';
import { Devvit, useForm, useState } from '@devvit/public-api';

import { HeroButton } from '../../components/HeroButton.js';
import { PixelText } from '../../components/PixelText.js';
import { StyledButton } from '../../components/StyledButton.js';
import { Service } from '../../service/Service.js';
import Settings from '../../settings.json' with { type: 'json' };
import type { GameSettings } from '../../types.js';
import { PlayerRole } from '../../types.js';

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

interface RoleAssignmentPageProps {
  username: string;
  gameSettings: GameSettings;
  onClose: () => void;
  onGameCreated: (postId: string) => void;
}

export const RoleAssignmentPage = (props: RoleAssignmentPageProps, context: Context): JSX.Element => {
  const service = new Service(context);
  
  // Initialize role and word state with function initializers
  const [roleData] = useState(() => {
    if (!context.userId) return null;
    
    // First player (game creator) gets random role
    const assignedRole: PlayerRole = Math.random() < 0.33 ? PlayerRole.WOLF : PlayerRole.SHEEP;
    const wordPair = getRandomWordPair();
    const assignedWord = assignedRole === PlayerRole.WOLF ? wordPair.wolf : wordPair.sheep;
    
    return {
      role: assignedRole,
      word: assignedWord,
      wordPairIndex: wordPair.index
    };
  });

  const [gameId] = useState(`wolf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const width = 500;

  // Return loading state if role data is not ready
  if (!roleData) {
    return (
      <vstack height="100%" width="100%" alignment="center middle" padding="medium">
        <PixelText scale={2} color="white">Assigning your role...</PixelText>
      </vstack>
    );
  }

  const { role, word, wordPairIndex } = roleData;

  // Clues form
  const cluesForm = useForm(
    {
      title: role === PlayerRole.WOLF ? 'You are the WOLF! 🐺' : 'You are a SHEEP! 🐑',
      description: role === PlayerRole.WOLF 
        ? `Your word is "${word}". Give 3 clues that could apply to either word to blend in with the sheep!`
        : `Your word is "${word}". Give 3 honest clues about your word.`,
      acceptLabel: 'Submit Clues & Create Game',
      fields: [
        {
          type: 'string',
          name: 'clue1',
          label: 'Clue 1',
          required: true,
        },
        {
          type: 'string',
          name: 'clue2',
          label: 'Clue 2',
          required: true,
        },
        {
          type: 'string',
          name: 'clue3',
          label: 'Clue 3',
          required: true,
        },
      ],
    },
    async (values) => {
      if (!context.userId) return;

      const clues = [values.clue1.trim(), values.clue2.trim(), values.clue3.trim()];
      
      try{
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
      
      const username = props.username || 'Unknown';

      context.ui.showToast('Wolf game created with your clues! Share the post for others to join.');
      props.onGameCreated(post.id);
      context.ui.navigateTo(post);

      // Save wolf game data and auto-join creator with their clues
      await service.saveWolfGame(post.id, {
        gameId,
        postId: post.id,
        creatorId: context.userId,
        status: 'waiting' as any,
        wordPairIndex, // Store the word pair index for consistency
        players: [{
          userId: context.userId,
          username,
          role,
          word,
          clues,
          isAlive: true,
          joinedAt: Date.now(),
        }],
        maxPlayers: 6,
        createdAt: Date.now(),
      });

      }catch(error){
        context.ui.showToast('Error creating wolf game');
        console.error(error);
      }
    }
  );

  return (
    <zstack height="100%" width="100%">
      <vstack height="100%" width="100%" alignment="center middle">
        {/* Role Display - No background, just text */}
        <vstack alignment="center middle" padding="large" width={`${width}px`}>
          <text size="xxlarge" color="white">
            {role === PlayerRole.WOLF ? '🐺' : '🐑'}
          </text>
          <spacer height="16px" />
          <PixelText scale={3} color="white">
            {role === PlayerRole.WOLF ? 'YOU ARE THE WOLF!' : 'YOU ARE A SHEEP!'}
          </PixelText>
          <spacer height="20px" />
          <PixelText scale={2} color="white">
            Your word is:
          </PixelText>
          <spacer height="8px" />
          <PixelText scale={2} color="gold">
            {word}
          </PixelText>
        </vstack>
        
        <spacer height="8px" />

        {/* Instructions */}
        <vstack alignment="center middle" padding="medium" width="400px">
          <PixelText color="white" scale={1}>
            {role === PlayerRole.WOLF 
              ? 'Give clues that will help you blend in with the sheep!'
              : 'Give clues that will help identify the wolf.'
            }
          </PixelText>
        </vstack>

        <spacer height="20px" />

        {/* Submit Clues Button */}
        <HeroButton
          label="ENTER YOUR CLUES"
          onPress={() => context.ui.showForm(cluesForm)}
          animated={true}
          width="350px"
        />

        <spacer height="24px" />

        {/* Game Info */}
        <PixelText color="white" scale={1}>
          Game will start when total 6 players join
        </PixelText>
      </vstack>

      {/* Overlay with styled back button */}
      <vstack height="100%" width="100%" alignment="center middle">
        <spacer height="16px" />
        <hstack alignment="middle center">
          <StyledButton
            appearance="secondary"
            onPress={props.onClose}
            leadingIcon="arrow-left"
            label="BACK"
            width="160px"
          />
        </hstack>
        <spacer grow />
        <spacer height="8px" />
      </vstack>
    </zstack>
  );
}; 