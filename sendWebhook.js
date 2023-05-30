require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');

const sendWebhook = async (props) => {
  // Proxy client configuration
  const proxy = process.env.PROXY;
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;
  const itemLink = props.link;

  // WebhookURL
  const webHookURL = process.env.WEBHOOKURL;

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
    await page.goto(link, { timeout: 0 });
    return [page, browser];
  }

  async function checkProduct(page, browser) {
    try {
      const elementHandle = await page.$('#tdi_86 > div > div.vc_column.tdi_89.wpb_column.vc_column_container.tdc-column.td-pb-span8 > div > div.td_block_wrap.tdb_single_content.tdi_91.td-pb-border-top.td_block_template_9.td-post-content.tagdiv-type > div');
      const itemInfo = (await page.evaluate(el => el.querySelector('div.release-info').textContent, elementHandle)).split('\n');
      const [itemName] = itemInfo;
      const items = [];

      itemInfo.forEach(result => {
        if (result.split(':').length <= 1) return;

        items.push({ name: result.split(':')[0] ? result.split(':')[0] : 'Unknown', value: result.split(':')[1].substring(1) ? result.split(':')[1].substring(1) : 'Unknown' });
      });

      const message = {
        username: 'SBD Monitor',
        avatar_url: 'https://sneakerbardetroit.com/wp-content/uploads/2016/07/SBD-Favicon-Update.jpg',
        embeds: [
          {
            title: itemName,
            url: itemLink,
            color: 0x000,
            fields: items,
            timestamp: new Date().toISOString(),
          }
        ]
      }

      await axios.post(webHookURL, message)
        .catch(err => console.error(err));
    } catch (error) { console.log(error); }

    await page.close();
    await browser.close();
    await browser.disconnect();
    if (browser && browser.process() != null) browser.process().kill('SIGINT');
  }

  async function monitor(link) {
    const [page, browser] = await initBrowser(link);
    await checkProduct(page, browser);
  }

  await monitor(itemLink);
};

module.exports = sendWebhook;