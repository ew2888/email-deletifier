# Email Deletifier

A Node.js application that automatically processes and manages your Gmail inbox by identifying and handling advertising emails.

## Features

- **AI-Powered Classification**: Uses OpenAI's GPT model to accurately identify advertising emails
- **Gmail Integration**: Works directly with your Gmail account using IMAP
- **Smart Labeling**: Automatically labels emails as "Advertising" or "Processed"
- **Configurable Cleanup**: Automatically deletes old advertising emails based on configurable thresholds
- **Dry Run Mode**: Test the script without actually deleting any emails
- **Detailed Logging**: Comprehensive logging of all actions and decisions

## Prerequisites

- Node.js (v14 or higher)
- A Gmail account
- OpenAI API key
- Gmail App Password (if 2FA is enabled)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/email-deletifier.git
cd email-deletifier
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
GMAIL_USER=your.email@gmail.com
GMAIL_PASSWORD=your-app-password
OPENAI_API_KEY=your-openai-api-key
DELETE_FROM_ADVERTISING_DAYS=60  # Optional: Days after which to delete advertising emails (default: 60)
DRY_RUN=true  # Optional: Set to 'true' to test without deleting emails (default: false)
```

## Configuration

The following environment variables can be configured in your `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `GMAIL_USER` | Your Gmail email address | Required |
| `GMAIL_PASSWORD` | Your Gmail app password | Required |
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `DELETE_FROM_ADVERTISING_DAYS` | Age threshold (in days) for deleting advertising emails | 60 |
| `DRY_RUN` | If 'true', runs in simulation mode without deleting emails | false |

## How It Works

The script operates in two passes:

### First Pass: Email Classification
1. Fetches unprocessed emails from your Gmail INBOX
2. Uses OpenAI to classify each email as advertising or not
3. Adds appropriate labels:
   - "Advertising" label for advertising emails
   - "Processed" label for all processed emails
4. Keeps all emails in their original location

### Second Pass: Cleanup
1. Checks the "Advertising" folder for old emails
2. Deletes advertising emails older than the configured threshold
3. Skips deletion if in dry run mode
4. Provides detailed logging of all actions

## Usage

Run the script:
```bash
npx ts-node src/main.ts
```

The script will:
1. Connect to your Gmail account
2. Create necessary labels if they don't exist
3. Process unprocessed emails in batches
4. Clean up old advertising emails
5. Provide a detailed summary of actions taken

## Logging

The script provides detailed logging of:
- Configuration settings
- Connection status
- Email processing decisions
- Classification results
- Label application status
- Deletion actions
- Summary statistics

## Safety Features

- Dry run mode for testing without actual deletions
- Configurable deletion threshold
- Detailed logging of all actions
- Batch processing to prevent overload
- Error handling and graceful disconnection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 