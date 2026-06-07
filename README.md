# 📊 Credex Salary Audit Platform

An automated, high-precision payroll auditing tool designed to instantly compare historical and revised salary structures. Built with React and Vite, this application processes data entirely in the browser for maximum security, and leverages the Google Gemini API to generate intelligent executive summaries of organizational wage shifts.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

## ✨ Key Features

* **🔒 Zero-Server Privacy:** 100% client-side CSV parsing. Highly sensitive organizational payroll data never leaves the user's local browser.
* **🧮 Deterministic Math Engine:** Calculates exact numerical variances ($\Delta$) and percentage shifts across multiple salary components (Basic, HRA, DA, PF, etc.).
* **🧠 Generative AI Layer:** Integrates `gemini-2.5-flash` to automatically scan for structural anomalies and write a 3-bullet executive summary of the audit.
* **📈 Interactive Variance Ledger:** Clickable, expandable data tables that reveal the exact micro-changes in an individual employee's salary structure.
* **📊 Dynamic Visualizations:** Automated bar charts mapping the core drivers of gross budget shifts.

## 🛠️ Technology Stack

* **Frontend Framework:** React (via Vite)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Data Parsing:** PapaParse (CSV to JSON)
* **Data Visualization:** Recharts
* **AI Integration:** `@google/generative-ai` SDK

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/your-username/salary-audit-tool.git
cd salary-audit-tool
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables
Create a `.env.local` file in the root of your project and add your Google Gemini API key:
\`\`\`env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`
*(You can get a free API key from [Google AI Studio](https://aistudio.google.com/)).*

### 4. Start the Development Server
\`\`\`bash
npm run dev
\`\`\`
The application will be available at `http://localhost:5173`.

## 📁 How to Use the Tool

1.  **Upload Historical Data:** Drag and drop the older payroll CSV into the left dropzone.
2.  **Upload Revised Data:** Drag and drop the updated payroll CSV into the right dropzone.
3.  **Execute Audit:** Click the "Execute Audit Engine" button.
4.  **Review Insights:** * Review top-level KPIs (Total Audited, Net Change).
    * Expand individual employee rows in the Variance Registry to see exact allowance adjustments.
    * Read the AI-generated Executive Summary at the bottom of the dashboard.

**CSV Structure Requirement:**
Both CSV files must contain an `Employee ID` column to act as the unique primary key, along with a `Gross Salary` column and standard allowance columns (Basic, PF, DA, HRA, etc.).

## 🌍 Deployment

This project is optimized for seamless deployment on [Vercel](https://vercel.com).
1. Import your GitHub repository into Vercel.
2. Add your `VITE_GEMINI_API_KEY` to the Vercel Environment Variables settings.
3. Click Deploy. 
*(Note: Ensure "Vercel Authentication" is disabled in deployment settings if you want the URL to be publicly accessible without a Vercel login).*