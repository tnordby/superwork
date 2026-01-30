## PRD 1 — Customer Portal Navigation & Core Sidebar Experience

**Purpose**  
Define the **primary navigation structure** of the Superwork customer portal.  
This PRD establishes the sidebar as the backbone of the product experience and ensures customers immediately understand *where to go, what they can manage, and how Superwork works*.

This PRD is intentionally concrete and UI-driven.

---

## Core Idea

The Superwork portal is centered around a **persistent left-hand sidebar** that reflects how customers think about their relationship with Superwork:

- Ongoing work
- Money and subscription
- People and access
- Delivered assets
- Feedback and communication

If the sidebar makes sense, the product makes sense.

---

## Sidebar Design & Branding (Non-Negotiable)

- **Background color:** `#0e141d`
- **Text & navigation font:** `Inter, sans-serif`
- **Logo:**
  - Asset name: `superwork-logo-white`
  - Placement: top of sidebar
  - Logo is not clickable in v1 (prevents unexpected navigation)
- **Icon color:** inherits text color
- **Active item state:**
  - Clear contrast against `#0e141d`
  - No bright or saturated accent colors in v1

The sidebar must feel **calm, premium, and enterprise-grade**, not app-like or playful.

---

## Sidebar Principles

- The sidebar is **always visible** on desktop
- It is **role-aware** (customers vs employees vs admins)
- It uses **clear, familiar labels** — no internal jargon
- Each item maps to a *distinct mental model*, not a feature dump
- Icons support scanning, not decoration

---

## Sidebar Structure (Customer View)

### 1. Home

- **Label:** Home  
- **Lucide icon:** `home`

**Purpose**
- Give customers a quick overview of their relationship with Superwork

**Expected content (high level)**
- Active subscription
- Current balance snapshot
- Active projects
- Recent updates

---

### 2. Account (Expandable Section)

- **Label:** Account  
- **Lucide icon:** `wallet`

The Account section groups everything related to **money, access, and governance**.  
This mirrors how finance, leadership, and RevOps users think.

#### Sub-menu items

##### Balance
- **Lucide icon:** `credit-card`
- Shows available, used, and in-progress budget

##### Usage
- **Lucide icon:** `bar-chart-3`
- Explains where budget was spent

##### Plan
- **Lucide icon:** `layers`
- Shows current Superwork plan and inclusions

##### Invoices
- **Lucide icon:** `file-text`
- Invoice history and downloads

##### Members
- **Lucide icon:** `users`
- Portal users, roles, and access

##### Teams
- **Lucide icon:** `folder-tree`
- Budget and access grouping for larger customers

##### Settings
- **Lucide icon:** `settings`
- Organization preferences and configuration

---

### 3. Assets

- **Label:** Assets  
- **Lucide icon:** `folder`

**Purpose**
- Central location for delivered work and shared materials

---

### 4. Submit Feedback

- **Label:** Submit feedback  
- **Lucide icon:** `message-square`

**Purpose**
- Asynchronous, contextual communication with Superwork
- Feedback, questions, and change requests tied to work

This is **not** live chat and **not** ticketing.

---

## Role Awareness (High-Level)

- **Customers**
  - See the sidebar exactly as defined above
- **Employees**
  - See additional internal sections (defined in later PRDs)
- **Admins**
  - See system-level controls in addition to all customer views

This PRD defines **structure and presentation only**, not permission enforcement.

---

## Relationship to HubSpot

- The portal does **not** replace HubSpot
- It explains and coordinates **consulting work executed inside HubSpot**
- Sidebar items reflect consulting outcomes, not CRM objects

---

## Explicitly Does NOT Cover

- Authentication and login flows
- Authorization logic
- Backend implementation
- Database schemas
- Feature-level UI beyond the sidebar

---

## Key Acceptance Criteria

- A first-time customer understands navigation within **10 seconds**
- Sidebar labels require no explanation from consultants
- Financial and non-financial users both recognize the Account section
- All future features fit naturally into this navigation
- Sidebar styling is consistent across all pages

---

## Non-Goals

- No nested menus beyond one level in v1
- No customer-customizable navi
