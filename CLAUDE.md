# CLAUDE.md - PEBLGen Development Documentation

**Last Updated:** January 19, 2026
**Application Version:** Current Production State
**Port:** localhost:8000

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Current Application State](#current-application-state)
3. [Recent Updates](#recent-updates)
4. [Core Features](#core-features)
5. [File Structure](#file-structure)
6. [Configuration](#configuration)
7. [Known Issues & TODOs](#known-issues--todos)
8. [Development Guidelines](#development-guidelines)

---

## Quick Reference

### Starting the Application
```bash
npm run dev
# Application runs on http://localhost:8000
```

### Key Pages
- **Main App:** http://localhost:8000/map-drawing
- **Timesheet:** http://localhost:8000/timesheet.html
- **Spend:** http://localhost:8000/spend.html
- **Grants:** http://localhost:8000/grants.html
- **Quote:** http://localhost:8000/quote.html

### Database
- **Provider:** Supabase
- **Config File:** `supabase-client.js` (root directory)
- **URL:** https://gamsynrzeixorftnivps.supabase.co

---

## Current Application State

### Active Features ✅
1. **Map Drawing System** (`/map-drawing`)
   - Pin creation with file attachments
   - Area and line drawing
   - Project management
   - Real-time data visualization
   - CSV file uploads (CROP, WQ, CHEM, eDNA)

2. **Timesheet Management** (`timesheet.html`)
   - Labour allocation tracking
   - Weekly breakdown (W1-W5)
   - Staff signatures with drawing capability
   - **PDF Export** with optimized column widths
   - Cloud backup to Supabase
   - Load/save functionality

3. **Financial Management**
   - **Spend Tracking** (`spend.html`) - Transactions, invoices, budget monitoring
   - **Grants Management** (`grants.html`) - Grant allocations and quarterly reports
   - **Quote System** (`quote.html`) - Quote generation and tracking
   - Gmail integration for invoice search

4. **Data Visualization**
   - Rarefaction curves for eDNA haplotype data
   - Timeseries plotting for environmental data
   - Heatmaps and statistical analysis
   - Custom date parsing for various formats

### Deprecated Features ⚠️
- **Data Explorer** (`/data-explorer`) - Functionality moved to map-drawing page

---

## Recent Updates

### Timesheet PDF Export Optimization (January 19, 2026)

**File:** `timesheet.html` (lines 2941-2953)

**Changes Made:**
- Optimized column widths for better table fit
- Enabled text wrapping to prevent content cutoff
- Adjusted proportions for readability vs. space efficiency

**Current Column Widths:**
```css
.rate-col { width: 25px; }     /* Day Rate, Hr Rate - 20% smaller */
.days-col { width: 20px; }     /* Days - 10% smaller */
.hours-col { width: 23px; }    /* Hours - 10% smaller */
.month-col { width: 20px; }    /* Month - 10% smaller */
.staff-col { width: 35px; }    /* Staff - 50% smaller */
.inout-col { width: 33px; }    /* W1-W5 In/Out - 30% wider than initial reduction */
.hrs-col { width: 20px; }      /* W1-W5 Hours - 30% wider than initial reduction */
.desc-col { width: 59px; }     /* W1-W5 Descriptions - 30% wider than initial reduction */
.sig-col { width: 35px; }      /* Signature - 50% smaller */
.date-col { width: 42px; }     /* Signed On - 20% wider */
```

**Text Wrapping:**
```css
th, td {
  white-space: normal;
  word-wrap: break-word;
  /* Removed: overflow: hidden; text-overflow: ellipsis; */
}
```

**Result:**
- Table fits on page without horizontal cutoff
- All content wraps to multiple lines instead of truncating
- Better balance between space and readability

---

## Core Features

### 1. Map Drawing System

**Location:** `src/app/map-drawing/page.tsx`

**Key Functionality:**
- **Pin Management:** Create, edit, delete map pins with geographic coordinates
- **File Attachments:** Upload CSV files (eDNA, CROP, WQ, CHEM) to pins
- **Area & Line Drawing:** Draw polygons and polylines on map
- **Project Organization:** Group pins by project
- **Data Visualization:** View timeseries, rarefaction curves, heatmaps

**Supported File Types:**
- `*_hapl.csv` - eDNA haplotype data with rarefaction analysis
- `CROP*.csv` - Crop sampling data (DD/MM/YYYY format)
- `WQ*.csv` - Water quality measurements
- `CHEM*.csv` - Chemical analysis
- Generic CSV with date/time columns

**Data Storage:**
- **Pins:** `pins` table in Supabase
- **Files:** Supabase Storage bucket
- **Metadata:** `user_file_details` table

### 2. Timesheet System

**Location:** `timesheet.html`

**Workflow:**
1. Load forecast data from Grants page
2. User fills in weekly hours (W1-W5)
3. Add signatures for approval
4. Export to PDF for record-keeping
5. Save to Supabase for backup

**PDF Export Process:**
```javascript
// Function: downloadTimesheetPDF() at line 2907
1. Check for timesheet data
2. Build HTML table with styled columns
3. Include signatures as base64 images
4. Open print dialog for PDF save
5. User saves via browser print-to-PDF
```

**Storage:**
- **Table:** `saved_timesheets`
- **Fields:** user_id, project_name, timesheet_data, is_approved, metadata
- **Fallback:** localStorage if Supabase unavailable

### 3. Financial Management

**Spend Page (`spend.html`):**
- Transaction tracking with categories
- Invoice management with Gmail search integration
- Budget vs. actual spending comparison
- Custom transaction creation
- Monthly/quarterly reporting

**Grants Page (`grants.html`):**
- Multi-project grant allocation
- Quarterly budget breakdown
- Forecast vs. actual tracking
- Export to Excel functionality
- Integration with Timesheet for labour allocation

**Quote Page (`quote.html`):**
- Quote generation for project proposals
- Line item management
- Quote-to-invoice conversion
- PDF export capability

**Gmail Integration:**
- OAuth 2.0 authentication
- Multi-account support
- Invoice search with date range filtering
- PDF attachment download
- Auto-assignment to transactions

### 4. Data Visualization

**Rarefaction Curves:**
- File: `src/components/pin-data/RarefactionChart.tsx`
- Algorithm: Michaelis-Menten or Logarithmic curve fitting
- Features: Confidence intervals, extrapolation, R² statistics
- Auto-display: Enabled by default with Michaelis-Menten model

**Timeseries Plotting:**
- File: `src/components/pin-data/PinChartDisplay.tsx`
- Multi-parameter support
- Date range filtering
- Export to CSV/image

**Date Parsing:**
- File: `src/components/pin-data/csvParser.ts`
- Supports: ISO, DD/MM/YYYY, MM/DD/YYYY, Excel dates, Unix timestamps
- Intelligent format detection based on data patterns
- Override for known file types (CROP → DD/MM/YYYY)

---

## File Structure

```
PEBLGen/
├── src/                          # Next.js React application
│   ├── app/
│   │   ├── map-drawing/         # Main map interface
│   │   │   └── page.tsx         # Primary application logic
│   │   ├── data-explorer/       # ⚠️ DEPRECATED
│   │   └── ...
│   ├── components/
│   │   ├── map/                 # Leaflet map components
│   │   │   └── LeafletMap.tsx
│   │   ├── pin-data/            # Data visualization
│   │   │   ├── PinChartDisplay.tsx
│   │   │   ├── RarefactionChart.tsx
│   │   │   ├── HaplotypeHeatmap.tsx
│   │   │   └── csvParser.ts
│   │   └── auth/                # Authentication components
│   ├── lib/
│   │   ├── supabase/            # Database services
│   │   ├── curve-fitting.ts     # Rarefaction curve algorithms
│   │   ├── dateParser.ts        # Date parsing utilities
│   │   └── ...
│   └── hooks/
│       └── use-map-data.ts      # Map data management hook
│
├── public/                       # Static HTML pages
│   └── (legacy pages)
│
├── Root HTML Pages (Legacy System)
│   ├── timesheet.html           # Timesheet management
│   ├── spend.html               # Transaction & invoice tracking
│   ├── grants.html              # Grant management
│   ├── quote.html               # Quote generation
│   ├── gantt.html               # Project timeline
│   └── index.html               # Landing page
│
├── Configuration
│   ├── supabase-client.js       # ⚠️ COMMITTED - Supabase credentials
│   ├── package.json             # Dependencies & scripts
│   ├── next.config.js           # Next.js configuration
│   └── .gitignore               # Git exclusions
│
└── Documentation
    ├── README.md                # Setup & general info
    ├── CLAUDE.md                # This file
    ├── START_HERE.md            # Quick start guide
    └── *.md                     # Feature-specific docs
```

---

## Configuration

### Supabase Connection

**File:** `supabase-client.js` (root directory)

```javascript
const SUPABASE_URL = 'https://gamsynrzeixorftnivps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...'; // Full key in file
```

⚠️ **Security Note:** This file is committed to Git. Keep repository PRIVATE.

### Database Tables

**Core Tables:**
- `pins` - Map pin locations and metadata
- `projects` - Project organization
- `areas` - Polygon areas
- `lines` - Polyline features
- `user_file_details` - Uploaded file metadata
- `saved_timesheets` - Timesheet backups
- `transactions` - Financial transactions
- `grants_allocations` - Grant budgets
- `quotes` - Quote records

**Authentication:**
- Supabase Auth with email/password
- Anonymous auth disabled (security)

### Environment Variables

**Not Currently Used** - All config in `supabase-client.js`

**If Migrating to .env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://gamsynrzeixorftnivps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### Port Configuration

**Default:** Port 8000

**Change in:** `package.json`
```json
"scripts": {
  "dev": "next dev -p 8000"
}
```

⚠️ **Warning:** Changing port creates new browser storage context.

---

## Known Issues & TODOs

### Active TODOs

#### TODO #1: File Opening Functionality
**Location:** `src/app/data-explorer/page.tsx:203-210`

**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 2-3 hours

**Current State:** Shows placeholder toast "Opening {fileName}... (Feature coming soon)"

**Required Implementation:**
1. Create `FilePreviewDialog.tsx` component
2. Add CSV preview with data table
3. Implement file download functionality
4. Optional: Add data visualization preview

**API Requirements:**
- `fileStorageService.downloadFile(filePath)`
- CSV parser (papa-parse recommended)

---

#### TODO #2: Email Service Integration
**Location:** `src/lib/supabase/user-validation-service.ts:290`

**Status:** Not Started
**Priority:** Medium
**Estimated Time:** 3-4 hours

**Current State:** Placeholder function `sendInvitationEmail()` only logs to console

**Required Implementation:**
1. Choose email provider (Resend recommended)
2. Add environment variables for API key
3. Create HTML email template
4. Implement send functionality with error handling
5. Test deliverability

**Recommended Provider:** Resend
```bash
npm install resend
```

**Environment Variables Needed:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=PEBL Pin Sharing
```

---

#### TODO #3: Project Rename Functionality
**Location:** `src/app/map-drawing/page.tsx:6641`

**Status:** Not Started
**Priority:** Low
**Estimated Time:** 1-2 hours

**Current State:** Shows placeholder toast "Project renaming will be available in a future update"

**Required Implementation:**
1. Add inline edit field or dialog
2. Create `updateProjectName()` service function
3. Update Supabase `projects` table
4. Update local state after successful rename
5. Handle validation and errors

**Database Query:**
```sql
UPDATE projects
SET name = $1, updated_at = NOW()
WHERE id = $2 AND user_id = $3
```

---

### Completed Features ✅

#### Map Performance Optimization (Completed: January 23, 2025)
**Issues Resolved:**
- Jagged map dragging during interaction
- Page flashing on initial load
- Multiple component re-renders

**Solutions:**
- Implemented `requestAnimationFrame` throttling for 60fps updates
- Added `hasInitiallyLoaded`, `hasRestoredRef`, `hasInitializedRef` guards
- Deferred expensive state updates until dragging stops

**Performance Improvement:**
- Before: 6 map initializations, 3 database loads
- After: 1 map initialization, 1 database load

---

#### Rarefaction Curve Improvements (Completed: January 23, 2025)
**Enhancements:**
- Added shaded confidence intervals
- Increased curve smoothness (50 → 100 interpolation points)
- Improved chart styling (cleaner axes, better colors)
- Enhanced legend display
- **Default settings:** Michaelis-Menten curve fitting enabled by default

**Files Modified:**
- `src/components/pin-data/RarefactionChart.tsx`
- `src/lib/curve-fitting.ts`
- `src/components/pin-data/HaplotypeHeatmap.tsx`

---

#### Timesheet PDF Export Optimization (Completed: January 19, 2026)
**Improvements:**
- Optimized column widths for better fit
- Enabled text wrapping (no truncation)
- Balanced space allocation for readability

**Column Width Adjustments:**
- Reduced: Day Rate, Hr Rate, Days, Hours, Month (10-20% smaller)
- Reduced: Staff, Signature (50% smaller)
- Increased: W1-W5 columns (30% wider)
- Increased: Signed On (20% wider)

---

### Future Enhancements (Saved for Later)

#### Email Search Feature
**Location:** Spend page
**Status:** Planned, not implemented
**Documentation:** `EMAIL_SEARCH_FEATURE.md`

**Features:**
- Bulk email search across all Gmail accounts
- Keyword and date range filtering
- Bulk attachment downloads (ZIP, merged PDF)
- Email preview before download

**Estimated Effort:** 22 hours

---

#### Unified Date Parser System
**Status:** In Progress
**Priority:** High

**Goal:** Create single intelligent date parser to replace multiple implementations

**Current Issues:**
- Code duplication across `csvParser.ts` and `map-drawing/page.tsx`
- Inconsistent behavior for edge cases
- Hard to maintain

**Approach:**
1. Create `src/lib/unified-date-parser.ts`
2. Support all formats: ISO, DD/MM/YYYY, MM/DD/YYYY, Excel dates, Unix timestamps
3. Intelligent format detection based on data patterns
4. Filename-based overrides for known types (CROP → DD/MM/YYYY)
5. Comprehensive unit tests

---

#### Outlier Cleanup Script
**Status:** Awaiting Requirements
**Priority:** Medium

**Pending Decisions:**
1. Outlier detection method (IQR, Z-score, etc.)
2. Handling strategy (remove, flag, replace)
3. Data scope (width only, length+width, all numeric)
4. User interface (automatic, interactive, preview)

**Documentation:** See Task 2 in earlier documentation

---

## Development Guidelines

### Code Style & Conventions

**File Naming:**
- React components: PascalCase (`PinChartDisplay.tsx`)
- Utilities: camelCase (`csvParser.ts`)
- HTML pages: lowercase with hyphens (`timesheet.html`)

**Component Structure:**
```typescript
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types/Interfaces
interface Props {
  data: string[];
}

// 3. Component
export function ComponentName({ data }: Props) {
  // State
  const [state, setState] = useState();

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return <div>...</div>;
}
```

**Database Operations:**
```typescript
// Always check authentication
await ensureAuthenticated();

// Use try-catch for Supabase calls
try {
  const { data, error } = await supabaseClient
    .from('table_name')
    .select('*')
    .eq('user_id', currentUser.id);

  if (error) throw error;

  // Handle data
} catch (error) {
  console.error('Operation failed:', error);
  // Fallback or user notification
}
```

### MCP Usage Best Practices

**DO:**
- ✅ Read code files directly for context
- ✅ Make focused, targeted edits
- ✅ Trust console logs and test output
- ✅ Complete code changes before visual verification

**DON'T:**
- ❌ Make multiple browser navigation attempts unnecessarily
- ❌ Take full-page screenshots when logs suffice
- ❌ Repeatedly try failed navigation patterns
- ❌ Visual test during active development

**Token Efficiency:**
- Inefficient: 10+ navigation attempts + screenshots = ~6,000 tokens
- Efficient: 4 focused code edits + log review = ~2,000 tokens
- **Savings:** 66% token reduction

### Testing Approach

**Manual Testing Checklist:**
1. Test in browser at http://localhost:8000
2. Check browser console for errors (F12)
3. Verify database operations in Supabase dashboard
4. Test error scenarios (network failure, invalid input)
5. Check responsive design (mobile/tablet)

**Console Logging:**
```javascript
// Use descriptive prefixes
console.log('[Timesheet Export] Starting PDF generation');
console.error('[Database] Failed to save timesheet:', error);
console.warn('[File Upload] File size exceeds 10MB');
```

### Git Workflow

**Commit Messages:**
```bash
# Good
git commit -m "Fix timesheet PDF column widths to prevent cutoff"
git commit -m "Add rarefaction curve confidence intervals"

# Bad
git commit -m "Fixed stuff"
git commit -m "Updates"
```

**Before Committing:**
1. Test changes locally
2. Check console for errors
3. Verify database operations
4. Update documentation if needed

**Files to NEVER commit:**
- `node_modules/`
- `.next/`
- `.env.local` (if created)
- `*.pdf` (generated PDFs)

**Files CURRENTLY committed (but sensitive):**
- `supabase-client.js` ⚠️ Contains credentials - keep repo PRIVATE

---

## Troubleshooting

### Common Issues

#### "Supabase client not initialized"
**Fix:**
1. Check `supabase-client.js` exists in project root
2. Verify file loads in browser (check Network tab)
3. Check browser console for initialization errors

#### "Data not syncing between machines"
**Fix:**
1. Verify same Supabase credentials on both machines
2. Check user is logged in (authentication)
3. Refresh page to trigger re-fetch
4. Check Supabase dashboard for RLS policy issues

#### "PDF export cuts off content"
**Fix:**
1. Adjust column widths in CSS (lines 2944-2953 in `timesheet.html`)
2. Ensure `white-space: normal` and `word-wrap: break-word` are set
3. Test with different browser print settings (scale, margins)

#### "File upload fails"
**Fix:**
1. Check file size (Supabase limit: 50MB default)
2. Verify Supabase Storage bucket exists and has proper policies
3. Check network tab for 413 (file too large) or 403 (permission denied)
4. Ensure user is authenticated

#### "Map not loading"
**Fix:**
1. Check Leaflet CSS is loaded
2. Verify map container has height set in CSS
3. Check browser console for Leaflet errors
4. Clear browser cache and refresh

---

## Performance Optimization

### Current Optimizations

**Map Performance:**
- `requestAnimationFrame` throttling for smooth 60fps updates
- Deferred state updates during continuous movement
- Guard flags to prevent duplicate initialization

**Database Queries:**
- Indexed queries on `user_id` for fast filtering
- RLS policies for security without performance impact
- Batch operations where possible

**File Handling:**
- Client-side CSV parsing (no server load)
- Lazy loading of file content (only when viewed)
- Cached parsed data in component state

### Future Optimization Opportunities

1. **Code Splitting:** Split large components for faster initial load
2. **Image Optimization:** Compress uploaded images, lazy load on map
3. **Virtual Scrolling:** For large data tables in timesheet/spend
4. **Service Worker:** Offline capability and faster load times
5. **Database Indexes:** Add indexes on frequently queried columns

---

## Security Considerations

### Current Security Measures

**Authentication:**
- Supabase Auth with email/password
- Row Level Security (RLS) policies on all tables
- User-scoped data (can only access own records)

**Data Protection:**
- HTTPS for all API calls (Supabase)
- Credentials in committed file (⚠️ PRIVATE REPO REQUIRED)
- No sensitive data in localStorage

### Security TODOs

1. **Move to Environment Variables:**
   - Migrate `supabase-client.js` to `.env.local`
   - Remove credentials from Git history
   - Use build-time injection for production

2. **Audit RLS Policies:**
   - Verify all tables have proper policies
   - Check for data leakage between users
   - Test policy effectiveness

3. **Input Validation:**
   - Sanitize user inputs before database insertion
   - Validate file uploads (type, size, content)
   - Escape HTML in user-generated content

4. **Rate Limiting:**
   - Implement rate limiting for Gmail API calls
   - Add throttling for file uploads
   - Protect against abuse

---

## Deployment

### Current Deployment Status

**Environment:** Development (localhost:8000)

**Production Deployment:** Not yet configured

### Deployment Checklist (When Ready)

**Pre-Deployment:**
- [ ] Move Supabase credentials to environment variables
- [ ] Test all features in production mode (`npm run build && npm start`)
- [ ] Configure production domain in Supabase dashboard
- [ ] Set up SSL certificate (HTTPS required for Geolocation API)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

**Deployment Options:**

**1. Vercel (Recommended for Next.js):**
```bash
npm install -g vercel
vercel deploy
```

**2. Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**3. Traditional Hosting:**
```bash
npm run build
# Upload .next folder and node_modules to server
# Run: node .next/standalone/server.js
```

**Post-Deployment:**
- [ ] Verify environment variables are set
- [ ] Test database connectivity
- [ ] Test file upload/download
- [ ] Check Gmail OAuth redirects work with production domain
- [ ] Monitor error logs for first 24 hours

---

## Useful Commands

### Development
```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Run production build locally
npm start
```

### Database
```bash
# Reset database (destructive!)
# Go to Supabase Dashboard > SQL Editor
# Run: DROP SCHEMA public CASCADE; CREATE SCHEMA public;

# Backup database
# Supabase Dashboard > Database > Backups

# View logs
# Supabase Dashboard > Logs
```

### Git
```bash
# Common workflow
git status
git add .
git commit -m "Description"
git push

# Sync with remote
git pull

# View recent commits
git log --oneline -10

# Discard local changes
git checkout -- <file>
```

---

## Key Contacts & Resources

### Documentation
- **Main README:** README.md
- **Setup Guide:** SETUP.md
- **Quick Start:** START_HERE.md
- **Feature Docs:** Individual *.md files in root

### External Resources
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Leaflet Docs:** https://leafletjs.com/reference.html
- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev

### Internal Tools
- **Browser DevTools:** F12 (check Console, Network, Application tabs)
- **Supabase SQL Editor:** Run custom queries
- **Git History:** `git log` for commit history

---

## Appendix: Useful Code Snippets

### Add New Database Table Service

```typescript
// src/lib/supabase/new-service.ts
import { supabaseClient } from '../../../supabase-client';
import { ensureAuthenticated, getCurrentUser } from './auth-service';

export interface NewRecord {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export async function createRecord(name: string): Promise<NewRecord | null> {
  try {
    await ensureAuthenticated();
    const user = getCurrentUser();

    const { data, error } = await supabaseClient
      .from('new_table')
      .insert([{ user_id: user.id, name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[New Service] Create failed:', error);
    return null;
  }
}

export async function getRecords(): Promise<NewRecord[]> {
  try {
    await ensureAuthenticated();
    const user = getCurrentUser();

    const { data, error } = await supabaseClient
      .from('new_table')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[New Service] Fetch failed:', error);
    return [];
  }
}
```

### Add New React Component

```typescript
// src/components/new-component/NewComponent.tsx
import { useState, useEffect } from 'react';

interface NewComponentProps {
  title: string;
  data: string[];
  onSave?: (value: string) => void;
}

export function NewComponent({ title, data, onSave }: NewComponentProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialization logic
    console.log('[NewComponent] Mounted with data:', data);
  }, [data]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save logic
      await onSave?.(value);
      console.log('[NewComponent] Saved successfully');
    } catch (error) {
      console.error('[NewComponent] Save failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-component">
      <h2>{title}</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value..."
      />
      <button onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
```

### Add CSV Export Function

```javascript
// Utility: Export data to CSV
function exportToCSV(data, filename) {
  // Convert array of objects to CSV
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header =>
        JSON.stringify(row[header] ?? '')
      ).join(',')
    )
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`[Export] Downloaded: ${filename}`);
}

// Usage
const timesheetData = [
  { staff: 'John Doe', hours: 40, rate: 25 },
  { staff: 'Jane Smith', hours: 35, rate: 30 }
];
exportToCSV(timesheetData, 'timesheet-export.csv');
```

---

## Version History

**v1.0 - January 19, 2026**
- Initial CLAUDE.md documentation created
- Documented current application state
- Added timesheet PDF export optimization details
- Comprehensive feature and TODO documentation

---

**End of Documentation**

For questions or clarifications, refer to individual feature documentation files or check the browser console for runtime information.
