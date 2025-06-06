import { ImapService } from '../services/email/ImapService';

async function testGmailConnection() {
  const imapService = new ImapService();
  
  try {
    console.log('Connecting to Gmail...');
    await imapService.connect();
    console.log('Successfully connected to Gmail!');

    // List all available folders/labels
    console.log('\nFetching available folders/labels:');
    const folders = await imapService.listFolders();
    if (folders.length === 0) {
      console.log('No folders found!');
    } else {
      folders.forEach(folder => console.log(`- ${folder}`));
    }

    // Fetch the 5 most recent emails
    console.log('\nFetching 5 most recent emails:');
    const emails = await imapService.fetchEmails({
      maxAgeDays: 30,
      batchSize: 5,
      includeRead: true,
      includeUnread: true
    });

    if (emails.length === 0) {
      console.log('No emails found in the last 30 days.');
    } else {
      console.log(`\nFound ${emails.length} emails:`);
      emails.forEach((email, index) => {
        console.log(`\n--- Email ${index + 1} ---`);
        console.log(`Subject: ${email.subject || '(No subject)'}`);
        console.log(`From: ${email.sender || '(No sender)'}`);
        console.log(`Date: ${email.date.toLocaleString()}`);
        console.log(`Age: ${email.ageInDays} days`);
        if (email.labels && email.labels.length > 0) {
          console.log(`Labels: ${email.labels.join(', ')}`);
        }
        console.log('---');
      });
    }

  } catch (error) {
    console.error('\nError occurred:');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error(error);
    }
  } finally {
    try {
      await imapService.disconnect();
      console.log('\nDisconnected from Gmail');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}

// Run the test
console.log('Starting Gmail connection test...\n');
testGmailConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 