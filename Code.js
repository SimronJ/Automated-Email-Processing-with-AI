// ====================== CONFIGURATION ======================
const CLIENT_ID = 'blank';
const CLIENT_SECRET = 'blank';
const OPENAI_API_KEY = 'blank';
const SPREADSHEET_ID = 'blank';
const MONITORED_SENDERS = ['blank'];
const CHECK_TIMES = [9, 16, 21]; // Times (hours) to check emails during the day


// ====================== OAUTH SETUP ======================
function getOAuthService() {
  return OAuth2.createService('gmail')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/v2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/spreadsheets')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  return HtmlService.createHtmlOutput(authorized ? 'Success! You can close this tab.' : 'Failed to authorize.');
}

// ====================== MAIN PROCESSING FUNCTION ======================
function processAllEmails() {
  Logger.log('Starting email processing...');
  
  // Process latest Amazon Flex email
  replyToLatestAmazonFlexEmail();
  
  // Process other monitored emails
  autoReply();
  
  Logger.log('Email processing completed.');
}

// ====================== AMAZON FLEX SPECIFIC HANDLING ======================
function replyToLatestAmazonFlexEmail() {
  const searchQuery = 'from:amazonflex-support is:unread';
  Logger.log("Search Query Used: " + searchQuery);
  
  const threads = GmailApp.search(searchQuery);
  
  if (threads.length > 0) {
    const latestThread = threads[0];
    const messages = latestThread.getMessages();
    const latestMessage = messages[messages.length - 1];

    Logger.log(`Processing latest email from: ${latestMessage.getFrom()}`);
    
    if (!isEmailProcessed(latestMessage.getId())) {
      const emailContent = latestMessage.getPlainBody();
      const aiResponse = generateAIResponse(emailContent);
      
      if (aiResponse) {
        notifyUser(aiResponse, latestMessage.getFrom(), latestThread); // Notify user for approval
        markEmailAsProcessed(latestMessage.getId());
        Logger.log('Notification sent to user for the latest Amazon Flex email.');
      }
    }
  } else {
    Logger.log('No unread emails found from amazonflex-support.');
  }
}

// ====================== GENERAL EMAIL MONITORING ======================
function autoReply() {
  const searchQuery = MONITORED_SENDERS.map(sender => `from:(${sender}) is:unread`).join(' OR ');
  Logger.log('Search Query: ' + searchQuery);
  
  const threads = GmailApp.search(searchQuery);
  Logger.log(`Found ${threads.length} unread matching threads`);
  
  threads.forEach((thread, index) => {
    processThread(thread);
  });
}

function processThread(thread) {
  try {
    const lastMessage = thread.getMessages().pop();
    const emailContent = lastMessage.getPlainBody();

    if (!isEmailProcessed(lastMessage.getId())) {
      const aiResponse = generateAIResponse(emailContent);
      
      if (aiResponse) {
        notifyUser(aiResponse, lastMessage.getFrom(), thread); // Notify user for approval
        markEmailAsProcessed(lastMessage.getId());
        Logger.log('Notification sent to user for a monitored email.');
      }
    }
  } catch (error) {
    Logger.log(`Error processing thread: ${error.message}`);
  }
}

// ====================== AI RESPONSE GENERATION ======================
function generateAIResponse(emailContent) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant responding to emails.' },
      { role: 'user', content: `Please generate a response to this email: ${emailContent}` }
    ]
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return json.choices[0].message.content;
  } catch (error) {
    Logger.log('Error generating AI response: ' + error.message);
    return null;
  }
}

// ====================== NOTIFY USER FOR APPROVAL ======================
function notifyUser(aiResponse, senderEmail, thread) {
  const notificationEmail = Session.getActiveUser().getEmail();
  const approvalId = Utilities.getUuid();
  
  // Get the original email content
  const lastMessage = thread.getMessages().pop();
  const originalSubject = lastMessage.getSubject();
  const originalContent = lastMessage.getPlainBody();

  // Store the pending response in cache
  const pendingResponse = {
    threadId: thread.getId(),
    aiResponse: aiResponse,
    senderEmail: senderEmail
  };
  
  CacheService.getScriptCache().put(approvalId, JSON.stringify(pendingResponse), 21600);

  const approvalUrl = ScriptApp.getService().getUrl() + "?action=approve&id=" + approvalId;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2c3e50; font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        Email Response Review
      </h1>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #34495e; font-size: 20px;">Original Email:</h2>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #2980b9; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>From:</strong> ${senderEmail}</p>
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${originalSubject}</p>
          <div style="margin-top: 10px; white-space: pre-wrap; font-family: Arial, sans-serif;">
            ${originalContent.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #34495e; font-size: 20px;">AI Generated Response:</h2>
        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #27ae60; margin-bottom: 20px;">
          <div style="white-space: pre-wrap; font-family: Arial, sans-serif;">
            ${aiResponse.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>

      <div style="margin: 30px 0; text-align: center;">
        <p style="margin-bottom: 15px; font-weight: bold; color: #2c3e50;">
          Do you approve this response?
        </p>
        <a href="${approvalUrl}" 
           style="background: #27ae60; 
                  color: white; 
                  padding: 12px 25px; 
                  text-decoration: none; 
                  border-radius: 5px;
                  font-weight: bold;
                  display: inline-block;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          ✓ Approve and Send Response
        </a>
      </div>
    </div>
  `;

  GmailApp.sendEmail(
    notificationEmail,
    `AI Response Preview - RE: ${originalSubject}`,
    '',
    {
      htmlBody: htmlBody
    }
  );
}


// ====================== APPROVAL HANDLING ======================
function doGet(e) {
  const action = e.parameter.action;
  const approvalId = e.parameter.id;

  if (!approvalId) return HtmlService.createHtmlOutput('Invalid request');

  const cache = CacheService.getScriptCache();
  const responseJson = cache.get(approvalId);

  if (!responseJson) return HtmlService.createHtmlOutput('Response expired or not found');

  const pendingResponse = JSON.parse(responseJson);
  if (action === 'approve') {
    const thread = GmailApp.getThreadById(pendingResponse.threadId);
    thread.reply(pendingResponse.aiResponse); // Reply with the AI-generated content
    Logger.log('Response approved and sent to the user.');
    cache.remove(approvalId);
    return HtmlService.createHtmlOutput('Response sent successfully!');
  }
}

// ====================== LOGGING & TRACKING ======================
function isEmailProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  return cache.get(messageId) !== null;
}

function markEmailAsProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  cache.put(messageId, 'processed', 21600); // Cache for 6 hours
}

// ====================== TRIGGER SETUP ======================
function createEmailProcessingTrigger() {
  // First, delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processAllEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create a new trigger to run every hour (or specify another interval)
  ScriptApp.newTrigger('processAllEmails')
    .timeBased()
    .everyHours(1) // Adjust this to your desired interval
    .create();
  
  Logger.log('Trigger for email processing created successfully');
}

// ====================== INITIAL SETUP ======================
function setup() {
  // Check if the OAuth service is authorized
  const service = getOAuthService();
  if (!service.hasAccess()) {
    Logger.log('Authorization required. Please run the script to authorize.');
    return;
  }
  
  // Create time-based triggers for regular email processing
  createEmailProcessingTrigger();
  
  Logger.log('Setup completed. The script is now configured to run automatically.');
}