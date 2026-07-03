function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setTitle('EV Fam Tracker')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function testFunc() {
  const result = getSheetRows("202601", EXPENSE_SHEET_ID)
  Logger.log(
    JSON.stringify(result, null, 2)
  )
}

function getDevSheet(monthYear="") {
  return getSheetRows(monthYear, EXPENSE_SHEET_ID)
}

function getSheetRows(monthYear, sheetId="") {
  const resp = {
    success: false,
    error: "",
    sheetName: "",
    rowLen: 0,
    rows: []
  }
  if(monthYear.length !== 6) {
    resp.error = "Bulan yang dipilih salah"
    return resp
  }

  const year = monthYear.substring(0, 4); // "2026"
  const monthIndex = parseInt(monthYear.substring(4, 6), 10) - 1; // 2 (representing March)

  // Array of short month names matching your naming convention
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Validate monthIndex falls within 0-11 range
  if (monthIndex >= 0 && monthIndex <= 11) {
    resp.sheetName = `Cashbot ${months[monthIndex]} ${year}`; // Compiles to "Cashbot Mar 2026"
  } else {
    resp.error = "Month Index not found: " + monthIndex
  }

  const rows = getSheetDataAsJson(resp.sheetName, sheetId);
  if(rows?.error) {
    resp.error = rows?.error
  } else {
    resp.success = true
    resp.rows = rows
    resp.rowLen = rows?.length
  }

  return resp
}

/**
 * Standardizes the JSON output with CORS support
 */
function createJsonResponse(data, statusCode) {
  const output = JSON.stringify(data);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Standard logic for Web Apps to handle CORS
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}