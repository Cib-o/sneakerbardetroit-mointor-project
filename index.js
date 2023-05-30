require('dotenv').config();
const puppeteer = require('puppeteer');
const sendWebhook = require('./sendWebhook');

(async () => {
  // Proxy client configuration
  const proxy = process.env.PROXY;
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;

  // Product
  let initialProductLink = '';

  // Browser setup
  async function initBrowser(link) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--proxy-server=${proxy}`
      ],
    });
    const page = await browser.newPage();
    await page.authenticate({ username, password });
    try {
      await page.goto(link, { timeout: 0 });
      return [page, browser];
    } catch (error) {
      await page.close();
      await browser.close();
      if (browser && browser.process() != null) browser.process().kill('SIGINT');
      return [false, false];
    }
  }

  // Checks each product and makes difference between link
  async function checkProduct(page, browser) {
    let newLink = false;

    try {
      const elementHandle = await page.$('#tdi_94 > div:nth-child(1) > div > div.td-module-meta-info > h3 > a');
      newLink = await page.evaluate(el => el.getAttribute('href'), elementHandle);
    } catch (error) { console.log(error); }

    if (newLink) {
      if (initialProductLink !== newLink) {
        initialProductLink = newLink;
  
        await sendWebhook({
          'link': newLink
        });
      }
    }
    
    await page.close();
    await browser.close();
    await browser.disconnect();
    if (browser && browser.process() != null) browser.process().kill('SIGINT');
  }

  // Monitor of product
  async function monitor(link) {
    const [page, browser] = await initBrowser(link);
    if (!page || !browser) return;
    await checkProduct(page, browser);
  }

  // Start up
  setInterval(async () => {
    await monitor('https://sneakerbardetroit.com/');
  }, 60000);
})();