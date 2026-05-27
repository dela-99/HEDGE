# PHASE 2 — UI/UX + SYSTEM DESIGN
**Hedge Fintech App**  
**Status:** Locked  
**Built on:** Phase 1 Foundation

## 1. Core Design Philosophy
- Trustworthy, fast, operational, premium, calm under pressure
- Designed for African SME merchants on low-end Android + unstable networks
- Prioritize operational clarity over flashy design

## 2. Design System

### Typography
- **Font:** Inter
- Scale: Heading XL (32px), L (24px), M (20px), Body (14-16px), Caption (12px)
- Weights: 600 (headings), 500 (labels), 400 (body)

### Spacing
- 8px grid system (4, 8, 12, 16, 24, 32, 48, 64px)

### Color System
- Primary Dark: #0F172A
- Primary Blue: #2563EB
- Background: #F8FAFC
- Surface: #FFFFFF
- Border: #E2E8F0
- Text Primary: #0F172A
- Text Secondary: #475569
- Success: #16A34A
- Pending: #F59E0B
- Failed/Fraud: #DC2626

### Design Tokens
- Radius: sm (6px), md (10px), lg (16px)
- Shadows: sm, md
- Transitions: fast(150ms), base(250ms)

## 3. Component System
- **Buttons:** primary, secondary, danger, ghost
- **Cards:** revenue, alerts, summaries
- **Tables:** transactions, reconciliation, audit (sticky header + expandable rows)
- **Badges:** status indicators
- **Toasts:** success/failure/alert feedback
- **Modals:** minimal usage

## 4. Frontend Architecture

**Stack:**
- Next.js (App Router)
- TypeScript
- TailwindCSS
- ShadCN UI
- React Query (data fetching)
- Zustand (state)
- Framer Motion (minimal animations)

**Folder Structure:**
```text
/frontend
├── src/
│   ├── app/                  # Next.js pages
│   ├── components/
│   │   ├── ui/               # Reusable primitives
│   │   ├── layout/           # Sidebar, navbar
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── reconciliation/
│   │   ├── analytics/
│   │   ├── notifications/
│   │   └── auth/
│   ├── lib/                  # API client, utils
│   ├── hooks/
│   ├── store/                # Zustand
│   └── styles/
```

**Key Pages:**
- `/auth/login`, `/auth/signup`
- `/dashboard`
- `/transactions`, `/transactions/[id]`
- `/reconciliation`
- `/analytics`
- `/notifications`
- `/settings`, `/team`

## 5. UX Priorities

**Dashboard:**
- Top: Revenue cards + Pending + Failed + Fraud Alerts (visible within 2s)
- Middle: Revenue trend graph
- Bottom: Recent transactions + Reconciliation status

**Mobile:**
- Bottom tab nav (Dashboard, Transactions, Alerts, Analytics, Settings)
- 44px+ tap targets
- Lightweight, lazy loading, compressed assets

**Security UX:**
- Visible active sessions
- Login history
- Clear fraud indicators
- Confirmation on sensitive actions

**Performance Targets:**
- Initial load < 2.5s
- Dashboard render < 1s

## 6. Accessibility & Observability
- WCAG 2.2 AA minimum (contrast, keyboard nav, screen reader)
- Error tracking + logging hooks ready

## 7. Integration with Phase 1
- All protected pages use Auth guards from Phase 1A
- Real-time updates via React Query + WebSocket/hooks for transactions & notifications
- RBAC controls visibility of pages/menus

**Phase 2 Status:** UI/UX + Frontend Architecture Locked. Ready for implementation.
