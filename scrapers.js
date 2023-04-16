// const puppeteer = require('puppeteer');
import * as puppeteer from 'puppeteer';
// import { launch } from 'puppeteer';

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  writeBatch,
  doc,
} from 'firebase/firestore/lite';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDr4vNW8rR9unczwADxlkXUN37MHbi28y4',
  authDomain: 'tofi-tools.firebaseapp.com',
  projectId: 'tofi-tools',
  storageBucket: 'tofi-tools.appspot.com',
  messagingSenderId: '1000692286817',
  appId: '1:1000692286817:web:0ab6b513b409955f87b120',
  measurementId: 'G-XHFCKR8VW2',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get a list of cities from your database
async function saveData(db, dailyData, mealsData) {
  const citiesCol = collection(db, 'finance-data');
  const citySnapshot = await getDocs(citiesCol);
  // const cityList = citySnapshot.map((doc) => doc.data());

  citySnapshot.forEach((doc) => {
    console.log(doc.data());
  });

  // console.warn({
  //   citiesCol: citiesCol,
  //   cityList: cityList,
  //   citySnapshot: citySnapshot,
  // });

  // const collection = firebase.firestore().collection('restaurants');
  // return collection.add(data);

  /**
   * Bulk Upload
   */
  const batch = writeBatch(db);

  const dailylifeboxCollection = collection(
    db,
    'lifebox',
    'tHTOmzHDq5Sz4Yqwxe0pcOVBBiV2',
    'daily'
  );

  const meallifeboxCollection = collection(
    db,
    'lifebox',
    'tHTOmzHDq5Sz4Yqwxe0pcOVBBiV2',
    'meal'
  );

  dailyData.forEach((entry) => {
    var docRef = doc(dailylifeboxCollection); //automatically generate unique id
    batch.set(docRef, entry);
  });

  mealsData.forEach((entry) => {
    var docRef = doc(meallifeboxCollection); //automatically generate unique id
    batch.set(docRef, entry);
  });

  batch.commit();
}

const querySnapshot = await getDocs(collection(db, 'users'));
querySnapshot.forEach((doc) => {
  console.log(`${doc.id} => ${doc.data()}`);
});

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

async function scrape(url) {
  const broweser = await puppeteer.launch();
  const page = await broweser.newPage();
  await page.goto(url);

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

  const weeklyButtons = await page.$$('.weekly-buttons .button-week');

  // Doesn't work well for some reason
  // for (let button of weeklyButtons) {
  // await button.click();
  // ...

  const scrapedDays = [];
  const scrapedMeals = [];
  const dateCounter = getMonday(new Date());
  // For each week
  for (let i = 1; i <= weeklyButtons.length; i++) {
    // Navigate to the week page.
    //
    // Clicking hte button doesn't work well for some reason
    // for (let button of weeklyButtons) {
    // await button.click();
    // ...
    await page.goto(`${url}/week-${i}`);

    let days = await page.$$(`.slider-menu-for-day .slick-track .slick-slide`);

    // For each day
    for (let day of days) {
      const meals = await day.$$('.slick-slide > .row');

      const scrapedDailyMeals = [];
      // For each day
      for (let meal of meals) {
        const img = await meal.$('img');
        const title = await meal.$('.wrapper-ingredients h4');

        let srcText = 'no image';
        if (img) {
          const src = await img.getProperty('src');
          srcText = await src.jsonValue();
        }

        const titleText = await title.getProperty('textContent');
        const titleRawText = await titleText.jsonValue();

        scrapedMeals.push({
          title: titleRawText,
          imageUrl: srcText,
        });

        scrapedDailyMeals.push({
          title: titleRawText,
          imageUrl: srcText,
        });
      }

      console.log({ scrapedDailyMeals });
      scrapedDays.push({
        date: new Date(dateCounter),
        meals: scrapedDailyMeals,
      });
      dateCounter.setDate(dateCounter.getDate() + 1);
    }
  }

  console.log(scrapedDays);
  saveData(db, scrapedDays, scrapedMeals);

  //   const sliderElemText = await sliderElem.getProperty('textContent');
  //   const sliderElemRawText = await sliderElemText.jsonValue();

  //   console.log({ sliderElemRawText });

  // Make sure to close the browser at the end in order for the process to end
  broweser.close();
}

scrape('https://www.lifebox.ro/sportbox-4');
