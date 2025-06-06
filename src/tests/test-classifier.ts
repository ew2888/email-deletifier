import { OpenAIClassifier } from '../services/classifier/OpenAIClassifier';
import { Email } from '../services/email/ImapService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

async function testClassifier() {
  const classifier = new OpenAIClassifier(OPENAI_API_KEY as string);

  // Sample emails for testing
  const sampleEmails: Email[] = [
    {
      id: '1',
      subject: '50% OFF - Limited Time Offer!',
      sender: 'marketing@store.com',
      date: new Date(),
      ageInDays: 1,
      body: 'Dear Customer, We are excited to offer you 50% off all items in our store! This offer is only valid for the next 24 hours. Click here to shop now!',
      html: '',
      text: '',
      labels: []
    },
    {
      id: '2',
      subject: 'Meeting Tomorrow at 2 PM',
      sender: 'colleague@company.com',
      date: new Date(),
      ageInDays: 1,
      body: 'Hi, Just a reminder about our team meeting tomorrow at 2 PM. Please bring your project updates. Best regards, John',
      html: '',
      text: '',
      labels: []
    },
    {
      id: '3',
      subject: 'Your Order #12345 has shipped',
      sender: 'orders@amazon.com',
      date: new Date(),
      ageInDays: 1,
      body: 'Your order has been shipped and is on its way. Track your package here: [link]',
      html: '',
      text: '',
      labels: []
    }
  ];

  console.log('Testing email classification...\n');

  for (const email of sampleEmails) {
    console.log(`\nAnalyzing email: ${email.subject}`);
    console.log(`From: ${email.sender}`);
    console.log(`Content: ${email.body}\n`);

    const result = await classifier.classifyEmail(email);
    
    console.log('Classification Result:');
    console.log(`Is Advertising: ${result.isAdvertising}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Reason: ${result.reason}`);
    console.log('---');
  }
}

// Run the test
console.log('Starting classifier test...\n');
console.log(`Using OpenAI model: ${process.env.OPENAI_MODEL || 'gpt-4.1-nano'}\n`);
testClassifier().catch(error => {
  console.error('Error during test:', error);
  process.exit(1);
}); 