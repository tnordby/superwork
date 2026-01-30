# Quoting & Approval Workflow - Progress Update

## ✅ Completed

### 1. Database Schema
- **File**: `supabase/quotes-schema.sql` ✅ DEPLOYED
- Tables: quotes, project_assignments, quote_line_items
- RLS policies for security
- Helper function for project creation
- All indexes and triggers

### 2. TypeScript Types
- **File**: `types/quotes.ts`
- Quote types with full workflow
- Assignment types with roles
- Line item types
- All CRUD input/output types

### 3. API Routes

#### `/app/api/quotes/route.ts` ✅
- `GET` - List all quotes (role-filtered)
- `POST` - Create new quote request

#### `/app/api/quotes/[id]/route.ts` ✅
- `GET` - Get single quote with line items
- `PATCH` - Update quote (PM review, customer approval)
- `DELETE` - Delete pending quote

#### `/app/api/quotes/[id]/assign/route.ts` ✅
- `POST` - Assign consultant to quote
- `DELETE` - Remove consultant assignment

## 📋 Remaining Work

### API Routes (Optional - Nice to Have)

#### `/app/api/quotes/[id]/line-items/route.ts`
```typescript
// POST - Add line item to quote
// GET - List line items for quote
```

#### `/app/api/quotes/[id]/line-items/[itemId]/route.ts`
```typescript
// PATCH - Update line item
// DELETE - Remove line item
```

### UI Components - Phase 1: Customer

#### 1. Quote Request Form
**File**: `/app/quote-request/page.tsx`

**Purpose**: Allow customers to request quotes for services

**Features**:
- Pre-fill from service selection or custom brief
- Form fields:
  - Title (auto-filled from service)
  - Description (customer can add details)
  - Category & Service Type (from selection)
  - Estimated budget (optional)
- Submit creates quote with status `pending_pm_review`
- Success message with next steps

**Integration**:
- Link from "Browse Services" → "Request Quote" button
- Link from "Submit custom brief" button
- Link from existing service cards

#### 2. Customer Quotes Dashboard
**File**: `/app/quotes/page.tsx`

**Purpose**: Customer view of all their quotes

**Features**:
- Tabs: Pending Review, Pending Approval, Approved, Rejected
- Quote card showing:
  - Title, category, service
  - Status with color coding
  - Price (if available)
  - Created date
  - Action button (View/Approve)
- Click to view full quote details

#### 3. Quote Approval Page
**File**: `/app/quotes/[id]/page.tsx`

**Purpose**: Customer reviews and approves/rejects quote

**Features**:
- Quote details (title, description, category)
- Line items table with pricing breakdown
- Total price (prominent)
- Assigned consultant info (name, role)
- Timeline estimate (if provided)
- Action buttons:
  - "Approve Quote" (green, prominent)
  - "Reject Quote" (requires reason modal)
  - "Request Changes" (v2 feature)
- After approval: "Project created!" message with link

### UI Components - Phase 2: PM/Admin

#### 4. PM Quotes Dashboard
**File**: `/app/pm/quotes/page.tsx`

**Purpose**: PM view of all quotes in the system

**Features**:
- Stats cards: Pending Review, Pending Customer, Approved This Month
- Tabs: Needs Review, Pending Customer, Approved, Rejected
- Quote list with:
  - Customer name
  - Title & category
  - Status
  - Submitted date
  - Assigned consultant (if any)
  - Quick actions
- Filters: Date range, status, category
- Search by customer or title
- Click to open review page

#### 5. PM Quote Review Page
**File**: `/app/pm/quotes/[id]/page.tsx`

**Purpose**: PM reviews quote, adds pricing, assigns consultant

**Features**:
- Quote request details (read-only)
- Customer information
- Line items management:
  - Add line item button
  - Edit/delete existing items
  - Quantity, unit price, total calculation
  - Auto-calculate total quote price
- Consultant assignment section:
  - Search/select consultant from list
  - Assign as Lead
  - Internal notes field
  - Shows consultant's current workload (v2)
- PM notes (internal, not shown to customer)
- Action buttons:
  - "Send to Customer" (sets status to pending_customer_approval)
  - "Reject Request" (with internal reason)
  - "Save Draft" (stays in pending_pm_review)
- Validation: Must have assigned consultant before sending

### UI Components - Phase 3: Consultant

#### 6. Consultant Workspace
**File**: `/app/consultant/dashboard/page.tsx`

**Purpose**: Consultant view of assigned projects

**Features**:
- "Your Assignments" section
- Cards for each assigned project showing:
  - Project name
  - Customer name
  - Your role (Lead/Contributor)
  - Status
  - Due date
- Filter by status
- Click to view project details

## Integration Points

### 1. Update "Browse Services" Page
Add "Request Quote" button to each service card

### 2. Update "Submit Custom Brief" Flow
Change form submission to create quote instead of project

### 3. Update Project Creation
- Check if service requires quote approval
- If yes, redirect to quote request
- If no, allow direct project creation

### 4. Add Quotes to Sidebar Navigation
```typescript
{
  label: 'Quotes',
  icon: FileText,
  subItems: [
    { label: 'My Quotes', href: '/quotes', icon: List },
    { label: 'Request Quote', href: '/quote-request', icon: Plus },
  ]
}
```

### 5. PM Section in Sidebar
```typescript
{
  label: 'PM Dashboard',
  icon: Shield,
  subItems: [
    { label: 'Quotes', href: '/pm/quotes', icon: FileText },
    { label: 'Projects', href: '/pm/projects', icon: FolderKanban },
  ]
}
// Only show if user role is 'pm' or 'admin'
```

## Email Notifications (Phase 4)

Use existing Resend integration to create:

1. **quote-request-submitted.tsx**
   - To: PM team
   - When: Customer submits quote request
   - Contains: Link to review quote

2. **quote-ready-for-approval.tsx**
   - To: Customer
   - When: PM sends quote
   - Contains: Quote summary, link to approve

3. **quote-approved.tsx**
   - To: PM, assigned consultant
   - When: Customer approves
   - Contains: Project details, link to project

4. **quote-rejected.tsx**
   - To: PM
   - When: Customer rejects
   - Contains: Rejection reason

5. **consultant-assigned.tsx**
   - To: Consultant
   - When: Assigned to quote/project
   - Contains: Project details, customer info

## Testing Checklist

- [ ] Customer can request quote
- [ ] PM receives quote in dashboard
- [ ] PM can add line items and pricing
- [ ] PM can assign consultant
- [ ] PM can send quote to customer
- [ ] Customer receives email notification
- [ ] Customer can view quote details
- [ ] Customer can approve quote
- [ ] Project auto-created on approval
- [ ] Consultant receives assignment notification
- [ ] Assignment appears in consultant workspace
- [ ] Customer can reject quote
- [ ] PM receives rejection notification
- [ ] Assignment locked after approval
- [ ] Cannot modify pricing after approval
- [ ] RLS policies work correctly

## Next Immediate Steps

1. **Create customer quote request form** (`/app/quote-request/page.tsx`)
2. **Create customer quotes dashboard** (`/app/quotes/page.tsx`)
3. **Create PM quotes dashboard** (`/app/pm/quotes/page.tsx`)
4. **Test complete flow end-to-end**
5. **Add email notifications**

## Notes

- The API layer is now complete and functional
- All database operations are secured with RLS
- The workflow enforces consultant assignment before approval
- Projects are automatically created from approved quotes
- Assignment is locked after customer approval to prevent changes
