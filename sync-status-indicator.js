// sync-status-indicator.js
// Visual sync status indicator for all pages

console.log('📊 [SYNC STATUS] Indicator loaded');

// Sync status states
const SYNC_STATUS = {
    SYNCED: 'synced',       // ✓ Everything backed up
    SYNCING: 'syncing',     // ⟳ Currently syncing
    PENDING: 'pending',     // ⏳ Changes waiting to sync
    ERROR: 'error',         // ❌ Sync failed
    DISABLED: 'disabled',   // ⚪ Sync not available
};

let currentStatus = SYNC_STATUS.DISABLED;
let statusIndicator = null;
let lastSyncText = '';
let retryCount = 0;
const MAX_RETRIES = 20;

/**
 * Initialize sync status indicator
 */
function initSyncStatusIndicator() {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSyncIndicator);
    } else {
        createSyncIndicator();
    }
}

/**
 * Create the sync indicator UI element
 */
function createSyncIndicator() {
    // Check if already created
    if (document.getElementById('sync-status-indicator')) return;

    // Find the navigation bar
    const navBar = document.querySelector('.nav-buttons');
    if (!navBar) {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
            console.warn(`⚠️ [SYNC STATUS] Navigation bar not found, retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(createSyncIndicator, 500);
        } else {
            console.error('❌ [SYNC STATUS] Navigation bar not found after maximum retries. Giving up.');
        }
        return;
    }

    // Create indicator as a nav button with dropdown
    const indicator = document.createElement('button');
    indicator.id = 'sync-status-indicator';
    indicator.className = 'nav-btn sync-status-btn';
    indicator.innerHTML = `
        <span class="sync-icon" id="syncIcon">☁️</span>
    `;
    indicator.title = 'Initializing backup...';
    indicator.style.position = 'relative';

    // Create dropdown panel
    const dropdown = document.createElement('div');
    dropdown.id = 'sync-status-dropdown';
    dropdown.className = 'sync-dropdown';
    dropdown.style.display = 'none';
    dropdown.innerHTML = `
        <div class="sync-dropdown-header">
            <span id="syncDropdownTitle">☁️ Backup Status</span>
        </div>
        <div class="sync-dropdown-content" id="syncDropdownContent">
            <div class="sync-status-text" id="syncStatusDetails">Loading...</div>
            <div class="sync-data-list">
                <div class="sync-data-label">📊 What's backed up:</div>
                <div class="sync-data-items">
                    • Project budgets<br>
                    • Transactions & PDFs<br>
                    • Gantt charts<br>
                    • Sketcher data
                </div>
            </div>
        </div>
        <div class="sync-dropdown-actions">
            <button id="syncNowBtn" class="sync-action-btn sync-primary-btn" onclick="handleManualSync()">
                🔄 Sync Now
            </button>
            <button id="refreshSpendBtn" class="sync-action-btn sync-secondary-btn" onclick="handleRefreshSpendData()" style="display: none;">
                💰 Refresh Spend Data
            </button>
        </div>
    `;

    // Insert before the "↑ Top" button or "Reset Backup" button (or at the end if neither exists)
    const topButton = Array.from(navBar.children).find(btn =>
        btn.textContent.includes('Top') || btn.textContent.includes('Reset Backup')
    );
    if (topButton) {
        navBar.insertBefore(indicator, topButton);
    } else {
        navBar.appendChild(indicator);
    }

    // Append dropdown to indicator
    indicator.appendChild(dropdown);

    statusIndicator = indicator;

    // Add click handler to toggle dropdown
    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSyncDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!indicator.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Show "Refresh Spend Data" button only on grants.html
    if (window.location.pathname.includes('grants.html')) {
        document.getElementById('refreshSpendBtn').style.display = 'block';
    }

    console.log('✅ [SYNC STATUS] Indicator created');

    // Start monitoring sync status
    startStatusMonitoring();
}

/**
 * Start monitoring sync status
 */
function startStatusMonitoring() {
    // Check status every second
    setInterval(updateSyncStatus, 1000);

    // Listen for Supabase ready event
    window.addEventListener('supabaseReady', () => {
        updateSyncStatus();
    });

    // Listen for user authenticated event
    window.addEventListener('userAuthenticated', () => {
        updateSyncStatus();
    });

    // Initial check
    setTimeout(updateSyncStatus, 500);
}

/**
 * Update sync status based on current state
 */
function updateSyncStatus() {
    if (!window.autoSync) {
        setSyncStatus(SYNC_STATUS.DISABLED, 'Backup system loading...');
        return;
    }

    if (!window.currentUser) {
        setSyncStatus(SYNC_STATUS.DISABLED, 'Authenticating...');
        return;
    }

    // Check for database setup errors
    if (window.autoSync.hasSetupError && window.autoSync.hasSetupError()) {
        const errorMsg = window.autoSync.getLastError ? window.autoSync.getLastError() : 'Setup required';
        setSyncStatus(SYNC_STATUS.ERROR, errorMsg);
        return;
    }

    // Check if currently syncing
    if (window.autoSync.isSyncing()) {
        setSyncStatus(SYNC_STATUS.SYNCING, 'Backing up your data...');
        return;
    }

    // Check last sync time
    const lastSync = window.autoSync.getLastSyncTime();

    if (!lastSync) {
        setSyncStatus(SYNC_STATUS.PENDING, 'Waiting for first backup...');
        return;
    }

    // Calculate time since last sync
    const timeSinceSync = Date.now() - lastSync.getTime();
    const minutesAgo = Math.floor(timeSinceSync / 60000);
    const secondsAgo = Math.floor(timeSinceSync / 1000);

    let timeText;
    if (minutesAgo > 0) {
        timeText = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
    } else if (secondsAgo > 5) {
        timeText = `${secondsAgo} seconds ago`;
    } else {
        timeText = 'just now';
    }

    // If sync was recent (within 5 seconds), show synced
    if (secondsAgo < 5) {
        setSyncStatus(SYNC_STATUS.SYNCED, `✓ All backed up (${timeText})`);
    } else if (timeSinceSync < 30000) {
        // Within 30 seconds - still good
        setSyncStatus(SYNC_STATUS.SYNCED, `✓ Backed up ${timeText}`);
    } else {
        // Over 30 seconds - might have pending changes
        setSyncStatus(SYNC_STATUS.PENDING, `Last backup: ${timeText}`);
    }
}

/**
 * Set sync status and update UI
 */
function setSyncStatus(status, tooltipText) {
    if (!statusIndicator) return;

    currentStatus = status;
    lastSyncText = tooltipText;

    const icon = document.getElementById('syncIcon');

    if (!icon) return;

    // Remove all status classes
    statusIndicator.classList.remove('synced', 'syncing', 'pending', 'error', 'disabled');

    // Add current status class
    statusIndicator.classList.add(status);

    // Reset icon styles
    icon.style.opacity = '1';
    icon.style.animation = 'none';

    // Update icon and animation based on status
    switch (status) {
        case SYNC_STATUS.SYNCED:
            icon.innerHTML = '☁️<span class="sync-check">✓</span>';
            break;

        case SYNC_STATUS.SYNCING:
            icon.innerHTML = '☁️<span class="sync-spinner">⟳</span>';
            icon.style.animation = 'spin 2s linear infinite';
            break;

        case SYNC_STATUS.PENDING:
            icon.innerHTML = '☁️<span class="sync-pending">⏳</span>';
            icon.style.animation = 'pulse 2s ease-in-out infinite';
            break;

        case SYNC_STATUS.ERROR:
            icon.innerHTML = '☁️<span class="sync-error">⚠️</span>';
            break;

        case SYNC_STATUS.DISABLED:
            icon.innerHTML = '☁️';
            icon.style.opacity = '0.5';
            break;
    }

    // Update tooltip (title attribute)
    statusIndicator.title = tooltipText;
}

/**
 * Toggle sync dropdown visibility
 */
function toggleSyncDropdown() {
    const dropdown = document.getElementById('sync-status-dropdown');
    if (!dropdown) return;

    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        updateDropdownContent();
    }
}

/**
 * Update dropdown content with current status
 */
function updateDropdownContent() {
    const detailsEl = document.getElementById('syncStatusDetails');
    if (!detailsEl) return;

    const lastSync = window.autoSync?.getLastSyncTime();
    const isSyncing = window.autoSync?.isSyncing();
    const isEnabled = window.autoSync?.config?.enabled;
    const hasError = window.autoSync?.hasSetupError?.();

    let statusHTML = '';

    if (!window.autoSync) {
        statusHTML = '<div class="sync-status-item">⚪ <strong>Not initialized</strong></div>';
    } else if (!window.currentUser) {
        statusHTML = '<div class="sync-status-item">⚪ <strong>Not authenticated</strong></div>';
    } else if (hasError) {
        statusHTML = `
            <div class="sync-status-item sync-error-item">
                ❌ <strong>Setup Required</strong>
            </div>
            <div class="sync-error-details">
                ⚠️ Database tables not created<br><br>
                📝 <strong>Solution:</strong><br>
                1. Open Supabase Dashboard<br>
                2. Go to SQL Editor<br>
                3. Run the table creation scripts<br>
                4. Refresh this page<br><br>
                <small>See SUPABASE_MIGRATION_README.md for details</small>
            </div>
        `;
    } else if (!isEnabled) {
        statusHTML = '<div class="sync-status-item">⚪ <strong>Disabled</strong></div>';
    } else if (isSyncing) {
        statusHTML = '<div class="sync-status-item sync-syncing">⟳ <strong>Backing up now...</strong></div>';
    } else if (lastSync) {
        const timeAgo = Math.floor((Date.now() - lastSync.getTime()) / 1000);
        const minutesAgo = Math.floor(timeAgo / 60);
        const timeText = minutesAgo > 0 ? `${minutesAgo} min ago` : `${timeAgo} sec ago`;

        statusHTML = `
            <div class="sync-status-item sync-synced">✅ <strong>All backed up</strong></div>
            <div class="sync-time-info">
                📅 Last backup: ${lastSync.toLocaleTimeString()}<br>
                ⏱️ ${timeText}
            </div>
        `;
    } else {
        statusHTML = '<div class="sync-status-item">⏳ <strong>Waiting for first backup</strong></div>';
    }

    detailsEl.innerHTML = statusHTML;
}

/**
 * Handle manual sync button click
 */
function handleManualSync() {
    if (!window.autoSync) {
        alert('⚠️ Auto-sync not initialized');
        return;
    }

    if (window.autoSync.isSyncing()) {
        alert('⚠️ Sync already in progress');
        return;
    }

    console.log('🔄 [SYNC STATUS] Manual sync triggered');
    window.autoSync.queueFullSync();

    // Update UI
    updateDropdownContent();

    // Show feedback
    const btn = document.getElementById('syncNowBtn');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '⟳ Syncing...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            updateDropdownContent();
        }, 3000);
    }
}

/**
 * Handle refresh spend data button click (grants.html only)
 */
function handleRefreshSpendData() {
    console.log('💰 [SYNC STATUS] Refresh spend data triggered');

    if (typeof refreshTransactionData === 'function') {
        refreshTransactionData();

        // Update button state
        const btn = document.getElementById('refreshSpendBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '⟳ Refreshing...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);
        }
    } else {
        alert('⚠️ This function is only available on the Grants page');
    }
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    /* Sync Status Button in Nav Bar */
    .sync-status-btn {
        position: relative;
        padding: 6px 10px !important;
        min-width: 40px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .sync-status-btn .sync-icon {
        font-size: 20px;
        display: inline-block;
        position: relative;
        line-height: 1;
    }

    /* Status indicator overlays */
    .sync-status-btn .sync-check,
    .sync-status-btn .sync-spinner,
    .sync-status-btn .sync-pending,
    .sync-status-btn .sync-error {
        position: absolute;
        bottom: -4px;
        right: -4px;
        font-size: 12px;
        background: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .sync-status-btn .sync-check {
        color: #4caf50;
        font-weight: bold;
    }

    .sync-status-btn .sync-spinner {
        color: #2196f3;
        animation: spin 2s linear infinite;
    }

    .sync-status-btn .sync-pending {
        font-size: 10px;
        animation: pulse 2s ease-in-out infinite;
    }

    .sync-status-btn .sync-error {
        color: #f44336;
        font-weight: bold;
    }

    /* Status Colors - subtle background tints */
    .sync-status-btn.synced {
        background-color: rgba(76, 175, 80, 0.1) !important;
    }

    .sync-status-btn.syncing {
        background-color: rgba(33, 150, 243, 0.1) !important;
    }

    .sync-status-btn.pending {
        background-color: rgba(255, 152, 0, 0.1) !important;
    }

    .sync-status-btn.error {
        background-color: rgba(244, 67, 54, 0.1) !important;
    }

    .sync-status-btn.disabled {
        background-color: rgba(158, 158, 158, 0.1) !important;
        opacity: 0.6;
    }

    /* Dropdown Panel */
    .sync-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 320px;
        max-width: 380px;
        z-index: 10000;
        color: #1e293b;
        font-size: 13px;
    }

    .sync-dropdown-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
        font-weight: 600;
        font-size: 14px;
        color: #0f172a;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 8px 8px 0 0;
    }

    .sync-dropdown-content {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
    }

    .sync-status-text {
        margin-bottom: 16px;
    }

    .sync-status-item {
        padding: 8px 12px;
        background: #f8fafc;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 14px;
    }

    .sync-status-item.sync-synced {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #15803d;
    }

    .sync-status-item.sync-syncing {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e40af;
    }

    .sync-status-item.sync-error-item {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
    }

    .sync-time-info {
        padding: 8px 12px;
        background: #f8fafc;
        border-radius: 6px;
        font-size: 12px;
        color: #64748b;
        line-height: 1.6;
    }

    .sync-error-details {
        padding: 12px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.8;
        color: #7f1d1d;
    }

    .sync-data-list {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
    }

    .sync-data-label {
        font-weight: 600;
        color: #475569;
        margin-bottom: 8px;
    }

    .sync-data-items {
        font-size: 12px;
        color: #64748b;
        line-height: 1.8;
        padding-left: 8px;
    }

    .sync-dropdown-actions {
        padding: 12px 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #f8fafc;
        border-radius: 0 0 8px 8px;
    }

    .sync-action-btn {
        width: 100%;
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .sync-primary-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .sync-primary-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        transform: translateY(-1px);
    }

    .sync-secondary-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
    }

    .sync-secondary-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
        transform: translateY(-1px);
    }

    .sync-action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* Animations */
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    /* Hover effect */
    .sync-status-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
        .sync-status-btn {
            padding: 6px 10px !important;
            min-width: 40px;
        }

        .sync-status-btn .sync-icon {
            font-size: 20px;
        }

        .sync-status-btn .sync-check,
        .sync-status-btn .sync-spinner,
        .sync-status-btn .sync-pending,
        .sync-status-btn .sync-error {
            width: 14px;
            height: 14px;
            font-size: 10px;
            bottom: -2px;
            right: -2px;
        }

        .sync-dropdown {
            min-width: 280px;
            max-width: 320px;
            right: -10px;
        }
    }
`;
document.head.appendChild(style);

// Initialize when script loads
initSyncStatusIndicator();

console.log('✅ [SYNC STATUS] Indicator script ready');
