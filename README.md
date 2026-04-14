# SafeRoute — Women Safety Companion

SafeRoute is a comprehensive, full-stack web application designed for women's safety. Built as a Final Year Project, it provides real-time tracking, immediate SOS alerts via SMS, community-driven safety reports, and safe route finding.

## 🚀 Features

*   **Real-time SOS Alerts:** Instantly sends your live GPS coordinates via SMS to all your trusted contacts with a single tap.
*   **Live Location Tracking:** Start a tracking session that allows your emergency contacts to monitor your journey until you reach your destination safely.
*   **Community Reports:** A crowdsourced feature where users report unsafe areas, poor lighting, or harassment. Reports are verified via community upvotes.
*   **Safe Route Navigation:** Calculates the safest walking or driving route using Google Maps and overlays safety scores from historical community data.
*   **Heatmap Analytics:** Visualizes safe zones and high-risk areas using a dynamic heatmap powered by community reports.
*   **Dashboard & Safety Analytics:** View your personalized safety score, manage emergency contacts, and read continuous safety tips.

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide React
*   **Backend:** Node.js, Express.js
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** Supabase Auth (JWT)
*   **SMS Integration:** Fast2SMS API

## 📋 System Architecture

The architecture utilizes a unified frontend to interface with both Supabase directly and the Express.js backend for secure operations:

1.  **Authentication & Database:** The React frontend connects directly to Supabase using the Anon Key to manage user sessions and fetch data safely using RLS (Row Level Security).
2.  **Webhooks & Alerting:** When an SOS is triggered, the React frontend calls the Node.js Express Backend. The backend connects to Supabase securely via the Service Role Key to look up Emergency Contacts, format the message, and ping the Fast2SMS API server to dispatch real SMS text messages globally.

## ⚙️ Running Locally for Evaluation

### Prerequisites
*   Node.js (v16+)
*   NPM or Yarn
*   A Supabase Project

### 1. Database Setup
1. Open your Supabase Dashboard.
2. Go to the SQL Editor.
3. Paste the contents of `supabase_schema.sql` and run it. This will automatically generate all necessary tables, triggers, RPC functions, and Row-Level Security policies.

### 2. Backend Setup
```bash
cd backend
npm install
```
Add your `.env` file in the `backend/` folder:
```env
PORT=5000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
FAST2SMS_API_KEY=<optional_fast2sms_api_key_for_real_texts>
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window.
```bash
cd "Women Safety"
npm install
```
Add your `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```
Start the frontend server:
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## 🔒 Security Measures Implemented
*   **Row-Level Security (RLS):** Users can only access their own tracking sessions and profile data. Reading reports is public, but tampering is forbidden.
*   **Server-Side Triggers:** SOS triggers are validated and fired exclusively from an isolated backend environment to secure API keys.
*   **Encrypted Passwords:** Passwords and tokens are completely abstracted and hashed safely via Supabase.
