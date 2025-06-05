import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// Load environment variables
dotenv.config();

// Default paths for local storage
const homeDir = os.homedir();
const defaultDataDir = path.join(homeDir, '.email-deletifier');

export interface EnvConfig {
  // Email Configuration
  emailProvider: 'imap' | 'gmail';
  emailUser: string;
  emailPassword: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;

  // Processing Settings
  maxEmailAgeDays: number;
  batchSize: number;
  checkIntervalMinutes: number;
  classificationConfidenceThreshold: number;
  deletionDelayDays: number;

  // Local Storage
  dataDir: string;
  logDir: string;
  tempDir: string;
  maxLogSizeMb: number;
  maxTempFilesMb: number;
}

export const config: EnvConfig = {
  // Email Configuration
  emailProvider: (process.env.EMAIL_PROVIDER as 'imap' | 'gmail') || 'imap',
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  imapHost: process.env.IMAP_HOST || 'imap.gmail.com',
  imapPort: parseInt(process.env.IMAP_PORT || '993', 10),
  imapTls: process.env.IMAP_TLS === 'true',

  // Processing Settings
  maxEmailAgeDays: parseInt(process.env.MAX_EMAIL_AGE_DAYS || '30', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '50', 10),
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '15', 10),
  classificationConfidenceThreshold: parseFloat(process.env.CLASSIFICATION_CONFIDENCE_THRESHOLD || '0.85'),
  deletionDelayDays: parseInt(process.env.DELETION_DELAY_DAYS || '7', 10),

  // Local Storage
  dataDir: process.env.DATA_DIR || defaultDataDir,
  logDir: process.env.LOG_DIR || path.join(defaultDataDir, 'logs'),
  tempDir: process.env.TEMP_DIR || path.join(defaultDataDir, 'temp'),
  maxLogSizeMb: parseInt(process.env.MAX_LOG_SIZE_MB || '100', 10),
  maxTempFilesMb: parseInt(process.env.MAX_TEMP_FILES_MB || '50', 10),
}; 