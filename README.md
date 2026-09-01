<div align="center">
  <img src="public/logo.png" alt="FeeLedger" width="80" />
  <h1>FeeLedger</h1>
  <p><strong>Free, open-source fee management for tutors, coaching centres, and small businesses.</strong></p>
  <p>Your data lives in your Google Drive. No servers. No subscriptions. No ads.</p>
  <a href="https://feeledger.github.io/">Live app →</a>
</div>

---

## What is FeeLedger?

FeeLedger is a web app that helps tutors, coaching centres, gyms, and any small business that collects recurring fees from members or students.

You can:
- Build a **custom student/member database** with the fields you need
- Organise members into **batches or groups**
- **Record payments** and generate **PDF receipts** instantly
- Send **WhatsApp reminders** for outstanding dues
- See a **dashboard** of your collections at a glance
- Export reports to **CSV**

Everything runs in your browser. Your data is stored in a folder called `FeeLedger` inside **your own Google Drive** — we never see it, store it, or have access to it.

---

## Key features

| Feature | Details |
|---|---|
| 🧑‍🎓 Custom member fields | Dates, amounts, phone numbers, WhatsApp numbers, membership expiry, and more — all configurable |
| 🗂️ Groups & batches | Group members by batch, class, subject, or any label you define |
| 💸 Fast payment entry | Search member → enter amount → save → receipt generated |
| 🧾 PDF receipts | Generated in your browser, saved to your Drive, shareable via WhatsApp |
| 📲 WhatsApp reminders | Pre-filled message templates with outstanding dues, sent directly to member's WhatsApp |
| 📊 Dashboard | Monthly collections, payment mode breakdown, batch-wise summary |
| ⚙️ Full customisation | Fields, receipt layout, fee frequency, tax rates, business branding — all in Settings |
| 🔒 Your data, your Drive | Uses `drive.file` scope — only files FeeLedger creates |
| 📱 PWA | Install on Android or iPhone, works offline |
| 🆓 Free & open source | MIT licence. No ads. No tracking. Fork it, self-host it, change it. |

---

## How to use it

1. **Go to [feeledger.github.io](https://feeledger.github.io/)**
2. Click **Continue with Google** — sign in with any Google account
3. Complete the **one-time setup wizard**:
   - Enter your business name, logo, address, GSTIN
   - Configure the fields you want to collect for your members
   - Set up receipt numbering and layout
4. **Add members** — fill in their details using your configured fields
5. **Receive a payment** — search the member, enter amount, select mode, save
6. **Share the receipt** — download PDF or share via WhatsApp instantly

That's it. All data syncs to your Google Drive automatically.

---

## Settings you can configure

- **Business profile** — name, logo, address, GSTIN, tax rates
- **Member fields** — add/remove/rename fields; supported types: text, number, phone, WhatsApp number, date, amount, email, dropdown, multi-select, yes/no, URL
- **Groups & batches** — create custom groups; assign members
- **Fee frequency** — monthly, quarterly, half-yearly, annually, one-time, custom instalments
- **Due dates** — set collection due dates per member or per batch
- **Payment modes** — Cash, UPI, Bank Transfer, Card, Cheque, Other (configurable)
- **Receipt layout** — choose which fields appear on receipts, add footer/terms/signature
- **Receipt numbering** — set prefix, year, month, series number format
- **WhatsApp message template** — define your reminder message; FeeLedger fills in the member name and outstanding amount automatically

---

## For developers — self-hosting or forking

### Requirements
- A Google Cloud project with the **Google Drive API** enabled
- An **OAuth 2.0 Client ID** (Web application type)
- A GitHub account (for Pages hosting) or any static hosting

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/feeledger/feeledger.git
cd feeledger

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and add your VITE_GOOGLE_CLIENT_ID

# 4. Run locally
npm run dev

# 5. Build for production
npm run build
```

### Google Cloud setup (5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Google Drive API**
3. APIs & Services → OAuth consent screen → External → fill in app name + email
4. APIs & Services → Credentials → Create OAuth Client ID → Web application
5. Add authorised origins:
   - `http://localhost:5173` (local dev)
   - `https://your-domain.com` (production)
6. Copy the Client ID → paste into `.env.local` as `VITE_GOOGLE_CLIENT_ID`

### Deploying to GitHub Pages

1. Fork this repo
2. Go to your fork → Settings → Pages → Source: **GitHub Actions**
3. Go to Settings → Secrets → Actions → add `VITE_GOOGLE_CLIENT_ID`
4. Push to `main` — the workflow builds and deploys automatically

The app will be live at `https://your-username.github.io/`

---

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Local storage**: IndexedDB (via Dexie) — fast local queries
- **Cloud storage**: User's Google Drive (`drive.file` scope only)
- **PDF generation**: Browser-native (no third-party PDF service)
- **Auth**: Google Identity Services (no passwords stored)
- **Hosting**: GitHub Pages (static, no server required)
- **Backend**: None

Data flow:
```
Browser (IndexedDB)  ←→  Google Drive (user's own)
         ↑
      React UI
```

---

## Licence

MIT — free to use, fork, modify, and distribute. No attribution required, but appreciated.

---

## Contributing

Pull requests welcome. Please open an issue first for significant changes.
