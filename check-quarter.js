const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Checking custom transaction quarter assignment...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\n📝 Navigating to grants page...');
    await page.goto('http://localhost:8000/grants.html', { waitUntil: 'networkidle' });

    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);

    console.log('\n🔍 Checking for custom transaction...');
    const txInfo = await page.evaluate(() => {
      const customTx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));

      if (!customTx) {
        return { found: false };
      }

      const assignment = customTx.assignments?.[0];

      return {
        found: true,
        date: customTx.date,
        description: customTx.description,
        spent: customTx.spent,
        spent_ex_vat: customTx.spent_ex_vat,
        isCustom: customTx.isCustom,
        assignment: {
          projectId: assignment?.projectId,
          category: assignment?.category,
          itemKey: assignment?.itemKey,
          quarter: assignment?.quarter,
          percentage: assignment?.percentage,
          amount: assignment?.amount,
          transactionRef: assignment?.transactionRef
        }
      };
    });

    console.log('\n📊 Transaction Info:');
    console.log(JSON.stringify(txInfo, null, 2));

    if (!txInfo.found) {
      console.log('\n❌ Custom transaction not found in cachedTransactions');
      await page.screenshot({ path: 'no-custom-tx.png', fullPage: true });
      await browser.close();
      return;
    }

    console.log('\n✅ Custom Transaction Found:');
    console.log(`   Date: ${txInfo.date}`);
    console.log(`   Description: ${txInfo.description}`);
    console.log(`   Amount: £${txInfo.spent}`);
    console.log(`   Quarter: Q${txInfo.assignment.quarter || '(not set)'}`);
    console.log(`   Percentage: ${txInfo.assignment.percentage}%`);
    console.log(`   Category: ${txInfo.assignment.category}`);

    // Check if quarter is wrong
    if (!txInfo.assignment.quarter || txInfo.assignment.quarter !== 1) {
      console.log(`\n⚠️  Quarter is ${txInfo.assignment.quarter}, should be 1`);
      console.log('🔧 Fixing quarter assignment...');

      const fixResult = await page.evaluate(async () => {
        // Find and update the transaction in database
        const txn = db.transaction(['csvFiles'], 'readwrite');
        const store = txn.objectStore('csvFiles');

        const allFiles = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

        if (!customFile || !customFile.transactions) {
          return { success: false, error: 'Custom file not found' };
        }

        // Find the transaction
        const txToUpdate = customFile.transactions.find(t =>
          t.description?.includes('Project Meetings')
        );

        if (!txToUpdate) {
          return { success: false, error: 'Transaction not found in file' };
        }

        const oldQuarter = txToUpdate.assignments[0].quarter;

        // Update quarter to 1
        txToUpdate.assignments[0].quarter = 1;
        txToUpdate.assignments[0].percentage = 100; // Also ensure split is 100%

        // Save back to database
        const writeTxn = db.transaction(['csvFiles'], 'readwrite');
        const writeStore = writeTxn.objectStore('csvFiles');

        await new Promise((resolve, reject) => {
          const putRequest = writeStore.put(customFile);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        });

        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
          writeTxn.oncomplete = () => resolve();
          writeTxn.onerror = () => reject(writeTxn.error);
        });

        console.log('✅ Database updated');

        // Reload cached transactions
        cachedTransactions = await loadAllTransactions();
        console.log('✅ Cached transactions reloaded');

        // Re-render the page
        if (typeof renderBudgetBreakdown === 'function') {
          renderBudgetBreakdown();
        }
        console.log('✅ Page re-rendered');

        return {
          success: true,
          oldQuarter,
          newQuarter: 1
        };
      });

      console.log('\n🔧 Fix Result:', JSON.stringify(fixResult, null, 2));

      if (fixResult.success) {
        console.log(`✅ Quarter updated: Q${fixResult.oldQuarter} → Q${fixResult.newQuarter}`);
        console.log('⏳ Waiting for page to re-render...');
        await page.waitForTimeout(3000);

        // Verify the fix
        const verifyInfo = await page.evaluate(() => {
          const tx = cachedTransactions?.find(t => t.description?.includes('Project Meetings'));
          return {
            quarter: tx?.assignments?.[0]?.quarter,
            percentage: tx?.assignments?.[0]?.percentage
          };
        });

        console.log('\n✅ Verification:');
        console.log(`   Quarter: Q${verifyInfo.quarter}`);
        console.log(`   Split: ${verifyInfo.percentage}%`);

        // Check if it appears in Q1 tracking
        const appearsInQ1 = await page.evaluate(() => {
          // Check if the quarterly tracking section shows it
          const q1Section = document.querySelector('[id*="q1-category-travel"]');
          if (!q1Section) return { found: false, reason: 'Q1 section not found' };

          const travelBreakdown = document.getElementById('q1-category-travel-breakdown');
          if (!travelBreakdown) return { found: false, reason: 'Travel breakdown not found' };

          const hasProjectMeetings = travelBreakdown.textContent.includes('Project Meetings');
          return {
            found: hasProjectMeetings,
            text: hasProjectMeetings ? 'Transaction visible in Q1 Travel section' : 'Not visible yet'
          };
        });

        console.log('\n📊 Q1 Tracking Check:');
        console.log(JSON.stringify(appearsInQ1, null, 2));

        if (appearsInQ1.found) {
          console.log('\n🎉 SUCCESS! Custom transaction now appears in Q1 Transactions by Category!');
        } else {
          console.log('\n⚠️  Transaction updated but not yet visible. Try:');
          console.log('   1. Click on Q1 button to activate that quarter');
          console.log('   2. Refresh the page (Ctrl+F5)');
        }
      } else {
        console.log(`❌ Fix failed: ${fixResult.error}`);
      }
    } else {
      console.log('\n✅ Quarter is already set to Q1');
      console.log('ℹ️  If you can\'t see it in the Q1 section, try:');
      console.log('   1. Click the Q1 (2509-2511) button to activate it');
      console.log('   2. Look for the "Q1 Transactions by Category" section below');
      console.log('   3. Expand the "Travel and Subsistence" category');
    }

    // Take final screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'quarter-check-result.png', fullPage: true });
    console.log('Screenshot saved: quarter-check-result.png');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'quarter-check-error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
