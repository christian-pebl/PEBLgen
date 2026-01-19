# Quick Start Guide - PEBLGen CLI

## Installation Complete! ✅

Your hybrid CLI interface is ready to use. Here's how to get started.

---

## Quick Test (30 seconds)

\`\`\`bash
# 1. Navigate to CLI directory
cd cli

# 2. Test connection
npm run pebl -- test
# Should show: ✓ Connection successful!

# 3. Show help
npm run pebl -- --help

# 4. Add a test transaction
npm run pebl -- add --date 2025-01-14 --amount -25.50 --description "Test from CLI" --category "Testing"

# 5. List transactions
npm run pebl -- list --limit 10
\`\`\`

---

## Most Useful Commands

### Add a Transaction
\`\`\`bash
npm run pebl -- add --date 2025-01-14 --amount -45.67 --description "Tesco groceries" --category "Groceries" --bank "Metro"
\`\`\`

### Bulk Categorize
\`\`\`bash
# Preview first (dry run)
npm run pebl -- categorize --filter "description contains 'Amazon'" --category "Shopping" --dry-run

# Then apply
npm run pebl -- categorize --filter "description contains 'Amazon'" --category "Shopping"
\`\`\`

### Find Duplicates
\`\`\`bash
npm run pebl -- duplicates --start 2025-12-01 --end 2025-12-31
\`\`\`

### Analyze Spending
\`\`\`bash
npm run pebl -- analyze --start 2025-12-01 --end 2025-12-31 --group-by category
\`\`\`

---

For full documentation, see: cli/README.md
