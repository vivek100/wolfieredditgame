/** @typedef {import('../src/types.ts').WolfDevvitSystemMessage} WolfDevvitSystemMessage */
/** @typedef {import('../src/types.ts').WolfWebViewMessage} WolfWebViewMessage */

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

// Computer player names and avatars
const COMPUTER_PLAYERS = [
  { name: 'Alice', avatar: '👩', id: 'alice' },
  { name: 'Bob', avatar: '👨', id: 'bob' },
  { name: 'Charlie', avatar: '🧑', id: 'charlie' },
  { name: 'Diana', avatar: '👩‍🦰', id: 'diana' },
  { name: 'Eva', avatar: '👩‍🦱', id: 'eva' },
];

// Clue templates for computer players
const CLUE_TEMPLATES = {
  Apple: ['red', 'fruit', 'sweet', 'tree', 'healthy', 'crunchy', 'juice', 'snack'],
  Orange: ['citrus', 'vitamin', 'round', 'peel', 'juice', 'bright', 'segments', 'tangy'],
  Cat: ['furry', 'meow', 'pet', 'whiskers', 'purr', 'independent', 'feline', 'cute'],
  Dog: ['loyal', 'bark', 'pet', 'tail', 'fetch', 'friend', 'canine', 'walk'],
  Coffee: ['drink', 'caffeine', 'morning', 'hot', 'beans', 'energy', 'brown', 'bitter'],
  Tea: ['drink', 'leaves', 'hot', 'calm', 'ceremony', 'green', 'steep', 'relaxing'],
  Summer: ['hot', 'sunny', 'vacation', 'beach', 'warm', 'long', 'bright', 'fun'],
  Winter: ['cold', 'snow', 'ice', 'coat', 'dark', 'freeze', 'season', 'chill'],
  Book: ['read', 'pages', 'story', 'words', 'paper', 'knowledge', 'library', 'author'],
  Movie: ['watch', 'screen', 'actors', 'cinema', 'popcorn', 'director', 'film', 'entertainment'],
  Beach: ['sand', 'waves', 'ocean', 'sun', 'vacation', 'swim', 'shore', 'relaxing'],
  Mountain: ['high', 'climb', 'peak', 'rocks', 'view', 'hiking', 'tall', 'nature'],
  Pizza: ['cheese', 'dough', 'slice', 'oven', 'italian', 'round', 'toppings', 'delicious'],
  Burger: ['meat', 'bun', 'grill', 'fast', 'american', 'fries', 'sauce', 'tasty'],
  Car: ['drive', 'wheels', 'engine', 'road', 'transport', 'fuel', 'speed', 'vehicle'],
  Bike: ['pedal', 'wheels', 'chain', 'exercise', 'eco', 'balance', 'ride', 'cycle'],
  Day: ['light', 'sun', 'bright', 'work', 'active', 'awake', 'morning', 'noon'],
  Night: ['dark', 'moon', 'stars', 'sleep', 'quiet', 'rest', 'evening', 'peaceful'],
  Hot: ['warm', 'heat', 'fire', 'summer', 'sweat', 'temperature', 'burning', 'fever'],
  Cold: ['cool', 'ice', 'winter', 'freeze', 'chill', 'temperature', 'shiver', 'snow'],
};

class WolfGameApp {
  constructor() {
    this.currentUser = null;
    this.gameState = 'loading'; // loading, role, clues, bonfire, accusations, voting, results
    this.roundNumber = 1;
    this.userRole = null; // 'sheep' or 'wolf'
    this.userWord = null;
    this.userClues = [];
    this.computerPlayers = [];
    this.accusations = [];
    this.votes = {};
    this.selectedAccusation = null;
    this.votingTimer = null;
    this.scores = {}; // userId -> score
    this.currentWordPair = null;
    
    // Initialize DOM elements
    this.initializeElements();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Wait for Devvit messages
    addEventListener('message', this.onDevvitMessage.bind(this));
    
    // Signal that the web view is ready and auto-start
    addEventListener('load', () => {
      this.postToDevvit({ type: 'webViewReady' });
      // Auto-start after a brief delay
      setTimeout(() => this.startGame(), 1000);
    });
  }
  
  initializeElements() {
    this.elements = {
      // Screens
      loadingScreen: document.getElementById('loading-screen'),
      roleScreen: document.getElementById('role-screen'),
      cluesScreen: document.getElementById('clues-screen'),
      bonfireScreen: document.getElementById('bonfire-screen'),
      accusationsScreen: document.getElementById('accusations-screen'),
      votingScreen: document.getElementById('voting-screen'),
      resultsScreen: document.getElementById('results-screen'),
      
      // Role screen elements
      roleDisplay: document.getElementById('role-display'),
      wordDisplay: document.getElementById('word-display'),
      roleInstruction: document.getElementById('role-instruction'),
      
      // Clues screen elements
      cluesWordDisplay: document.getElementById('clues-word-display'),
      clue1: document.getElementById('clue1'),
      clue2: document.getElementById('clue2'),
      clue3: document.getElementById('clue3'),
      computerThinking: document.getElementById('computer-thinking'),
      
      // Bonfire screen elements
      userName: document.getElementById('user-name'),
      userClue1: document.getElementById('user-clue1'),
      userClue2: document.getElementById('user-clue2'),
      userClue3: document.getElementById('user-clue3'),
      
      // Accusations screen elements
      accusationInput: document.getElementById('accusation-input'),
      accusedName: document.getElementById('accused-name'),
      accusationReason: document.getElementById('accusation-reason'),
      accusationsList: document.getElementById('accusations-list'),
      
      // Voting screen elements
      timerDisplay: document.getElementById('timer-display'),
      yourVote: document.getElementById('your-vote'),
      votedPlayer: document.getElementById('voted-player'),
      
      // Results screen elements
      resultsTitle: document.getElementById('results-title'),
      eliminatedText: document.getElementById('eliminated-text'),
      eliminatedPlayer: document.getElementById('eliminated-player'),
      eliminatedRole: document.getElementById('eliminated-role'),
      outcomeText: document.getElementById('outcome-text'),
      outcomeDescription: document.getElementById('outcome-description'),
      userScore: document.getElementById('user-score'),
      
      // Buttons
      btnContinueToClues: document.getElementById('btn-continue-to-clues'),
      btnSubmitClues: document.getElementById('btn-submit-clues'),
      btnContinueToAccusations: document.getElementById('btn-continue-to-accusations'),
      btnSubmitAccusation: document.getElementById('btn-submit-accusation'),
      btnContinueToVoting: document.getElementById('btn-continue-to-voting'),
      btnNextRound: document.getElementById('btn-next-round'),
      btnNewGame: document.getElementById('btn-new-game'),
    };
  }
  
  setupEventListeners() {
    // Role screen
    this.elements.btnContinueToClues.addEventListener('click', () => this.showCluesScreen());
    
    // Clues screen
    this.elements.btnSubmitClues.addEventListener('click', () => this.submitClues());
    
    // Bonfire screen
    this.elements.btnContinueToAccusations.addEventListener('click', () => this.showAccusationsScreen());
    
    // Accusations screen
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectPlayerForAccusation(e.target.closest('.player-btn').dataset.player));
    });
    this.elements.btnSubmitAccusation.addEventListener('click', () => this.submitAccusation());
    this.elements.btnContinueToVoting.addEventListener('click', () => this.showVotingScreen());
    
    // Voting screen
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.submitVote(e.target.closest('.vote-btn').dataset.player));
    });
    
    // Results screen
    this.elements.btnNextRound.addEventListener('click', () => this.nextRound());
    this.elements.btnNewGame.addEventListener('click', () => this.newGame());
  }
  
  onDevvitMessage(event) {
    if (event.data.type !== 'devvit-message') return;
    
    const { message } = event.data.data;
    
    switch (message.type) {
      case 'initialData':
        this.handleInitialData(message.data);
        break;
      case 'gameCreated':
        this.showToast('Game created!', 'success');
        break;
      case 'error':
        this.showError(message.data.message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  postToDevvit(message) {
    parent.postMessage(message, '*');
  }
  
  handleInitialData({ username, userId }) {
    this.currentUser = { username, userId };
    
    // Initialize user score if not exists
    if (!this.scores[userId]) {
      this.scores[userId] = { username, score: 0 };
    }
    
    // Update user name display
    if (this.elements.userName) {
      this.elements.userName.textContent = username || 'You';
    }
  }
  
  startGame() {
    // Hide loading, assign role and word
    this.assignRoleAndWord();
    this.createComputerPlayers();
    this.showRoleScreen();
  }
  
  assignRoleAndWord() {
    // 20% chance of being wolf, 80% sheep
    this.userRole = Math.random() < 0.2 ? 'wolf' : 'sheep';
    
    // Pick random word pair
    this.currentWordPair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    this.userWord = this.userRole === 'wolf' ? this.currentWordPair.wolf : this.currentWordPair.sheep;
  }
  
  createComputerPlayers() {
    this.computerPlayers = [];
    
    // Ensure exactly one wolf in the game
    const wolfIndex = this.userRole === 'sheep' ? Math.floor(Math.random() * 5) : -1;
    
    COMPUTER_PLAYERS.forEach((player, index) => {
      const isWolf = index === wolfIndex;
      const computerPlayer = {
        ...player,
        isWolf,
        word: isWolf ? this.currentWordPair.wolf : this.currentWordPair.sheep,
        clues: [],
        vote: null,
      };
      
      this.computerPlayers.push(computerPlayer);
    });
  }
  
  showRoleScreen() {
    this.hideAllScreens();
    this.elements.roleScreen.classList.remove('hidden');
    
    // Update role display
    this.elements.roleDisplay.textContent = this.userRole === 'wolf' ? '🐺 WOLF' : '🐑 SHEEP';
    this.elements.roleDisplay.className = `role-badge ${this.userRole}`;
    
    // Update word display
    this.elements.wordDisplay.textContent = this.userWord.toUpperCase();
    
    // Update instruction
    const instruction = this.userRole === 'wolf' 
      ? 'Give misleading clues to blend in with the sheep!'
      : 'Give honest clues about your word to help catch the wolf!';
    this.elements.roleInstruction.textContent = instruction;
  }
  
  showCluesScreen() {
    this.hideAllScreens();
    this.elements.cluesScreen.classList.remove('hidden');
    
    // Update word reminder
    this.elements.cluesWordDisplay.textContent = this.userWord.toUpperCase();
    
    // Clear previous clues
    this.elements.clue1.value = '';
    this.elements.clue2.value = '';
    this.elements.clue3.value = '';
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
    
    // Show thinking status
    this.elements.computerThinking.classList.remove('hidden');
    this.elements.btnSubmitClues.disabled = true;
    
    // Generate computer clues after delay
    await this.sleep(2000);
    this.generateComputerClues();
    
    // Show bonfire screen
    this.showBonfireScreen();
  }
  
  generateComputerClues() {
    this.computerPlayers.forEach(player => {
      const templates = CLUE_TEMPLATES[player.word] || ['thing', 'item', 'object'];
      
      if (player.isWolf) {
        // Wolf gives slightly misleading clues
        const misleadingClues = ['common', 'popular', 'basic', 'normal', 'typical', 'ordinary'];
        const allClues = [...templates, ...misleadingClues];
        player.clues = this.shuffleArray(allClues).slice(0, 3);
      } else {
        // Sheep give honest clues
        player.clues = this.shuffleArray(templates).slice(0, 3);
      }
    });
  }
  
  showBonfireScreen() {
    this.hideAllScreens();
    this.elements.bonfireScreen.classList.remove('hidden');
    
    // Update user clues display
    this.elements.userClue1.textContent = this.userClues[0];
    this.elements.userClue2.textContent = this.userClues[1];
    this.elements.userClue3.textContent = this.userClues[2];
    
    // Update computer player clues
    this.computerPlayers.forEach(player => {
      const playerSpot = document.querySelector(`[data-player="${player.id}"]`);
      if (playerSpot) {
        const clueElements = playerSpot.querySelectorAll('.clue-bubble');
        clueElements.forEach((element, index) => {
          if (player.clues[index]) {
            element.textContent = player.clues[index];
          }
        });
      }
    });
  }
  
  showAccusationsScreen() {
    this.hideAllScreens();
    this.elements.accusationsScreen.classList.remove('hidden');
    
    // Reset accusations
    this.accusations = [];
    this.selectedAccusation = null;
    this.elements.accusationInput.classList.add('hidden');
    this.elements.btnContinueToVoting.classList.add('hidden');
    this.updateAccusationsList();
  }
  
  selectPlayerForAccusation(playerId) {
    this.selectedAccusation = playerId;
    
    // Update UI
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelector(`[data-player="${playerId}"]`).classList.add('selected');
    
    // Show accusation input
    this.elements.accusationInput.classList.remove('hidden');
    const playerName = this.computerPlayers.find(p => p.id === playerId)?.name || playerId;
    this.elements.accusedName.textContent = playerName;
    this.elements.accusationReason.value = '';
  }
  
  submitAccusation() {
    const reason = this.elements.accusationReason.value.trim();
    if (!reason) {
      this.showError('Please provide a reason for your accusation');
      return;
    }
    
    const playerName = this.computerPlayers.find(p => p.id === this.selectedAccusation)?.name;
    this.accusations.push({
      accuser: this.currentUser?.username || 'You',
      accused: playerName,
      reason: reason
    });
    
    // Generate computer accusations
    this.generateComputerAccusations();
    
    // Update display
    this.updateAccusationsList();
    
    // Hide input and show continue button
    this.elements.accusationInput.classList.add('hidden');
    this.elements.btnContinueToVoting.classList.remove('hidden');
  }
  
  generateComputerAccusations() {
    const reasons = [
      'clues seem off',
      'too vague',
      'suspicious behavior',
      'weird clues',
      'acting strange',
      'not convincing',
      'seems fake',
      'gut feeling'
    ];
    
    this.computerPlayers.forEach(accuser => {
      // Each computer player accuses someone randomly
      const targets = this.computerPlayers.filter(p => p.id !== accuser.id);
      const target = targets[Math.floor(Math.random() * targets.length)];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      
      this.accusations.push({
        accuser: accuser.name,
        accused: target.name,
        reason: reason
      });
    });
  }
  
  updateAccusationsList() {
    this.elements.accusationsList.innerHTML = '';
    
    this.accusations.forEach(accusation => {
      const item = document.createElement('div');
      item.className = 'accusation-item';
      item.textContent = `${accusation.accuser} → ${accusation.accused}: ${accusation.reason}`;
      this.elements.accusationsList.appendChild(item);
    });
  }
  
  showVotingScreen() {
    this.hideAllScreens();
    this.elements.votingScreen.classList.remove('hidden');
    
    // Reset votes
    this.votes = {};
    this.elements.yourVote.classList.add('hidden');
    
    // Start voting timer
    this.startVotingTimer(30);
    
    // Generate computer votes after delay
    setTimeout(() => this.generateComputerVotes(), 3000);
  }
  
  startVotingTimer(seconds) {
    let timeLeft = seconds;
    this.elements.timerDisplay.textContent = `${timeLeft}s`;
    
    this.votingTimer = setInterval(() => {
      timeLeft--;
      this.elements.timerDisplay.textContent = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.votingTimer);
        this.processVotingResults();
      }
    }, 1000);
  }
  
  submitVote(playerId) {
    if (this.votes.user) return; // Already voted
    
    this.votes.user = playerId;
    
    // Update UI
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.classList.remove('voted');
    });
    document.querySelector(`[data-player="${playerId}"]`).classList.add('voted');
    
    // Show vote confirmation
    const playerName = this.computerPlayers.find(p => p.id === playerId)?.name;
    this.elements.votedPlayer.textContent = playerName;
    this.elements.yourVote.classList.remove('hidden');
    
    // Check if all votes are in
    if (Object.keys(this.votes).length >= 6) { // User + 5 computers
      clearInterval(this.votingTimer);
      this.processVotingResults();
    }
  }
  
  generateComputerVotes() {
    this.computerPlayers.forEach(voter => {
      // Computer players vote randomly (could be made smarter)
      const targets = this.computerPlayers.filter(p => p.id !== voter.id);
      const target = targets[Math.floor(Math.random() * targets.length)];
      this.votes[voter.id] = target.id;
    });
    
    // Update vote counts display
    this.updateVoteCounts();
  }
  
  updateVoteCounts() {
    const voteCounts = {};
    Object.values(this.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    // Update display
    this.computerPlayers.forEach(player => {
      const voteElement = document.getElementById(`votes-${player.id}`);
      if (voteElement) {
        const count = voteCounts[player.id] || 0;
        voteElement.textContent = `${count} votes`;
      }
    });
  }
  
  processVotingResults() {
    // Count votes
    const voteCounts = {};
    Object.values(this.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    // Find player with most votes
    const eliminatedId = Object.keys(voteCounts).reduce((a, b) => 
      voteCounts[a] > voteCounts[b] ? a : b
    );
    
    this.showResultsScreen(eliminatedId);
  }
  
  showResultsScreen(eliminatedId) {
    this.hideAllScreens();
    this.elements.resultsScreen.classList.remove('hidden');
    
    const eliminatedPlayer = this.computerPlayers.find(p => p.id === eliminatedId);
    const wasWolf = eliminatedPlayer?.isWolf || false;
    
    // Update elimination display
    this.elements.eliminatedText.textContent = `${eliminatedPlayer?.name} has been eliminated!`;
    this.elements.eliminatedPlayer.querySelector('.player-avatar').textContent = eliminatedPlayer?.avatar;
    this.elements.eliminatedPlayer.querySelector('.pixel-text').textContent = eliminatedPlayer?.name;
    this.elements.eliminatedRole.textContent = wasWolf ? 'Was the WOLF' : 'Was a SHEEP';
    this.elements.eliminatedRole.style.background = wasWolf ? '#FF4444' : '#44FF44';
    
    // Determine game outcome
    let userWon = false;
    let outcomeText = '';
    let outcomeDescription = '';
    let points = 2; // Base participation points
    
    if (wasWolf) {
      // Wolf was eliminated - Sheep win
      outcomeText = '🎉 Sheep Win!';
      outcomeDescription = 'The wolf has been caught!';
      if (this.userRole === 'sheep') {
        userWon = true;
        points += 10;
      }
    } else {
      // Innocent was eliminated - Wolf wins
      outcomeText = '🐺 Wolf Wins!';
      outcomeDescription = 'An innocent was eliminated. The wolf remains hidden!';
      if (this.userRole === 'wolf') {
        userWon = true;
        points += 15;
      }
    }
    
    // Update outcome display
    this.elements.outcomeText.textContent = outcomeText;
    this.elements.outcomeDescription.textContent = outcomeDescription;
    
    // Update score
    this.scores[this.currentUser?.userId].score += points;
    this.elements.userScore.textContent = `+${points} points`;
    
    // Send score update to Devvit
    this.postToDevvit({ 
      type: 'updateScore', 
      data: { 
        score: points,
        userId: this.currentUser?.userId 
      }
    });
  }
  
  nextRound() {
    this.roundNumber++;
    this.resetGame();
    this.startGame();
  }
  
  newGame() {
    this.roundNumber = 1;
    this.scores[this.currentUser?.userId].score = 0;
    this.resetGame();
    this.startGame();
  }
  
  resetGame() {
    // Reset game state
    this.userClues = [];
    this.accusations = [];
    this.votes = {};
    this.selectedAccusation = null;
    
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
      this.votingTimer = null;
    }
    
    // Clear form inputs
    this.elements.clue1.value = '';
    this.elements.clue2.value = '';
    this.elements.clue3.value = '';
    this.elements.accusationReason.value = '';
    
    // Reset button states
    this.elements.btnSubmitClues.disabled = false;
    this.elements.computerThinking.classList.add('hidden');
    this.elements.accusationInput.classList.add('hidden');
    this.elements.btnContinueToVoting.classList.add('hidden');
    this.elements.yourVote.classList.add('hidden');
    
    // Clear selections
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.classList.remove('voted');
    });
  }
  
  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
  }
  
  // Utility functions
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