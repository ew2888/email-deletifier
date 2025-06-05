import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { config } from '../../config/env';
import { Readable } from 'stream';

export interface Email {
  id: string;
  subject: string;
  sender: string;
  date: Date;
  ageInDays: number;
  body: string;
  html: string;
  text: string;
  labels?: string[];  // Gmail labels
}

export interface FetchOptions {
  maxAgeDays: number;
  batchSize: number;
  includeRead: boolean;
  includeUnread: boolean;
  labels?: string[];  // Gmail labels to search in
}

export class ImapService {
  private imap: Imap;
  private connected: boolean = false;
  private isGmail: boolean;

  constructor() {
    this.isGmail = config.imapHost.toLowerCase().includes('gmail');
    
    this.imap = new Imap({
      user: config.emailUser,
      password: config.emailPassword,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      // Gmail-specific settings
      ...(this.isGmail && {
        authTimeout: 30000,  // 30 seconds
        keepalive: true,     // Keep connection alive
        tlsOptions: { rejectUnauthorized: false }  // Required for some Gmail connections
      })
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.imap.on('ready', () => {
      this.connected = true;
      console.log('IMAP connection ready');
    });

    this.imap.on('error', (err: Error) => {
      console.error('IMAP error:', err);
      this.connected = false;
    });

    this.imap.on('end', () => {
      console.log('IMAP connection ended');
      this.connected = false;
    });
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.connected = true;
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.connected) return;

    return new Promise((resolve) => {
      this.imap.end();
      this.imap.once('end', () => {
        this.connected = false;
        resolve();
      });
    });
  }

  /**
   * List all folders/labels in the mailbox
   */
  public async listFolders(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }

        const folderNames: string[] = [];
        
        // Helper function to process a single box
        const processBox = (box: any, prefix: string = '') => {
          if (!box || typeof box !== 'object' || !box.name) {
            return;
          }

          const name = prefix + box.name;
          
          // Skip Gmail system folders if needed
          if (!this.isGmail || !['[Gmail]'].includes(name)) {
            folderNames.push(name);
          }
          
          // Handle children if they exist and are in the correct format
          if (box.children && Array.isArray(box.children)) {
            box.children.forEach((child: any) => {
              if (child && typeof child === 'object') {
                processBox(child, name + '/');
              }
            });
          }
        };

        // Process each top-level box
        Object.values(boxes).forEach(box => {
          if (box && typeof box === 'object') {
            processBox(box);
          }
        });

        // For Gmail, ensure we have the basic folders
        if (this.isGmail) {
          const requiredFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
          requiredFolders.forEach(folder => {
            if (!folderNames.includes(folder)) {
              folderNames.push(folder);
            }
          });
        }

        // Filter out any undefined or empty folder names
        const validFolders = folderNames.filter(name => name && name.trim() !== '');
        resolve(validFolders);
      });
    });
  }

  /**
   * Create a new folder/label in the mailbox
   * @param folderName The name of the folder/label to create
   */
  public async createFolder(folderName: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    // For Gmail, we need to handle labels differently
    if (this.isGmail) {
      console.log('Note: Gmail uses labels instead of folders. Creating a new label.');
    }

    return new Promise((resolve, reject) => {
      this.imap.addBox(folderName, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Delete a folder from the mailbox
   * @param folderName The name of the folder to delete
   */
  public async deleteFolder(folderName: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.delBox(folderName, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Move an email to a different folder
   * @param emailId The ID of the email to move
   * @param targetFolder The destination folder
   */
  public async moveEmail(emailId: string, targetFolder: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap.move([emailId], targetFolder, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  public async fetchEmails(options: FetchOptions): Promise<Email[]> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open inbox: ${err.message}`));
          return;
        }

        // Build search criteria
        const searchCriteria: any[] = ['ALL'];
        
        // Add date criteria if specified
        if (options.maxAgeDays) {
          const date = new Date();
          date.setDate(date.getDate() - options.maxAgeDays);
          searchCriteria.push(['SINCE', date]);
        }

        // Add read/unread criteria
        if (!options.includeRead && !options.includeUnread) {
          searchCriteria.push('UNSEEN');
        } else if (options.includeRead && !options.includeUnread) {
          searchCriteria.push('SEEN');
        } else if (!options.includeRead && options.includeUnread) {
          searchCriteria.push('UNSEEN');
        }

        // Fetch emails
        const fetchOptions = {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true
        };

        this.imap.search(searchCriteria, (err, results) => {
          if (err) {
            reject(new Error(`Search failed: ${err.message}`));
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          // Limit results to batch size
          const limitedResults = results.slice(0, options.batchSize || 100);

          const emails: Email[] = [];
          let processedCount = 0;

          const fetch = this.imap.fetch(limitedResults, fetchOptions);

          fetch.on('message', (msg) => {
            const email: Email = {
              id: '',
              subject: '',
              sender: '',
              date: new Date(),
              ageInDays: 0,
              labels: [],
              body: '',
              html: '',
              text: ''
            };

            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                if (info.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE)') {
                  const header = Imap.parseHeader(buffer);
                  email.subject = header.subject?.[0] || '';
                  email.sender = header.from?.[0] || '';
                  if (header.date?.[0]) {
                    email.date = new Date(header.date[0]);
                    email.ageInDays = Math.floor((Date.now() - email.date.getTime()) / (1000 * 60 * 60 * 24));
                  }
                }
              });
            });

            msg.once('attributes', (attrs) => {
              email.id = attrs.uid.toString();
              if (attrs.flags) {
                email.labels = attrs.flags.map((flag: string) => flag.toString());
              }
            });

            msg.once('end', () => {
              emails.push(email);
              processedCount++;
              if (processedCount === limitedResults.length) {
                resolve(emails);
              }
            });
          });

          fetch.once('error', (err) => {
            reject(new Error(`Fetch error: ${err.message}`));
          });

          fetch.once('end', () => {
            if (processedCount === 0) {
              resolve([]);
            }
          });
        });
      });
    });
  }
} 