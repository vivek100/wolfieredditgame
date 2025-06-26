import type { MenuItem } from '@devvit/public-api';
import { Devvit } from '@devvit/public-api';

import { LoadingState } from '../components/LoadingState.js';
import { Service } from '../service/Service.js';

export const createWolfGame: MenuItem = {
  label: '[Wolf Game] Create New Game',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const service = new Service(context);
    const community = await context.reddit.getCurrentSubreddit();
    
    // Generate unique game ID
    const gameId = `wolf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const post = await context.reddit.submitPost({
      title: `🐺 Who is the Wolf? - Game #${gameId.split('_')[1]}`,
      subredditName: community.name,
      preview: (
        <vstack height="100%" width="100%" alignment="center middle" padding="medium">
          <text size="xlarge" weight="bold">🐺 Who is the Wolf?</text>
          <text size="medium">A social deduction game</text>
          <spacer height="16px" />
          <text size="medium" color="gray">Players: 0/6</text>
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
    
    // Save wolf game data
    await service.saveWolfGame(post.id, {
      gameId,
      postId: post.id,
      creatorId: context.userId!,
      status: 'waiting',
      players: [],
      maxPlayers: 6,
      createdAt: Date.now(),
    });
    
    context.ui.showToast('Wolf game created! Share the post for others to join.');
    context.ui.navigateTo(post);
  },
}; 