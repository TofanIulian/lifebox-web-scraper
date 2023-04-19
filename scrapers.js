'use strict';

import * as puppeteer from 'puppeteer';

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;
}

async function scrape(url) {
  const broweser = await puppeteer.launch({
    headless: false,
    slowMo: 50, // slow down by 250ms
  });
  const page = await broweser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  const username = 'tofan.iulian';
  const password = '$Tnumber1';

  // inspect, right click element, copy XPath
  // const xPath =
  //   '/html/body/div[3]/section[3]/div/div[2]/div/div/div[1]/div[1]/div[1]/div/img';

  // Select by xpath
  // const [el] = await page.$x(xPath);
  // const src = await el.getProperty('src');
  // const srcText = await src.jsonValue();

  // console.log(srcText);

  // ############

  // const xPath2 =
  //   '/html/body/div[3]/section[3]/div/div[2]/div/div/div[1]/div[1]/div[2]/div/h4';

  // const [el2] = await page.$x(xPath2);
  // const text = await el2.getProperty('textContent');
  // const rawText = await text.jsonValue();

  // console.log(rawText);

  const esentialCookies =
    '/html/body/div[2]/div/div/div[2]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/button[1]';
  const [esentialCookiesButton] = await page.$x(esentialCookies);

  await esentialCookiesButton.click();

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

  await page.waitForSelector('input[name="username"]');
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForSelector(`a[href^='/${username}']`).then((el) => {
    el.click();
  });

  await page.waitForSelector(`a[href^='/${username}/followers']`).then((el) => {
    el.click();

    el.evaluate((htmlElement) => {
      console.log(htmlElement);
    });

    // console.log(el.children[0].children[0]);
  });

  await page.waitForXPath(
    '/html/body/div[2]/div/div/div[3]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[2]'
  );

  await page.evaluate(() => {
    function getElementByXpath(path) {
      return document.evaluate(
        path,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    }

    const listContainer = getElementByXpath(
      '/html/body/div[2]/div/div/div[3]/div/div/div[1]/div/div[2]/div/div/div/div/div[2]/div/div/div[2]'
    );

    console.log(listContainer);
    listContainer.scrollTop = 1000;

    const scrollIntervalId = setInterval(() => {
      listContainer.scrollTop = listContainer.scrollTop + 1000;

      // look into scrollIntoView(this)
      if (listContainer.children[0].children[0].children.length === 169) {
        clearInterval(scrollIntervalId);
      }
    }, 2000);

    // const lastLink = document.querySelectorAll('h3 > a')[2];
    // const topPos = lastLink.offsetTop;

    // const parentDiv = document.querySelector('div[class*="eo2As"]');
    // parentDiv.scrollTop = topPos;
  });

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

scrape('https://www.instagram.com/');

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
