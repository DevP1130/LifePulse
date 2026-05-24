# LifePulse — AI-Powered Life Event Detection Dashboard

> A banking intelligence platform that analyzes customer transaction data to detect life transitions and equips relationship managers with AI-generated outreach briefs.

---

## Overview

LifePulse monitors customer spending patterns to identify significant life events — relocations, new babies, home purchases, job changes, financial stress, marriages, and divorces. When a transition is detected, relationship managers receive a personalized outreach brief with recommended products, talking points, and a draft message.

**Built as a Capital One internship interview demo.**

---

## Architecture

```
LifePulse/
├── backend/          # Python FastAPI — data generation, detection, brief API
└── frontend/         # React + TypeScript (Vite) — dashboard UI
```

---

## Features

- **Synthetic transaction generator** — 12 seeded customers with 90 days of realistic transaction history and embedded life-event signals
- **Rule-based event detector** — flags customers based on spending pattern rules (merchant categories, frequency, amount thresholds)
- **Outreach brief generator** — produces personalized briefs with event summary, transaction signals, recommended products, and draft messaging
- **Dashboard UI** — sortable customer list with confidence scores, severity badges, and one-click brief viewer

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000` — Swagger docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | All customers with detected life events |
| GET | `/api/customers/{id}` | Single customer detail |
| GET | `/api/customers/{id}/transactions` | Full transaction history |
| GET | `/api/customers/{id}/brief` | AI-generated outreach brief |

---

## Life Events Detected

| Event | Key Signals |
|-------|-------------|
| Relocation | Moving truck rental, storage, new utility setup, furniture stores |
| New Baby | Baby retailers, OB/GYN, prenatal care, pediatric visits |
| Home Purchase | Title insurance, escrow, home inspection, Home Depot spike |
| Job Change | Deposit source change, LinkedIn Premium, professional apparel |
| Financial Stress | NSF/overdraft fees, payday loans, late fees, spending decline |
| Marriage | Wedding vendors, jeweler, honeymoon travel |
| Divorce | Legal fees, mediation, new apartment deposit |

---

## Tech Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Auth:** Mock (hardcoded session — no real auth for demo)
