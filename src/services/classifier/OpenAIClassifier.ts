import OpenAI from 'openai';
import { Email } from '../email/ImapService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface ClassificationResult {
  isAdvertising: boolean;
  confidence: number;
  reason: string;
}

export class OpenAIClassifier {
  private openai: OpenAI;
  private readonly model: string;
  private readonly CLASSIFICATION_PROMPT = `You are an email classification system. Your task is to determine if an email is advertising/promotional in nature.

Consider these factors:
1. Is the primary purpose to sell or promote something?
2. Does it contain marketing language, special offers, or calls to action?
3. Is it from a business trying to get you to buy or sign up?
4. Does it contain unsubscribe links or marketing disclaimers?

Respond with a JSON object in this format:
{
  "isAdvertising": boolean,
  "confidence": number (0-1),
  "reason": "brief explanation"
}

Only respond with the JSON object, no other text.`;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    // Use configured model or fallback to gpt-4.1-nano
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1-nano';
    console.log(`Using OpenAI model: ${this.model}`);
  }

  async classifyEmail(email: Email): Promise<ClassificationResult> {
    try {
      const emailContent = `
Subject: ${email.subject}
From: ${email.sender}
Date: ${email.date.toISOString()}
Body: ${email.body}
`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.CLASSIFICATION_PROMPT },
          { role: "user", content: emailContent }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 // Low temperature for more consistent results
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(response) as ClassificationResult;
      
      // Validate the response format
      if (typeof result.isAdvertising !== 'boolean' ||
          typeof result.confidence !== 'number' ||
          typeof result.reason !== 'string') {
        throw new Error('Invalid response format from OpenAI');
      }

      return result;
    } catch (error) {
      console.error('Error classifying email:', error);
      // Return a safe default in case of errors
      return {
        isAdvertising: false,
        confidence: 0,
        reason: 'Error during classification'
      };
    }
  }

  async classifyBatch(emails: Email[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();
    
    // Process emails in parallel with a concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < emails.length; i += concurrencyLimit) {
      const batch = emails.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(email => 
        this.classifyEmail(email).then(result => {
          results.set(email.id, result);
        })
      );
      
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to respect rate limits
      if (i + concurrencyLimit < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
} 