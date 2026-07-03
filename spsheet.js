const EXPENSE_LOG_HEADERS = ['Date', 'Amount', 'Description', 'Category'];
const templateSheetName = "Cashbot Template";

// --- GOOGLE SHEET HELPER FUNCTIONS ---

/**
 * Appends a row of data to the specified Google Sheet.
 * If the sheet does not exist, it will be created with headers.
 * @param {string} sheetName The name of the sheet to append to.
 * @param {Array<any>} rowData An array of data to append as a new row.
 */
function appendRowToSheet(sheetName, rowData, defaultHeaders = CHAT_HISTORY_HEADERS) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);

    // Check if the target sheet doesn't exist
    if (!sheet) {
      // 1. Get the template sheet
      const templateSheet = spreadsheet.getSheetByName(templateSheetName);

      if (templateSheet) {
        // 2. Duplicate the template sheet
        sheet = templateSheet.copyTo(spreadsheet);

        // 3. Rename the newly copied sheet
        sheet.setName(sheetName);

        Logger.log(`Copied sheet "${templateSheetName}" to new sheet: ${sheetName}`);
      } else {
        // Handle the case where the template sheet itself is missing
        Logger.log(`ERROR: Template sheet "${templateSheetName}" not found. Creating a blank sheet.`);
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.appendRow(defaultHeaders); // Use the defined headers
        Logger.log(`Created new blank sheet: ${sheetName} with headers.`);
      }
    }

    sheet.appendRow(rowData);
    Logger.log(`Appended row to ${sheetName}: ${JSON.stringify(rowData)}`);

  } catch (e) {
    Logger.log('Error appending data to sheet: ' + e.toString());
    // You might want to send an error message to Telegram here as well
  }
}

/**
 * Core function modified to accept sheetName as a parameter.
 */
function getSheetDataAsJson(sheetName, sheetId="") {
  const startRow = 16;
  let ss;
  if(sheetId) {
    ss = SpreadsheetApp.openById(sheetId)
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { "error": `Sheet '${sheetName}' not found.` };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) {
    return []; // Return empty array if no data exists from row 15 onwards
  }
  
  const numRows = (lastRow - startRow) + 1;
  const dataRange = sheet.getRange(startRow, 1, numRows, 4); 
  const values = dataRange.getValues();
  
  const result = values.map(row => {
    let formattedDate = "";
    if (row[0] instanceof Date) {
      formattedDate = Utilities.formatDate(row[0], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    } else if (row[0]) {
      formattedDate = row[0].toString();
    }
    
    return {
      "Date": formattedDate,
      "Amount": Number(row[1]) || 0,
      "Description": String(row[2]),
      "Category": String(row[3])
    };
  });
  
  return result;
}
