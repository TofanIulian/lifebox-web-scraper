import { NUMBER_OF_COLUMNS, NUMBER_OF_ROWS } from './minesweeper-config.js';

export const SquareState = Object.freeze({
  BombRevealed: 'bombrevealed',
  BombDeath: 'bombdeath',
  Flagged: 'bombflagged',
  Blank: 'blank',
  Zero: 'open0',
  One: 'open1',
  Two: 'open2',
  Three: 'open3',
  Four: 'open4',
  Five: 'open5',
  Six: 'open6',
  Seven: 'open7',
  Eight: 'open8',
});

export function getNeighboursCoordinates([i, j]) {
  const coordinates = [];

  if (i > 1) {
    if (j > 1) {
      // left-top
      coordinates.push([i - 1, j - 1]);
    }

    // top
    coordinates.push([i - 1, j]);

    if (j < NUMBER_OF_COLUMNS) {
      // right-top
      coordinates.push([i - 1, j + 1]);
    }
  }

  if (j > 1) {
    // left
    coordinates.push([i, j - 1]);
  }

  if (j < NUMBER_OF_COLUMNS) {
    // right
    coordinates.push([i, j + 1]);
  }

  if (i < NUMBER_OF_ROWS) {
    if (j > 1) {
      // left bottom
      coordinates.push([i + 1, j - 1]);
    }

    // bottom
    coordinates.push([i + 1, j]);

    if (j < NUMBER_OF_COLUMNS) {
      // right-bottom
      coordinates.push([i + 1, j + 1]);
    }
  }

  return coordinates;
}

export function getSquareNumberOfBombs(state) {
  switch (state) {
    case SquareState.Zero:
      return 0;
    case SquareState.One:
      return 1;
    case SquareState.Two:
      return 2;
    case SquareState.Three:
      return 3;
    case SquareState.Four:
      return 4;
    case SquareState.Five:
      return 5;
    case SquareState.Six:
      return 6;
    case SquareState.Seven:
      return 7;
    case SquareState.Eight:
      return 8;
  }
}

/**
 * Not used
 * @returns
 */
export function getRandomSquareCoordinates() {
  const row = Math.floor(Math.random() * NUMBER_OF_ROWS) + 1;
  const column = Math.floor(Math.random() * NUMBER_OF_COLUMNS) + 1;

  return [row, column];
}

/**
 * Not used
 * @returns
 */
export function getRandomNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}
