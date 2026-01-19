// universal-backup.js
// UNIVERSAL INSTANT BACKUP SYSTEM
// Backs up ALL data types to Supabase instantly
// Add this to ALL pages: index.html, spend.html, quote.html, invoice.html, timesheet.html

console.log('🛡️ [UNIVERSAL-BACKUP] Loading...');

const BACKUP_CONFIG = {
    enabled: true,
    showNotifications: true,
    debounceMs: 2000,  // Wait 2 seconds after last change before backing up
    retryAttempts: 3,
    verbose: true
};

let backupQueue = new Set();
let backupTimeout = null;
let isBackingUp = false;
let lastBackupTime = null;

/**
 * Initialize universal backup system
 */
async function initUniversalBackup() {
    console.log('🛡️ [UNIVERSAL-BACKUP] Initializing...');

    try {
        // Wait for Supabase
        await waitForSupabase();

        if (!supabaseClient) {
            throw new Error('Supabase client not available. Check supabase-client.js is loaded.');
        }

        await ensureAuthenticated();

        if (!currentUser) {
            throw new Error('Not authenticated to Supabase. Check your auth setup.');
        }

        // Set up monitors for all data types
        monitorLocalStorage();
        monitorIndexedDB();

        // Periodic health check
        setInterval(checkBackupHealth, 60000); // Every minute

        console.log('✅ [UNIVERSAL-BACKUP] Ready - ALL data will backup instantly');
        updateBackupIndicator('ready');

    } catch (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Initialization failed:', error);
        updateBackupIndicator('error');
        showPersistentErrorBanner(`🔒 BACKUP NOT WORKING: ${error.message}`);
    }
}

/**
 * Queue data for backup
 */
function queueBackup(dataType, data) {
    const key = `${dataType}:${JSON.stringify(data).substring(0, 100)}`;
    backupQueue.add({ dataType, data, timestamp: Date.now() });

    // Debounce: wait for changes to stop before backing up
    if (backupTimeout) clearTimeout(backupTimeout);

    backupTimeout = setTimeout(() => {
        processBackupQueue();
    }, BACKUP_CONFIG.debounceMs);

    if (BACKUP_CONFIG.verbose) {
        console.log(`🛡️ [UNIVERSAL-BACKUP] Queued: ${dataType}`);
    }
}

/**
 * Process backup queue
 */
async function processBackupQueue() {
    if (isBackingUp || backupQueue.size === 0) return;

    isBackingUp = true;
    updateBackupIndicator('syncing');

    const items = Array.from(backupQueue);
    backupQueue.clear();

    console.log(`🛡️ [UNIVERSAL-BACKUP] Processing ${items.length} items...`);

    let success = 0;
    let failed = 0;
    let authError = false;
    let networkError = false;

    for (const item of items) {
        try {
            await backupItem(item.dataType, item.data);
            success++;
        } catch (error) {
            console.error(`❌ [UNIVERSAL-BACKUP] Failed: ${item.dataType}`, error);
            failed++;

            // Detect error type
            if (error.message && (error.message.includes('JWT') || error.message.includes('auth') || error.message.includes('unauthorized'))) {
                authError = true;
            } else if (error.message && (error.message.includes('network') || error.message.includes('fetch'))) {
                networkError = true;
            }
        }
    }

    lastBackupTime = new Date();
    isBackingUp = false;

    if (failed > 0) {
        console.error(`❌ [UNIVERSAL-BACKUP] BACKUP FAILED: ${success} success, ${failed} failed`);
        updateBackupIndicator('error');

        // Show prominent error notification
        let errorMsg = `⚠️ BACKUP FAILED: ${failed} items not saved!`;
        if (authError) {
            errorMsg = '🔒 BACKUP FAILED: Not logged in to Supabase! Your changes are NOT being saved.';
        } else if (networkError) {
            errorMsg = '🌐 BACKUP FAILED: Network error! Check your internet connection.';
        }

        showBackupNotification(errorMsg, 'error');
        showPersistentErrorBanner(errorMsg);
    } else {
        console.log(`✅ [UNIVERSAL-BACKUP] Complete: ${success} success, ${failed} failed`);
        updateBackupIndicator('success');
        hidePersistentErrorBanner();

        if (BACKUP_CONFIG.showNotifications && success > 0) {
            showBackupNotification(`✅ Backed up ${success} items`, 'success');
        }
    }
}

/**
 * Backup individual item
 */
async function backupItem(dataType, data) {
    await ensureAuthenticated();

    switch (dataType) {
        case 'transaction':
            return await backupTransaction(data);
        case 'labour_allocation':
            return await backupLabourAllocation(data);
        case 'quote':
            return await backupQuote(data);
        case 'invoice':
            return await backupInvoice(data);
        case 'client':
            return await backupClient(data);
        case 'timesheet':
            return await backupTimesheet(data);
        case 'pricelist':
            return await backupPricelistItem(data);
        case 'project':
            return await backupProject(data);
        case 'gantt':
            return await backupGantt(data);
        case 'staff_signature':
            return await backupStaffSignature(data);
        case 'user_preferences':
            return await backupUserPreferences(data);
        case 'keyword_aliases':
            return await backupKeywordAliases(data);
        case 'gmail_accounts':
            return await backupGmailAccounts(data);
        default:
            console.warn(`Unknown data type: ${dataType}`);
    }
}

/**
 * Backup transaction
 */
async function backupTransaction(transaction) {
    // Helper: Clean currency string (remove £, $, €, commas, whitespace)
    function cleanCurrency(value) {
        if (!value || value === '') return 0;
        if (typeof value === 'number') return value;
        // Remove currency symbols, commas, and whitespace, then parse
        const cleaned = String(value).replace(/[£$€,\s]/g, '');
        return parseFloat(cleaned) || 0;
    }

    // Helper: Convert DD/MM/YYYY to YYYY-MM-DD
    function convertDate(dateStr) {
        if (!dateStr) return null;
        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            const [_, day, month, year] = match;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return dateStr; // Return as-is if format not recognized
    }

    // Handle different amount formats (spent/received from spend.html, or amount from other sources)
    let amount = 0;
    if (transaction.amount !== undefined && transaction.amount !== null) {
        amount = cleanCurrency(transaction.amount);
    } else if (transaction.spent) {
        amount = -Math.abs(cleanCurrency(transaction.spent)); // Negative for spent
    } else if (transaction.received) {
        amount = Math.abs(cleanCurrency(transaction.received)); // Positive for received
    }

    const transactionData = {
        user_id: currentUser.id,
        date: convertDate(transaction.date),
        description: transaction.description || transaction.desc,
        amount: amount,
        bank: transaction.bank,
        category: transaction.category || transaction.type,
        allocation: transaction.allocation || transaction.project,
        invoice_filename: transaction.invoice || transaction.invoiceFile,
        notes: transaction.notes,
        transaction_data: transaction
    };

    const { data, error } = await supabaseClient
        .from('transactions')
        .upsert(transactionData, {
            onConflict: 'user_id,date,description,amount'
        })
        .select();

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Failed: transaction', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        });
        throw error;
    }

    // Log successful insert for debugging (can be removed later)
    if (data && data.length > 0) {
        console.log(`✅ [UNIVERSAL-BACKUP] Transaction saved: ${data[0].id} | ${transactionData.date} | ${transactionData.description.substring(0, 30)}...`);
    }
}

/**
 * Backup labour allocation entry
 */
async function backupLabourAllocation(entry) {
    // Validate required fields
    if (!entry.month) {
        console.warn('⚠️ [UNIVERSAL-BACKUP] Skipping labour entry - missing month:', entry);
        return; // Skip invalid entries
    }

    const staffName = entry.staffName || entry.staff;
    if (!staffName || staffName.trim() === '') {
        console.warn('⚠️ [UNIVERSAL-BACKUP] Skipping labour entry - missing staff name:', entry.month);
        return; // Skip invalid entries
    }

    const { error } = await supabaseClient
        .from('labour_allocation_entries')
        .upsert({
            user_id: currentUser.id,
            month: entry.month,
            staff_name: staffName,
            gross_pay: parseFloat(entry.grossPay || entry.gross || 0),
            fte: parseFloat(entry.fte || 1),
            project_allocations: entry.allocations || entry.projects,
            entry_data: entry
        }, {
            onConflict: 'user_id,month,staff_name'
        });

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Labour backup failed:', {
            month: entry.month,
            staff: staffName,
            error: error.message,
            details: error.details,
            hint: error.hint
        });
        throw error;
    }
}

/**
 * Backup quote
 */
async function backupQuote(quote) {
    const { error } = await supabaseClient
        .from('quotes')
        .upsert({
            user_id: currentUser.id,
            quote_number: quote.quoteNumber || quote.number,
            client_name: quote.clientName || quote.client,
            client_organization: quote.clientOrganization || quote.organization,
            client_address: quote.clientAddress || quote.address,
            quote_date: quote.quoteDate || quote.date,
            valid_until: quote.validUntil,
            items: quote.items,
            subtotal: parseFloat(quote.subtotal || 0),
            vat: parseFloat(quote.vat || 0),
            total: parseFloat(quote.total || 0),
            notes: quote.notes,
            status: quote.status || 'draft',
            quote_data: quote
        }, {
            onConflict: 'user_id,quote_number'
        });

    if (error) throw error;
}

/**
 * Backup invoice
 */
async function backupInvoice(invoice) {
    const { error } = await supabaseClient
        .from('saved_invoices')
        .upsert({
            user_id: currentUser.id,
            invoice_number: invoice.invoiceNumber || invoice.number,
            client_name: invoice.clientName || invoice.client,
            client_organization: invoice.clientOrganization || invoice.organization,
            client_address: invoice.clientAddress || invoice.address,
            invoice_date: invoice.invoiceDate || invoice.date,
            due_date: invoice.dueDate,
            items: invoice.items,
            subtotal: parseFloat(invoice.subtotal || 0),
            vat: parseFloat(invoice.vat || 0),
            total: parseFloat(invoice.total || 0),
            notes: invoice.notes,
            status: invoice.status || 'draft',
            invoice_data: invoice
        }, {
            onConflict: 'user_id,invoice_number'
        });

    if (error) throw error;
}

/**
 * Backup client
 */
async function backupClient(client) {
    const { error } = await supabaseClient
        .from('clients')
        .upsert({
            user_id: currentUser.id,
            client_name: client.name || client.clientName,
            organization: client.organization,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            client_data: client
        }, {
            onConflict: 'user_id,client_name,organization'
        });

    if (error) throw error;
}

/**
 * Backup timesheet entry
 */
async function backupTimesheet(entry) {
    const { error } = await supabaseClient
        .from('timesheets')
        .upsert({
            user_id: currentUser.id,
            date: entry.date,
            staff_name: entry.staffName || entry.staff,
            project: entry.project,
            hours: parseFloat(entry.hours || 0),
            task_description: entry.task || entry.description,
            notes: entry.notes,
            timesheet_data: entry
        }, {
            onConflict: 'user_id,date,staff_name,project'
        });

    if (error) throw error;
}

/**
 * Backup pricelist item
 */
async function backupPricelistItem(item) {
    const { error } = await supabaseClient
        .from('price_list')
        .upsert({
            user_id: currentUser.id,
            item_name: item.name || item.itemName,
            description: item.description,
            unit_price: parseFloat(item.price || item.unitPrice || 0),
            unit: item.unit,
            category: item.category,
            item_data: item
        }, {
            onConflict: 'user_id,item_name'
        });

    if (error) throw error;
}

/**
 * Backup project (already handled by auto-sync-manager.js but included for completeness)
 */
async function backupProject(project) {
    const { error } = await supabaseClient
        .from('projects')
        .upsert({
            user_id: currentUser.id,
            project_name: project.projectName,
            project_number: project.projectNumber,
            budget_data: project,
            last_modified: project.lastModified || new Date().toISOString()
        }, {
            onConflict: 'user_id,project_name'
        });

    if (error) throw error;
}

/**
 * Backup gantt chart
 */
async function backupGantt(ganttData) {
    const projectKey = ganttData.projectKey || ganttData.name || 'default';

    const { error } = await supabaseClient
        .from('gantt_projects')
        .upsert({
            user_id: currentUser.id,
            project_key: projectKey,
            project_name: ganttData.name || ganttData.projectName,
            tasks: ganttData.tasks || [],
            gantt_data: ganttData
        }, {
            onConflict: 'user_id,project_key'
        });

    if (error) throw error;
}

/**
 * Backup staff signature
 */
async function backupStaffSignature(signatureData) {
    // signatureData: { staffName: string, signatureImage: string (data URL) }
    if (!signatureData.staffName) {
        console.warn('⚠️ [UNIVERSAL-BACKUP] Skipping signature - missing staff name');
        return;
    }

    const { error } = await supabaseClient
        .from('staff_signatures')
        .upsert({
            user_id: currentUser.id,
            staff_name: signatureData.staffName,
            signature_image: signatureData.signatureImage,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'user_id,staff_name'
        });

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Staff signature backup failed:', {
            staff: signatureData.staffName,
            error: error.message
        });
        throw error;
    }
}

/**
 * Backup user preferences
 */
async function backupUserPreferences(preferences) {
    const { error } = await supabaseClient
        .from('user_preferences')
        .upsert({
            user_id: currentUser.id,
            preference_key: preferences.key,
            preference_value: preferences.value,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'user_id,preference_key'
        });

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] User preference backup failed:', {
            key: preferences.key,
            error: error.message
        });
        throw error;
    }
}

/**
 * Backup keyword aliases
 */
async function backupKeywordAliases(aliases) {
    const { error } = await supabaseClient
        .from('keyword_aliases')
        .upsert({
            user_id: currentUser.id,
            aliases_data: aliases,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Keyword aliases backup failed:', error.message);
        throw error;
    }
}

/**
 * Backup Gmail accounts (without sensitive OAuth tokens)
 */
async function backupGmailAccounts(accounts) {
    if (!Array.isArray(accounts)) {
        console.warn('⚠️ [UNIVERSAL-BACKUP] Gmail accounts must be an array');
        return;
    }

    // Strip sensitive OAuth tokens before backup
    const sanitizedAccounts = accounts.map(account => ({
        email: account.email,
        name: account.name,
        // DO NOT backup: access_token, refresh_token, etc.
    }));

    const { error } = await supabaseClient
        .from('gmail_accounts')
        .upsert({
            user_id: currentUser.id,
            accounts: sanitizedAccounts,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('❌ [UNIVERSAL-BACKUP] Gmail accounts backup failed:', error.message);
        throw error;
    }

    console.log(`✅ [UNIVERSAL-BACKUP] Gmail accounts backed up (${sanitizedAccounts.length} accounts, tokens excluded)`);
}

/**
 * Monitor localStorage for changes
 */
function monitorLocalStorage() {
    const originalSetItem = localStorage.setItem;

    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);

        // Detect data type from key
        const keyLower = key.toLowerCase();

        try {
            const data = JSON.parse(value);

            // Skip UI state and history keys
            if (keyLower.includes('history') || keyLower.includes('cache') || keyLower.includes('temp')) {
                console.log(`ℹ️ [UNIVERSAL-BACKUP] Skipping UI state: ${key}`);
                return;
            }

            // Skip API keys (security risk - should not be backed up)
            if (keyLower.includes('api_key') || keyLower.includes('apikey')) {
                console.log(`🔒 [UNIVERSAL-BACKUP] Skipping API key: ${key}`);
                return;
            }

            // Handle staff signatures (stored as object mapping staff names to signature images)
            if (key === 'timesheet_staff_signatures' && typeof data === 'object' && !Array.isArray(data)) {
                console.log('📝 [UNIVERSAL-BACKUP] Backing up staff signatures');
                Object.keys(data).forEach(staffName => {
                    queueBackup('staff_signature', {
                        staffName: staffName,
                        signatureImage: data[staffName]
                    });
                });
                return;
            }

            // Handle keyword aliases
            if (key === 'keywordAliases' && typeof data === 'object') {
                console.log('🏷️ [UNIVERSAL-BACKUP] Backing up keyword aliases');
                queueBackup('keyword_aliases', data);
                return;
            }

            // Handle Gmail accounts (sanitize OAuth tokens)
            if (key === 'gmailAccounts' && Array.isArray(data)) {
                console.log('📧 [UNIVERSAL-BACKUP] Backing up Gmail accounts (tokens excluded)');
                queueBackup('gmail_accounts', data);
                return;
            }

            // Handle user preferences
            if (key === 'spendTableSettings' || key === 'darkMode' || key === 'completionViewMode' ||
                key === 'taskColumnWidth' || key === 'labourBudgetCollapsed' || key === 'monthStates') {
                console.log(`⚙️ [UNIVERSAL-BACKUP] Backing up preference: ${key}`);
                queueBackup('user_preferences', {
                    key: key,
                    value: data
                });
                return;
            }

            // Handle payslip folder map
            if (key === 'payslip_folder_map' && typeof data === 'object') {
                console.log('📁 [UNIVERSAL-BACKUP] Backing up payslip folder map');
                queueBackup('user_preferences', {
                    key: 'payslip_folder_map',
                    value: data
                });
                return;
            }

            // Handle payslip team members
            if (key === 'payslip_team_members' && typeof data === 'object') {
                console.log('👥 [UNIVERSAL-BACKUP] Backing up payslip team members');
                queueBackup('user_preferences', {
                    key: 'payslip_team_members',
                    value: data
                });
                return;
            }

            if (keyLower.includes('transaction') && Array.isArray(data)) {
                data.forEach(t => queueBackup('transaction', t));
            } else if (keyLower.includes('gantt')) {
                // Handle gantt data (can be object with multiple projects)
                if (typeof data === 'object' && !Array.isArray(data)) {
                    Object.keys(data).forEach(projectKey => {
                        const ganttProject = { ...data[projectKey], projectKey };
                        queueBackup('gantt', ganttProject);
                    });
                } else if (Array.isArray(data)) {
                    data.forEach(g => queueBackup('gantt', g));
                }
            } else if (keyLower.includes('quote') && Array.isArray(data)) {
                data.forEach(q => queueBackup('quote', q));
            } else if (keyLower.includes('invoice') && Array.isArray(data)) {
                data.forEach(i => queueBackup('invoice', i));
            } else if (keyLower.includes('client') && Array.isArray(data)) {
                data.forEach(c => queueBackup('client', c));
            } else if (keyLower.includes('timesheet') && Array.isArray(data)) {
                // Only backup actual timesheet entries with valid date field
                data.forEach(t => {
                    if (t && t.date) {
                        queueBackup('timesheet', t);
                    } else {
                        console.warn('⚠️ [UNIVERSAL-BACKUP] Skipping timesheet entry without date field');
                    }
                });
            } else if (keyLower.includes('labour') || keyLower.includes('labor')) {
                if (Array.isArray(data)) {
                    // Direct array of labour entries
                    data.forEach(l => queueBackup('labour_allocation', l));
                } else if (data && data.rows && Array.isArray(data.rows)) {
                    // Labour allocation data object with rows array (from timesheet.html)
                    data.rows.forEach(row => {
                        // Only queue rows with valid month and staff name
                        if (row.month && row.staff && row.staff.trim() !== '') {
                            queueBackup('labour_allocation', row);
                        }
                    });
                } else {
                    // Single labour entry
                    queueBackup('labour_allocation', data);
                }
            }
        } catch (e) {
            // Not JSON, ignore
        }
    };

    console.log('👀 [UNIVERSAL-BACKUP] Monitoring localStorage');
}

/**
 * Monitor IndexedDB for changes
 */
function monitorIndexedDB() {
    const originalOpen = indexedDB.open;

    indexedDB.open = function(...args) {
        const request = originalOpen.apply(this, args);

        request.addEventListener('success', function() {
            const db = this.result;
            const originalTransaction = db.transaction.bind(db);

            db.transaction = function(storeNames, mode) {
                const tx = originalTransaction(storeNames, mode);

                if (mode === 'readwrite') {
                    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

                    stores.forEach(storeName => {
                        const store = tx.objectStore(storeName);
                        const originalPut = store.put.bind(store);
                        const originalAdd = store.add.bind(store);

                        store.put = function(value) {
                            const request = originalPut(value);
                            request.addEventListener('success', () => {
                                detectAndQueueBackup(storeName, value);
                            });
                            return request;
                        };

                        store.add = function(value) {
                            const request = originalAdd(value);
                            request.addEventListener('success', () => {
                                detectAndQueueBackup(storeName, value);
                            });
                            return request;
                        };
                    });
                }

                return tx;
            };
        });

        return request;
    };

    console.log('👀 [UNIVERSAL-BACKUP] Monitoring IndexedDB');
}

/**
 * Detect data type and queue backup
 */
function detectAndQueueBackup(storeName, value) {
    const name = storeName.toLowerCase();

    if (name.includes('transaction')) {
        queueBackup('transaction', value);
    } else if (name.includes('gantt')) {
        queueBackup('gantt', value);
    } else if (name.includes('project')) {
        queueBackup('project', value);
    } else if (name.includes('invoice')) {
        queueBackup('invoice', value);
    } else if (name.includes('quote')) {
        queueBackup('quote', value);
    } else if (name.includes('client')) {
        queueBackup('client', value);
    } else if (name.includes('timesheet')) {
        queueBackup('timesheet', value);
    } else if (name.includes('labour') || name.includes('labor')) {
        queueBackup('labour_allocation', value);
    }
}

/**
 * Check backup health
 */
function checkBackupHealth() {
    if (!lastBackupTime) return;

    const minutesSinceBackup = (Date.now() - lastBackupTime.getTime()) / 60000;

    if (minutesSinceBackup > 10) {
        console.warn('⚠️ [UNIVERSAL-BACKUP] No backup in 10+ minutes');
        updateBackupIndicator('warning');
    }
}

/**
 * Update backup indicator in UI
 */
function updateBackupIndicator(status) {
    // Find or create backup indicator
    let indicator = document.getElementById('backup-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'backup-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            z-index: 10000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(indicator);
    }

    const colors = {
        ready: { bg: '#10b981', text: 'white', icon: '✅', message: 'Backup Ready' },
        syncing: { bg: '#3b82f6', text: 'white', icon: '🔄', message: 'Backing up...' },
        success: { bg: '#10b981', text: 'white', icon: '✅', message: 'Backed up' },
        warning: { bg: '#f59e0b', text: 'white', icon: '⚠️', message: 'Backup delayed' },
        error: { bg: '#ef4444', text: 'white', icon: '❌', message: 'Backup FAILED' }
    };

    const style = colors[status] || colors.ready;

    indicator.style.background = style.bg;
    indicator.style.color = style.text;
    indicator.innerHTML = `${style.icon} ${style.message}`;

    if (lastBackupTime && status === 'success') {
        const timeAgo = Math.floor((Date.now() - lastBackupTime.getTime()) / 1000);
        indicator.innerHTML += ` (${timeAgo}s ago)`;
    }

    // Add pulsing animation for errors and warnings
    if (status === 'error' || status === 'warning') {
        indicator.style.animation = 'pulse 2s infinite';
        indicator.style.opacity = '1';
        indicator.style.cursor = 'pointer';
        indicator.onclick = () => {
            alert('⚠️ Backup system is not working!\n\nYour changes are NOT being saved to the cloud.\n\nPossible causes:\n• Not logged in to Supabase\n• Internet connection issue\n• Supabase service down\n\nCheck the browser console for details.');
        };

        // Add pulse animation CSS if not exists
        if (!document.getElementById('backup-pulse-animation')) {
            const animStyle = document.createElement('style');
            animStyle.id = 'backup-pulse-animation';
            animStyle.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                }
            `;
            document.head.appendChild(animStyle);
        }
    } else if (status === 'success') {
        indicator.style.animation = '';
        indicator.onclick = null;
        // Auto-hide after 3 seconds
        setTimeout(() => {
            indicator.style.opacity = '0.5';
        }, 3000);
    } else {
        indicator.style.animation = '';
        indicator.onclick = null;
        indicator.style.opacity = '1';
    }
}

/**
 * Show backup notification
 */
function showBackupNotification(message, type) {
    if (typeof showSimpleToast === 'function') {
        showSimpleToast(message, type);
    }
}

/**
 * Manual backup trigger
 */
async function backupAllDataNow() {
    console.log('🛡️ [UNIVERSAL-BACKUP] Manual backup triggered');
    updateBackupIndicator('syncing');

    // Force immediate backup of all data
    backupQueue.clear();
    if (backupTimeout) clearTimeout(backupTimeout);

    await processBackupQueue();

    showBackupNotification('✅ Manual backup complete', 'success');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initUniversalBackup, 2000);
    });
} else {
    setTimeout(initUniversalBackup, 2000);
}

/**
 * Show persistent error banner at top of page
 */
function showPersistentErrorBanner(message) {
    // Remove existing banner if any
    hidePersistentErrorBanner();

    const banner = document.createElement('div');
    banner.id = 'backup-error-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 15px 20px;
        text-align: center;
        font-size: 16px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
    `;
    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <span style="font-size: 24px;">⚠️</span>
            <span>${message}</span>
            <button onclick="window.universalBackup.dismissError()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: 600;">Dismiss</button>
        </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    document.body.prepend(banner);

    // Also log to console prominently
    console.error('═══════════════════════════════════════════════');
    console.error('⚠️  BACKUP SYSTEM FAILURE  ⚠️');
    console.error(message);
    console.error('═══════════════════════════════════════════════');
}

/**
 * Hide persistent error banner
 */
function hidePersistentErrorBanner() {
    const existing = document.getElementById('backup-error-banner');
    if (existing) {
        existing.remove();
    }
}

// Export functions
window.universalBackup = {
    backupNow: backupAllDataNow,
    queueBackup: queueBackup,
    getLastBackupTime: () => lastBackupTime,
    isBackingUp: () => isBackingUp,
    dismissError: hidePersistentErrorBanner,
    config: BACKUP_CONFIG
};

console.log('✅ [UNIVERSAL-BACKUP] System loaded');
