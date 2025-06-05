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
          reject(new Error(`Failed to list folders: ${err.message}`));
          return;
        }

        const folders: string[] = [];

        // Helper function to process a box and its children
        const processBox = (box: any, prefix: string = '') => {
          if (box.name) {
            // For Gmail, we want to include categories and user-created labels
            if (this.isGmail) {
              // Remove [Gmail]/ prefix and add to list if not already present
              const folderName = box.name.replace('[Gmail]/', '');
              if (folderName && !folders.includes(folderName)) {
                folders.push(folderName);
              }
            } else {
              // For non-Gmail, include all folders
              const folderName = prefix + box.name;
              if (folderName && !folders.includes(folderName)) {
                folders.push(folderName);
              }
            }
          }

          // Process child folders
          if (box.children && Array.isArray(box.children)) {
            box.children.forEach((child: any) => {
              processBox(child, prefix + box.name + '/');
            });
          }
        };

        // Process all boxes
        Object.values(boxes).forEach(box => processBox(box));

        // Filter out any undefined or empty folder names
        const validFolders = folders.filter(folder => folder && folder.trim() !== '');
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
    return new Promise((resolve, reject) => {
      const handleDuplicate = (errMsg: string) => {
        // Accept any duplicate error for both [Gmail]/ and plain names
        if (errMsg.includes('already exists') || errMsg.includes('Duplicate folder name')) {
          console.log(`Label/folder "${folderName}" already exists`);
          resolve();
        } else {
          reject(new Error(`Failed to create label/folder "${folderName}": ${errMsg}`));
        }
      };
      if (this.isGmail) {
        this.imap.addBox(`[Gmail]/${folderName}`, (err) => {
          if (err) {
            handleDuplicate(err.message);
            return;
          }
          console.log(`Successfully created label "${folderName}"`);
          resolve();
        });
      } else {
        this.imap.addBox(folderName, (err) => {
          if (err) {
            handleDuplicate(err.message);
            return;
          }
          console.log(`Successfully created folder "${folderName}"`);
          resolve();
        });
      }
    });
  }

  async ensureFolderExists(folderName: string): Promise<void> {
    try {
      const folders = await this.listFolders();
      // Accept both [Gmail]/ and plain names for Gmail
      const exists = folders.some(f => f === folderName || f === `[Gmail]/${folderName}`);
      if (!exists) {
        await this.createFolder(folderName);
      }
    } catch (error) {
      throw new Error(`Failed to ensure folder "${folderName}" exists: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * Add a Gmail label to an email
   * @param emailId The ID of the email to label
   * @param label The label to add
   */
  public async addLabel(emailId: string, label: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err) => {
        if (err) {
          reject(new Error(`Failed to open INBOX: ${err.message}`));
          return;
        }

        if (this.isGmail && typeof (this.imap as any).addLabels === 'function') {
          (this.imap as any).addLabels(emailId, label, (err: any) => {
            if (err) {
              reject(new Error(`Failed to add label "${label}": ${err.message}`));
              return;
            }
            resolve();
          });
        } else {
          // For non-Gmail, use regular flags (not recommended for custom labels)
          this.imap.addFlags(emailId, label, (err) => {
            if (err) {
              reject(new Error(`Failed to add flag "${label}": ${err.message}`));
              return;
            }
            resolve();
          });
        }
      });
    });
  }

  /**
   * Move an email to a different folder or add a label
   * @param emailId The ID of the email to move/label
   * @param targetFolder The destination folder or label
   */
  public async moveEmail(emailId: string, targetFolder: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    // For Gmail, we'll use labels instead of moving
    if (this.isGmail) {
      return this.addLabel(emailId, targetFolder);
    }

    // For non-Gmail, use the original move logic
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

  async fetchEmails(options: FetchOptions, folderName: string = 'INBOX'): Promise<Email[]> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox(folderName, false, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open folder "${folderName}": ${err.message}`));
          return;
        }

        console.log(`Fetching emails from folder: ${folderName}`);

        // Build search criteria
        const searchCriteria: any[] = [];
        
        if (this.isGmail) {
          // Use Gmail's X-GM-RAW to exclude Processed label
          let rawQuery = '-label:Processed';
          if (options.maxAgeDays) {
            const date = new Date();
            date.setDate(date.getDate() - options.maxAgeDays);
            // Gmail's search uses yyyy/mm/dd
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            rawQuery += ` after:${y}/${m}/${d}`;
          }
          searchCriteria.push(['X-GM-RAW', rawQuery]);
        } else {
          // For non-Gmail, use standard IMAP search
          searchCriteria.push('ALL');
          
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
        }

        // Fetch emails
        const fetchOptions = {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true,
          envelope: true,
          flags: true,
          labels: true  // Request Gmail labels
        };

        this.imap.search(searchCriteria, (err, results) => {
          if (err) {
            reject(new Error(`Search failed: ${err.message}`));
            return;
          }

          if (!results || results.length === 0) {
            console.log(`No emails found in ${folderName}`);
            resolve([]);
            return;
          }

          console.log(`Found ${results.length} emails in ${folderName}`);

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
              
              // Get Gmail labels from X-GM-LABELS attribute
              if (this.isGmail && attrs['x-gm-labels']) {
                email.labels = attrs['x-gm-labels'];
              } else if (attrs.flags) {
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

  async deleteEmail(emailId: string, folderName: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to IMAP server');
    }
    return new Promise((resolve, reject) => {
      this.imap.openBox(folderName, false, (err) => {
        if (err) {
          reject(new Error(`Failed to open folder "${folderName}": ${err.message}`));
          return;
        }
        this.imap.addFlags(emailId, '\\Deleted', (err2) => {
          if (err2) {
            reject(new Error(`Failed to mark email as deleted: ${err2.message}`));
            return;
          }
          this.imap.expunge(emailId, (err3) => {
            if (err3) {
              reject(new Error(`Failed to expunge email: ${err3.message}`));
              return;
            }
            resolve();
          });
        });
      });
    });
  }
} 