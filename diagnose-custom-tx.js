// DIAGNOSTIC SCRIPT FOR CUSTOM TRANSACTIONS
// Open grants.html in browser, open Console (F12), paste this entire script and press Enter

(async function diagnoseCustomTransactions() {
    console.log('🔍 ===== CUSTOM TRANSACTION DIAGNOSTIC =====\n');

    // Check database
    console.log('📊 Step 1: Checking IndexedDB...');
    if (!db) {
        console.error('❌ IndexedDB not initialized');
        return;
    }

    const txn = db.transaction(['csvFiles'], 'readonly');
    const store = txn.objectStore('csvFiles');
    const allFiles = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

    if (!customFile) {
        console.error('❌ No custom_transactions.csv file found in database');
        console.log('ℹ️ Available files:', allFiles.map(f => f.name));
        return;
    }

    console.log('✅ Found custom_transactions.csv');
    console.log('📝 Number of custom transactions:', customFile.transactions?.length || 0);

    if (!customFile.transactions || customFile.transactions.length === 0) {
        console.error('❌ No transactions in custom file');
        return;
    }

    // Display each custom transaction
    console.log('\n📋 Custom Transactions in Database:');
    customFile.transactions.forEach((tx, i) => {
        const assignment = tx.assignments?.[0];
        console.log(`\n--- Transaction ${i + 1} ---`);
        console.log('Date:', tx.date);
        console.log('Description:', tx.description);
        console.log('Amount (Inc VAT):', tx.spent);
        console.log('Amount (Ex VAT):', tx.spent_ex_vat);
        console.log('Zero VAT:', tx.zeroVAT);
        console.log('Detail:', tx.detail);
        console.log('isCustom:', tx.isCustom);
        console.log('Assignment:');
        if (assignment) {
            console.log('  - Project ID:', assignment.projectId);
            console.log('  - Category:', assignment.category);
            console.log('  - Item Key:', assignment.itemKey);
            console.log('  - Quarter:', assignment.quarter);
            console.log('  - Percentage:', assignment.percentage + '%');
            console.log('  - Amount:', assignment.amount);
        } else {
            console.log('  ❌ No assignment found!');
        }
    });

    // Check cached transactions
    console.log('\n📊 Step 2: Checking cachedTransactions...');
    if (!cachedTransactions || cachedTransactions.length === 0) {
        console.error('❌ cachedTransactions is empty or not loaded');
        return;
    }

    console.log('✅ cachedTransactions loaded, count:', cachedTransactions.length);

    const customInCache = cachedTransactions.filter(t =>
        t.isCustom || t.description?.includes('[CUSTOM]')
    );

    console.log('📝 Custom transactions in cache:', customInCache.length);

    if (customInCache.length === 0) {
        console.error('❌ No custom transactions found in cachedTransactions!');
        console.log('⚠️ This means custom transactions are not being loaded from database');
        return;
    }

    console.log('\n📋 Custom Transactions in Cache:');
    customInCache.forEach((tx, i) => {
        const assignment = tx.assignments?.[0];
        console.log(`\n--- Cached Transaction ${i + 1} ---`);
        console.log('Date:', tx.date);
        console.log('Description:', tx.description);
        console.log('Quarter:', assignment?.quarter);
        console.log('Percentage:', assignment?.percentage + '%');
        console.log('Category:', assignment?.category);
        console.log('Project ID:', assignment?.projectId);
    });

    // Check current project
    console.log('\n📊 Step 3: Checking current project...');
    if (!projectBudget || !projectBudget.projectId) {
        console.error('❌ No project loaded (projectBudget is empty)');
        return;
    }

    console.log('✅ Current project ID:', projectBudget.projectId);
    console.log('✅ Current project name:', projectBudget.projectName);

    // Match transactions to current project
    const matchingTx = customInCache.filter(tx =>
        tx.assignments?.some(a => a.projectId === projectBudget.projectId)
    );

    console.log('\n📊 Step 4: Matching custom transactions to current project...');
    console.log('✅ Found', matchingTx.length, 'custom transaction(s) for this project');

    if (matchingTx.length === 0) {
        console.error('❌ No custom transactions match the current project ID!');
        console.log('⚠️ This is the problem! The custom transaction was saved with a different project ID.');
        console.log('\nCustom transaction project IDs:', customInCache.map(t => t.assignments?.[0]?.projectId));
        console.log('Current project ID:', projectBudget.projectId);
        return;
    }

    // Check Travel category specifically
    const travelTx = matchingTx.filter(tx =>
        tx.assignments?.some(a => a.category === 'Travel')
    );

    console.log('\n📊 Step 5: Checking Travel category...');
    console.log('✅ Found', travelTx.length, 'Travel transaction(s)');

    if (travelTx.length === 0) {
        console.error('❌ No custom transactions assigned to Travel category!');
        console.log('⚠️ Categories found:', matchingTx.map(t => t.assignments?.[0]?.category));
        return;
    }

    console.log('\n✅ SUCCESS! Custom transaction should be visible in Travel and Subsistence section');
    console.log('\n📋 Transaction details:');
    travelTx.forEach(tx => {
        const assignment = tx.assignments[0];
        console.log(`Date: ${tx.date}`);
        console.log(`Description: ${tx.description}`);
        console.log(`Quarter: Q${assignment.quarter}`);
        console.log(`Split: ${assignment.percentage}%`);
        console.log(`Amount: £${tx.spent}`);
    });

    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('If you can\'t see the transaction, try:');
    console.log('1. Refresh the page (Ctrl+F5)');
    console.log('2. Expand the Travel and Subsistence section');
    console.log('3. Check if the transaction appears in Quarterly Tracking section');

})().catch(err => {
    console.error('❌ Diagnostic failed:', err);
});
