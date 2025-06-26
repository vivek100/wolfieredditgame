/** @typedef {import('../src/types.ts').WolfDevvitSystemMessage} WolfDevvitSystemMessage */
/** @typedef {import('../src/types.ts').WolfWebViewMessage} WolfWebViewMessage */
/** @typedef {import('../src/types.ts').WolfGameData} WolfGameData */
/** @typedef {import('../src/types.ts').WolfPlayer} WolfPlayer */

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

// Computer player names
const COMPUTER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eva'];

// Possible clues for computer players (will be randomized)
const CLUE_TEMPLATES = {
  Apple: ['red fruit', 'grows on trees', 'good for health'],
  Orange: ['citrus fruit', 'bright color', 'vitamin C'],
  Cat: ['furry pet', 'says meow', 'independent'],
  Dog: ['loyal pet', 'man\'s best friend', 'barks'],
  Coffee: ['morning drink', 'has caffeine', 'brown liquid'],
  Tea: ['hot beverage', 'comes in bags', 'relaxing'],
  // ... more clue templates can be added
};

class WolfGameApp {
  constructor() {
    this.currentUser = null;
    this.gameState = 'loading'; // loading, clues, voting, results
    this.roundNumber = 1;
    this.userRole = null; // 'sheep' or 'wolf'
    this.userWord = null;
    this.computerPlayers = [];
    this.selectedVoteTarget = null;
    this.votingTimer = null;
    this.scores = {}; // userId -> score
    
    // Initialize DOM elements
    this.initializeElements();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Wait for Devvit messages
    addEventListener('message', this.onDevvitMessage.bind(this));
    
    // Signal that the web view is ready
    addEventListener('load', () => {
      this.postToDevvit({ type: 'webViewReady' });
    });
  }
  
  initializeElements() {
    // Main elements
    this.elements = {
      loading: document.getElementById('loading'),
      gameScreen: document.getElementById('game-screen'),
      roundNumber: document.getElementById('round-number'),
      userRole: document.getElementById('user-role'),
      assignedWord: document.getElementById('assigned-word'),
      
      // Sections
      wordSection: document.getElementById('word-section'),
      cluesSection: document.getElementById('clues-section'),
      computerStatus: document.getElementById('computer-status'),
      allCluesSection: document.getElementById('all-clues-section'),
      votingSection: document.getElementById('voting-section'),
      resultsSection: document.getElementById('results-section'),
      
      // Input elements
      clue1: document.getElementById('clue1'),
      clue2: document.getElementById('clue2'),
      clue3: document.getElementById('clue3'),
      
      // Containers
      computerPlayersList: document.getElementById('computer-players-list'),
      cluesContainer: document.getElementById('clues-container'),
      votingOptions: document.getElementById('voting-options'),
      votesContainer: document.getElementById('votes-container'),
      eliminatedPlayer: document.getElementById('eliminated-player'),
      gameOutcomeText: document.getElementById('game-outcome-text'),
      leaderboardContainer: document.getElementById('leaderboard-container'),
      
      // Buttons
      submitClues: document.getElementById('btn-submit-clues'),
      submitVote: document.getElementById('btn-submit-vote'),
      nextRound: document.getElementById('btn-next-round'),
      newGame: document.getElementById('btn-new-game'),
      
      // Other
      votingTimer: document.getElementById('voting-timer'),
      resultsTitle: document.getElementById('results-title')
    };
  }
  
  setupEventListeners() {
    this.elements.submitClues.addEventListener('click', () => this.submitClues());
    this.elements.submitVote.addEventListener('click', () => this.submitVote());
    this.elements.nextRound.addEventListener('click', () => this.nextRound());
    this.elements.newGame.addEventListener('click', () => this.newGame());
  }
  
  /**
   * Handle messages from Devvit
   */
  onDevvitMessage(event) {
    if (event.data.type !== 'devvit-message') return;
    
    const { message } = event.data.data;
    
    switch (message.type) {
      case 'initialData':
        this.handleInitialData(message.data);
        break;
      case 'gameCreated':
        this.startGame();
        break;
      case 'error':
        this.showError(message.data.message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  /**
   * Send message to Devvit
   */
  postToDevvit(message) {
    parent.postMessage(message, '*');
  }
  
  handleInitialData({ username, userId }) {
    this.currentUser = { username, userId };
    
    // Initialize user score if not exists
    if (!this.scores[userId]) {
      this.scores[userId] = { username, score: 0 };
    }
    
    // Auto-start the game
    this.startGame();
  }
  
  startGame() {
    // Hide loading, show game screen
    this.elements.loading.classList.add('hidden');
    this.elements.gameScreen.classList.remove('hidden');
    
    // Initialize game
    this.assignRoleAndWord();
    this.createComputerPlayers();
    this.updateUI();
    
    this.gameState = 'clues';
  }
  
  assignRoleAndWord() {
    // Randomly assign wolf or sheep (20% chance of being wolf)
    this.userRole = Math.random() < 0.2 ? 'wolf' : 'sheep';
    
    // Pick random word pair
    const wordPair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    this.userWord = this.userRole === 'wolf' ? wordPair.wolf : wordPair.sheep;
    
    // Store the word pair for computer players
    this.currentWordPair = wordPair;
  }
  
  createComputerPlayers() {
    this.computerPlayers = [];
    
    for (let i = 0; i < 5; i++) {
      const isWolf = this.userRole === 'sheep' && i === 0; // Only one wolf in the game
      const player = {
        id: `computer_${i}`,
        name: COMPUTER_NAMES[i],
        isWolf,
        word: isWolf ? this.currentWordPair.wolf : this.currentWordPair.sheep,
        clues: [],
        vote: null,
        isComputer: true
      };
      
      this.computerPlayers.push(player);
    }
  }
  
  updateUI() {
    // Update round and role display
    this.elements.roundNumber.textContent = `Round ${this.roundNumber}`;
    this.elements.userRole.textContent = this.userRole === 'wolf' ? '🐺 Wolf' : '🐑 Sheep';
    this.elements.userRole.className = `role-badge ${this.userRole}`;
    this.elements.assignedWord.textContent = this.userWord;
    
    // Update clues instruction based on role
    const instruction = this.userRole === 'wolf' 
      ? 'Give 3 misleading clues (try to blend in!):'
      : 'Give 3 honest clues about your word:';
    document.getElementById('clues-instruction').textContent = instruction;
    
    // Show computer players
    this.updateComputerPlayersDisplay();
  }
  
  updateComputerPlayersDisplay() {
    const container = this.elements.computerPlayersList;
    container.innerHTML = '';
    
    this.computerPlayers.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'computer-player';
      playerDiv.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="player-status">Ready</span>
      `;
      container.appendChild(playerDiv);
    });
  }
  
  async submitClues() {
    const clue1 = this.elements.clue1.value.trim();
    const clue2 = this.elements.clue2.value.trim();
    const clue3 = this.elements.clue3.value.trim();
    
    if (!clue1 || !clue2 || !clue3) {
      this.showError('Please provide all 3 clues');
      return;
    }
    
    // Store user clues
    this.userClues = [clue1, clue2, clue3];
    
    // Disable clues section
    this.elements.cluesSection.classList.add('hidden');
    this.elements.computerStatus.classList.remove('hidden');
    
    // Generate computer clues
    await this.generateComputerClues();
    
    // Show all clues and start voting
    this.showVotingPhase();
  }
  
  async generateComputerClues() {
    // Simulate thinking time
    await this.sleep(2000);
    
    for (const player of this.computerPlayers) {
      player.clues = this.generateCluesForWord(player.word, player.isWolf);
    }
  }
  
  generateCluesForWord(word, isWolf) {
    // Get base clues for the word
    const baseClues = CLUE_TEMPLATES[word] || ['mysterious', 'interesting', 'unique'];
    
    if (isWolf) {
      // Wolf should give slightly misleading clues
      const misleadingClues = [
        'common thing', 'everyone knows', 'very popular',
        'simple concept', 'basic item', 'ordinary stuff'
      ];
      return this.shuffleArray([...baseClues, ...misleadingClues]).slice(0, 3);
    } else {
      // Sheep give honest clues
      return this.shuffleArray(baseClues).slice(0, 3);
    }
  }
  
  showVotingPhase() {
    this.gameState = 'voting';
    
    // Hide computer status, show clues and voting
    this.elements.computerStatus.classList.add('hidden');
    this.elements.allCluesSection.classList.remove('hidden');
    this.elements.votingSection.classList.remove('hidden');
    
    // Display all clues
    this.displayAllClues();
    
    // Create voting options
    this.createVotingOptions();
    
    // Start voting timer
    this.startVotingTimer(30);
    
    // Generate computer votes (delayed)
    setTimeout(() => this.generateComputerVotes(), 5000);
  }
  
  displayAllClues() {
    const container = this.elements.cluesContainer;
    container.innerHTML = '';
    
    // User clues
    const userDiv = document.createElement('div');
    userDiv.className = 'player-clues';
    userDiv.innerHTML = `
      <h4>${this.currentUser.username} (You)</h4>
      <div class="clues-list">
        ${this.userClues.map(clue => `<span class="clue">${clue}</span>`).join('')}
      </div>
    `;
    container.appendChild(userDiv);
    
    // Computer player clues
    this.computerPlayers.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-clues';
      playerDiv.innerHTML = `
        <h4>${player.name}</h4>
        <div class="clues-list">
          ${player.clues.map(clue => `<span class="clue">${clue}</span>`).join('')}
        </div>
      `;
      container.appendChild(playerDiv);
    });
  }
  
  createVotingOptions() {
    const container = this.elements.votingOptions;
    container.innerHTML = '';
    
    // Add computer players as voting options
    this.computerPlayers.forEach(player => {
      const button = document.createElement('button');
      button.className = 'vote-option';
      button.textContent = player.name;
      button.addEventListener('click', () => this.selectVoteTarget(player.id));
      container.appendChild(button);
    });
  }
  
  selectVoteTarget(playerId) {
    this.selectedVoteTarget = playerId;
    
    // Update UI
    document.querySelectorAll('.vote-option').forEach(btn => {
      btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    this.elements.submitVote.disabled = false;
  }
  
  generateComputerVotes() {
    // Computer players vote randomly (future: AI can make smarter decisions here)
    const allPlayers = [...this.computerPlayers, { id: 'user', name: this.currentUser.username }];
    
    this.computerPlayers.forEach(voter => {
      // Don't vote for self
      const targets = allPlayers.filter(p => p.id !== voter.id);
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      voter.vote = randomTarget.id;
    });
  }
  
  submitVote() {
    if (!this.selectedVoteTarget) return;
    
    // Stop timer
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
    }
    
    // Process voting results
    this.processVotingResults();
  }
  
  processVotingResults() {
    this.gameState = 'results';
    
    // Hide voting, show results
    this.elements.votingSection.classList.add('hidden');
    this.elements.resultsSection.classList.remove('hidden');
    
    // Calculate votes
    const votes = {};
    
    // User vote
    votes[this.selectedVoteTarget] = (votes[this.selectedVoteTarget] || 0) + 1;
    
    // Computer votes
    this.computerPlayers.forEach(player => {
      if (player.vote) {
        votes[player.vote] = (votes[player.vote] || 0) + 1;
      }
    });
    
    // Find player with most votes
    const eliminatedPlayerId = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
    
    // Display results
    this.displayVotingResults(votes, eliminatedPlayerId);
    
    // Update scores and determine game outcome
    this.updateScoresAndOutcome(eliminatedPlayerId);
  }
  
  displayVotingResults(votes, eliminatedPlayerId) {
    const container = this.elements.votesContainer;
    container.innerHTML = '';
    
    // Show vote breakdown
    Object.entries(votes).forEach(([playerId, voteCount]) => {
      const playerName = playerId === 'user' 
        ? this.currentUser.username 
        : this.computerPlayers.find(p => p.id === playerId)?.name || 'Unknown';
      
      const voteDiv = document.createElement('div');
      voteDiv.className = 'vote-result';
      voteDiv.innerHTML = `
        <span class="player-name">${playerName}</span>
        <span class="vote-count">${voteCount} votes</span>
      `;
      container.appendChild(voteDiv);
    });
    
    // Show eliminated player
    const eliminatedName = eliminatedPlayerId === 'user' 
      ? this.currentUser.username 
      : this.computerPlayers.find(p => p.id === eliminatedPlayerId)?.name || 'Unknown';
    
    this.elements.eliminatedPlayer.innerHTML = `
      <h3>❌ ${eliminatedName} has been eliminated!</h3>
    `;
  }
  
  updateScoresAndOutcome(eliminatedPlayerId) {
    const eliminatedPlayer = eliminatedPlayerId === 'user' 
      ? { isWolf: this.userRole === 'wolf' }
      : this.computerPlayers.find(p => p.id === eliminatedPlayerId);
    
    let outcome = '';
    let userWon = false;
    
    if (eliminatedPlayer.isWolf) {
      // Wolf was eliminated - Sheep win
      outcome = '🎉 The Wolf has been caught! Sheep win!';
      if (this.userRole === 'sheep') {
        userWon = true;
        this.scores[this.currentUser.userId].score += 10;
      }
    } else {
      // Innocent was eliminated - Wolf wins
      outcome = '🐺 An innocent was eliminated! Wolf wins!';
      if (this.userRole === 'wolf') {
        userWon = true;
        this.scores[this.currentUser.userId].score += 15;
      }
    }
    
    // Participation points
    this.scores[this.currentUser.userId].score += 2;
    
    this.elements.gameOutcomeText.innerHTML = `
      <h3>${outcome}</h3>
      <p>You ${userWon ? 'won' : 'lost'} this round!</p>
    `;
    
    // Update leaderboard
    this.updateLeaderboard();
    
    // Show next round button
    this.elements.nextRound.classList.remove('hidden');
  }
  
  updateLeaderboard() {
    const container = this.elements.leaderboardContainer;
    container.innerHTML = '';
    
    // For now, just show user's score (in future, load from Devvit/Redis)
    const userScore = this.scores[this.currentUser.userId];
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.className = 'leaderboard-entry';
    leaderboardDiv.innerHTML = `
      <span class="rank">1st</span>
      <span class="username">${userScore.username}</span>
      <span class="score">${userScore.score} pts</span>
    `;
    container.appendChild(leaderboardDiv);
    
    // TODO: Load and display full leaderboard from Devvit
    this.postToDevvit({ 
      type: 'updateScore', 
      score: userScore.score,
      userId: this.currentUser.userId
    });
  }
  
  nextRound() {
    this.roundNumber++;
    
    // Reset game state
    this.gameState = 'clues';
    this.selectedVoteTarget = null;
    this.userClues = [];
    
    // Clear inputs
    this.elements.clue1.value = '';
    this.elements.clue2.value = '';
    this.elements.clue3.value = '';
    
    // Hide results, show word and clues sections
    this.elements.resultsSection.classList.add('hidden');
    this.elements.wordSection.classList.remove('hidden');
    this.elements.cluesSection.classList.remove('hidden');
    this.elements.allCluesSection.classList.add('hidden');
    
    // Reassign roles and words
    this.assignRoleAndWord();
    this.createComputerPlayers();
    this.updateUI();
  }
  
  newGame() {
    // Reset everything
    this.roundNumber = 1;
    this.scores[this.currentUser.userId].score = 0;
    
    this.nextRound();
  }
  
  // Utility functions
  startVotingTimer(seconds) {
    let timeLeft = seconds;
    this.elements.votingTimer.textContent = `Time left: ${timeLeft}s`;
    
    this.votingTimer = setInterval(() => {
      timeLeft--;
      this.elements.votingTimer.textContent = `Time left: ${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.votingTimer);
        // Auto-submit if user hasn't voted
        if (!this.selectedVoteTarget) {
          // Vote for random player
          const randomPlayer = this.computerPlayers[Math.floor(Math.random() * this.computerPlayers.length)];
          this.selectedVoteTarget = randomPlayer.id;
        }
        this.submitVote();
      }
    }, 1000);
  }
  
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  showError(message) {
    this.showToast(message, 'error');
  }
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
  }
}

// Initialize the game when the page loads
new WolfGameApp(); 