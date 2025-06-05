import { ImapService } from './services/email/ImapService';
import { OpenAIClassifier } from './services/classifier/OpenAIClassifier';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const ADVERTISING_LABEL = 'Advertising';
const PROCESSED_LABEL = 'Processed';
const BATCH_SIZE = 50;
const MAX_EMAIL_AGE_DAYS = 365;  // Look back up to a year
const DELETE_FROM_ADVERTISING_DAYS = parseInt(process.env.DELETE_FROM_ADVERTISING_DAYS || '60', 10);  // Delete advertising emails older than this
const DRY_RUN = process.env.DRY_RUN === 'true';  // If true, don't actually delete emails
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

async function main() {
  const imapService = new ImapService();
  const classifier = new OpenAIClassifier(OPENAI_API_KEY);

  try {
    console.log('Starting Email Deletifier main process...\n');
    console.log('Configuration:');
    console.log(`- Batch size: ${BATCH_SIZE} emails`);
    console.log(`- Max email age: ${MAX_EMAIL_AGE_DAYS} days`);
    console.log(`- Delete advertising emails older than: ${DELETE_FROM_ADVERTISING_DAYS} days`);
    console.log(`- Dry run mode: ${DRY_RUN ? 'ON (no emails will be deleted)' : 'OFF (emails will be deleted)'}\n`);

    // Connect to Gmail
    console.log('Connecting to Gmail...');
    await imapService.connect();
    console.log('Successfully connected to Gmail!');

    // Ensure labels exist
    console.log(`\nEnsuring labels exist...`);
    await imapService.ensureFolderExists(ADVERTISING_LABEL);
    await imapService.ensureFolderExists(PROCESSED_LABEL);

    // FIRST PASS: Process INBOX emails
    console.log('\n=== FIRST PASS: Processing INBOX emails ===');
    const inboxEmails = await imapService.fetchEmails({
      maxAgeDays: MAX_EMAIL_AGE_DAYS,
      batchSize: BATCH_SIZE,
      includeRead: true,
      includeUnread: true
    });

    let processedCount = 0;
    let skippedCount = 0;
    let advertisingCount = 0;
    let notAdvertisingCount = 0;

    for (const email of inboxEmails) {
      console.log(`\nChecking email: ${email.subject}`);
      
      const result = await classifier.classifyEmail(email);
      console.log(`Classification result: ${result.isAdvertising ? 'Advertising' : 'Not advertising'} (${result.confidence * 100}% confidence)`);
      
      if (result.isAdvertising) {
        console.log(`Adding Advertising label: ${email.subject}`);
        try {
          await imapService.addLabel(email.id, ADVERTISING_LABEL);
          console.log('Advertising label added successfully');
          advertisingCount++;
        } catch (err) {
          console.error(`Failed to add Advertising label: ${email.subject}`, err);
        }
      }
      
      // Always add Processed label to mark this email as handled
      try {
        await imapService.addLabel(email.id, PROCESSED_LABEL);
        console.log('Processed label added successfully');
        notAdvertisingCount++;
      } catch (err) {
        console.error(`Failed to add Processed label: ${email.subject}`, err);
      }
      
      processedCount++;
    }

    console.log('\nFirst Pass Summary:');
    console.log(`- Processed: ${processedCount} emails`);
    console.log(`- Skipped: ${skippedCount} already processed emails`);
    console.log(`- Marked as Advertising: ${advertisingCount} emails`);
    console.log(`- Marked as Processed: ${notAdvertisingCount} emails`);

    // SECOND PASS: Check Advertising folder for old emails
    console.log('\n=== SECOND PASS: Checking Advertising folder ===');
    console.log(`Looking for advertising emails older than ${DELETE_FROM_ADVERTISING_DAYS} days...`);
    if (DRY_RUN) {
      console.log('DRY RUN MODE: No emails will be deleted');
    }
    
    const advEmails = await imapService.fetchEmails({
      maxAgeDays: MAX_EMAIL_AGE_DAYS,
      batchSize: BATCH_SIZE,
      includeRead: true,
      includeUnread: true
    }, ADVERTISING_LABEL);

    console.log(`Found ${advEmails.length} emails in ${ADVERTISING_LABEL}`);
    
    let deletedCount = 0;
    let skippedDeletionCount = 0;
    
    for (const email of advEmails) {
      if (email.ageInDays >= DELETE_FROM_ADVERTISING_DAYS) {
        console.log(`\n${DRY_RUN ? 'Would delete' : 'Deleting'} old advertising email: ${email.subject}`);
        console.log(`- Age: ${email.ageInDays} days (threshold: ${DELETE_FROM_ADVERTISING_DAYS} days)`);
        try {
          if (!DRY_RUN) {
            await imapService.deleteEmail(email.id, ADVERTISING_LABEL);
            console.log('Delete successful');
          } else {
            console.log('(Dry run - no deletion performed)');
          }
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete email: ${email.subject}`, err);
        }
      } else {
        console.log(`\nSkipping deletion of advertising email: ${email.subject}`);
        console.log(`- Age: ${email.ageInDays} days (threshold: ${DELETE_FROM_ADVERTISING_DAYS} days)`);
        skippedDeletionCount++;
      }
    }

    console.log('\nSecond Pass Summary:');
    console.log(`- Total advertising emails found: ${advEmails.length}`);
    console.log(`- ${DRY_RUN ? 'Would delete' : 'Deleted'}: ${deletedCount} old advertising emails`);
    console.log(`- Skipped deletion: ${skippedDeletionCount} emails (too new)`);
    if (DRY_RUN) {
      console.log('\nDRY RUN MODE: No emails were actually deleted');
    }

  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    try {
      await imapService.disconnect();
      console.log('Disconnected from Gmail');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}

main().catch(console.error); 