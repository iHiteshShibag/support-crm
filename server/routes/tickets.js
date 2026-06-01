import { Router } from "express";
import { createTicketId, getDb } from "../db.js";

const router = Router();
const statuses = new Set(["Open", "In Progress", "Closed"]);

function requireText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function serializeTicket(row) {
  return {
    ticket_id: row.ticket_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    subject: row.subject,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

router.post("/", async (req, res, next) => {
  try {
    const { customer_name, customer_email, subject, description } = req.body;

    if (![customer_name, customer_email, subject, description].every(requireText)) {
      return res.status(400).json({ error: "Customer name, email, subject, and description are required." });
    }

    const db = await getDb();
    const ticketId = await createTicketId();
    await db.run(
      `INSERT INTO tickets (ticket_id, customer_name, customer_email, subject, description)
       VALUES (?, ?, ?, ?, ?)`,
      ticketId,
      customer_name.trim(),
      customer_email.trim().toLowerCase(),
      subject.trim(),
      description.trim()
    );
    const ticket = await db.get("SELECT ticket_id, created_at FROM tickets WHERE ticket_id = ?", ticketId);

    return res.status(201).json(ticket);
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const clauses = [];
    const values = [];

    if (status && status !== "All") {
      if (!statuses.has(status)) {
        return res.status(400).json({ error: "Status must be Open, In Progress, or Closed." });
      }
      clauses.push("status = ?");
      values.push(status);
    }

    if (requireText(search)) {
      const searchValue = `%${search.trim().toLowerCase()}%`;
      clauses.push(`(
        LOWER(ticket_id) LIKE ?
        OR LOWER(customer_name) LIKE ?
        OR LOWER(customer_email) LIKE ?
        OR LOWER(subject) LIKE ?
        OR LOWER(description) LIKE ?
      )`);
      values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const tickets = await (await getDb()).all(
      `SELECT ticket_id, customer_name, subject, status, created_at
       FROM tickets
       ${where}
       ORDER BY datetime(updated_at) DESC`,
      values
    );

    return res.json(tickets);
  } catch (error) {
    return next(error);
  }
});

router.get("/:ticketId", async (req, res, next) => {
  try {
    const db = await getDb();
    const ticket = await db.get("SELECT * FROM tickets WHERE ticket_id = ?", req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const notes = await db.all(
      "SELECT id, note_text, created_at FROM notes WHERE ticket_id = ? ORDER BY datetime(created_at) DESC",
      req.params.ticketId
    );

    return res.json({ ...serializeTicket(ticket), notes });
  } catch (error) {
    return next(error);
  }
});

router.put("/:ticketId", async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    if (status && !statuses.has(status)) {
      return res.status(400).json({ error: "Status must be Open, In Progress, or Closed." });
    }

    const db = await getDb();
    const ticket = await db.get("SELECT ticket_id FROM tickets WHERE ticket_id = ?", req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (status) {
      await db.run(
        "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?",
        status,
        req.params.ticketId
      );
    }

    if (requireText(notes)) {
      await db.run("INSERT INTO notes (ticket_id, note_text) VALUES (?, ?)", req.params.ticketId, notes.trim());
      await db.run("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ?", req.params.ticketId);
    }

    const updated = await db.get("SELECT updated_at FROM tickets WHERE ticket_id = ?", req.params.ticketId);

    return res.json({ success: true, updated_at: updated.updated_at });
  } catch (error) {
    return next(error);
  }
});

export default router;
