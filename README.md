# Innowell Technologies Agentic AI HRMS Portal

A full-stack enterprise **Human Resource Management System (HRMS)** built for Innowell Technologies enterprise use case with **Google Gemini 3.7 Flash API** ultra-fast integration, **Role-Based Access Control (RBAC)**, **Strict Row-Level Isolation**, and a modern SaaS dashboard UI.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**
   - **System Admin (`Shanthi@innowell.com`)**: Full enterprise administration, system governance, and operational approvals.
   - **HR Specialist (`Janani@innowell.com`)**: Global people operations, leave management, and support ticket resolution.
   - **Director (`Leninkumar@innowell.com`)**: Executive authority, department oversight, and high-level approvals.
   - **Manager (`Kannan@innowell.com`)**: Team leadership, project sprint direction, and leave approvals.
   - **Employees (`ravi@innowell.com`, `teja@innowell.com`, `priya@innowell.com`, `suchi@innowell.com`)**: Company directory access, personal profile, live leave quotas, 1-click AI leave applications, support tickets, and meeting scheduler.

2. **Ultra-Fast Agentic AI Workflows (Powered by Google Gemini 3.7 Flash)**
   - **Innowell AI Assistant (Embedded Chatbot)**: High-speed conversational AI assistant powered by Gemini 3.7 Flash with instant date calculation, holiday interception, and fallback engine.
   - **Smart Holiday & Weekend Detection**: Real-time detection of **all Sundays**, **2nd and 4th Saturdays**, and **Official Gazetted Holidays** with cheerful emoji suggestions (`🎉 Woohoo! [Date] is already a holiday! 🏖️`).
   - **Agentic Leave Management**: Evaluates eligibility against annual and monthly quotas (1 leave/month) and auto-drafts formal leave application reasons for HR review.
   - **HR Review Copilot**: Generates polite, policy-aligned approval or rejection remarks.
   - **Agentic Meeting Scheduler**: Parses natural-language scheduling requests and integrates with team calendars.
   - **Intelligent Support Tickets**: 1-click support ticket intake with automated categorization and severity diagnosis.

3. **Strict Row-Level Security**
   - Payroll and attendance backend endpoints enforce row isolation (`user_id == req.user.id`) for Employee-role requests at the database query layer.

4. **Modern Light-Blue SaaS UI**
   - Clean light theme with CSS custom properties (`--color-primary: #3B82F6`, `--color-primary-tint: #EFF6FF`).
   - Card View and List View toggle for data tables.
   - Live quota badges and instant status indicators.

---

## 📅 Official Leave Policies & Quotas

| Leave Type | Code | Annual Quota | Accrual Rule |
|---|---|---|---|
| **General Leave** | `GL` | **12 days / year** | 1 leave credited per month |
| **Sick Leave** | `SL` | **12 days / year** | 1 leave credited per month |
| **Maternity Leave** | `ML` | **90 days** | Applicable per standard maternity policy |
| **Leave Without Pay** | `LWP` | **0 days** | Subject to manager approval |

---

## 🏖️ Official Holiday Calendar (2026)

- **Weekly Offs:** Every **Sunday**
- **Company Offs:** **2nd Saturday** and **4th Saturday** of every month
- **Gazetted & Festival Holidays:**
  1. **Ganesh Chaturthi:** Monday, 14 September 2026
  2. **Gandhi Jayanti:** Friday, 2 October 2026
  3. **Ayudha Pooja / Durga Pooja:** Monday, 19 October 2026
  4. **Dussehra (Vijayadashami):** Tuesday, 20 October 2026
  5. **Kannada Rajyotsava:** Sunday, 1 November 2026
  6. **Diwali (Deepavali):** Sunday, 8 November 2026
  7. **Guru Nanak Jayanti:** Tuesday, 24 November 2026
  8. **Christmas Day:** Friday, 25 December 2026

---

## 🛠️ Technology Stack

- **Frontend:** React.js (Vite), Vanilla CSS (CSS Custom Properties Tokens), Lucide Icons
- **Backend:** Python (FastAPI), SQLAlchemy, PyMySQL, PyJWT, Bcrypt
- **Database:** MySQL (`innowell_hrms` database)
- **AI Integration:** Google Gemini 3.7 Flash API (`GEMINI_API_KEY` configured in `.env`)

---

## 🚀 Quick Start Guide

### 1. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=innowell_hrms
JWT_SECRET=innowell_hrms_super_secret_jwt_key_2026_agentic_ai
ADMIN_EMAIL=Shanthi@innowell.com
ADMIN_PASSWORD=Shanthi@123
HR_EMAIL=Leninkumar@innowell.com
HR_PASSWORD=Lenin@123
PORT=8000
FRONTEND_URL=http://localhost:5173
```

### 2. Run Backend & Seed Database
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run Database Migration & Seed Script
python seed.py

# Start FastAPI Backend Server
uvicorn main:app --reload --port 8000
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Authorized Approvers & Demo Accounts

### Designated Approvers:
| Role | Name | Email ID | Default Password | Authority |
|---|---|---|---|---|
| **System Admin** | Shanthireddaiah Nimmakayala | `Shanthi@innowell.com` | `Shanthi@123` | Full Admin & Operations Approver |
| **HR Specialist** | Janani | `Janani@innowell.com` | `Janani@123` | HR & People Operations |
| **Director** | Leninkumar | `Leninkumar@innowell.com` | `Lenin@123` | Director & Executive Approver |
| **Manager** | Kannan | `Kannan@innowell.com` | `Kannan@123` | Manager & Team Approvals |

### Employees:
| Role | Name | Email ID | Default Password |
|---|---|---|---|
| **Employee** | Ravi Kumar | `ravi@innowell.com` | `Employee123!` |
| **Employee** | Teja Reddy | `teja@innowell.com` | `Employee123!` |
| **Employee** | Priya Sharma | `priya@innowell.com` | `Employee123!` |
| **Employee** | Suchitra Suchi | `suchi@innowell.com` | `Employee123!` |

