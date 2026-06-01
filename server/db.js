import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const databaseFile = process.env.DATABASE_FILE || "./data/support-crm.sqlite";

let db;
let wrappedDb;
let SQL;

function paramsFrom(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

async function saveDb() {
  await fs.writeFile(databaseFile, Buffer.from(db.export()));
}

function wrapDatabase(database) {
  return {
    exec(sql) {
      database.exec(sql);
      return saveDb();
    },
    async run(sql, ...args) {
      const statement = database.prepare(sql);
      try {
        statement.bind(paramsFrom(args));
        statement.step();
      } finally {
        statement.free();
      }
      await saveDb();
      return { changes: database.getRowsModified() };
    },
    async get(sql, ...args) {
      const statement = database.prepare(sql);
      try {
        statement.bind(paramsFrom(args));
        return statement.step() ? statement.getAsObject() : undefined;
      } finally {
        statement.free();
      }
    },
    async all(sql, ...args) {
      const rows = [];
      const statement = database.prepare(sql);
      try {
        statement.bind(paramsFrom(args));
        while (statement.step()) {
          rows.push(statement.getAsObject());
        }
      } finally {
        statement.free();
      }
      return rows;
    }
  };
}

export async function getDb() {
  if (wrappedDb) return wrappedDb;

  await fs.mkdir(path.dirname(databaseFile), { recursive: true });
  SQL = SQL || await initSqlJs();

  let existingDatabase;
  try {
    existingDatabase = await fs.readFile(databaseFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  db = new SQL.Database(existingDatabase);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
    );
  `);
  await saveDb();

  wrappedDb = wrapDatabase(db);
  return wrappedDb;
}

export async function createTicketId() {
  const database = await getDb();
  const row = await database.get("SELECT MAX(id) AS max_id FROM tickets");
  const nextId = Number(row?.max_id || 0) + 1;
  return `TKT-${String(nextId).padStart(3, "0")}`;
}
