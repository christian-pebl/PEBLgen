// INSTRUCTIONS:
// 1. Open grants.html in your browser with your project loaded
// 2. Open Browser DevTools Console (F12)
// 3. Paste this entire script into the console and press Enter
// 4. Follow the prompts to test the custom transaction editing

(async function testCustomTransactionEdit() {
    console.log('🧪 ===== CUSTOM TRANSACTION EDIT TEST =====\n');

    // Check if we're on the grants page
    if (!window.location.href.includes('grants.html')) {
        console.error('❌ This script must be run on grants.html');
        return;
    }

    // Check for custom transactions
    const customTransactions = cachedTransactions?.filter(t => t.isCustom || t.description?.includes('[CUSTOM]'));

    if (!customTransactions || customTransactions.length === 0) {
        console.error('❌ No custom transactions found in cache');
        console.log('ℹ️ Create a custom transaction first by:');
        console.log('   1. Going to Travel and Subsistence section');
        console.log('   2. Clicking "Add Custom Transaction"');
        console.log('   3. Filling in the form and saving');
        return;
    }

    console.log(`✅ Found ${customTransactions.length} custom transaction(s)\n`);

    // Display custom transactions
    customTransactions.forEach((tx, i) => {
        const assignment = tx.assignments?.[0];
        console.log(`📝 Transaction ${i + 1}:`);
        console.log(`   Date: ${tx.date}`);
        console.log(`   Description: ${tx.description}`);
        console.log(`   Amount: £${tx.spent}`);
        console.log(`   Quarter: Q${assignment?.quarter || '?'}`);
        console.log(`   Split %: ${assignment?.percentage || '?'}%`);
        console.log(`   Category: ${assignment?.category || '?'}`);
        console.log('');
    });

    // Test editing the first one
    const testTx = customTransactions[0];
    const testAssignment = testTx.assignments?.[0];

    console.log('🧪 TEST: Simulating transaction update...\n');
    console.log('📊 BEFORE UPDATE:');
    console.log(`   Quarter: Q${testAssignment?.quarter}`);
    console.log(`   Split %: ${testAssignment?.percentage}%\n`);

    // Show what the update would look like
    console.log('🎯 SIMULATED UPDATE (Quarter→Q1, Split→100%):');

    const simulatedUpdate = {
        ...testTx,
        assignments: [{
            ...testAssignment,
            quarter: 1,
            percentage: 100
        }]
    };

    console.log(`   New Quarter: Q${simulatedUpdate.assignments[0].quarter}`);
    console.log(`   New Split %: ${simulatedUpdate.assignments[0].percentage}%\n`);

    console.log('✅ Script completed!');
    console.log('\n📋 TO ACTUALLY TEST THE EDIT FUNCTIONALITY:');
    console.log('   1. Find the custom transaction in the Travel and Subsistence section');
    console.log('   2. Click the blue "✏️ Edit" button');
    console.log('   3. Change Quarter to Q1 and Split % to 100');
    console.log('   4. Click "Update Transaction"');
    console.log('   5. Watch this console for logs starting with 💾 [CUSTOM TX]');
    console.log('\n👀 Look for these key console messages:');
    console.log('   • 💾 [CUSTOM TX] Mode: EDIT');
    console.log('   • 💾 [CUSTOM TX] Found at index: 0 (or other number)');
    console.log('   • ✅ [CUSTOM TX] NEW Quarter: 1 NEW Split: 100');
    console.log('   • ✅ [CUSTOM TX] Transaction saved successfully');

    // Return the test transaction for inspection
    return testTx;
})();
