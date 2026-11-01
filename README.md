# FinSmart — Intelligent Personal Finance & Digital Wallet

[![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-F55036?style=flat&logo=openai&logoColor=white)](https://groq.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-F05032?style=flat&logo=feather&logoColor=white)](https://lucide.dev/)

FinSmart is a modern personal finance and digital wallet application designed to streamline expense tracking, budgeting, and wealth management. Built with a responsive glassmorphic interface, FinSmart pairs real-time transaction processing with AI-driven financial insights and automated analytics.

---

## Key Features

### Digital Wallet & Transactions
* **Live Balance Management**: Monitor account liquidity and total net balance in real time.
* **Instant Money Transfers**: Transfer funds between accounts with recipient validation and instant transaction records.
* **Transaction History & Filtering**: Search and filter past transactions by type (income/expense), date, and category.
* **Recent Payees**: Quick-access shortcuts to frequently transferred contacts.

### AI Financial Insights & Forecasting
* **Spending Analyzer**: Context-aware transaction analysis highlighting patterns, recurring expenses, and outliers.
* **Smart Budget Advisor**: Actionable recommendations tailored to current spending velocity and category allocations.
* **Next-Month Prediction**: Statistical and generative projections estimating upcoming monthly liabilities.
* **Personalized Savings Tips**: Data-driven strategies to reduce discretionary spending.

### Smart Budgeting & Expense Control
* **Category Limits**: Set monthly caps across categories such as Food, Housing, Utilities, Transportation, and Entertainment.
* **Dynamic Budget Alerts**: Visual threshold indicators displaying real-time budget depletion and overspend notifications.
* **Interactive Progress Metrics**: Glassmorphism progress bars showing exact remaining budget balances.

### Savings Goals & Gamification
* **Goal Tracker**: Define financial targets, track completion percentages, and manage target timelines.
* **FinCoins Rewards**: Earn points for consistently staying under budget limits and hitting milestones.
* **Celebration Animations**: Interactive milestone feedback using Canvas Confetti effects.

### Visual Analytics & Reports
* **Cash Flow Breakdown**: Comprehensive income versus expense distribution powered by Chart.js.
* **Category Analytics**: Interactive doughnut and bar charts visualizing expense distribution.
* **Historical Trends**: Multi-month spending comparisons to evaluate financial discipline.

### Dedicated Support Ticket System
* **Customer Ticket Submission**: In-app query submission interface integrated with EmailJS for direct dispatch.
* **Status Tracking**: User-visible status indicators for open, in-review, and resolved inquiries.

### Standalone Admin Support Dashboard
* **Isolated Admin Workspace**: Dedicated full-screen support center (`/admin-support`) completely separated from the user dashboard.
* **Ticket Resolution Panel**: Admin controls to inspect, filter, update status, and respond to incoming user tickets.
* **Dual-Tier Authentication**: Decoupled login system preventing unauthorized crossover between standard user accounts and administrative controls.
* **Autofill Defense**: Input hardening against browser credential autofill for static administrative access.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, React Router v7, Vite |
| **Styling & Design** | Vanilla CSS, Modern Glassmorphism Architecture |
| **Icons & Visuals** | Lucide React |
| **Data Visualization** | Chart.js, React-ChartJS-2 |
| **Backend & Database** | Firebase Authentication, Cloud Firestore |
| **Artificial Intelligence** | Groq API (Qwen 2.5 / Llama 3.2 models) |
| **Communication** | EmailJS |
| **Utilities** | Canvas-Confetti |

---

## Architecture Overview

```text
FinSmart/
├── public/                 # Static assets and icons
├── src/
│   ├── ai/                 # Groq API configuration and prompt helpers
│   ├── components/         # Reusable UI widgets, modals, layout elements
│   │   ├── layout/         # Sidebar, Navbar, and layout wrappers
│   │   └── rewards/        # Reward and celebration components
│   ├── firebase/           # Firebase client initialization, auth, and Firestore queries
│   ├── pages/              # Application views
│   │   ├── AdminSupport.jsx# Standalone administrative support console
│   │   ├── AIInsights.jsx  # AI spending analysis & advice panel
│   │   ├── Budget.jsx      # Budget manager and category limits
│   │   ├── Dashboard.jsx   # Primary user overview and stats
│   │   ├── Login.jsx       # User authentication and admin portal trigger
│   │   ├── Reports.jsx     # Visual charts and cashflow analysis
│   │   ├── Savings.jsx     # Savings targets and FinCoins
│   │   ├── Signup.jsx      # Registration view
│   │   ├── Support.jsx     # User ticket creation interface
│   │   ├── Transactions.jsx# Detailed ledger view
│   │   ├── Transfer.jsx    # Funds transfer portal
│   │   └── Wallet.jsx      # Digital wallet management
│   ├── App.jsx             # Top-level routing, role guards, and navigation state
│   └── main.jsx            # React root mount
├── firestore.rules         # Security rules for collections
└── vite.config.js          # Build configuration
```

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
* npm, yarn, or pnpm
* Firebase project with Authentication & Firestore enabled
* Groq API key for AI features

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rajesh-dev-stack/FinSmart.git
   cd FinSmart
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root directory:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY="your_firebase_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
   VITE_FIREBASE_APP_ID="your_firebase_app_id"

   # AI Configuration
   VITE_GROQ_API_KEY="your_groq_api_key"

   # EmailJS Configuration (Support Inquiries)
   VITE_EMAILJS_SERVICE_ID="your_emailjs_service_id"
   VITE_EMAILJS_TEMPLATE_ID="your_emailjs_template_id"
   VITE_EMAILJS_PUBLIC_KEY="your_emailjs_public_key"
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## Security & Access Control

* **Decoupled Roles**: The regular user login and administrative support portals run on independent authentication pathways.
* **Database Rules**: Firestore rules enforce user-level document isolation for transactions, budgets, and personal balances while granting administrative read/write access to customer support tickets.
* **Credential Protection**: Admin access routes incorporate security headers and form attributes to prevent browser password managers from auto-persisting administrative credentials.

---

## Contributing

Contributions, bug reports, and feature proposals are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m "Add NewFeature"`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## License

This project is open-source under the [MIT License](LICENSE).

Copyright (c) 2026 FinSmart. All rights reserved.
