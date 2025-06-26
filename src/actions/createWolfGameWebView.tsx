import type { Context, MenuItemOnPressEvent } from '@devvit/public-api';
import { Devvit } from '@devvit/public-api';

export const createWolfGameWebView = {
  label: 'Create Wolf Game (Web View)',
  location: 'subreddit',
  onPress: async (event: MenuItemOnPressEvent, context: Context) => {
    const { reddit } = context;
    const subreddit = await reddit.getCurrentSubreddit();

    const post = await reddit.submitPost({
      title: 'Who is the Wolf? - New Game',
      subredditName: subreddit.name,
      preview: (
        <vstack height="100%" width="100%" alignment="center middle" padding="medium">
          <text size="xlarge" weight="bold">🐺 Who is the Wolf?</text>
          <text size="medium">A social deduction game - Web View Version</text>
          <spacer height="16px" />
          <text size="small" alignment="center">
            Click the "Launch Game" button to start playing!
          </text>
          <spacer height="16px" />
          <text size="small" color="gray">
            Fast development, modern UI, better performance
          </text>
        </vstack>
      ),
    });

    context.ui.showToast('Wolf Game (Web View) post created!');
    context.ui.navigateTo(post);
  },
}; 