# Support CRM

A full-stack customer support ticketing CRM built for the Datastraw AI + Tech Intern assessment. The app lets support teams create tickets, search and filter the queue, view customer details, update status, and add notes.

## Tech Stack

- Backend: Node.js, Express
- Database: SQLite
- Frontend: React, Vite, plain CSS
- Deployment target: Render for the full-stack app, or Vercel frontend + Render API

## Features

- Create tickets with customer name, email, title, and description
- Auto-generated ticket IDs such as `TKT-001`
- List all tickets with ID, customer, title, status, and creation date
- Search across ticket ID, customer name, email, subject, and description
- Filter by `Open`, `In Progress`, and `Closed`
- View ticket details, update status, and add timestamped notes
- Mobile responsive layout

## Project Structure

.
├── server/
│   ├── db.js
│   ├── index.js
│   └── routes/tickets.js
├── src/
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vite.config.js
├── .env.example
└── README.md


## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

3. Start the app in development:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to `http://localhost:5000`.

## Production Build

```bash
npm run build
npm start
```

The Express server serves the built React app from `dist/` and exposes the API under `/api`.

## API Endpoints

### Create Ticket

`POST /api/tickets`

```json
{
  "customer_name": "Aisha Rao",
  "customer_email": "aisha@example.com",
  "subject": "Order not delivered",
  "description": "Customer says the order has not arrived yet."
}
```

### List Tickets

`GET /api/tickets?status=Open&search=aisha`

### Get Ticket Details

`GET /api/tickets/TKT-001`

### Update Ticket

`PUT /api/tickets/TKT-001`

```json
{
  "status": "In Progress",
  "notes": "Contacted delivery partner and shared an update with the customer."
}
```
## Submission Notes

```text
I built a full-stack support ticketing CRM using Node.js, Express, SQLite, and React. It supports ticket creation, live search/filtering, ticket detail views, status updates, and notes with a clean two-table schema.

The main challenge was keeping the app simple enough for the assignment while still making it feel like a real support workflow. With more time, I would add authentication, role-based access, and a hosted production database.
```
