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

    // Create indicator as a nav button
    const indicator = document.createElement('button');
    indicator.id = 'sync-status-indicator';
    indicator.className = 'nav-btn sync-status-btn';
    indicator.innerHTML = `
        <span class="sync-icon" id="syncIcon">☁️</span>
    `;
    indicator.title = 'Initializing backup...';

    // Insert before the "↑ Top" button or "Reset Backup" button (or at the end if neither exists)
    const topButton = Array.from(navBar.children).find(btn =>
        btn.textContent.includes('Top') || btn.textContent.includes('Reset Backup')
    );
    if (topButton) {
        navBar.insertBefore(indicator, topButton);
    } else {
        navBar.appendChild(indicator);
    }

    statusIndicator = indicator;

    // Add click handler to show details
    indicator.addEventListener('click', showSyncDetails);

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
 * Show detailed sync information
 */
function showSyncDetails() {
    const lastSync = window.autoSync?.getLastSyncTime();
    const isSyncing = window.autoSync?.isSyncing();
    const isEnabled = window.autoSync?.config?.enabled;
    const hasError = window.autoSync?.hasSetupError?.();
    const errorMsg = window.autoSync?.getLastError?.();

    let details = '☁️ Cloud Backup Status\n\n';

    if (!window.autoSync) {
        details += '⚪ Status: Not initialized\n';
    } else if (!window.currentUser) {
        details += '⚪ Status: Not authenticated\n';
    } else if (hasError) {
        details += '❌ Status: Setup Required\n\n';
        details += '⚠️ Problem: Database tables not created\n\n';
        details += '📝 Solution:\n';
        details += '1. Open Supabase Dashboard\n';
        details += '2. Go to SQL Editor\n';
        details += '3. Run the table creation scripts\n';
        details += '4. Run the storage bucket creation scripts\n';
        details += '5. Refresh this page\n\n';
        details += 'See SUPABASE_MIGRATION_README.md for full instructions.\n';
    } else if (!isEnabled) {
        details += '⚪ Status: Disabled\n';
    } else if (isSyncing) {
        details += '⟳ Status: Backing up now...\n';
    } else if (lastSync) {
        const timeAgo = Math.floor((Date.now() - lastSync.getTime()) / 1000);
        details += `✅ Status: All backed up\n`;
        details += `📅 Last backup: ${lastSync.toLocaleTimeString()}\n`;
        details += `⏱️ Time ago: ${timeAgo} seconds\n`;
    } else {
        details += '⏳ Status: Waiting for first backup\n';
    }

    details += '\n📊 What gets backed up:\n';
    details += '• Project budgets\n';
    details += '• CSV transaction files\n';
    details += '• PDF invoices\n';
    details += '• All text entries\n';
    details += '• Gantt charts\n';
    details += '• Sketcher data\n';

    details += '\n⚙️ Settings:\n';
    details += `• Auto-sync: ${isEnabled ? 'Enabled' : 'Disabled'}\n`;
    details += `• Sync delay: ${window.autoSync?.config?.syncDelay || 0}ms\n`;

    alert(details);
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    /* Sync Status Button in Nav Bar */
    .sync-status-btn {
        position: relative;
        padding: 8px 12px !important;
        min-width: 45px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .sync-status-btn .sync-icon {
        font-size: 24px;
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
    }
`;
document.head.appendChild(style);

// Initialize when script loads
initSyncStatusIndicator();

console.log('✅ [SYNC STATUS] Indicator script ready');
