import { ImapService } from '../services/email/ImapService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testFolderCreation() {
  const imapService = new ImapService();
  
  try {
    console.log('Connecting to Gmail...');
    await imapService.connect();
    console.log('Successfully connected to Gmail!');

    // List current folders
    console.log('\nCurrent folders:');
    const folders = await imapService.listFolders();
    folders.forEach(folder => console.log(`- ${folder}`));

    // Create Advertising folder
    const folderName = 'Advertising';
    console.log(`\nEnsuring "${folderName}" folder exists...`);
    await imapService.ensureFolderExists(folderName);

    // List folders again to confirm
    console.log('\nUpdated folder list:');
    const updatedFolders = await imapService.listFolders();
    updatedFolders.forEach(folder => console.log(`- ${folder}`));

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
console.log('Starting folder creation test...\n');
testFolderCreation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 