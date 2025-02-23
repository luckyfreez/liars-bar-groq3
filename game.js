// Card class
class Card {
    constructor(type) {
        this.type = type;
    }
}

// Deck class
class Deck {
    constructor() {
        this.cards = [
            ...Array(6).fill('King'),
            ...Array(6).fill('Queen'),
            ...Array(6).fill('Ace'),
            ...Array(2).fill('Joker')
        ].map(type => new Card(type));
        this.shuffle();
    }
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    deal(num) {
        return this.cards.length >= num ? this.cards.splice(0, num) : [];
    }
}

// Player class
class Player {
    constructor(name, isHuman) {
        this.name = name;
        this.isHuman = isHuman;
        this.hand = [];
    }
    draw(deck, num) {
        const drawn = deck.deal(num);
        this.hand.push(...drawn);
        return drawn.length;
    }
}

// Game state
const CARD_TYPES = ['King', 'Queen', 'Ace', 'Joker'];
let players = [
    new Player("You", true),
    new Player("AI 1", false),
    new Player("AI 2", false)
];
let deck = new Deck();
let currentIndex = 0;
let lastPlayedCards = [];
let lastDeclaration = null;
let selectedCards = [];

// UI functions
function renderHand() {
    const handDiv = document.getElementById('player-hand');
    handDiv.innerHTML = '';
    players[0].hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card card-front';
        cardDiv.textContent = card.type === 'Joker' ? 'J' : card.type[0];
        cardDiv.dataset.type = card.type;
        cardDiv.addEventListener('click', () => {
            if (cardDiv.classList.contains('selected')) {
                cardDiv.classList.remove('selected');
                selectedCards = selectedCards.filter(c => c !== card);
            } else if (selectedCards.length < 3) {
                cardDiv.classList.add('selected');
                selectedCards.push(card);
            }
        });
        handDiv.appendChild(cardDiv);
    });
}

function renderTable(cards, revealed = false) {
    const tableDiv = document.getElementById('table');
    tableDiv.innerHTML = '';
    cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = revealed ? 'card card-front' : 'card card-back';
        if (revealed) {
            cardDiv.textContent = card.type === 'Joker' ? 'J' : card.type[0];
            cardDiv.dataset.type = card.type;
        }
        cardDiv.classList.add('played-card');
        tableDiv.appendChild(cardDiv);
    });
}

function renderAIPlayers() {
    players.forEach(player => {
        if (!player.isHuman) {
            const aiDiv = document.getElementById(player.name.toLowerCase().replace(' ', ''));
            aiDiv.textContent = `${player.name}: ${player.hand.length} cards`;
        }
    });
}

function setMessage(text) {
    document.getElementById('message').textContent = text;
}

function showButtons(buttons) {
    const actionDiv = document.getElementById('action-buttons');
    actionDiv.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.addEventListener('click', btn.callback);
        actionDiv.appendChild(button);
    });
}

// Game logic
async function playGame() {
    // Initialize game
    players.forEach(player => player.draw(deck, 5));
    renderHand();
    renderAIPlayers();

    while (true) {
        const currentPlayer = players[currentIndex];
        if (currentPlayer.hand.length === 0) {
            setMessage(`${currentPlayer.name} has no cards left and wins the game!`);
            showButtons([]);
            break;
        }
        setMessage(`--- ${currentPlayer.name}'s turn ---`);

        let cards, declaration;
        if (currentPlayer.isHuman) {
            ({ cards, declaration } = await new Promise(resolve => {
                selectedCards = [];
                setMessage('Select up to 3 cards to play.');
                showButtons([{
                    text: 'Play',
                    callback: () => {
                        if (selectedCards.length >= 1 && selectedCards.length <= 3) {
                            setMessage('Declare the card type:');
                            showButtons(CARD_TYPES.map(type => ({
                                text: type,
                                callback: () => resolve({ cards: selectedCards, declaration: type })
                            })));
                        } else {
                            setMessage('Please select 1 to 3 cards.');
                        }
                    }
                }]);
            }));
            currentPlayer.hand = currentPlayer.hand.filter(card => !cards.includes(card));
            renderHand();
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const numCards = Math.min(Math.floor(Math.random() * 3) + 1, currentPlayer.hand.length);
            cards = currentPlayer.hand.splice(0, numCards);
            declaration = Math.random() < 0.3 ? CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)] : cards[0].type;
            setMessage(`${currentPlayer.name} plays ${numCards} cards and declares '${declaration}'.`);
            renderAIPlayers();
        }
        lastPlayedCards = cards;
        lastDeclaration = declaration;
        renderTable(cards);

        const nextIndex = (currentIndex + 1) % players.length;
        const nextPlayer = players[nextIndex];
        if (nextPlayer.hand.length > 0) {
            let challenge;
            if (nextPlayer.isHuman) {
                challenge = await new Promise(resolve => {
                    setMessage(`Do you challenge '${lastDeclaration}' (${lastPlayedCards.length} cards)?`);
                    showButtons([
                        { text: 'Challenge', callback: () => resolve(true) },
                        { text: 'Accept', callback: () => resolve(false) }
                    ]);
                });
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
                challenge = Math.random() < 0.2;
                setMessage(`${nextPlayer.name} ${challenge ? 'challenges' : 'accepts'} the declaration.`);
            }
            if (challenge) {
                await new Promise(resolve => setTimeout(resolve, 500));
                renderTable(lastPlayedCards, true);
                const isLie = !lastPlayedCards.every(card => card.type === lastDeclaration);
                if (isLie) {
                    setMessage(`Lie detected! ${currentPlayer.name} draws 2 cards.`);
                    currentPlayer.draw(deck, 2);
                } else {
                    setMessage(`Truth confirmed! ${nextPlayer.name} draws 2 cards.`);
                    nextPlayer.draw(deck, 2);
                }
                if (currentPlayer.isHuman || nextPlayer.isHuman) renderHand();
                renderAIPlayers();
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        currentIndex = nextIndex;
    }
}

// Start the game
playGame();