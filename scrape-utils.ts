'use strict';

import { ElementHandle, Page } from 'puppeteer';

export async function clickByXpath(page: Page, xPath: string) {
  const element: ElementHandle<HTMLButtonElement> = await page.$x(xPath)[0];

  element.click();

  return element;
}
