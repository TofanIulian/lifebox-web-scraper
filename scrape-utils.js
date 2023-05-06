'use strict';

export async function clickByXpath(page, xPath) {
  const element = await page.$x(xPath)[0];
  element.click();

  return element;
}
