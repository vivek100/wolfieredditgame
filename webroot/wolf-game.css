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

// Point system constants
const POINTS = {
  SURVIVAL: 5,        // Points for surviving a round
  SHEEP_WIN: 15,      // Points for sheep winning (wolf eliminated)
  WOLF_WIN: 25,       // Points for wolf winning (survive to end)
  PARTICIPATION: 2,   // Base participation points
};

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
    this.gameState = 'loading'; // loading, role, clues, bonfire, accusations, voting, results, gameOver
    this.roundNumber = 1;
    this.userRole = null; // 'sheep' or 'wolf'
    this.userWord = null;
    this.userClues = [];
    this.computerPlayers = [];
    this.alivePlayers = []; // Track who's still alive
    this.accusations = [];
    this.votes = {};
    this.selectedAccusation = null;
    this.votingTimer = null;
    this.cluesTimer = null;
    this.bonfireTimer = null;
    this.accusationsTimer = null;
    this.totalScore = 0;
    this.roundScore = 0;
    this.currentWordPair = null;
    this.gameOver = false;
    this.userEliminated = false;
    this.gameWinner = null; // 'sheep', 'wolf', or null
    
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
    this.elements.btnContinueToAccusations.addEventListener('click', () => {
      // Clear bonfire timer if user clicks button
      if (this.bonfireTimer) {
        clearInterval(this.bonfireTimer);
        this.bonfireTimer = null;
      }
      this.showAccusationsScreen();
    });
    
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
    
    // Update user name display
    if (this.elements.userName) {
      this.elements.userName.textContent = username || 'You';
    }
  }
  
  startGame() {
    // Reset game state for new game
    this.gameOver = false;
    this.userEliminated = false;
    this.gameWinner = null;
    this.roundNumber = 1;
    this.totalScore = 0;
    
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
    this.alivePlayers = ['user']; // User starts alive
    
    // Ensure exactly one wolf in the game (if user is sheep)
    const wolfIndex = this.userRole === 'sheep' ? Math.floor(Math.random() * 5) : -1;
    
    COMPUTER_PLAYERS.forEach((player, index) => {
      const isWolf = index === wolfIndex;
      const computerPlayer = {
        ...player,
        isWolf,
        word: isWolf ? this.currentWordPair.wolf : this.currentWordPair.sheep,
        clues: [],
        vote: null,
        alive: true,
      };
      
      this.computerPlayers.push(computerPlayer);
      this.alivePlayers.push(player.id);
    });
  }
  
  showRoleScreen() {
    this.updateBackground('role');
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
    this.updateBackground('clues');
    this.hideAllScreens();
    this.elements.cluesScreen.classList.remove('hidden');
    
    // Update word reminder
    this.elements.cluesWordDisplay.textContent = this.userWord.toUpperCase();
    
    // Clear previous clues
    this.elements.clue1.value = '';
    this.elements.clue2.value = '';
    this.elements.clue3.value = '';
    
    // Show thinking status instead of timer
    this.elements.computerThinking.classList.add('hidden');
    
    // Hide timer initially
    this.elements.cluesTimer.classList.add('hidden');
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
    
    // Show thinking status immediately
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
      if (!player.alive) return; // Skip eliminated players
      
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
    this.updateBackground('bonfire');
    this.hideAllScreens();
    this.elements.bonfireScreen.classList.remove('hidden');
    
    // Update user clues display
    this.elements.userClue1.textContent = this.userClues[0];
    this.elements.userClue2.textContent = this.userClues[1];
    this.elements.userClue3.textContent = this.userClues[2];
    
    // Update computer player clues and hide eliminated players
    this.computerPlayers.forEach(player => {
      const playerSpot = document.querySelector(`[data-player="${player.id}"]`);
      if (playerSpot) {
        if (!player.alive) {
          // Hide eliminated players
          playerSpot.style.display = 'none';
        } else {
          playerSpot.style.display = 'block';
          const clueElements = playerSpot.querySelectorAll('.clue-bubble');
          clueElements.forEach((element, index) => {
            if (player.clues[index]) {
              element.textContent = player.clues[index];
            }
          });
        }
      }
    });
    
    // Start bonfire timer - auto-advance to accusations after 25 seconds
    this.startBonfireTimer(25);
  }
  
  showAccusationsScreen() {
    this.updateBackground('accusations');
    this.hideAllScreens();
    this.elements.accusationsScreen.classList.remove('hidden');
    
    // Generate computer accusations first (so user can see everyone's thoughts)
    this.generateComputerAccusations();
    
    // Reset user accusation state
    this.selectedAccusation = null;
    this.elements.accusationInput.classList.add('hidden');
    this.elements.btnContinueToVoting.classList.add('hidden');
    
    // Hide eliminated players from accusation options
    document.querySelectorAll('.player-btn').forEach(btn => {
      const playerId = btn.dataset.player;
      const player = this.computerPlayers.find(p => p.id === playerId);
      if (player && !player.alive) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'block';
      }
    });
    
    // Update accusations list to show computer accusations
    this.updateAccusationsList();
    
    // Start accusations timer - user must make accusation within this time or get eliminated
    this.startAccusationsTimer(35);
  }
  
  selectPlayerForAccusation(playerId) {
    const player = this.computerPlayers.find(p => p.id === playerId);
    if (!player || !player.alive) return; // Can't accuse eliminated players
    
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
    
    // Clear accusations timer
    if (this.accusationsTimer) {
      clearInterval(this.accusationsTimer);
      this.accusationsTimer = null;
    }
    
    // Remove timer display
    const timerDisplay = document.getElementById('accusations-timer-display');
    if (timerDisplay) timerDisplay.remove();
    
    const playerName = this.computerPlayers.find(p => p.id === this.selectedAccusation)?.name;
    this.accusations.push({
      accuser: this.currentUser?.username || 'You',
      accused: playerName,
      reason: reason
    });
    
    // Update display
    this.updateAccusationsList();
    
    // Hide input and show continue button
    this.elements.accusationInput.classList.add('hidden');
    this.elements.btnContinueToVoting.classList.remove('hidden');
  }
  
  generateComputerAccusations() {
    // Only generate if we haven't already
    if (this.accusations.length > 0) return;
    
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
    
    const alivePlayers = this.computerPlayers.filter(p => p.alive);
    
    alivePlayers.forEach(accuser => {
      // Each alive computer player accuses someone randomly (including user)
      const targets = [...alivePlayers.filter(p => p.id !== accuser.id)];
      if (this.alivePlayers.includes('user')) {
        targets.push({ name: this.currentUser?.username || 'You' });
      }
      
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        
        this.accusations.push({
          accuser: accuser.name,
          accused: target.name,
          reason: reason
        });
      }
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
    this.updateBackground('voting');
    this.hideAllScreens();
    this.elements.votingScreen.classList.remove('hidden');
    
    // Reset votes
    this.votes = {};
    this.elements.yourVote.classList.add('hidden');
    
    // Hide eliminated players from voting options
    document.querySelectorAll('.vote-btn').forEach(btn => {
      const playerId = btn.dataset.player;
      const player = this.computerPlayers.find(p => p.id === playerId);
      if (player && !player.alive) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'block';
        // Hide vote counts initially
        const voteCount = btn.querySelector('.vote-count');
        if (voteCount) voteCount.style.display = 'none';
      }
    });
    
    // Generate computer votes immediately
    this.generateComputerVotes();
    
    // Start voting timer - user must vote within this time or get eliminated
    this.startVotingTimer(25);
  }
  
  startVotingTimer(seconds) {
    let timeLeft = seconds;
    this.elements.timerDisplay.textContent = `${timeLeft}s`;
    
    this.votingTimer = setInterval(() => {
      timeLeft--;
      this.elements.timerDisplay.textContent = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.votingTimer);
        // User didn't vote in time - eliminate them
        this.eliminateUser();
      }
    }, 1000);
  }
  
  submitVote(playerId) {
    const player = this.computerPlayers.find(p => p.id === playerId);
    if (!player || !player.alive) return; // Can't vote for eliminated players
    
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
    
    // User voted - clear timer and show vote counts
    clearInterval(this.votingTimer);
    
    // Show all vote counts for 3 seconds, then show results
    this.showVoteCountsAndResults();
  }
  
  generateComputerVotes() {
    const alivePlayers = this.computerPlayers.filter(p => p.alive);
    
    alivePlayers.forEach(voter => {
      // Computer players vote randomly among alive players (including user)
      const targets = alivePlayers.filter(p => p.id !== voter.id);
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        this.votes[voter.id] = target.id;
      }
    });
    
    // Update vote counts display
    this.updateVoteCounts();
  }
  
  showVoteCountsAndResults() {
    // Calculate vote counts
    const voteCounts = {};
    Object.values(this.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    // Show all vote counts
    this.computerPlayers.forEach(player => {
      if (!player.alive) return;
      const voteElement = document.getElementById(`votes-${player.id}`);
      if (voteElement) {
        const count = voteCounts[player.id] || 0;
        voteElement.textContent = `${count} votes`;
        voteElement.style.display = 'block'; // Make vote counts visible
      }
    });
    
    // Update timer display to show vote results
    this.elements.timerDisplay.textContent = 'Vote Results!';
    
    // Show results after 3 seconds
    setTimeout(() => {
      this.processVotingResults();
    }, 3000);
  }

  updateVoteCounts() {
    const voteCounts = {};
    Object.values(this.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    // Update display
    this.computerPlayers.forEach(player => {
      if (!player.alive) return;
      const voteElement = document.getElementById(`votes-${player.id}`);
      if (voteElement) {
        const count = voteCounts[player.id] || 0;
        voteElement.textContent = `${count} votes`;
      }
    });
  }
  
  startCluesTimer(seconds) {
    let timeLeft = seconds;
    // Create timer display if not exists in clues screen
    let timerDisplay = document.getElementById('clues-timer-display');
    if (!timerDisplay) {
      timerDisplay = document.createElement('div');
      timerDisplay.id = 'clues-timer-display';
      timerDisplay.className = 'voting-timer';
      timerDisplay.innerHTML = `
        <div class="pixel-text small">Submit clues or be eliminated:</div>
        <div class="pixel-text medium">${timeLeft}s</div>
      `;
      this.elements.cluesScreen.querySelector('.content-container').insertBefore(
        timerDisplay, 
        this.elements.cluesScreen.querySelector('.clues-form')
      );
    }
    
    const timerText = timerDisplay.querySelector('.pixel-text.medium');
    timerText.textContent = `${timeLeft}s`;
    
    this.cluesTimer = setInterval(() => {
      timeLeft--;
      timerText.textContent = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.cluesTimer);
        // User didn't submit clues in time - eliminate them
        this.eliminateUser();
      }
    }, 1000);
  }

  startBonfireTimer(seconds) {
    let timeLeft = seconds;
    // Create timer display if not exists in bonfire screen
    let timerDisplay = document.getElementById('bonfire-timer-display');
    if (!timerDisplay) {
      timerDisplay = document.createElement('div');
      timerDisplay.id = 'bonfire-timer-display';
      timerDisplay.className = 'voting-timer';
      timerDisplay.innerHTML = `
        <div class="pixel-text small">Auto-advance in:</div>
        <div class="pixel-text medium">${timeLeft}s</div>
      `;
      this.elements.bonfireScreen.querySelector('.content-container').appendChild(timerDisplay);
    }
    
    const timerText = timerDisplay.querySelector('.pixel-text.medium');
    timerText.textContent = `${timeLeft}s`;
    
    this.bonfireTimer = setInterval(() => {
      timeLeft--;
      timerText.textContent = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.bonfireTimer);
        // Time's up - automatically proceed to accusations
        this.showAccusationsScreen();
      }
    }, 1000);
  }

  startAccusationsTimer(seconds) {
    let timeLeft = seconds;
    // Create timer display if not exists
    let timerDisplay = document.getElementById('accusations-timer-display');
    if (!timerDisplay) {
      timerDisplay = document.createElement('div');
      timerDisplay.id = 'accusations-timer-display';
      timerDisplay.className = 'accusations-timer';
      timerDisplay.innerHTML = `
        <div class="pixel-text tiny">Time: ${timeLeft}s</div>
      `;
      document.body.appendChild(timerDisplay);
    }
    
    const timerText = timerDisplay.querySelector('.pixel-text.tiny');
    timerText.textContent = `Time: ${timeLeft}s`;
    
    this.accusationsTimer = setInterval(() => {
      timeLeft--;
      timerText.textContent = `Time: ${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.accusationsTimer);
        // Remove timer display
        if (timerDisplay) timerDisplay.remove();
        // User didn't make accusation in time - eliminate them
        this.eliminateUser();
      }
    }, 1000);
  }

  updateBackground(screenType = null) {
    // Calculate total alive players (user + computer players)
    let aliveCount = 0;
    
    // Count user if alive
    if (this.alivePlayers.includes('user') && !this.userEliminated) {
      aliveCount++;
    }
    
    // Count alive computer players
    aliveCount += this.computerPlayers.filter(p => p.alive).length;
    
    // Set background based on screen type and alive count
    let backgroundImage;
    
    // Use landscape for role and clues screens
    if (screenType === 'landscape' || screenType === 'role' || screenType === 'clues') {
      backgroundImage = 'nightlandscape.png';
    } 
    // Use bonfire backgrounds for accusations, voting, bonfire, and results
    else if (screenType === 'bonfire' || screenType === 'accusations' || screenType === 'voting' || screenType === 'results') {
      if (this.gameOver || aliveCount === 0) {
        backgroundImage = 'bonfire0.png'; // Game over
      } else if (aliveCount === 3) {
        backgroundImage = 'bonfire3.png';
      } else if (aliveCount === 4) {
        backgroundImage = 'bonfire4.png';
      } else if (aliveCount === 5) {
        backgroundImage = 'bonfire5.png';
      } else {
        backgroundImage = 'bonfire6.png'; // 6 or more (start of game)
      }
    }
    // Default bonfire logic for other cases
    else {
      if (this.gameOver || aliveCount === 0) {
        backgroundImage = 'bonfire0.png'; // Game over
      } else if (aliveCount === 3) {
        backgroundImage = 'bonfire3.png';
      } else if (aliveCount === 4) {
        backgroundImage = 'bonfire4.png';
      } else if (aliveCount === 5) {
        backgroundImage = 'bonfire5.png';
      } else {
        backgroundImage = 'bonfire6.png'; // 6 or more (start of game)
      }
    }
    
    // Apply background to body
    document.body.style.backgroundImage = `url('${backgroundImage}')`;
  }

  eliminateUser() {
    // User didn't complete action in time - they get eliminated
    this.userEliminated = true;
    this.alivePlayers = this.alivePlayers.filter(id => id !== 'user');
    
    // Update background after user elimination
    this.updateBackground();
    
    this.showResultsScreen('user');
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
    
    // Eliminate the player
    const eliminatedPlayer = this.computerPlayers.find(p => p.id === eliminatedId);
    if (eliminatedPlayer) {
      eliminatedPlayer.alive = false;
      this.alivePlayers = this.alivePlayers.filter(id => id !== eliminatedId);
    }
    
    // Update background after elimination
    this.updateBackground();
    
    this.showResultsScreen(eliminatedId);
  }
  
  showResultsScreen(eliminatedId) {
    this.updateBackground('results');
    this.hideAllScreens();
    this.elements.resultsScreen.classList.remove('hidden');
    
    let eliminatedPlayer, wasWolf, eliminatedName, eliminatedAvatar;
    
    if (eliminatedId === 'user') {
      // User was eliminated (didn't vote in time)
      eliminatedName = this.currentUser?.username || 'You';
      eliminatedAvatar = '👤';
      wasWolf = this.userRole === 'wolf';
    } else {
      // Computer player was eliminated
      eliminatedPlayer = this.computerPlayers.find(p => p.id === eliminatedId);
      eliminatedName = eliminatedPlayer?.name;
      eliminatedAvatar = eliminatedPlayer?.avatar;
      wasWolf = eliminatedPlayer?.isWolf || false;
    }
    
    // Update elimination display
    this.elements.eliminatedText.textContent = `${eliminatedName} has been eliminated!`;
    this.elements.eliminatedPlayer.querySelector('.player-avatar').textContent = eliminatedAvatar;
    this.elements.eliminatedPlayer.querySelector('.pixel-text').textContent = eliminatedName;
    this.elements.eliminatedRole.textContent = wasWolf ? 'Was the WOLF' : 'Was a SHEEP';
    this.elements.eliminatedRole.style.background = wasWolf ? '#FF4444' : '#44FF44';
    
    // Calculate points and determine game state
    this.roundScore = POINTS.PARTICIPATION; // Base participation points
    let outcomeText = '';
    let outcomeDescription = '';
    let showNextRound = false;
    
    // Check win conditions
    if (wasWolf) {
      // Wolf was eliminated - Sheep win
      this.gameWinner = 'sheep';
      this.gameOver = true;
      outcomeText = '🎉 Sheep Win!';
      outcomeDescription = 'The wolf has been caught! Game Over.';
      
      if (this.userRole === 'sheep') {
        this.roundScore += POINTS.SHEEP_WIN;
      }
    } else {
      // Innocent was eliminated
      const aliveWolves = this.computerPlayers.filter(p => p.alive && p.isWolf).length + (this.userRole === 'wolf' && this.alivePlayers.includes('user') ? 1 : 0);
      const aliveSheep = this.computerPlayers.filter(p => p.alive && !p.isWolf).length + (this.userRole === 'sheep' && this.alivePlayers.includes('user') ? 1 : 0);
      
      if (aliveWolves >= aliveSheep || this.alivePlayers.length <= 2) {
        // Wolf wins - either equal numbers or only 2 players left
        this.gameWinner = 'wolf';
        this.gameOver = true;
        outcomeText = '🐺 Wolf Wins!';
        outcomeDescription = 'The wolf has survived! Game Over.';
        
        if (this.userRole === 'wolf') {
          this.roundScore += POINTS.WOLF_WIN;
        }
      } else {
        // Game continues
        outcomeText = '💀 Round Over';
        outcomeDescription = 'An innocent was eliminated. The hunt continues...';
        showNextRound = true;
        this.roundScore += POINTS.SURVIVAL; // Survival bonus
      }
    }
    
    // Update background - show game over background if game ended
    if (this.gameOver) {
      document.body.style.backgroundImage = "url('bonfire0.png')";
    } else {
      this.updateBackground('results');
    }
    
    // Update outcome display
    this.elements.outcomeText.textContent = outcomeText;
    this.elements.outcomeDescription.textContent = outcomeDescription;
    
    // Update score
    this.totalScore += this.roundScore;
    this.elements.userScore.textContent = `+${this.roundScore} points (Total: ${this.totalScore})`;
    
    // Show appropriate buttons
    if (this.gameOver || this.userEliminated) {
      this.elements.btnNextRound.style.display = 'none';
      this.elements.btnNewGame.style.display = 'inline-block';
      this.elements.btnNewGame.textContent = 'NEW GAME';
    } else if (showNextRound) {
      this.elements.btnNextRound.style.display = 'inline-block';
      this.elements.btnNewGame.style.display = 'inline-block';
      this.elements.btnNewGame.textContent = 'NEW GAME';
    }
    
    // Send score update to Devvit
    this.postToDevvit({ 
      type: 'updateScore', 
      data: { 
        score: this.roundScore,
        userId: this.currentUser?.userId 
      }
    });
  }
  
  nextRound() {
    if (this.gameOver || this.userEliminated) {
      this.newGame();
      return;
    }
    
    this.roundNumber++;
    this.resetRound();
    
    // Reassign roles and words for surviving players
    this.assignRoleAndWord();
    
    // Reset computer players (keep alive status)
    this.computerPlayers.forEach(player => {
      if (player.alive) {
        // Reassign role (maintain balance)
        const aliveCount = this.computerPlayers.filter(p => p.alive).length + 1; // +1 for user
        const needWolf = !this.computerPlayers.some(p => p.alive && p.isWolf) && this.userRole !== 'wolf';
        
        if (needWolf && Math.random() < 0.3) {
          player.isWolf = true;
          player.word = this.currentWordPair.wolf;
        } else {
          player.isWolf = false;
          player.word = this.currentWordPair.sheep;
        }
        
        player.clues = [];
        player.vote = null;
      }
    });
    
    this.showRoleScreen();
  }
  
  newGame() {
    this.roundNumber = 1;
    this.totalScore = 0;
    this.gameOver = false;
    this.userEliminated = false;
    this.gameWinner = null;
    this.resetRound();
    this.startGame();
  }
  
  resetRound() {
    // Reset round state
    this.userClues = [];
    this.accusations = [];
    this.votes = {};
    this.selectedAccusation = null;
    this.roundScore = 0;
    
    // Clear all timers
    if (this.votingTimer) {
      clearInterval(this.votingTimer);
      this.votingTimer = null;
    }
    if (this.cluesTimer) {
      clearInterval(this.cluesTimer);
      this.cluesTimer = null;
    }
    if (this.bonfireTimer) {
      clearInterval(this.bonfireTimer);
      this.bonfireTimer = null;
    }
    if (this.accusationsTimer) {
      clearInterval(this.accusationsTimer);
      this.accusationsTimer = null;
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
    
    // Reset button visibility
    this.elements.btnNextRound.style.display = 'inline-block';
    this.elements.btnNewGame.style.display = 'inline-block';
    
    // Clear selections
    document.querySelectorAll('.player-btn').forEach(btn => {
      btn.classList.remove('selected');
      btn.style.display = 'block';
    });
    document.querySelectorAll('.vote-btn').forEach(btn => {
      btn.classList.remove('voted');
      btn.style.display = 'block';
    });
    
    // Show all player spots
    document.querySelectorAll('.player-spot').forEach(spot => {
      spot.style.display = 'block';
    });
    
    // Clean up timer displays
    const cluesTimerDisplay = document.getElementById('clues-timer-display');
    if (cluesTimerDisplay) cluesTimerDisplay.remove();
    
    const bonfireTimerDisplay = document.getElementById('bonfire-timer-display');
    if (bonfireTimerDisplay) bonfireTimerDisplay.remove();
    
    const accusationsTimerDisplay = document.getElementById('accusations-timer-display');
    if (accusationsTimerDisplay) accusationsTimerDisplay.remove();
    
    // Reset vote count displays
    document.querySelectorAll('.vote-count').forEach(voteCount => {
      voteCount.style.display = 'block';
      voteCount.textContent = '0 votes';
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