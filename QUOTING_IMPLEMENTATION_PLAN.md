# Quoting & Approval Workflow - Implementation Plan

## ✅ Completed

### 1. Database Schema (`supabase/quotes-schema.sql`)
Created comprehensive schema including:
- **quotes** table with full workflow status tracking
- **project_assignments** table for consultant assignment
- **quote_line_items** table for detailed pricing
- RLS policies for security
- Helper function `create_project_from_quote()` for automatic project creation
- Proper indexes and triggers

### 2. TypeScript Types (`types/quotes.ts`)
Defined all necessary types:
- Quote, QuoteInsert, QuoteUpdate
- ProjectAssignment, AssignmentInsert, AssignmentUpdate
- QuoteLineItem with CRUD types
- Extended types with relations (QuoteWithLineItems, AssignmentWithUser)

## 🔄 Next Steps

### 3. API Routes (Priority: High)

#### `/app/api/quotes/route.ts`
```typescript
// GET - List quotes (filtered by role)
// POST - Create new quote request
```

#### `/app/api/quotes/[id]/route.ts`
```typescript
// GET - Get single quote with line items
// PATCH - Update quote (PM review, customer approval)
// DELETE - Delete quote (only if pending)
```

#### `/app/api/quotes/[id]/assign/route.ts`
```typescript
// POST - Assign consultant(s) to quote
// PATCH - Update assignment
// DELETE - Remove assignment
```

#### `/app/api/quotes/[id]/approve/route.ts`
```typescript
// POST - Approve quote (creates project automatically)
```

#### `/app/api/quotes/[id]/reject/route.ts`
```typescript
// POST - Reject quote with reason
```

### 4. Customer Quote Request Flow

#### Page: `/app/quote-request/page.tsx`
- Form to request custom quote
- Pre-fill from selected service
- Submit creates quote with status `pending_pm_review`

**Flow:**
1. Customer selects service or clicks "Submit custom brief"
2. Fills out quote request form
3. Quote created in `pending_pm_review` status
4. PM notified via email

### 5. PM Quote Review Interface

#### Page: `/app/pm/quotes/page.tsx`
- List all quotes grouped by status
- Filter by status, customer, date
- Quick actions: Review, Assign, Approve

#### Page: `/app/pm/quotes/[id]/page.tsx`
- Full quote details
- Add/edit line items
- Set pricing
- Assign consultant(s)
- Add PM notes
- Send to customer or reject

**Flow:**
1. PM reviews quote request
2. PM adds line items and pricing
3. PM assigns lead consultant (required before approval)
4. PM sets status to `pending_customer_approval`
5. Customer receives email notification

### 6. Consultant Assignment Interface

#### Component: `<ConsultantAssignmentModal>`
Used in PM quote review page

Features:
- Search/filter available consultants
- Assign as Lead or Contributor
- Add internal notes per assignment
- Shows consultant workload (optional v2)
- Assignment locked after customer approval

### 7. Customer Quote Approval Flow

#### Page: `/app/quotes/[id]/page.tsx`
- Customer views quote details
- See all line items and pricing
- See assigned consultant
- Accept or Reject with reason

**Flow:**
1. Customer receives email with quote
2. Reviews quote details
3. Approves → Project auto-created with assignments
4. Rejects → PM notified with reason

### 8. Quotes Dashboard

#### Page: `/app/quotes/page.tsx`
Customer view of their quotes:
- Tabs: Pending, Approved, Rejected
- Quick status view
- Link to approval page

### 9. Email Notifications

Integrate with existing Resend setup:

**Templates needed:**
1. `quote-request-submitted.tsx` - To PM when customer requests quote
2. `quote-ready-for-approval.tsx` - To customer when PM sends quote
3. `quote-approved.tsx` - To PM and consultant when approved
4. `quote-rejected.tsx` - To PM when customer rejects
5. `consultant-assigned.tsx` - To consultant when assigned to project

### 10. Update Project Creation Flow

#### Update: `/app/projects/create/page.tsx`
Add option: "Request Quote First"
- For services requiring approval
- For custom pricing
- Links to quote request form

## Implementation Order

1. **Phase 1: Core Infrastructure** ✅
   - Database schema
   - TypeScript types

2. **Phase 2: API Layer** (Next)
   - Quote CRUD endpoints
   - Assignment endpoints
   - Approval/rejection endpoints

3. **Phase 3: PM Workflow**
   - PM quotes dashboard
   - Quote review interface
   - Consultant assignment modal
   - Line item management

4. **Phase 4: Customer Workflow**
   - Quote request form
   - Customer quotes dashboard
   - Quote approval page

5. **Phase 5: Integration**
   - Email notifications
   - Update project creation flow
   - Link quotes to projects
   - Assignment sync

6. **Phase 6: Polish**
   - Loading states
   - Error handling
   - Validation
   - UI refinements

## Key Business Rules

1. **Quote must have assigned consultant before customer approval**
2. **Assignments locked after customer approval** (requires admin override)
3. **Project automatically created on quote approval**
4. **Lead assignment copied to project**
5. **Quote status flow is one-way** (no going back from approved/rejected)

## Database Migration Steps

1. Run `quotes-schema.sql` in Supabase SQL Editor
2. Verify tables created: `quotes`, `project_assignments`, `quote_line_items`
3. Test RLS policies with different user roles
4. Verify helper function works: `select create_project_from_quote('quote-id');`

## Testing Checklist

- [ ] Customer can request quote
- [ ] PM receives notification
- [ ] PM can review and add pricing
- [ ] PM can assign consultant
- [ ] Customer receives quote for approval
- [ ] Customer can approve quote
- [ ] Project auto-created with correct assignment
- [ ] Consultant receives notification
- [ ] Customer can reject quote
- [ ] PM receives rejection notification
- [ ] Assignment locked after approval
- [ ] RLS policies prevent unauthorized access

## Notes

- The system is designed to prevent projects starting without ownership
- All state transitions are audited (timestamps + user IDs)
- Email notifications keep all parties informed
- The workflow is linear but can be extended for revisions (v2)
