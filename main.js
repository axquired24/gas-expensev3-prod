// --- MAIN WEBHOOK HANDLER ---
/**
 * This function is triggered when Telegram sends a webhook update (POST request) to your deployed Apps Script web app.
 * It is designed to specifically handle messages from supergroup topics
 * and log them to a Google Sheet, then send a simple acknowledgment.
 * @param {Object} e The event object containing the POST request data.
 */
function doPost(e) {
  // IMPORTANT: Immediately return a success response to Telegram to prevent retries.
  // The rest of the script will continue to execute in the background.
  ContentService.createTextOutput(JSON.stringify({ success: true }));

  // Parse the incoming JSON content from Telegram
  const contents = JSON.parse(e.postData.contents);

  // Log the entire incoming update for debugging purposes
  Logger.log('Incoming Telegram Update: ' + JSON.stringify(contents, null, 2));

  let chatId;
  let responseText = "bot-rusak"; // Simple acknowledgment
  let messageThreadId = null; // Unique identifier for the target message thread (topic) of the forum
  let replyToMessageId = null; // ID of the original message to reply to

  // Prepare data for logging to Google Sheet
  let updateId = '';
  let timestamp = '';
  let chat_id_for_log = '';
  let sender_for_log = '';
  let topic_for_log = '';
  let group_for_log = '';
  let text_for_log = '';
  
  // --- Handle incoming message ---
  if (contents.message) {
    const message = contents.message; // Alias for easier access

    // Extract data for logging based on the specified structure
    updateId = contents.update_id || '';
    timestamp = new Date(message.date * 1000).toLocaleString(); // Convert Unix timestamp to human-readable
    chat_id_for_log = message.chat.id || '';
    sender_for_log = message.from.first_name || '';
    text_for_log = message.text || '';

    // Determine group and topic information for supergroup topics
    if (message.chat.type === 'supergroup' && message.is_topic_message) {
      group_for_log = message.chat.title || '';
      messageThreadId = message.message_thread_id;

      // As per the specified structure: x.message.reply_to_message.forum_topic_created.name
      if (message.reply_to_message && message.reply_to_message.forum_topic_created && message.reply_to_message.forum_topic_created.name) {
        topic_for_log = message.reply_to_message.forum_topic_created.name;
      } else {
        // Fallback if topic name isn't directly available via reply_to_message
        topic_for_log = `Topic ID: ${messageThreadId}`; 
      }
    } else {
      // If not a supergroup topic message, leave topic/group blank or handle differently if needed
      group_for_log = message.chat.title || ''; // Still log group title for non-topic messages if present
      topic_for_log = ''; // Ensure topic is empty if not a topic message
    }
    
    // Always reply to the original message for better context
    replyToMessageId = message.message_id;
    chatId = message.chat.id; // Set chatId for sending response

    // --- Specific handling for "appversion" command ---
    if (message.text && message.text.toLowerCase() === 'appversion') {
      responseText = `Current App Version: ${APP_VERSION}`;
      sendMessage(chatId, responseText, null, messageThreadId, replyToMessageId);
      // No explicit return here, as the 200 OK is already sent at the top.
      // The rest of the function will complete (logging will be skipped due to no shouldLogToSheet flag).
    } else {
      // log to sheet
      const rowData = [
        updateId,
        timestamp,
        sender_for_log,
        topic_for_log,
        group_for_log,
        text_for_log,
        JSON.stringify(message)
      ];
      appendRowToSheet(CHAT_HISTORY_SHEET_NAME, rowData);

      // no photo handle now
      const photoFileId = null;
      let messageText = message?.text
      let isCaptionImg = false
      if(message?.caption) {
        isCaptionImg = true;
        messageText = message?.caption
      } // endif
      if(messageText) {
        const parsedValues = formatMsg(messageText)
        const sheetRows = prepareForSheetRows(parsedValues, message.date, photoFileId)
        const sheetMonth = timestamp = Utilities.formatDate(new Date(message.date * 1000), Session.getScriptTimeZone(), 'MMM yyyy');
        const sheetName = "Cashbot " + sheetMonth;

        sheetRows.forEach(row => {
          appendRowToSheet(sheetName, row, EXPENSE_LOG_HEADERS);
        })

        let reply = "(text) " 
        reply += generateChatSummary(parsedValues)
        reply += "\n\nGoogle Sheet: " + sheetRows.length + " row(s) added."
        if(isCaptionImg) {
          reply += "\nTt..tapi gambarnya belum bisa diproses ya!"
        }
        responseText = reply
      } // endif

      // Send the default response back to Telegram
      sendMessage(chatId, responseText, null, messageThreadId, replyToMessageId);
    }

  } else {
    // If the update is not a message (e.g., edited_message, channel_post, etc.),
    // or if it's a callback_query (which we are no longer handling explicitly for response logic),
    // we still log the update_id and timestamp if available.
    updateId = contents.update_id || '';
    timestamp = new Date().toLocaleString(); // Use current time for unhandled updates
    text_for_log = `[Unhandled Update Type: ${Object.keys(contents)[1] || 'Unknown'}]`;
    Logger.log('Received unhandled update type. Logging basic info.');
    
    // Log unhandled updates to the sheet
    const rowData = [
      updateId,
      timestamp,
      chat_id_for_log, // Might be empty if chat ID not easily found
      sender_for_log,  // Might be empty
      topic_for_log,   // Might be empty
      group_for_log,   // Might be empty
      text_for_log
    ];
    appendRowToSheet(CHAT_HISTORY_SHEET_NAME, rowData);
    // No response will be sent for unhandled types as chatId might not be available or relevant.
  }

  // No return statement here, as the 200 OK is sent at the very beginning of the function.
}