# Mission Control UI – Modular Layout Redesign Prompt

You are working in the `apps/mission-control` React + TypeScript application.

The current layout uses:

- A **left sidebar** (`aside.sidebar`) with:
  - Operator scope buttons (Primary / BTC / ETH)
  - DemoReadinessCard
  - Milestone5ReadinessCard
  - ThemeSwitcher
- A **center main area** with:
  - AI Bot Mission Control header
  - BotStatusCard
  - ControlDeck
  - ReconciliationCard
  - EventStream
- A **right panel** (`aside.right-panel`) with:
  - Horizontal scrolling tabs
  - Risk / Audit / Logs / Approvals / Alerts / Incidents / Portfolio / Orders / Ops / Autonomy panels

## Problem

The right panel is too narrow (≈320–360px), causing:

- Horizontal scrolling tab row
- Cramped content
- Poor visibility of critical data
- Reduced usability for mission-critical panels (Risk, Approvals, Portfolio)

We need to redesign the layout to be:

- Modular
- Modern
- Full-width content driven
- Scalable
- Cleaner visually
- No horizontal tab scrolling

**Important:**  
Do NOT change backend logic.  
Do NOT modify business logic.  
Only restructure layout and styling.

---

# Target Layout Architecture

We are converting to a **3-pane mission control layout**:

```
| Nav Panel | Main Content | Info Panel |
```

---

# 1️⃣ Replace Horizontal Tabs with Vertical Navigation Panel

## Create a NavPanel (left side)

Replace the current right-panel horizontal tab row with a **vertical navigation panel** on the left.

The NavPanel should contain vertically stacked buttons for:

- Event Stream
- Risk
- Audit
- Logs
- Approvals
- Alerts
- Incidents
- Portfolio
- Orders
- Ops
- Autonomy

### Requirements

- Width: ~180–220px
- Vertical stacked buttons
- Highlight active panel
- Show attention badges:
  - Approvals (when pending)
  - Alerts (when open)
- Move sound toggle to bottom of NavPanel
- Remove horizontal scrolling entirely

### State Changes

Replace:

```ts
type RightTab = ...
const [tab, setTab] = useState<RightTab>("risk");
```

With:

```ts
type PanelName = 
  | "stream"
  | "risk"
  | "audit"
  | "logs"
  | "approvals"
  | "alerts"
  | "incidents"
  | "portfolio"
  | "orders"
  | "ops"
  | "autonomy";

const [selectedPanel, setSelectedPanel] = useState<PanelName>("stream");
```

Update click handlers accordingly.

---

# 2️⃣ Move Readiness + Status Components to Right Info Panel

The current left sidebar should become a **Right Info Panel**.

Move into this InfoPanel:

- DemoReadinessCard
- Milestone5ReadinessCard
- ThemeSwitcher
- (future bot filters)

### Requirements

- Width: 240–280px
- Scrollable if overflow
- Fixed height (full viewport)
- Clean card stacking
- No operator buttons here

---

# 3️⃣ Restructure Main Content Area

The main area should now contain two vertical sections:

## 🔒 Pinned Top Section (Always Visible)

Keep:

- AI Bot Mission Control header
- Environment badges
- Connection badges
- BotStatusCard
- ControlDeck
- ReconciliationCard

These must remain visible regardless of selected panel.

---

## 🔄 Dynamic Content Section

Below the pinned section, create:

```tsx
<section className="content-panel">
  {contentPanel}
</section>
```

Where `contentPanel` is determined by `selectedPanel`.

When:

- `"stream"` → render `<EventStream />`
- `"risk"` → `<RiskPanel />`
- `"audit"` → `<AuditTimeline />`
- `"logs"` → `<LogsPanel />`
- `"approvals"` → `<ApprovalsPanel />`
- `"alerts"` → `<AlertsPanel />`
- `"incidents"` → `<IncidentsPanel />`
- `"portfolio"` → `<PortfolioPanel />`
- `"orders"` → `<OrdersPanel />`
- `"ops"` → `<OpsMetricsPanel />`
- `"autonomy"` → `<AutonomyPanel />`

This section should:

- Take full available width
- Scroll independently
- Have proper padding
- Not affect pinned top section

---

# 4️⃣ Update App Shell Grid Layout

Modify `.app-shell` to:

```css
.app-shell {
  display: grid;
  grid-template-columns: minmax(180px, 220px) 1fr minmax(240px, 280px);
  height: 100vh;
}
```

Areas:

- NavPanel (left)
- Main content (center)
- InfoPanel (right)

Ensure:

- Main section scrolls internally
- Info panel scrolls internally
- No horizontal overflow
- No tab scrolling

---

# 5️⃣ Operator Scope + Controls

Move operator scope buttons (Primary / BTC / ETH) into:

- Either topbar dropdown
- Or topbar segmented control

They must remain visible at all times.

Remove them from sidebar.

---

# 6️⃣ Responsiveness

For smaller screens:

- Collapse NavPanel into a drawer
- Move InfoPanel below main content
- Ensure layout remains usable

---

# 7️⃣ Preserve Existing Behavior

Ensure all of the following continue working:

- Approval attention badges
- Alert attention badges
- Toast notifications
- Sound toggle persistence
- LocalStorage theme persistence
- Periodic refresh intervals
- Approval chimes
- Alert chimes
- Circuit breaker auto-tab switching

---

# 8️⃣ Files Likely Modified

Expect changes in:

- `App.tsx`
- CSS / styles file
- Possibly new components:
  - `NavPanel.tsx`
  - `InfoPanel.tsx`

Do NOT modify API logic or dashboard state logic.

---

# Desired Outcome

The final UI should:

- Eliminate cramped right panel
- Remove horizontal tab scrolling
- Provide full-width mission panels
- Keep critical controls pinned at top
- Keep readiness metrics visible but secondary
- Feel like a professional trading terminal
- Be modular and scalable

After implementation:

- Summarize changed files
- Confirm all panels render correctly
- Confirm attention badges still function
- Confirm responsiveness works

---

End of prompt.
