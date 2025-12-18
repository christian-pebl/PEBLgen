const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Loading project and checking custom transactions...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CUSTOM') || text.includes('project') || text.includes('Step')) {
      console.log(`[BROWSER] ${text}`);
    }
  });

  try {
    console.log('\n📝 Step 1: Navigate to grants page...');
    await page.goto('http://localhost:8000/grants.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Check for projects
    console.log('\n📝 Step 2: Checking for saved projects...');
    const projectCount = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (!db) {
          resolve(0);
          return;
        }
        const txn = db.transaction(['projects'], 'readonly');
        const store = txn.objectStore('projects');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.length);
        request.onerror = () => resolve(0);
      });
    });

    console.log(`Found ${projectCount} saved project(s)`);

    if (projectCount === 0) {
      console.log('\n❌ No projects found in database');
      console.log('ℹ️  You need to:');
      console.log('   1. Create or load a project first');
      console.log('   2. Then create custom transactions for that project');
      await page.screenshot({ path: 'no-projects.png', fullPage: true });
      await browser.close();
      return;
    }

    // Load the first project
    console.log('\n📝 Step 3: Loading first project...');
    const projectInfo = await page.evaluate(async () => {
      const txn = db.transaction(['projects'], 'readonly');
      const store = txn.objectStore('projects');
      const allProjects = await new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });

      if (allProjects.length === 0) return null;

      const project = allProjects[0];
      console.log('Loading project:', project.projectName || project.projectNumber);

      // Assign to projectBudget
      projectBudget = project;

      // Render the page
      if (typeof renderBudgetBreakdown === 'function') {
        renderBudgetBreakdown();
      }

      return {
        id: project.projectId,
        name: project.projectName,
        number: project.projectNumber
      };
    });

    if (!projectInfo) {
      console.log('❌ Failed to load project');
      await browser.close();
      return;
    }

    console.log(`✅ Loaded project: ${projectInfo.name || projectInfo.number}`);
    console.log(`   Project ID: ${projectInfo.id}`);

    await page.waitForTimeout(3000);

    // Now check for custom transactions
    console.log('\n📝 Step 4: Checking for custom transactions...');
    const customTxInfo = await page.evaluate(async () => {
      // Check database
      const txn = db.transaction(['csvFiles'], 'readonly');
      const store = txn.objectStore('csvFiles');
      const allFiles = await new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });

      const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

      if (!customFile || !customFile.transactions || customFile.transactions.length === 0) {
        return { found: false, inDatabase: false };
      }

      // Check if any match current project
      const currentProjectId = projectBudget.projectId;
      const matchingTx = customFile.transactions.filter(tx =>
        tx.assignments?.some(a => a.projectId === currentProjectId)
      );

      if (matchingTx.length === 0) {
        return {
          found: false,
          inDatabase: true,
          totalCount: customFile.transactions.length,
          projectIds: customFile.transactions.map(t => t.assignments?.[0]?.projectId),
          currentProjectId
        };
      }

      // Check categories
      const details = matchingTx.map(tx => {
        const assignment = tx.assignments[0];
        return {
          date: tx.date,
          description: tx.description,
          category: assignment.category,
          quarter: assignment.quarter,
          percentage: assignment.percentage,
          amount: tx.spent
        };
      });

      return {
        found: true,
        count: matchingTx.length,
        details
      };
    });

    console.log('\n📊 Custom Transaction Results:');
    console.log(JSON.stringify(customTxInfo, null, 2));

    if (!customTxInfo.found) {
      if (!customTxInfo.inDatabase) {
        console.log('\n❌ No custom transactions exist in database');
        console.log('ℹ️  Create one by:');
        console.log('   1. Going to Travel and Subsistence section');
        console.log('   2. Clicking "+ Add Custom Transaction"');
      } else {
        console.log('\n⚠️  Custom transactions exist but have wrong project ID!');
        console.log(`   Current project ID: ${customTxInfo.currentProjectId}`);
        console.log(`   Custom transaction project IDs: ${JSON.stringify(customTxInfo.projectIds)}`);
        console.log('\n🔧 Fixing project IDs...');

        // Fix the project IDs
        await page.evaluate(async () => {
          const currentProjectId = projectBudget.projectId;

          const txn = db.transaction(['csvFiles'], 'readwrite');
          const store = txn.objectStore('csvFiles');
          const allFiles = await new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
          });

          const customFile = allFiles.find(f => f.name === 'custom_transactions.csv');

          if (customFile && customFile.transactions) {
            customFile.transactions.forEach(tx => {
              if (tx.assignments) {
                tx.assignments.forEach(a => {
                  console.log(`Changing project ID: ${a.projectId} → ${currentProjectId}`);
                  a.projectId = currentProjectId;
                });
              }
            });

            // Save back
            const writeTxn = db.transaction(['csvFiles'], 'readwrite');
            const writeStore = writeTxn.objectStore('csvFiles');
            await new Promise((resolve) => {
              const request = writeStore.put(customFile);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
            });

            console.log('✅ Project IDs updated');

            // Reload
            cachedTransactions = await loadAllTransactions();
            if (typeof renderBudgetBreakdown === 'function') {
              renderBudgetBreakdown();
            }
          }
        });

        await page.waitForTimeout(2000);
        console.log('✅ Project IDs fixed - refreshing page...');
      }
    } else {
      console.log(`\n✅ Found ${customTxInfo.count} custom transaction(s) for this project`);
      customTxInfo.details.forEach(tx => {
        console.log(`  - ${tx.date}: ${tx.description}`);
        console.log(`    Category: ${tx.category}, Q${tx.quarter}, ${tx.percentage}%`);
      });
    }

    // Take final screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'grants-page-loaded.png', fullPage: true });
    console.log('\n📸 Screenshot saved: grants-page-loaded.png');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
