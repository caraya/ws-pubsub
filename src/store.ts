import { promises as fs } from 'fs';
import path from 'path';

/**
 * A single stored message.
 */
export interface StoredMessage {
  topic: string;
  payload: any;
  timestamp: number;
}

/**
 * Simple JSON-file message store.
 */
export class FileMessageStore {
  private filePath: string;
  private cache: StoredMessage[] = [];

  /**
   * @param filename JSON file under which messages are persisted
   */
  constructor(filename: string = 'messages.json') {
    this.filePath = path.resolve(process.cwd(), filename);
  }

  /** Load existing messages from disk (if any). */
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(data) as StoredMessage[];
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        this.cache = [];
      } else {
        throw e;
      }
    }
  }

  /**
   * Persist a new message.
   * @param msg the message to store
   */
  async save(msg: StoredMessage): Promise<void> {
    this.cache.push(msg);
    await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
  }

  /** Return all stored messages (optionally filtered by topic). */
  getAll(topic?: string): StoredMessage[] {
    return topic
      ? this.cache.filter(m => m.topic === topic)
      : [...this.cache];
  }
}
