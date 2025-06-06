# Email Deletifier

A Node.js tool that uses AI to automatically identify and manage advertising emails in your Gmail inbox. It uses Gmail labels to organize emails without moving them from their original location, making it safe and non-disruptive to your existing email organization.

## Features

- 🤖 AI-powered email classification using OpenAI's GPT model
- 🏷️ Smart labeling system (keeps emails in INBOX)
- 🔄 Two-pass system (classification and cleanup)
- 🛡️ Dry run mode for safe testing
- 📊 Detailed logging of all actions
- ⚙️ Configurable settings
- 🔒 Secure credential management

## Prerequisites

- Node.js (v14 or higher)
- Gmail account
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

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your credentials:
   ```
   GMAIL_USER=your.email@gmail.com
   GMAIL_PASSWORD=your-app-password
   OPENAI_API_KEY=your-openai-api-key
   DELETE_FROM_ADVERTISING_DAYS=60
   DRY_RUN=true
   ```

## Usage

1. Start the application:
   ```bash
   ./start.sh
   ```

   Or manually:
   ```bash
   npx ts-node src/main.ts
   ```

2. The script will:
   - Process unlabeled emails in your INBOX
   - Classify them using AI
   - Add appropriate labels
   - Optionally delete old advertising emails

## Configuration

The following environment variables can be configured in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GMAIL_USER` | Your Gmail address | - |
| `GMAIL_PASSWORD` | Gmail App Password | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `DELETE_FROM_ADVERTISING_DAYS` | Age threshold for deletion | 60 |
| `DRY_RUN` | Enable dry run mode | true |
| `BATCH_SIZE` | Number of emails to process at once | 10 |
| `MAX_EMAIL_AGE_DAYS` | Maximum age of emails to process | 90 |

## Safety Features

- **Dry Run Mode**: When enabled (`DRY_RUN=true`), no emails will be deleted
- **Labeling**: Emails are labeled rather than moved, preserving your organization
- **Detailed Logging**: All actions are logged for review
- **Error Handling**: Graceful error recovery and disconnection
- **Batch Processing**: Prevents server overload

## How It Works

1. **First Pass: Classification**
   - Fetches unprocessed emails from INBOX
   - Uses AI to classify each email
   - Adds "Advertising" label to identified ads
   - Marks all processed emails with "Processed" label

2. **Second Pass: Cleanup**
   - Identifies old advertising emails
   - Deletes based on configurable threshold
   - Respects dry run mode settings
   - Provides detailed action logging

## Development

### Project Structure

```
email-deletifier/
├── src/
│   ├── main.ts           # Main application entry
│   ├── gmail.ts          # Gmail API integration
│   ├── classifier.ts     # AI classification logic
│   └── tests/            # Test files
├── .env                  # Configuration
├── .env.example         # Example configuration
├── start.sh             # Startup script
└── package.json         # Dependencies
```

### Running Tests

```bash
npx ts-node src/tests/test-classifier.ts
npx ts-node src/tests/test-gmail.ts
npx ts-node src/tests/test-folder.ts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the GPT API
- Gmail API for email management capabilities
- Node.js community for excellent tooling 