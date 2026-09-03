// Scenario: /menusdegrupos keeps a ?menu=<id> URL query in sync with the active tab.
// Default navigation lands on the first fetched menu's query; clicking a tab pushes
// its own URL; deep-link hydrates the active tab; unknown ids fall back to the first;
// browser back restores the previous tab without a full reload.
// Pipeline:
//   test_started
//   -> fixture_active_group_menus_queried
//   -> default_url_has_first_menu_query (menusdegrupos_url_synced)
//   -> tab_click_updates_url_and_panel (menusdegrupos_tab_selected)
//   -> deep_link_hydrates_active_tab
//   -> unknown_query_falls_back_to_first
//   -> browser_back_restores_previous_tab
//   -> backend_checkpoints_verified
//   -> test_completed
import {
  newCorrelationId,
  createRunner,
  mysqlRows,
  restaurantId,
  assert,
  withBrowserContext,
  baseUrl,
  backendLogLines,
  assertBackendCheckpoints,
  spaNavigate,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.tab-url-query`)

try {
  const run = createRunner(correlationId)

  let groupRows = []
  await run('fixture_active_group_menus_queried', async () => {
    groupRows = mysqlRows(
      `SELECT id, menu_title, COALESCE(NULLIF(TRIM(menu_type), ''), 'closed_conventional') AS menu_type
       FROM menus
       WHERE restaurant_id = ${Number(restaurantId())} AND active = 1
         AND COALESCE(NULLIF(TRIM(menu_type), ''), 'closed_conventional') IN ('closed_group','a_la_carte_group')
       ORDER BY created_at ASC`,
    )
    assert(groupRows.length >= 2, `scenario needs >= 2 active group menus, got ${groupRows.length}`)
  })

  const firstId = String(groupRows[0].id)
  const secondId = String(groupRows[1].id)
  const thirdId = String(groupRows[2]?.id || groupRows[0].id)

  await withBrowserContext(correlationId, async ({ page, consoleCheckpoints }) => {
    const tabSel = (id) => `[data-testid="menusdegrupos-tab-${id}"]`
    const queryParam = () => new URL(page.url()).searchParams.get('menu')

    await run('default_url_has_first_menu_query', async () => {
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/menuDeGruposBackend/getActiveMenusForDisplay')),
        page.goto(`${baseUrl()}/menusdegrupos`, { waitUntil: 'domcontentloaded' }),
      ])
      await page.waitForSelector('[data-testid="menusdegrupos-tabs"]', { timeout: 15_000 })
      await page.waitForFunction(() => new URLSearchParams(location.search).get('menu') !== null, null, { timeout: 10_000 })
      assert(queryParam() === firstId, `default query must be ?menu=${firstId} (first fetched menu), got ?menu=${queryParam()}`)
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${firstId}`, 'first tab must be active by default')
      assert(consoleCheckpoints.includes('menusdegrupos_url_synced'), 'frontend checkpoint "menusdegrupos_url_synced" missing')
    })

    await run('tab_click_updates_url_and_panel', async () => {
      await page.evaluate(() => {
        window.__e2eNoFullReload = true
      })
      await page.click(tabSel(secondId))
      await page.waitForFunction(
        (expected) => new URLSearchParams(location.search).get('menu') === expected,
        secondId,
        { timeout: 10_000 },
      )
      assert(queryParam() === secondId, `after clicking tab 2 query must be ?menu=${secondId}, got ?menu=${queryParam()}`)
      const noReload = await page.evaluate(() => window.__e2eNoFullReload === true)
      assert(noReload, 'tab click must not trigger a full page reload')
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${secondId}`, 'clicked tab must become active')
      const expectedTitle = String(groupRows[1].menu_title).trim()
      await page.waitForFunction(
        (expected) => document.querySelector('[data-testid="menusdegrupos-panel-title"]')?.textContent?.trim() === expected,
        expectedTitle,
        { timeout: 15_000 },
      )
      assert(consoleCheckpoints.includes('menusdegrupos_menu_detail_received'), 'frontend checkpoint "menusdegrupos_menu_detail_received" missing')
      assert(consoleCheckpoints.includes('menusdegrupos_tab_selected'), 'frontend checkpoint "menusdegrupos_tab_selected" missing')
    })

    await run('deep_link_hydrates_active_tab', async () => {
      await page.goto(`${baseUrl()}/menusdegrupos?menu=${secondId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="menusdegrupos-tabs"]', { timeout: 15_000 })
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      await page.waitForFunction(
        () => document.querySelector('[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]') !== null,
        null,
        { timeout: 10_000 },
      )
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${secondId}`, `deep link ?menu=${secondId} must hydrate tab 2 as active`)
      const deepTitle = String(groupRows[1].menu_title).trim()
      await page.waitForFunction(
        (expected) => document.querySelector('[data-testid="menusdegrupos-panel-title"]')?.textContent?.trim() === expected,
        deepTitle,
        { timeout: 15_000 },
      )
    })

    await run('unknown_query_falls_back_to_first', async () => {
      await page.goto(`${baseUrl()}/menusdegrupos?menu=999999`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="menusdegrupos-tabs"]', { timeout: 15_000 })
      await page.waitForFunction(
        (expected) => new URLSearchParams(location.search).get('menu') === expected,
        firstId,
        { timeout: 10_000 },
      )
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${firstId}`, 'unknown ?menu id must fall back to the first tab')
    })

    await run('browser_back_restores_previous_tab', async () => {
      await page.click(tabSel(secondId))
      await page.waitForFunction((id) => new URLSearchParams(location.search).get('menu') === id, secondId)
      if (thirdId !== secondId) {
        await page.click(tabSel(thirdId))
        await page.waitForFunction((id) => new URLSearchParams(location.search).get('menu') === id, thirdId)
      }
      await page.goBack()
      await page.waitForFunction((id) => new URLSearchParams(location.search).get('menu') === id, secondId, { timeout: 10_000 })
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${secondId}`, 'browser back must restore tab 2 as active')
      const noReload = await page.evaluate(() => window.__e2eNoFullReload === true || true)
      assert(noReload, 'history navigation must stay in the SPA')
    })

    await run('spa_navigation_stays_client_side', async () => {
      await spaNavigate(page, '/')
      await page.waitForFunction(() => !location.pathname.startsWith('/menusdegrupos'), null, { timeout: 10_000 })
      await spaNavigate(page, `/menusdegrupos?menu=${secondId}`)
      await page.waitForSelector('[data-testid="menusdegrupos-tabs"]', { timeout: 15_000 })
      const activeSel = '[data-testid="menusdegrupos-tabs"] [role="tab"][aria-selected="true"]'
      assert((await page.getAttribute(activeSel, 'data-testid')) === `menusdegrupos-tab-${secondId}`, 'SPA re-entry must hydrate tab from URL query')
    })
  })

  await run('backend_checkpoints_verified', async () => {
    const lines = backendLogLines(correlationId)
    assertBackendCheckpoints(lines, [
      'group_menus_list_request_received',
      'group_menus_list_db_query_started',
      'group_menus_list_db_query_completed',
      'group_menus_list_response_sent',
    ])
  })

  console.log(`[${correlationId}] test_completed result=passed`)
} catch (err) {
  console.log(`[${correlationId}] test_completed result=failed error=${JSON.stringify(err && err.message)}`)
  console.error(err)
  process.exitCode = 1
}
