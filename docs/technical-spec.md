# Email Deletifier - Technical Specification

## 1. Technology Stack

### Core Technologies
- **Runtime:** Node.js (v18+)
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Database:** SQLite (for local storage of settings and audit logs)
- **Storage:** Local filesystem for logs and temporary data

### Key Dependencies
- `imap` - For IMAP email connection
- `nodemailer` - For email handling
- `@google-cloud/local-auth` - For Gmail API authentication
- `openai` - For GPT-based classification
- `winston` - For logging
- `node-cron` - For scheduling
- `dotenv` - For environment configuration
- `electron-store` - For secure local configuration storage

## 2. System Architecture

### Directory Structure
```
src/
├── config/           # Configuration files
├── services/         # Core services
│   ├── email/       # Email fetching and processing
│   ├── classifier/  # AI classification
│   └── action/      # Email action handling
├── models/          # Data models
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

### Core Services

#### 1. Email Service
```typescript
interface EmailService {
  connect(): Promise<void>;
  fetchEmails(options: FetchOptions): Promise<Email[]>;
  markForDeletion(emailId: string): Promise<void>;
  deleteEmail(emailId: string): Promise<void>;
  whitelistSender(email: string): Promise<void>;
}

interface FetchOptions {
  maxAgeDays: number;  // Only process emails newer than this
  batchSize: number;
  includeRead: boolean;
  includeUnread: boolean;
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  date: Date;
  ageInDays: number;
  // ... other email properties
}
```

#### 2. Classifier Service
```typescript
interface ClassifierService {
  classifyEmail(email: Email): Promise<ClassificationResult>;
  train(feedback: ClassificationFeedback): Promise<void>;
}

interface ClassificationResult {
  isAdvertising: boolean;
  confidence: number;
  reason: string;
}
```

#### 3. Action Service
```typescript
interface ActionService {
  processEmail(email: Email, classification: ClassificationResult): Promise<void>;
  handleWhitelistedSenders(): Promise<void>;
  generateAuditLog(): Promise<AuditLog>;
}
```

## 3. Implementation Details

### Local Machine Considerations

1. **Resource Usage:**
   - Memory-efficient processing (batch size limits)
   - CPU usage optimization for background operation
   - Disk space management for logs and temporary files
   - Automatic cleanup of old logs and temporary data

2. **System Integration:**
   - System startup integration (systemd service or launch agent)
   - Background process management
   - System notifications for important events
   - Power management awareness (pause during sleep)

3. **Local Storage:**
   - Encrypted local configuration
   - Rotating log files with size limits
   - Temporary file cleanup
   - Backup of important settings

### Email Connection
- Support for both IMAP and Gmail API
- OAuth2 authentication for Gmail
- Connection pooling for multiple accounts
- Automatic reconnection handling

### Email Processing
1. **Fetching:**
   - Batch processing of emails
   - Rate limiting to prevent provider restrictions
   - Error handling and retry logic
   - Age-based filtering
   - Date-based query optimization

2. **Preprocessing:**
   - HTML to text conversion
   - Header extraction
   - Attachment handling
   - Sender domain analysis
   - Email age calculation and validation

### AI Classification
1. **Model Options:**
   - GPT-4 for high accuracy
   - Local BERT model for privacy
   - Hybrid approach with fallback

2. **Classification Features:**
   - Subject line analysis
   - Sender domain reputation
   - Content structure
   - Presence of marketing keywords
   - Tracking pixel detection

### Action Handling
1. **Two-Stage Deletion Strategy:**
   - Stage 1: Move to Advertising folder
     - Emails identified as advertising are moved to a dedicated "Advertising" folder
     - This happens immediately upon classification
     - Users can review and move emails back if needed
   
   - Stage 2: Delete from Advertising folder
     - Emails in the Advertising folder older than 60 days are automatically deleted
     - This provides a 30-day grace period for review
     - Deletion is permanent and cannot be undone

2. **Rolling Window Process:**
   - Every 24 hours, the system:
     1. Scans inbox for advertising emails
     2. Moves identified advertising emails to Advertising folder
     3. Deletes emails from Advertising folder that are >60 days old
   
   - Age-based actions:
     - 0-30 days: Email remains in inbox
     - 30-60 days: Email moves to Advertising folder
     - >60 days: Email is deleted from Advertising folder

3. **Folder Management:**
   - System automatically creates "Advertising" folder if it doesn't exist
   - Maintains folder structure across email providers
   - Handles folder creation/migration gracefully
   - Preserves folder hierarchy

4. **Audit System:**
   - Logs all folder movements
   - Tracks email ages
   - Records deletion actions
   - Maintains history of user overrides
   - Reports on folder statistics

## 4. Configuration

### Environment Variables
```env
# Local machine specific
DATA_DIR=/home/user/.email-deletifier
LOG_DIR=/home/user/.email-deletifier/logs
TEMP_DIR=/home/user/.email-deletifier/temp
MAX_LOG_SIZE_MB=100
MAX_TEMP_FILES_MB=50
BATCH_SIZE=50
CHECK_INTERVAL_MINUTES=15

# Email configuration
EMAIL_PROVIDER=gmail|imap
EMAIL_USER=user@example.com
EMAIL_PASSWORD=****
IMAP_HOST=imap.example.com
IMAP_PORT=993
GMAIL_CLIENT_ID=****
GMAIL_CLIENT_SECRET=****
OPENAI_API_KEY=****
OPENAI_MODEL=gpt-4.1-nano  # Options: gpt-4.1-nano, gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo
CLASSIFICATION_CONFIDENCE_THRESHOLD=0.85

# Folder and Age Management
ADVERTISING_FOLDER_NAME=Advertising
MOVE_TO_ADVERTISING_DAYS=30
DELETE_FROM_ADVERTISING_DAYS=60
CHECK_FREQUENCY_HOURS=24

# Processing Limits
MAX_EMAILS_PER_BATCH=100
MAX_PROCESSING_TIME_MINUTES=30
```

### User Settings
```typescript
interface UserSettings {
  // Local machine settings
  dataDirectory: string;
  logDirectory: string;
  tempDirectory: string;
  maxLogSize: number;
  maxTempFiles: number;
  batchSize: number;
  checkInterval: number;
  systemNotifications: boolean;
  
  // Email settings
  emailProvider: 'gmail' | 'imap';
  connectionDetails: ConnectionDetails;
  classificationThreshold: number;
  deletionDelay: number;
  whitelistedSenders: string[];
  auditLogging: boolean;
  maxEmailAgeDays: number;  // Maximum age of emails to process
  ageBasedDeletion: {
    enabled: boolean;
    maxAgeDays: number;
    action: 'mark' | 'delete' | 'move';
    moveToFolder?: string;
  };
}
```

## 5. Security Considerations

1. **Local Security:**
   - Encrypted local storage for credentials
   - File system permissions management
   - Secure handling of API keys
   - Local firewall considerations

2. **Data Handling:**
   - All processing done locally
   - Minimal data retention
   - Secure local storage
   - Regular cleanup of sensitive data

3. **Error Handling:**
   - Local error logging
   - System notification integration
   - Automatic recovery from common issues
   - Safe mode operation when errors occur

## 6. Performance Considerations

1. **Local Resource Management:**
   - Memory usage limits
   - CPU throttling during system load
   - Disk space monitoring
   - Network bandwidth consideration

2. **Optimization:**
   - Efficient local file operations
   - Smart batching based on system load
   - Caching of classification results
   - Rate limiting based on system resources

3. **Monitoring:**
   - Local performance metrics
   - Resource usage tracking
   - Error rate monitoring
   - System impact assessment

## 7. Development Workflow

1. **Local Setup:**
   ```bash
   # Clone and install
   git clone [repository]
   cd email-deletifier
   pnpm install
   
   # Build
   pnpm build
   
   # Development
   pnpm dev
   
   # Production
   pnpm start
   ```

2. **Local Testing:**
   - Unit tests with Jest
   - Integration tests with local email server
   - End-to-end testing with real email accounts
   - Performance testing on target machine

3. **Deployment:**
   - Local installation script
   - System service setup
   - Configuration wizard
   - Update mechanism

## 8. Future Enhancements

1. **Local Features:**
   - System tray integration
   - Desktop notifications
   - Local web interface for configuration
   - Offline mode support
   - Local backup/restore
   - Advanced age-based rules:
     - Different thresholds for different folders
     - Sender-specific age rules
     - Category-specific age rules
     - Graduated retention policies

2. **AI Improvements:**
   - Local model caching
   - Offline classification capability
   - Local training data storage
   - Privacy-focused improvements

3. **System Integration:**
   - Better power management
   - System resource optimization
   - Multiple profile support
   - Automated updates 