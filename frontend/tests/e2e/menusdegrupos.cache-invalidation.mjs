// Scenario: menu content edited in the DB must be visible on SPA re-entry WITHOUT a
// full page reload — the frontend api cache must never serve stale menu content for
// these public endpoints (network-first, cache only as error fallback).
// Covers both fetch paths: the /menusdegrupos list and /api/menus/:id (MenuCatalogRoute).
// Both endpoints serve dishes from group_menu_section_dishes_v2, so the fixture
// mutates title_snapshot/description_snapshot of one dish row.
// Pipeline:
//   test_started
//   -> fixture_dish_prepared (dev DB mutation token A)
//   -> baseline_list_shows_token (menusdegrupos_menu_rendered)
//   -> warm_menu_by_id_cache (menu_catalog_menu_rendered)
//   -> navigate_away_spa (cache stays alive in JS context)
//   -> db_mutated_to_token_b
//   -> list_reflects_db_change
//   -> by_id_reflects_db_change
//   -> backend_checkpoints_verified
//   -> fixture_restored
//   -> test_completed
import {
  newCorrelationId,
  createRunner,
  mysqlRows,
  mysqlExec,
  sqlQuote,
  restaurantId,
  assert,
  withBrowserContext,
  baseUrl,
  backendLogLines,
  assertBackendCheckpoints,
  spaNavigate,
  waitForConsoleCheckpoint,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.cache-invalidation`)

let dishId = null
let targetMenuId = null
let originalTitle = null
let originalDescription = null
const tokenA = `E2ECACHEA${Date.now()}`
const tokenB = `E2ECACHEB${Date.now()}`

function setDishTitle(token) {
  mysqlExec(
    `UPDATE group_menu_section_dishes_v2
     SET title_snapshot = ${sqlQuote(token)}, description_snapshot = ${sqlQuote(token)}
     WHERE id = ${Number(dishId)}`,
  )
  const check = mysqlRows(`SELECT title_snapshot FROM group_menu_section_dishes_v2 WHERE id = ${Number(dishId)}`)
  assert(check[0]?.title_snapshot === token, `DB must contain token ${token} after update`)
}

try {
  const run = createRunner(correlationId)

  await run('fixture_dish_prepared', async () => {
    const rows = mysqlRows(
      `SELECT d.id, d.menu_id, d.title_snapshot, d.description_snapshot
       FROM group_menu_section_dishes_v2 d
       JOIN menus m ON m.id = d.menu_id
       WHERE d.restaurant_id = ${Number(restaurantId())} AND d.active = 1 AND m.active = 1
         AND COALESCE(NULLIF(TRIM(m.menu_type), ''), 'closed_conventional') IN ('closed_group','a_la_carte_group')
       ORDER BY d.menu_id ASC, d.section_id ASC, d.position ASC, d.id ASC`,
    )
    assert(rows.length >= 1, 'fixture needs an active dish row on an active group menu')
    dishId = Number(rows[0].id)
    targetMenuId = Number(rows[0].menu_id)
    originalTitle = rows[0].title_snapshot
    originalDescription = rows[0].description_snapshot
    await setDishTitle(tokenA)
    console.log(`[${correlationId}] fixture dish_id=${dishId} menu_id=${targetMenuId}`)
  })

  await withBrowserContext(correlationId, async ({ page, consoleCheckpoints }) => {
    const pageText = () => page.locator('.menuPage').innerText()

    await run('baseline_list_shows_token', async () => {
      await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/menuDeGruposBackend/getActiveMenusForDisplay')),
        page.goto(`${baseUrl()}/menusdegrupos`, { waitUntil: 'domcontentloaded' }),
      ])
      await page.waitForSelector('.menuPage .menuSectionCard', { timeout: 15_000 })
      const text = await pageText()
      assert(text.includes(tokenA), `fresh /menusdegrupos load must show DB token ${tokenA}`)
      assert(!text.includes(tokenB), `token ${tokenB} must not exist before mutation`)
      assert(consoleCheckpoints.includes('menusdegrupos_menu_rendered'), 'frontend checkpoint "menusdegrupos_menu_rendered" missing')
    })

    await run('warm_menu_by_id_cache', async () => {
      await spaNavigate(page, `/menu/${targetMenuId}`)
      await page.waitForSelector('.menuPage .menuSectionCard', { timeout: 15_000 })
      await page.waitForFunction((token) => document.querySelector('.menuPage')?.innerText.includes(token), tokenA, { timeout: 10_000 })
      await waitForConsoleCheckpoint(page, consoleCheckpoints, 'menu_catalog_menu_rendered')
    })

    await run('navigate_away_spa', async () => {
      await spaNavigate(page, '/')
      await page.waitForFunction(() => !location.pathname.startsWith('/menusdegrupos') && !location.pathname.startsWith('/menu/'), null, { timeout: 10_000 })
      await page.waitForFunction(() => !document.querySelector('.menuSectionCard'), null, { timeout: 10_000 })
    })

    await run('db_mutated_to_token_b', async () => {
      await setDishTitle(tokenB)
    })

    await run('list_reflects_db_change', async () => {
      await spaNavigate(page, '/menusdegrupos')
      await page.waitForSelector('.menuPage .menuSectionCard', { timeout: 15_000 })
      await page.waitForFunction((token) => document.querySelector('.menuPage')?.innerText.includes(token), tokenB, { timeout: 10_000 })
      const text = await pageText()
      assert(text.includes(tokenB), `SPA re-entry must show fresh DB content ${tokenB} (cache must not serve stale ${tokenA})`)
      assert(!text.includes(tokenA), `stale token ${tokenA} must disappear after DB change`)
    })

    await run('by_id_reflects_db_change', async () => {
      await spaNavigate(page, `/menu/${targetMenuId}`)
      await page.waitForFunction((token) => document.querySelector('.menuPage')?.innerText.includes(token), tokenB, { timeout: 15_000 })
      const text = await pageText()
      assert(text.includes(tokenB), `/menu/${targetMenuId} SPA re-entry must show fresh DB content ${tokenB}`)
      assert(!text.includes(tokenA), `stale token ${tokenA} must disappear on /menu/${targetMenuId} after DB change`)
    })
  })

  await run('backend_checkpoints_verified', async () => {
    const lines = backendLogLines(correlationId)
    assertBackendCheckpoints(lines, [
      'group_menus_list_request_received',
      'group_menus_list_db_query_started',
      'group_menus_list_db_query_completed',
      'group_menus_list_response_sent',
      'public_menu_by_id_request_received',
      'public_menu_by_id_db_query_started',
      'public_menu_by_id_db_query_completed',
      'public_menu_by_id_response_sent',
    ])
  })

  console.log(`[${correlationId}] test_completed result=passed`)
} catch (err) {
  console.log(`[${correlationId}] test_completed result=failed error=${JSON.stringify(err && err.message)}`)
  console.error(err)
  process.exitCode = 1
} finally {
  if (dishId !== null) {
    try {
      mysqlExec(
        `UPDATE group_menu_section_dishes_v2
         SET title_snapshot = ${sqlQuote(originalTitle)}, description_snapshot = ${sqlQuote(originalDescription)}
         WHERE id = ${Number(dishId)}`,
      )
      console.log(`[${correlationId}] checkpoint fixture_restored dish_id=${dishId}`)
    } catch (restoreErr) {
      console.error(`[${correlationId}] FIXTURE RESTORE FAILED dish_id=${dishId}:`, restoreErr)
      process.exitCode = 1
    }
  }
}
