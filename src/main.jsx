import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, Clock3, MessageSquarePlus, Moon, Plus, Search, Sun, Ticket, UserRound } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "";
const statuses = ["Open", "In Progress", "Closed"];

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(`${value}Z`));
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("support-crm-theme") || "light");
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    subject: "",
    description: ""
  });
  const [update, setUpdate] = useState({ status: "Open", notes: "" });

  const ticketCounts = useMemo(() => {
    return tickets.reduce(
      (counts, ticket) => ({ ...counts, [ticket.status]: (counts[ticket.status] || 0) + 1 }),
      { Open: 0, "In Progress": 0, Closed: 0 }
    );
  }, [tickets]);

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status !== "All") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const data = await api(`/api/tickets?${params.toString()}`);
      setTickets(data);
      if (!selectedId && data[0]) setSelectedId(data[0].ticket_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(ticketId) {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    setDetailLoading(true);
    setError("");
    try {
      const data = await api(`/api/tickets/${ticketId}`);
      setSelectedTicket(data);
      setUpdate({ status: data.status, notes: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadTickets, 220);
    return () => clearTimeout(timeout);
  }, [search, status]);

  useEffect(() => {
    loadTicket(selectedId);
  }, [selectedId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("support-crm-theme", theme);
  }, [theme]);

  async function createTicket(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const created = await api("/api/tickets", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({ customer_name: "", customer_email: "", subject: "", description: "" });
      setSelectedId(created.ticket_id);
      setMessage(`Created ${created.ticket_id}`);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateTicket(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api(`/api/tickets/${selectedTicket.ticket_id}`, {
        method: "PUT",
        body: JSON.stringify(update)
      });
      setMessage(`Updated ${selectedTicket.ticket_id}`);
      await loadTickets();
      await loadTicket(selectedTicket.ticket_id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Customer Support</p>
          <h1>Support CRM</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <div className="summary">
            {statuses.map((item) => (
              <div className="summary-item" key={item}>
                <span>{item}</span>
                <strong>{ticketCounts[item] || 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className={error ? "notice error" : "notice"}>
          {error || message}
        </div>
      )}

      <section className="workspace">
        <aside className="panel create-panel">
          <div className="panel-heading">
            <Plus size={18} />
            <h2>Create Ticket</h2>
          </div>
          <form onSubmit={createTicket} className="stack">
            <label>
              Customer name
              <input
                value={form.customer_name}
                onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                required
              />
            </label>
            <label>
              Customer email
              <input
                type="email"
                value={form.customer_email}
                onChange={(event) => setForm({ ...form, customer_email: event.target.value })}
                required
              />
            </label>
            <label>
              Issue title
              <input
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows="5"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
              />
            </label>
            <button type="submit" className="primary-button">
              <Ticket size={18} />
              Create
            </button>
          </form>
        </aside>

        <section className="panel ticket-list-panel">
          <div className="tools">
            <label className="search-box">
              <Search size={18} />
              <input
                placeholder="Search tickets, names, emails..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All</option>
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="ticket-list">
            {loading && <p className="empty">Loading tickets...</p>}
            {!loading && tickets.length === 0 && <p className="empty">No tickets match this view.</p>}
            {!loading &&
              tickets.map((ticket) => (
                <button
                  className={`ticket-row ${selectedId === ticket.ticket_id ? "active" : ""}`}
                  key={ticket.ticket_id}
                  onClick={() => setSelectedId(ticket.ticket_id)}
                >
                  <div>
                    <strong>{ticket.ticket_id}</strong>
                    <span>{ticket.subject}</span>
                  </div>
                  <div>
                    <span className={`status-pill ${statusClass(ticket.status)}`}>{ticket.status}</span>
                    <small>{formatDate(ticket.created_at)}</small>
                  </div>
                  <div className="customer-line">
                    <UserRound size={15} />
                    {ticket.customer_name}
                  </div>
                </button>
              ))}
          </div>
        </section>

        <section className="panel detail-panel">
          {detailLoading && <p className="empty">Loading details...</p>}
          {!detailLoading && !selectedTicket && <p className="empty">Select a ticket to view details.</p>}
          {!detailLoading && selectedTicket && (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">{selectedTicket.ticket_id}</p>
                  <h2>{selectedTicket.subject}</h2>
                </div>
                <span className={`status-pill ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Name</span>
                  <strong>{selectedTicket.customer_name}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{selectedTicket.customer_email}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{formatDate(selectedTicket.created_at)}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{formatDate(selectedTicket.updated_at)}</strong>
                </div>
              </div>

              <article className="description">{selectedTicket.description}</article>

              <form className="update-box" onSubmit={updateTicket}>
                <label>
                  Status
                  <select value={update.status} onChange={(event) => setUpdate({ ...update, status: event.target.value })}>
                    {statuses.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Add note
                  <textarea
                    rows="4"
                    value={update.notes}
                    onChange={(event) => setUpdate({ ...update, notes: event.target.value })}
                    placeholder="Add a customer update, internal note, or resolution..."
                  />
                </label>
                <button type="submit" className="primary-button">
                  <CheckCircle2 size={18} />
                  Save
                </button>
              </form>

              <div className="notes">
                <div className="panel-heading compact">
                  <MessageSquarePlus size={18} />
                  <h3>Notes</h3>
                </div>
                {selectedTicket.notes.length === 0 && <p className="empty">No notes yet.</p>}
                {selectedTicket.notes.map((note) => (
                  <div className="note" key={note.id}>
                    <p>{note.note_text}</p>
                    <small>
                      <Clock3 size={14} />
                      {formatDate(note.created_at)}
                    </small>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
