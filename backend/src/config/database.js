import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const databaseDirectory = join(currentDirectory, "../../data");
const databasePath = join(databaseDirectory, "proofprint.sqlite");

mkdirSync(databaseDirectory, { recursive: true });

const database = new Database(databasePath);
database.pragma("foreign_keys = ON");
database.pragma("journal_mode = WAL");

database.exec(`
  CREATE TABLE IF NOT EXISTS content_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_hash TEXT UNIQUE NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image')),
    ai_generated_probability REAL,
    human_written_probability REAL,
    classification TEXT,
    confidence_score REAL,
    blockchain_transaction_hash TEXT,
    blockchain_timestamp TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export default database;
