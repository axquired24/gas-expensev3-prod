
// --- TELEGRAM API HELPER FUNCTIONS (Essential for bot response) ---
function getTelegramUrl () {
  return getConfigByKey(CONFIG_KEY.TELEGRAM_API_URL);
}
/**
 * Sends a text message to a specified chat ID.
 * @param {string} chatId The ID of the chat to send the message to.
 * @param {string} text The text of the message.
 * @param {Object} [replyMarkup] Optional: An object for inline keyboard or custom keyboard.
 * @param {number} [messageThreadId] Optional: Unique identifier for the target message thread (topic) of the forum.
 * @param {number} [replyToMessageId] Optional: If the message is a reply, ID of the original message.
 */
function sendMessage(chatId, text, replyMarkup = null, messageThreadId = null, replyToMessageId = null) {
  const payload = {
    method: 'sendMessage',
    chat_id: String(chatId),
    text: text,
    parse_mode: 'HTML' // Or 'MarkdownV2'
  };

  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }

  // Add message_thread_id if provided (for sending to a specific topic)
  if (messageThreadId) {
    payload.message_thread_id = messageThreadId;
  }

  // Add reply_to_message_id if provided (for replying to a specific message)
  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }
  payload.parse_mode = "markdown"

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Prevents script from crashing on HTTP errors
  };

  try {
    const response = UrlFetchApp.fetch(getTelegramUrl(), options);
    Logger.log('sendMessage Response: ' + response.getContentText());
  } catch (e) {
    Logger.log('Error sending message: ' + e.toString());
  }
}

/**
 * Acknowledges a callback query. This removes the "loading" state from the inline button.
 * This function is kept as it's a standard Telegram API interaction,
 * even if explicit callback_query handling for bot response logic is removed from doPost.
 * @param {string} callbackQueryId The ID of the callback query to acknowledge.
 * @param {string} [text] Optional: Text to show as a pop-up notification to the user.
 * @param {boolean} [showAlert] Optional: If true, a larger alert will be shown instead of a small notification.
 */
function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  const payload = {
    method: 'answerCallbackQuery',
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: showAlert
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(getTelegramUrl(), options);
    Logger.log('answerCallbackQuery Response: ' + response.getContentText());
  } catch (e) {
    Logger.log('Error answering callback query: ' + e.toString());
  }
}

/**
 * Sets the webhook for your Telegram bot to point to this Apps Script web app.
 * IMPORTANT: After deploying your script as a web app, copy the 'Web app URL'
 * (which ends with /exec) from the deployment dialog and paste it into the
 * 'YOUR_DEPLOYED_WEB_APP_URL_HERE' placeholder in config.gs.
 * You only need to run this function once (or when your web app URL changes).
 */
function setWebhook() {
  // References the constant from config.gs
  const webAppUrl = getConfigByKey(CONFIG_KEY.TELEGRAM_WEBHOOK);
  
  if (webAppUrl === 'YOUR_DEPLOYED_WEB_APP_URL_HERE' || !webAppUrl) {
    Logger.log('ERROR: Please replace "YOUR_DEPLOYED_WEB_APP_URL_HERE" in config.gs with your actual deployed web app URL (ending in /exec).');
    return;
  }

  Logger.log('Attempting to set webhook to: ' + webAppUrl);

  const setWebhookUrl = getTelegramUrl() + 'setWebhook?url=' + encodeURIComponent(webAppUrl);
  
  const options = {
    method: 'post',
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(setWebhookUrl, options);
    Logger.log('setWebhook Response: ' + response.getContentText());
    const result = JSON.parse(response.getContentText());
    if (result.ok) {
      Logger.log('Webhook set successfully!');
    } else {
      Logger.log('Failed to set webhook: ' + result.description);
    }
  } catch (e) {
    Logger.log('Error setting webhook: ' + e.toString());
  }
}

/**
 * (Optional) Deletes the current webhook.
 * Run this if you want to stop receiving updates or change your webhook.
 */
function deleteWebhook() {
  const deleteWebhookUrl = getTelegramUrl() + 'deleteWebhook';
  const options = {
    method: 'post',
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(deleteWebhookUrl, options);
    Logger.log('deleteWebhook Response: ' + response.getContentText());
    const result = JSON.parse(response.getContentText());
    if (result.ok) {
      Logger.log('Webhook deleted successfully!');
    } else {
      Logger.log('Failed to delete webhook: ' + result.description);
    }
  } catch (e) {
    Logger.log('Error deleting webhook: ' + e.toString());
  }
}