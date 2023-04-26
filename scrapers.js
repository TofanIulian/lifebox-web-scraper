'use strict';

import * as puppeteer from 'puppeteer';

let page;

const logClicks = true;
const logNeighbours = true;

const NUMBER_OF_COLUMNS = 30;
const NUMBER_OF_ROWS = 16;
const BOMBS_SELECTORS = ['#mines_hundreds', '#mines_tens', '#mines_ones'];
const SECONDS_SELECTORS = [
  '#seconds_hundreds',
  '#seconds_tens',
  '#seconds_ones',
];

const SquareState = Object.freeze({
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

let mapState;
let squaresMap;
let blankSquaresMap;
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
async function hydrateMapState() {
  // const start = new Date();

  blankSquaresMap = {};
  ZerosSquaresMap = {};
  OnesSquaresMap = {};
  TwoSquaresMap = {};
  ThreesSquaresMap = {};
  FoursSquaresMap = {};
  FivesSquaresMap = {};
  SixesSquaresMap = {};
  SevensSquaresMap = {};
  EightsSquaresMap = {};

  const map = [];
  for (let i = 1; i <= NUMBER_OF_ROWS; i++) {
    const row = [];

    for (let j = 1; j <= NUMBER_OF_COLUMNS; j++) {
      // Note: you can't use an ID starting with an integer in CSS selectors
      // https://stackoverflow.com/questions/37270787/uncaught-syntaxerror-failed-to-execute-queryselector-on-document
      const square = await getElementClassName(`[id='${i}_${j}']`);

      const squareClass = square.split('square ')[1];
      squaresMap[`${i}_${j}`] = squareClass;

      switch (squareClass) {
        case SquareState.Blank: {
          blankSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.One: {
          OnesSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Two: {
          TwoSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Three: {
          ThreesSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Four: {
          FoursSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Five: {
          FivesSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Six: {
          SixesSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Seven: {
          SevensSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
        case SquareState.Eight: {
          EightsSquaresMap[`${i}_${j}`] = {
            key: `${i}_${j}`,
            i,
            j,
          };
          break;
        }
      }
      row.push(squareClass);
    }

    map.push(row);
  }

  // const end = new Date();
  // console.log(end.getTime() - start.getTime());

  // console.log(map);
  mapState = map;
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
  const blankSquaresArray = Object.keys(blankSquaresMap);

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
    await hydrateMapState();
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
  const [i, j] = getBlankSquare();

  if (logClicks) console.log('clicking:', [i, j]);
  await clickSquare(i, j, { button: 'left' }, true);
  mapHasChanged = true;
}

async function init() {
  mapState = [];
  squaresMap = {};
  blankSquaresMap = {};
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

  await hydrateMapState();
}

function checkNeighbour(blankNeighbours, flaggedNeighbours, i, j) {
  if (mapState[i - 1][j - 1] === undefined) {
    console.error('ERROR: ', i, j, mapState[i - 1][j - 1]);
  }

  switch (mapState[i - 1][j - 1]) {
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

function getNeighbours(i, j) {
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
      await clearNeighbourSquares(square.i, square.j);
    } else if (
      flaggedNeighbours.length < numberOfBombs && // 1 < 2
      blankNeighbours.length === numberOfBombs - flaggedNeighbours.length // 3 === 2 - 1
    ) {
      for (let neighbour of blankNeighbours) {
        await flagSquare(neighbour.i, neighbour.j);
      }
    }
  }
}

async function handleOnes() {
  const numberOfBombs = 1;

  for (const [key, square] of Object.entries(OnesSquaresMap)) {
    const [blankNeighbours, flaggedNeighbours] = getNeighbours(
      square.i,
      square.j
    );

    // console.log(square.i, square.j, blankNeighbours, flaggedNeighbours);
    if (
      // All the neighbour bombs are flagged
      flaggedNeighbours.length === numberOfBombs &&
      // There are other black neighbours
      blankNeighbours.length > 0
    ) {
      await clearNeighbourSquares(square.i, square.j);
    } else if (
      flaggedNeighbours.length < numberOfBombs &&
      blankNeighbours.length === numberOfBombs - flaggedNeighbours.length
    ) {
      for (let neighbour of blankNeighbours) {
        await flagSquare(neighbour.i, neighbour.j);
      }
    }
  }
}

async function scrape(url) {
  const broweser = await puppeteer.launch({
    headless: false,
    // slowMo: 50, // slow down by 250ms
  });
  page = await broweser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await init();

  await clickRandomBlankSquare();

  let stopGame = false;
  // while (!stopGame) {
  while (!stopGame) {
    mapHasChanged = false;
    await genericHandleSquare(1, OnesSquaresMap);
    await genericHandleSquare(2, TwoSquaresMap);
    await genericHandleSquare(3, ThreesSquaresMap);
    await genericHandleSquare(4, FoursSquaresMap);
    await genericHandleSquare(5, FivesSquaresMap);
    await genericHandleSquare(6, SixesSquaresMap);
    await genericHandleSquare(7, SevensSquaresMap);
    await genericHandleSquare(8, EightsSquaresMap);

    await hydrateMapState();

    const death = await page.$(`.${SquareState.BombDeath}`);
    console.log(death);
    if (death) {
      console.log('STOPPING GAME');
      mapHasChanged = false;
      stopGame = true;
      break;
    }
  }

  console.log('Loop');
  // await clickRandomBlankSquare();
  // }

  // setTimeout(async () => {
  //   const death = await page.$(`.${SquareState.BombDeath}`);
  //   console.log(death);
  // }, 5000);

  // if (death) {
  //   mapHasChanged = false;
  //   reps = 0;
  // }

  // inspect, right click element, copy XPath
  // const xPath =
  //   '/html/body/div[3]/section[3]/div/div[2]/div/div/div[1]/div[1]/div[1]/div/img';

  // Select by xpath
  // const [el] = await page.$x(xPath);
  // const src = await el.getProperty('src'); // 'textContent' = rawText
  // const srcText = await src.jsonValue();

  // console.log(srcText);

  // const esentialCookies =
  //   '/html/body/div[2]/div/div/div[2]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/button[1]';
  // const [esentialCookiesButton] = await page.$x(esentialCookies);

  // await esentialCookiesButton.click();

  // const allCookies =
  //   '/html/body/div[2]/div/div/div[2]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/button[2]';
  // const [allCookiesButton] = await page.$x(allCookies);

  // await allCookiesButton.click();

  // await page.waitForSelector('input[name=username]');
  // await page.$eval('input[name=username]', (el) => {
  //   el.click();
  //   el.value = 'tofan.iulian';
  //   el.setAttribute('value', 'tofaniulian');
  // });

  // keyboard.type('the text');

  // await page.waitForSelector('input[name=password]');
  // await page.$eval('input[name=password]', (el) => (el.value = '$Tnumber1'));

  // await page.click('button[type="submit"]');

  // await page.waitForSelector('input[name="username"]');
  // await page.type('input[name="username"]', username);
  // await page.type('input[name="password"]', password);
  // await page.click('button[type="submit"]');

  // await page.waitForSelector(`a[href^='/${username}']`).then((el) => {
  //   el.click();
  // });

  // await page.waitForSelector(`a[href^='/${username}/followers']`).then((el) => {
  //   el.click();

  //   el.evaluate((htmlElement) => {
  //     console.log(htmlElement);
  //   });

  //   // console.log(el.children[0].children[0]);
  // });

  // await page.waitForXPath(
  //   '/html/body/div[2]/div/div/div[3]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[2]'
  // );

  // await page.evaluate(() => {
  //   function getElementByXpath(path) {
  //     return document.evaluate(
  //       path,
  //       document,
  //       null,
  //       XPathResult.FIRST_ORDERED_NODE_TYPE,
  //       null
  //     ).singleNodeValue;
  //   }

  //   const listContainer = getElementByXpath(
  //     '/html/body/div[2]/div/div/div[3]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[2]'
  //   );

  //   console.log(listContainer);
  //   listContainer.scrollTop = 1000;

  //   const scrollIntervalId = setInterval(() => {
  //     listContainer.scrollTop = listContainer.scrollTop + 1000;

  //     // look into scrollIntoView(this)
  //     if (listContainer.children[0].children[0].children.length === 169) {
  //       clearInterval(scrollIntervalId);
  //     }
  //   }, 2000);

  //   // const lastLink = document.querySelectorAll('h3 > a')[2];
  //   // const topPos = lastLink.offsetTop;

  //   // const parentDiv = document.querySelector('div[class*="eo2As"]');
  //   // parentDiv.scrollTop = topPos;
  // });

  // await page.click(`a[href^='/${username}']`);
  // const text = await page.evaluate(() => {
  //   const anchor = document.querySelector(
  //     '._aacl ._aaco ._aacu ._aacx ._aad6 ._aade'
  //   );
  //   return anchor.textContent;
  // });
  // console.log(text);

  // const username = await page.$('[name="username"]');
  // console.log(
  //   'username value: ',
  //   await (await username.getProperty('value')).jsonValue()
  // );
  // console.log(username);

  // const password = await page.$('[name="password"]');
  // console.log(
  //   'password value: ',
  //   await (await password.getProperty('value')).jsonValue()
  // );

  // Doesn't work well for some reason
  // for (let button of weeklyButtons) {
  // await button.click();
  // ...

  // const scrapedDays = [];
  // const scrapedMeals = [];
  // const dateCounter = getMonday(new Date());
  // For each week
  // for (let i = 1; i <= weeklyButtons.length; i++) {
  //   // Navigate to the week page.
  //   //
  //   // Clicking hte button doesn't work well for some reason
  //   // for (let button of weeklyButtons) {
  //   // await button.click();
  //   // ...
  //   await page.goto(`${url}/week-${i}`);

  //   let days = await page.$$(`.slider-menu-for-day .slick-track .slick-slide`);

  //   // For each day
  //   for (let day of days) {
  //     const meals = await day.$$('.slick-slide > .row');

  //     const scrapedDailyMeals = [];
  //     // For each day
  //     for (let meal of meals) {
  //       const img = await meal.$('img');
  //       const title = await meal.$('.wrapper-ingredients h4');

  //       let srcText = 'no image';
  //       if (img) {
  //         const src = await img.getProperty('src');
  //         srcText = await src.jsonValue();
  //       }

  //       const titleText = await title.getProperty('textContent');
  //       const titleRawText = await titleText.jsonValue();

  //       scrapedMeals.push({
  //         title: titleRawText,
  //         imageUrl: srcText,
  //       });

  //       scrapedDailyMeals.push({
  //         title: titleRawText,
  //         imageUrl: srcText,
  //       });
  //     }

  //     console.log({ scrapedDailyMeals });
  //     scrapedDays.push({
  //       date: new Date(dateCounter),
  //       meals: scrapedDailyMeals,
  //     });
  //     dateCounter.setDate(dateCounter.getDate() + 1);
  //   }
  // }

  // console.log(scrapedDays);

  //   const sliderElemText = await sliderElem.getProperty('textContent');
  //   const sliderElemRawText = await sliderElemText.jsonValue();

  //   console.log({ sliderElemRawText });

  // Make sure to close the browser at the end in order for the process to end
  // broweser.close();
}

scrape('https://minesweeperonline.com/');

// document
//   .querySelector('input[name=username]')
//   .setAttribute('value', 'tofan.iulian');
// document.querySelector('input[name=username]').value = 'tofan.iulian';
// document
//   .querySelector('input[name=password]')
//   .setAttribute('value', '$Tnumber1');
// document.querySelector('input[name=password]').value = '$Tnumber1';
// document.querySelector('button[type="submit"]').disabled = false;
// document.querySelector('button[type="submit"]').click();
