# Automated Email Processing with AI

This Google Apps Script automates email handling using AI-powered responses. It processes emails from specified senders, generates AI responses, sends notification emails for approval, and replies automatically upon approval.

## Features

- **Automatic Email Searching**: Searches unread emails from specified senders.
- **AI-Powered Responses**: Generates responses using OpenAI's GPT models.
- **User Approval Workflow**: Notifies the user with AI-generated responses for approval before sending.
- **Automated Scheduling**: Uses triggers to process emails at scheduled intervals.
- **Response Logging**: Keeps track of processed emails and user approvals.

## Project Setup

1. **Clone or Download the Repository**: Clone this repository to your local machine.

2. **Set Up Google Apps Script**:
   - Go to [Google Apps Script](https://script.google.com) and create a new project.
   - Paste the script from `Code.gs` into your Apps Script editor.

3. **Configure Constants**:
   - **CLIENT_ID**: OAuth Client ID for Google API access.
   - **CLIENT_SECRET**: OAuth Client Secret for Google API.
   - **OPENAI_API_KEY**: Your OpenAI API key for generating responses.
   - **SPREADSHEET_ID**: Google Sheets ID for logging email processing.
   - **MONITORED_SENDERS**: List of email addresses you want to monitor.

4. **Deploy as a Web App**:
   - Click on "Deploy" > "New deployment" in the Apps Script interface.
   - Choose "Web app", set access to "Anyone with Google account", deploy, and authorize.

5. **Run the Setup**:
   - Execute the `setup()` function to authorize the app and create necessary triggers.
   
6. **Authorization**:
   - An authorization prompt will request access to Gmail, Spreadsheets, and external APIs during the setup. Allow the script access to these resources.

## Usage

- **Automatic Processing**: Once set up, the script automatically processes emails every 5 minutes.
  
- **Approval Interface**:
  - You'll receive an email notification with the original email content and AI-generated response.
  - Approve the response through the provided link to send the reply automatically.

## Customization

- **Adjust Trigger Frequency**: Modify `everyMinutes(5)` in `createEmailProcessingTrigger` to change how often the script runs.
- **Change AI Model**: Update the model in `generateAIResponse` if you have access to different OpenAI models.
- **Email Formatting**: Customize the `htmlBody` in `notifyUser` for different styling preferences.

## Troubleshooting

- **No Authorization**: Ensure you've authorized the script correctly. Redeploy if needed.
- **API Errors**: Check that your API keys and client credentials are correct and have proper scopes.
- **Logging Issues**: Ensure the provided Spreadsheet ID has a writable sheet named 'Response Log'.

## Contributing

Feel free to make improvements or report issues. Contributions are welcome!

## License

This project is licensed under the MIT License.
