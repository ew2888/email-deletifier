import { ImapService } from './services/email/ImapService';

async function main() {
  const imapService = new ImapService();

  try {
    // Connect to the IMAP server
    await imapService.connect();
    console.log('Connected to IMAP server');

    // List existing folders
    console.log('\nListing existing folders:');
    const folders = await imapService.listFolders();
    folders.forEach(folder => console.log(`- ${folder}`));

    // Create a new folder for advertising emails
    const adFolder = 'Advertising';
    console.log(`\nCreating folder: ${adFolder}`);
    await imapService.createFolder(adFolder);
    console.log('Folder created successfully');

    // Fetch emails from the last 30 days
    const emails = await imapService.fetchEmails({
      maxAgeDays: 30,
      batchSize: 10,
      includeRead: true,
      includeUnread: true
    });

    // Print the fetched emails
    console.log(`\nFetched ${emails.length} emails:`);
    emails.forEach(email => {
      console.log('\n---');
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.sender}`);
      console.log(`Date: ${email.date}`);
      console.log(`Age: ${email.ageInDays} days`);
      console.log('---');

      // Example: Move the first email to the Advertising folder
      if (email === emails[0]) {
        console.log(`\nMoving first email to ${adFolder} folder...`);
        imapService.moveEmail(email.id, adFolder)
          .then(() => console.log('Email moved successfully'))
          .catch(err => console.error('Error moving email:', err));
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always disconnect
    await imapService.disconnect();
    console.log('\nDisconnected from IMAP server');
  }
}

main().catch(console.error); 