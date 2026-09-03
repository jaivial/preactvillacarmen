// Scenario: /menusdegrupos must list ONLY active group menus
// ('menú cerrado de grupo' = closed_group, 'menú a la carta de grupo' = a_la_carte_group).
// Pipeline:
//   test_started
//   -> fixture_active_menus_queried (dev DB)
//   -> page_opened + menus_list_fetch_started (frontend)
//   -> group_menus_list_request_received -> group_menus_list_db_query_started
//      -> group_menus_list_db_query_completed -> group_menus_list_response_sent (backend)
//   -> menus_list_received -> menus_filtered -> menu_rendered (frontend)
//   -> correlation_header_echoed, tabs_match_group_fixture, conventional_menus_excluded
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
  waitForConsoleCheckpoint,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.filters-group-types`)

const GROUP_TYPES_SQL = "('closed_group','a_la_carte_group')"

let groupRows = []
let conventionalRows = []

try {
  const run = createRunner(correlationId)

  await run('fixture_active_menus_queried', async () => {
    const rows = mysqlRows(
      `SELECT id, menu_title, COALESCE(NULLIF(TRIM(menu_type), ''), 'closed_conventional') AS menu_type
       FROM menus
       WHERE restaurant_id = ${Number(restaurantId())} AND active = 1
       ORDER BY created_at ASC`,
    )
    groupRows = rows.filter((r) => GROUP_TYPES_SQL.includes(`'${r.menu_type}'`))
    conventionalRows = rows.filter((r) => !GROUP_TYPES_SQL.includes(`'${r.menu_type}'`))
    assert(groupRows.length >= 2, `fixture must contain at least 2 active group menus (tabs render only at >= 2), got ${groupRows.length}`)
    console.log(`[${correlationId}] fixture group_ids=${JSON.stringify(groupRows.map((r) => Number(r.id)))} excluded_ids=${JSON.stringify(conventionalRows.map((r) => Number(r.id)))}`)
  })

  await withBrowserContext(correlationId, async ({ page, consoleCheckpoints }) => {
    let response = null

    await run('page_opened', async () => {
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/menuDeGruposBackend/getActiveMenusForDisplay')),
        page.goto(`${baseUrl()}/menusdegrupos`, { waitUntil: 'domcontentloaded' }),
      ])
      response = resp
      assert(response.ok(), `getActiveMenusForDisplay must return 2xx, got ${response.status()}`)
      await page.waitForSelector('[data-testid="menusdegrupos-panel"]', { timeout: 15_000 })
    })

    await run('correlation_header_echoed', async () => {
      const echoed = response.headers()['x-correlation-id']
      assert(echoed === correlationId, `backend must echo x-correlation-id, got ${JSON.stringify(echoed)}`)
    })

    await run('menus_list_fetch_checkpoints_emitted', async () => {
      for (const name of [
        'menusdegrupos_frontend_loaded',
        'menusdegrupos_menus_list_fetch_started',
        'menusdegrupos_menus_list_received',
        'menusdegrupos_menus_filtered',
        'menusdegrupos_menu_rendered',
      ]) {
        await waitForConsoleCheckpoint(page, consoleCheckpoints, name)
      }
    })

    await run('tabs_match_group_fixture', async () => {
      await page.waitForSelector('[data-testid="menusdegrupos-tabs"]', { timeout: 15_000 })
      const tabs = page.locator('[data-testid="menusdegrupos-tabs"] [role="tab"]')
      const count = await tabs.count()
      assert(count === groupRows.length, `tab count must equal active group menus (${groupRows.length}), got ${count}`)

      const expectedIds = groupRows.map((r) => String(r.id)).sort()
      const tabIds = []
      for (let i = 0; i < count; i++) {
        const testid = await tabs.nth(i).getAttribute('data-testid')
        assert(testid, `tab ${i} must carry a unique data-testid`)
        tabIds.push(String(testid).replace('menusdegrupos-tab-', ''))
      }
      assert(
        JSON.stringify([...tabIds].sort()) === JSON.stringify(expectedIds),
        `tab menu ids ${JSON.stringify(tabIds)} must equal group fixture ids ${JSON.stringify(expectedIds)}`,
      )
      for (let i = 0; i < count; i++) {
        const text = (await tabs.nth(i).innerText()).trim()
        assert(text.length > 0, `tab ${i} must show a menu title`)
      }
    })

    await run('conventional_menus_excluded', async () => {
      for (const r of conventionalRows) {
        const tab = page.locator(`[data-testid="menusdegrupos-tab-${r.id}"]`)
        assert((await tab.count()) === 0, `menu ${r.id} (${r.menu_type}) must NOT render as a tab`)
        const titleTab = page.getByRole('tab', { name: r.menu_title })
        assert((await titleTab.count()) === 0, `menu "${r.menu_title}" (${r.menu_type}) must NOT appear as a tab title`)
      }
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
