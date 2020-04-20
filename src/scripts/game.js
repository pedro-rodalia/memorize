import Card from './card';
import { score, shuffle } from './helpers';

class Game {
  constructor ({ el, scoreEl, numberOfCards, hardcoreMode}) {
    this.el = document.querySelector(el || '#game');
    this.scoreEl = document.querySelector(scoreEl || '#score');
    this.numberOfCards = numberOfCards || 16;
    this.hardcoreMode = hardcoreMode || false;
    this.totalCards = 100;
    this.boardEl = null;
    this.score = 0;
    this.attempts = 0;
    this.board = [];
    this.candidates = [];
    this.handicap = null;
    this.gameStart = new Date();
    this.setCandidate = this.solver.bind(this);
    this.init();
  }

  init () {
    // Clear score elements
    this.scoreEl.querySelector('#points').textContent = this.score;
    this.scoreEl.querySelector('#attempts').textContent = this.attempts;
    // Create board html element and store it
    const boardEl = document.createElement('div');
    boardEl.classList.add('board', `board--x${this.numberOfCards}`);
    this.boardEl = boardEl;
    // Append board to the game html element
    this.el.appendChild(boardEl);
    // Generate a set of cards and render the board content
    this.generateCards();
    this.render();
    // If hardcore mode is enabled set the function to run every 5 seconds
    if (this.hardcoreMode) this.handicap = setInterval(() => this.hardcore(), 1500 * Math.sqrt(numberOfCards));
  }

  generateCards () {
    // Create and shuffle an array containing the ids for all the cards and pick the first n cards
    const cardsIds = Array.from({ length: this.totalCards }, (_, idx) => idx + 1);
    this.board = shuffle(cardsIds).slice(0, this.numberOfCards / 2);
    // Populate the board with selected randomized cards
    this.board = this.board.flatMap(id => [
      new Card(this.boardEl, id, this.setCandidate),
      new Card(this.boardEl, id, this.setCandidate)
    ]);
    // Shuffle the board so equal cards don't show up next to each other
    this.board = shuffle(this.board);
  }

  hardcore () {
    // Get solved cards checking the board for cards with status set to 'solved'
    const solvedCardIds = this.board.filter(card => card.isSolved).map(card => card.id);
    // Hardcore mode is enabled after enough pairs have been discovered
    if (solvedCardIds.length <= Math.sqrt(this.numberOfCards)) return;
    // Get a random card id from the solved cards and unsolve it
    const cardId = solvedCardIds[Math.floor(Math.random() * solvedCardIds.length)];
    this.board.filter(card => card.id === cardId).forEach(card => card.unSolve());
  }

  render () {
    // Render each card
    this.board.forEach((card) => card.render());
  }

  reset (newGameConfiguration) {
    // Remove the board element and return a new clean instance of the game
    clearInterval(this.handicap);
    this.boardEl.parentNode.removeChild(this.boardEl);
    return new Game(newGameConfiguration);
  }

  checkWinCondition () {
    // When every card is has been solved clear the handicap
    if (this.board.some(card => !card.isSolved)) return;
    clearInterval(this.handicap);
    console.log('win');
  }

  updateScore (solved = false) {
    this.attempts += 1;
    this.scoreEl.querySelector('#attempts').textContent = this.attempts;
    if (!solved) return;
    const secondsElapsed = (new Date().getTime() - this.gameStart.getTime()) / 1000;
    this.score += score(secondsElapsed, this.attempts);
    this.scoreEl.querySelector('#points').textContent = this.score;
  }

  async solver (card) {
    const nOfCandidates = this.candidates.length;
    // If card is solved nothing should happen
    if (card.isSolved || card.isUncovered) return;
    // If only one card is present in the candidates array unblock the mutex and wait for another card
    switch (nOfCandidates) {
      case 0:
        this.candidates.push(card);
        card.uncover();
        break;
      case 1:
        this.candidates.push(card);
        await card.uncover();
        if (this.candidates[0].id === this.candidates[1].id) {
          // If the ids match, update score, solve both cards, update score, check if the game is over and unblock the mutex
          this.updateScore(true);
          this.candidates.forEach(card => card.solve());
          this.checkWinCondition();
        } else {
          this.updateScore();
          // If the ids don't match cover back the cards and pass the resolve handler to the card cover function
          await Promise.all([this.candidates.map(card => card.cover())]);
          // this.candidates.forEach(card => card.cover(resolve));
        }
        // Clear the candidates array either way (matching or non-matching ids)
        this.candidates = [];
        break;
    }
  }

}

export default Game;
