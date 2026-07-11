// Sheet Configuration
const CHAT_HISTORY_SHEET_NAME = 'Chat History';
const CHAT_HISTORY_HEADERS = ['Update ID', 'Timestamp', 'Sender', 'Topic', 'Group', 'Text'];

const CONFIG_KEY = {
  TELEGRAM_BOT_NAME: "telegram_bot_name",
  TELEGRAM_BOT_TOKEN: "telegram_bot_token",
  TELEGRAM_WEBHOOK: "telegram_webhook",
  TELEGRAM_API_URL: "telegram_api_url"
}

// Google Sheet ID that holds the monthly expense tabs
const EXPENSE_SHEET_ID = '1-TnWsmsM9XAQpaCWIfR5RhezwgVPpeozz42OMYaKmCM';

// App Version
const APP_VERSION = '1.1.20'; // New variable for the application version

// Webhook URL
// IMPORTANT: Replace 'YOUR_DEPLOYED_WEB_APP_URL_HERE' with the actual URL you get
// after deploying your script as a web app. It should end with /exec.
// const DEPLOYED_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzYLXaTDEroLJrwErkswg-conzavgBOlxNx7yc9WdD5rAZkHlpEL0s1G5vX5bzDYV3-/exec'; 
const DEPLOYED_WEB_APP_URL = 'https://webhook.site/c6408790-4562-493d-8aeb-5b22e5aeb194'

function getAllConfig() {
  const configSheetName = "Config";
  let configData = [];

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(configSheetName);

    if (!sheet) {
      Logger.log(`Error: Sheet named "${configSheetName}" not found.`);
      SpreadsheetApp.getUi().alert('Error', `Sheet named "${configSheetName}" not found. Please create it.`, SpreadsheetApp.getUi().ButtonSet.OK);
      return [];
    }

    // Get all data from the sheet
    const range = sheet.getDataRange();
    const values = range.getValues();

    if (values.length === 0) {
      Logger.log(`Sheet "${configSheetName}" is empty.`);
      return [];
    }

    // Assume the first row contains headers
    const headers = values[0];
    const dataRows = values.slice(1); // Get all rows after the header

    // Iterate over data rows and create objects
    dataRows.forEach(row => {
      let rowObject = {};
      headers.forEach((header, index) => {
        // Use header as key, trim whitespace from header and value
        rowObject[header.trim()] = row[index];
      });
      configData.push(rowObject);
    });

    return configData;
  } catch (e) {
    Logger.log('Error reading config sheet: ' + e.toString());
    SpreadsheetApp.getUi().alert('Error', 'An error occurred while reading the config sheet: ' + e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return [];
  }
}

function getConfigByKey(key) {
  const configs = getAllConfig()
  if(key === CONFIG_KEY.TELEGRAM_API_URL) {
    const botToken = configs.filter(x => x.key == CONFIG_KEY.TELEGRAM_BOT_TOKEN)[0].value
    return 'https://api.telegram.org/bot' + botToken + '/'
  } // endif
  return configs.filter(x => x.key == key)[0].value
}