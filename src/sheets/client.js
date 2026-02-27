const { google } = require('googleapis');
const config = require('../config');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: config.GOOGLE_PRIVATE_KEY ? config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : ''
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

async function appendRow(sheetName, values) {
  const request = {
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  };
  return await sheets.spreadsheets.values.append(request);
}

async function getRows(sheetName, range) {
  const request = {
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    range: `${sheetName}!${range}`
  };
  const response = await sheets.spreadsheets.values.get(request);
  return response.data.values || [];
}

async function updateRow(sheetName, range, values) {
  const request = {
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  };
  return await sheets.spreadsheets.values.update(request);
}

module.exports = { appendRow, getRows, updateRow };
