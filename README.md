# Policy Compliance Frontend – Multi-AI Agent System

A Vite + React application that powers a policy-compliance assistant: voice-enabled chat, document and image analysis with OCR, recommendation workflows, and role-aware administration. The UI integrates with Supabase for authentication/storage and a companion API at `http://127.0.0.1:5000` for AI analysis.

## Features

- **AI Chat Assistant** – Streaming responses with Markdown rendering, document/image attachments, and Web Speech API voice input for hands-free prompts.
- **Policy Analyzer** – Upload PDFs or common image formats, preview them in-app, and run OCR-backed compliance checks with optional policy selections.
- **Document Management** – Authenticated upload page that stores files in Supabase for reuse across the product.
- **Recommendations Hub** – Displays AI recommendations with provenance, copy-to-clipboard toasts, and links into source policies.
- **Role & Subscription Awareness** – UI adapts to `admin` vs `user` roles and subscription tiers fetched from the backend.
- **Admin & Subscription Views** – Dedicated routes for plan upgrades and administrator tooling, all behind a reusable protected-route wrapper.
- **Rich UX** – Tailwind-styled layout, responsive design, PDF zoom/pagination, toasts, and keyboard shortcuts (Enter to send).

## Prerequisites

- Node.js ≥ 18 and npm ≥ 9
- Supabase project with an anon key and a `documents` storage bucket
- Backend API serving the endpoints listed below at `http://127.0.0.1:5000`
- Modern Chromium or Safari browser (Web Speech API support required for voice input)

## Environment Configuration

Create a `.env` or `.env.local` file in the project root:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

> Ensure Supabase storage policies permit authenticated users to upload to the `documents` bucket.

## Getting Started

```pwsh
# Install dependencies
npm install

# Run the dev server (http://localhost:5173)
npm run dev
```

Available scripts:

- `npm run build` – production build
- `npm run preview` – preview production output
- `npm run lint` – ESLint across the repo

## Backend Integration

The frontend relies on a separate backend (default `http://127.0.0.1:5000`). Key endpoints include:

- `POST /queries/analyze/stream` – streaming chat replies with optional attachments (`document_url`, `document_type`)
- `POST /documents/analyze` – policy analyzer entry for PDFs/images
- `POST /documents/upload` – document ingestion endpoint
- `GET /user/subscrition/user/` – subscription plan lookup
- `GET /user/role` or `GET /user/details` – role retrieval

Supabase JWTs from `getToken()` are attached to requests for authorization.

## Project Structure

```

	assets/            # Static assets bundled via Vite
	components/        # Shared UI (ProtectedRoute, TermsAndConditions, etc.)
	hooks/             # Custom hooks such as useThinkingEntries
	lib/               # Auth helpers
	pages/             # Route-level views (AIChatbotUI, PolicyAnalyzerUI, etc.)
	services/          # API wrappers
	utils/             # Supabase client, UUID helper
```

Highlights:

- `AIChatbotUI.jsx` – Chat interface with voice input, streaming UI, and attachment previews
- `PolicyAnalyzerUI.jsx` – PDF.js viewer plus image previews with OCR-ready uploads
- `DocumentUploadPage.jsx` – Manual upload flow wired into Supabase storage
- `RecommendationsPage.jsx` – Recommendation cards with provenance and copy feedback
- `AdminDashboard.jsx` – Role-protected admin tools

## Styling & UI

- Tailwind CSS via `@tailwindcss/vite`
- Lucide icons for lightweight SVGs
- React Markdown + GFM for rich AI response rendering

## Voice Input Notes

- Implemented with the browser Web Speech API inside `AIChatbotUI.jsx`
- Gracefully disables when unsupported (`voiceSupported` flag)
- Merges interim transcripts with any text already typed

## OCR & File Handling

- PDF rendering handled by PDF.js (loaded on demand from a CDN)
- Image uploads previewed via object URLs and marked with `document_type="image"`
- Supabase storage hosts attachment URLs before analysis

## Authentication & Routing

- `ProtectedRoute` gates authenticated sections
- Session IDs stored via `utils/sessionManager`
- React Router v7 routes: `/`, `/analyze`, `/documents`, `/recommendations`, `/subscription`, `/admin`, `/login`

## Development Tips

- Voice input requires HTTPS or `localhost`
- Update hard-coded API URLs (search for `http://127.0.0.1:5000`) if your backend lives elsewhere
- Ensure backend CORS allows `http://localhost:5173`
- When modifying PDF.js integration, adjust worker CDN URLs in `PolicyAnalyzerUI.jsx`

## Contributing

- Fork and clone the repo
- Create a feature branch: `git checkout -b feat/my-change`
- Run `npm run lint` before committing
- Open a pull request describing the change and any backend prerequisites

