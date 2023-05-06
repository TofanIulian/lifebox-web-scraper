'use strict';

import * as puppeteer from 'puppeteer';

import {
  SquareState,
  getNeighboursCoordinates,
  getSquareNumberOfBombs,
} from './minesweeper-utils.js';

import { NUMBER_OF_COLUMNS, NUMBER_OF_ROWS } from './minesweeper-config.js';

import { wait } from './utils.js';

let page;

const logClicks = true;
const logNeighbours = true;
const debug = false;

const BOMBS_SELECTORS = ['#mines_hundreds', '#mines_tens', '#mines_ones'];
const SECONDS_SELECTORS = [
  '#seconds_hundreds',
  '#seconds_tens',
  '#seconds_ones',
];

let map;
let squaresMap;
let blankMap;
let squaresToLookInto;
let ZerosSquaresMap;
let OnesSquaresMap;
let TwoSquaresMap;
let ThreesSquaresMap;
let FoursSquaresMap;
let FivesSquaresMap;
let SixesSquaresMap;
let SevensSquaresMap;
let EightsSquaresMap;
let remainingBombs;

let mapHasChanged;

function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

async function getElementClassName(selector) {
  return await page
    // Use $ in favor of waitForSelector bacause it takes too long
    .$(selector)
    // .waitForSelector(selector)
    .then((el) => el?.getProperty('className'))
    .then((className) => className.jsonValue());
}

async function getValueFromClass(className, splitString) {
  return className.split(splitString)[1].split('')[0];
}

async function getTimer(bombs = false) {
  const selectors = bombs ? BOMBS_SELECTORS : SECONDS_SELECTORS;

  let returnValue = '';
  for (let selector of selectors) {
    const selectorValue = await getValueFromClass(
      await getElementClassName(selector),
      'time'
    );
    returnValue = returnValue + String(selectorValue);
  }

  return Number(returnValue);
}

async function getNumberOfBombs() {
  return await getTimer(true);
}

/**
 *
 * Performance:
 *
 * With head and wait for selector 1100ms
 * 1032
 * 922
 * 906
 * 913
 * 920
 * 887
 * 856
 * 852
 * 852
 * 848
 *
 * With head 370ms
 * 343
 * 283
 * 268
 * 264
 * 263
 * 251
 * 252
 * 245
 * 246
 * 244
 *
 * Headless 280ms
 * 290
 * 246
 * 232
 * 229
 * 216
 * 214
 * 210
 * 212
 * 208
 * 212
 *
 * @param {*} page
 */
async function initMap() {
  // const start = new Date();

  map = [];
  squaresToLookInto = [];

  for (let i = 1; i <= NUMBER_OF_ROWS; i++) {
    const row = [];

    for (let j = 1; j <= NUMBER_OF_COLUMNS; j++) {
      // Note: you can't use an ID starting with an integer in CSS selectors
      // https://stackoverflow.com/questions/37270787/uncaught-syntaxerror-failed-to-execute-queryselector-on-document

      const elemHandle = await page.$(`[id='${i}_${j}']`);
      // const square = await getElementClassName(`[id='${i}_${j}']`);

      // const squareClass = square.split('square ')[1];
      // squaresMap[`${i}_${j}`] = squareClass;

      row[j] = {
        coordinates: [i, j],
        elemHandle: elemHandle,
        state: SquareState.Blank,
        checked: false,
        resolved: false,
      };
    }

    map[i] = row;
  }

  // const end = new Date();
  // console.log(end.getTime() - start.getTime());

  // console.log(map);
  return map;
}

async function updateMap() {
  // const start = new Date();

  for (let i = 1; i <= NUMBER_OF_ROWS; i++) {
    for (let j = 1; j <= NUMBER_OF_COLUMNS; j++) {
      const previousState = map[i][j].state;
      if (map[i][j].state === SquareState.Blank) await updateState([i, j]);

      if (map[i][j].state !== previousState) {
        squaresToLookInto.unshift(map[i][j]);
      }
    }
  }

  // const end = new Date();
  // console.log(end.getTime() - start.getTime());

  // console.log(map);
  return map;
}

function getRandomNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}

function getRandomSquareCoordinates() {
  const row = Math.floor(Math.random() * NUMBER_OF_ROWS) + 1;
  const column = Math.floor(Math.random() * NUMBER_OF_COLUMNS) + 1;

  return [row, column];
}

// TODO: We could take a blanck square in a smarter way.Example: 1 surounded by 8 blanks
function getBlankSquare() {
  const blankSquaresArray = Object.keys(blankMap);

  // const halfLength = Math.floor(blankSquaresArray.length / 2);
  // return blankSquaresArray[halfLength].split('_');

  const randomElemPosition = getRandomNumber(blankSquaresArray.length - 1);

  console.log('Error Details:');
  console.log(blankSquaresArray);
  console.log(randomElemPosition);
  console.log(blankSquaresArray[randomElemPosition]);

  // TypeError: Cannot read properties of undefined (reading 'split')
  return blankSquaresArray[randomElemPosition]
    .split('_')
    .map((coord) => Number(coord));
}

async function clickSquare(
  i,
  j,
  clickOptions = { button: 'left' },
  hydrate = false
) {
  await page.$(`[id='${i}_${j}']`).then((el) => el.click(clickOptions));

  if (hydrate) {
    await hydratemap();
  }
}

async function flagSquare(i, j) {
  if (logClicks) console.log('flagging:', [i, j]);

  await clickSquare(i, j, { button: 'right' }, true);
  mapHasChanged = true;
}

async function clearNeighbourSquares(i, j) {
  if (logClicks) console.log('clearing:', [i, j]);
  await clickSquare(i, j, { button: 'middle' }, true);
  mapHasChanged = true;
}

async function clickRandomBlankSquare() {
  const i = Math.floor(Math.random() * (map.length - 1)) + 1;
  const j = Math.floor(Math.random() * (map[i].length - 1)) + 1;

  if (logClicks) console.log('clicking:', [i, j]);

  await map[i][j].elemHandle.click();

  return [i, j];
}

async function init() {
  map = [];
  squaresMap = {};
  blankMap = {};
  ZerosSquaresMap = {};
  OnesSquaresMap = {};
  TwoSquaresMap = {};
  ThreesSquaresMap = {};
  FoursSquaresMap = {};
  FivesSquaresMap = {};
  SixesSquaresMap = {};
  SevensSquaresMap = {};
  EightsSquaresMap = {};
  remainingBombs = await getNumberOfBombs();
  // console.log(await getTimer());

  mapHasChanged = false;

  await initMap();
}

function checkNeighbour1(blankNeighbours, flaggedNeighbours, i, j) {
  if (map[i - 1][j - 1] === undefined) {
    console.error('ERROR: ', i, j, map[i - 1][j - 1]);
  }

  switch (map[i - 1][j - 1]) {
    case SquareState.Blank: {
      blankNeighbours.push({ i, j });
      break;
    }
    case SquareState.Flagged: {
      flaggedNeighbours.push({ i, j });
      break;
    }
  }
}

function getNeighbours1(i, j) {
  const blankNeighbours = [];
  const flaggedNeighbours = [];

  if (i > 1 && j > 1) {
    // left-top
    checkNeighbour(blankNeighbours, flaggedNeighbours, i - 1, j - 1);
  }

  if (i > 1) {
    // top
    checkNeighbour(blankNeighbours, flaggedNeighbours, i - 1, j);

    if (j < NUMBER_OF_COLUMNS) {
      // right-top
      checkNeighbour(blankNeighbours, flaggedNeighbours, i - 1, j + 1);
    }
  }

  if (j > 1) {
    // left
    checkNeighbour(blankNeighbours, flaggedNeighbours, i, j - 1);

    if (i < NUMBER_OF_ROWS) {
      // left bottom
      checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j - 1);
    }
  }

  if (j < NUMBER_OF_COLUMNS) {
    // right
    checkNeighbour(blankNeighbours, flaggedNeighbours, i, j + 1);
  }

  if (i < NUMBER_OF_ROWS) {
    // bottom
    checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j);

    if (j < NUMBER_OF_COLUMNS) {
      // right-bottom
      checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j + 1);
    }
  }

  return [blankNeighbours, flaggedNeighbours];
}

async function genericHandleSquare(numberOfBombs, squaresMap) {
  console.log('Handeling: ', numberOfBombs);

  for (const [key, square] of Object.entries(squaresMap)) {
    const [blankNeighbours, flaggedNeighbours] = getNeighbours(
      square.i,
      square.j
    );

    if (logNeighbours)
      console.log(square.i, square.j, blankNeighbours, flaggedNeighbours);
    if (
      // All the neighbour bombs are flagged
      flaggedNeighbours.length === numberOfBombs &&
      // There are other black neighbours
      blankNeighbours.length > 0
    ) {
      map[i][j].elemHandle.click({ button: 'middle' });
      // await updateState()
    } else if (
      flaggedNeighbours.length < numberOfBombs &&
      blankNeighbours.length === numberOfBombs - flaggedNeighbours.length
    ) {
      for (let neighbour of blankNeighbours) {
        neighbour.elemHandle.click({ button: 'right' });
        await updateState(neighbour.coordinates);
      }
    }
  }
}

async function updateState([i, j]) {
  const state = await map[i][j].elemHandle
    .getProperty('className')
    .then((className) => className.jsonValue())
    .then((className) => className.split('square ')[1]);

  map[i][j].state = state;
}

function getNeighbours([i, j]) {
  const blankNeighbours = [];
  const flaggedNeighbours = [];

  if (i > 1 && j > 1) {
    // left-top
    checkNeighbour([i - 1, j - 1]);
  }

  if (i > 1) {
    // top
    checkNeighbour(blankNeighbours, flaggedNeighbours, i - 1, j);

    if (j < NUMBER_OF_COLUMNS) {
      // right-top
      checkNeighbour(blankNeighbours, flaggedNeighbours, i - 1, j + 1);
    }
  }

  if (j > 1) {
    // left
    checkNeighbour(blankNeighbours, flaggedNeighbours, i, j - 1);

    if (i < NUMBER_OF_ROWS) {
      // left bottom
      checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j - 1);
    }
  }

  if (j < NUMBER_OF_COLUMNS) {
    // right
    checkNeighbour(blankNeighbours, flaggedNeighbours, i, j + 1);
  }

  if (i < NUMBER_OF_ROWS) {
    // bottom
    checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j);

    if (j < NUMBER_OF_COLUMNS) {
      // right-bottom
      checkNeighbour(blankNeighbours, flaggedNeighbours, i + 1, j + 1);
    }
  }

  return [blankNeighbours, flaggedNeighbours];
}

async function markAsResolved([i, j]) {
  console.log('Resolved: ', i, j);

  map[i][j].resolved = true;

  if (debug)
    await page.evaluate(
      ([i, j]) => {
        let dom = document.getElementById(`${i}_${j}`);

        dom.innerText = 'R';
      },
      [i, j]
    );
  mapHasChanged = true;
}

async function tryToResolveSquare([i, j]) {
  // console.log('Resolving: ', i, j);
  const neighboursCoordinates = getNeighboursCoordinates([i, j]);

  const numberOfBombs = getSquareNumberOfBombs(map[i][j].state);

  const blankNeighbours = [];
  const flaggedNeighbours = [];

  for (let [i, j] of neighboursCoordinates) {
    if (debug) {
      await page.evaluate(
        (coordinates) => {
          let dom = document.getElementById(
            `${coordinates[0]}_${coordinates[1]}`
          );
          dom.classList.add('purple');
        },
        [i, j]
      );
      await wait(25);

      await page.evaluate(
        (coordinates) => {
          let dom = document.getElementById(
            `${coordinates[0]}_${coordinates[1]}`
          );
          dom.classList.remove('purple');
        },
        [i, j]
      );
      await wait(5);
    }

    if (map[i][j].state === SquareState.Blank) {
      blankNeighbours.push(map[i][j]);
    }
    if (map[i][j].state === SquareState.Flagged) {
      flaggedNeighbours.push(map[i][j]);
    }
  }

  console.log(
    [i, j],
    numberOfBombs,
    flaggedNeighbours.length,
    blankNeighbours.length
  );

  if (
    // All the neighbour bombs are flagged
    flaggedNeighbours.length === numberOfBombs
  ) {
    // There are other black neighbours
    if (blankNeighbours.length > 0) {
      console.log('Clearing');
      await map[i][j].elemHandle.click({ button: 'middle' });
      await lookIntoNeightbours([i, j]);
    }

    await markAsResolved([i, j]);
  } else if (
    flaggedNeighbours.length < numberOfBombs && // 1 < 2
    blankNeighbours.length === numberOfBombs - flaggedNeighbours.length // 3 === 2 - 1
  ) {
    console.log('Flagging');
    for (let neighbour of blankNeighbours) {
      await neighbour.elemHandle.click({ button: 'right' });
      await updateState(neighbour.coordinates);
    }

    await markAsResolved([i, j]);
  }
}

async function checkNeighbour([i, j]) {
  if (map[i][j].checked === true) return;

  map[i][j].checked = true;

  await updateState([i, j]);

  console.log('Look Into: ', i, j, map[i][j].state);
  squaresToLookInto.push(map[i][j]);
}

async function lookIntoNeightbours([i, j]) {
  const neighboursCoordinates = getNeighboursCoordinates([i, j]);

  for (let coord of neighboursCoordinates) {
    await checkNeighbour(coord);
  }
}

async function scrape(url) {
  const broweser = await puppeteer.launch({
    headless: false,
    // slowMo: 10, // slow down by 250ms
  });
  page = await broweser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await page.addStyleTag({
    content: `
      .green {
        background: green !important
      }

      .purple{
        background: purple !important;
        color: white !important;
        font-size: 18px !important;
        line-height: 15px !important;
      }

      .square {
        color: white !important;
        font-size: 18px !important;
        line-height: 15px !important;
      }
      
      .blue {
        background: blue !important
      }
      `,
  });

  await init();
  console.log(map.length);

  // for (let i = 1; i < map.length; i++) {
  //   for (let j = 1; j < map[i].length; j++) {
  //     await map[i][j].elemHandle.click({ button: 'right' });
  //   }
  // }

  let [i, j] = await clickRandomBlankSquare();

  await updateState([i, j]);

  squaresToLookInto.push(map[i][j]);

  let reps = 200;
  while (squaresToLookInto.length && reps) {
    mapHasChanged = false;

    console.log('RUN', reps, '    ', squaresToLookInto.length);
    for (let i = 0; i < squaresToLookInto.length; i++) {
      if (debug) {
        await page.evaluate((coordinates) => {
          let dom = document.getElementById(
            `${coordinates[0]}_${coordinates[1]}`
          );
          dom.classList.add('blue');
        }, squaresToLookInto[i].coordinates);
        await wait(50);

        await page.evaluate((coordinates) => {
          let dom = document.getElementById(
            `${coordinates[0]}_${coordinates[1]}`
          );
          dom.classList.remove('blue');
        }, squaresToLookInto[i].coordinates);
        await wait(10);
      }
      if (squaresToLookInto[i].resolved === true) {
        squaresToLookInto.splice(i, 1);
        i--;
        continue;
      }

      switch (squaresToLookInto[i].state) {
        case SquareState.Zero: {
          squaresToLookInto[i].checked = true;

          await markAsResolved(squaresToLookInto[i].coordinates);

          if (debug) {
            await page.evaluate((coordinates) => {
              let dom = document.getElementById(
                `${coordinates[0]}_${coordinates[1]}`
              );
              dom.classList.add('green');
            }, squaresToLookInto[i].coordinates);
          }
          await lookIntoNeightbours(squaresToLookInto[i].coordinates);
          break;
        }
        case SquareState.One:
        case SquareState.Two:
        case SquareState.Three:
        case SquareState.Four:
        case SquareState.Five:
        case SquareState.Six:
        case SquareState.Seven:
        case SquareState.Eight: {
          squaresToLookInto[i].checked = true;
          // squaresToLookInto[i].elemHandle.

          // await page.evaluate((coordinates) => {
          //   let dom = document.getElementById(
          //     `${coordinates[0]}_${coordinates[1]}`
          //   );
          //   dom.classList.add('blue');
          // }, squaresToLookInto[i].coordinates);

          await tryToResolveSquare(squaresToLookInto[i].coordinates);

          // squaresToLookInto.splice(i, 1);
          break;
        }
        default: {
          // await page.evaluate((coordinates) => {
          //   let dom = document.getElementById(
          //     `${coordinates[0]}_${coordinates[1]}`
          //   );
          //   dom.classList.add('purple');

          //   if (dom.innerText == 'e') dom.innerText = 'f';
          //   else if (dom.innerText == 'd') dom.innerText = 'e';
          //   else if (dom.innerText == 'c') dom.innerText = 'd';
          //   else if (dom.innerText == 'b') dom.innerText = 'c';
          //   else if (dom.innerText == 'a') dom.innerText = 'b';
          //   else dom.innerText = 'a';
          // }, squaresToLookInto[i].coordinates);
          break;
        }
      }

      // lookIntoSquare(square);
    }

    if (!mapHasChanged) {
      // let [i, j] = await clickRandomBlankSquare();

      // await updateState([i, j]);

      // squaresToLookInto.unshift(map[i][j]);

      await wait(500);
      await updateMap;
    }

    await updateMap();
    reps--;
  }

  console.log(squaresToLookInto.length);

  // await lookAtNeighbours(coordinates);

  // let stopGame = false;
  // while (!stopGame) {
  //   mapHasChanged = false;
  //   await genericHandleSquare(1, OnesSquaresMap);
  //   await genericHandleSquare(2, TwoSquaresMap);
  //   await genericHandleSquare(3, ThreesSquaresMap);
  //   await genericHandleSquare(4, FoursSquaresMap);
  //   await genericHandleSquare(5, FivesSquaresMap);
  //   await genericHandleSquare(6, SixesSquaresMap);
  //   await genericHandleSquare(7, SevensSquaresMap);
  //   await genericHandleSquare(8, EightsSquaresMap);

  //   await hydratemap();

  //   const death = await page.$(`.${SquareState.BombDeath}`);
  //   console.log(death);
  //   if (death) {
  //     console.log('STOPPING GAME');
  //     mapHasChanged = false;
  //     stopGame = true;
  //     break;
  //   }
  // }
}

scrape('https://minesweeperonline.com/');
