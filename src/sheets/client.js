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

// Like getRows but reads from any spreadsheet (not just the bot's sheet)
async function getRowsFrom(spreadsheetId, sheetName, range) {
  const request = {
    spreadsheetId,
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

// Extend a sheet to have at least `minColumns` columns.
// Uses batchUpdate appendDimension. No-op if sheet already has enough columns.
async function ensureColumns(sheetName, minColumns) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.GOOGLE_SHEETS_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  const currentCols = sheet.properties.gridProperties.columnCount;
  if (currentCols >= minColumns) return; // already enough columns
  const toAdd = minColumns - currentCols;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    resource: {
      requests: [{
        appendDimension: {
          sheetId: sheet.properties.sheetId,
          dimension: 'COLUMNS',
          length: toAdd
        }
      }]
    }
  });
}

// Read cell values AND background colors from any spreadsheet.
// Returns array of rows; each row is array of { value, bgColor }
// bgColor is { red, green, blue } with 0–1 float values, or null for default (white)
async function getCellFormats(spreadsheetId, sheetName, range) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [`${sheetName}!${range}`],
    includeGridData: true
  });

  const sheetData = response.data.sheets[0];
  if (!sheetData || !sheetData.data[0]) return [];

  return sheetData.data[0].rowData.map(row => {
    if (!row.values) return [];
    return row.values.map(cell => {
      const value = cell.formattedValue || '';
      const rawValue = cell.effectiveValue || null; // { numberValue, stringValue, boolValue, ... }
      const bgColor = cell.effectiveFormat && cell.effectiveFormat.backgroundColor
        ? cell.effectiveFormat.backgroundColor
        : null;
      return { value, rawValue, bgColor };
    });
  });
}

// Delete a specific row by its 1-based row number (e.g., row 2 = first data row)
async function deleteRow(sheetName, rowNumber) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.GOOGLE_SHEETS_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.GOOGLE_SHEETS_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-based
            endIndex: rowNumber        // exclusive
          }
        }
      }]
    }
  });
}

module.exports = { appendRow, getRows, getRowsFrom, updateRow, getCellFormats, ensureColumns, deleteRow };
