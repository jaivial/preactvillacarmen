// Scenario: a dish persisted with description_enabled = 0 must NOT expose
// its description — neither in getMenuForDisplay nor in the /menusdegrupos UI.
// Pipeline:
//   test_started
//   -> fixture_dish_queried (dev DB: first v2 dish with a description)
//   -> description_disabled (mysqlExec UPDATE description_enabled=0)
//   -> endpoint_omits_descripcion (direct getMenuForDisplay fetch)
//   -> ui_hides_descripcion (open /menusdegrupos, click the menu tab, assert
//      description text absent + menu_detail checkpoints emitted)
//   -> description_restored (finally: UPDATE description_enabled=1)
//   -> test_completed
import {
  newCorrelationId,
  createRunner,
  mysqlRows,
  mysqlExec,
  restaurantId,
  assert,
  withBrowserContext,
  baseUrl,
  waitForConsoleCheckpoint,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.description-toggle`)

let dish = null
try {
  const run = createRunner(correlationId)

  await run('fixture_dish_queried', async () => {
    const rows = mysqlRows(
      `SELECT d.id AS dish_id, d.menu_id, d.title_snapshot,
              COALESCE(NULLIF(TRIM(d.description_snapshot), ''), '') AS description_snapshot
       FROM group_menu_section_dishes_v2 d
       JOIN menus m ON m.id = d.menu_id AND m.restaurant_id = ${Number(restaurantId())}
         AND m.active = 1
         AND COALESCE(NULLIF(TRIM(m.menu_type), ''), 'closed_conventional') IN ('closed_group','a_la_carte_group')
       WHERE d.restaurant_id = ${Number(restaurantId())} AND d.active = 1
         AND COALESCE(d.description_enabled, 1) = 1
         AND COALESCE(NULLIF(TRIM(d.description_snapshot), ''), '') <> ''
       ORDER BY d.menu_id ASC, d.position ASC, d.id ASC
       LIMIT 1`,
    )
    assert(rows.length === 1, `fixture needs one v2 dish with a non-empty description_snapshot, got ${rows.length}`)
    dish = rows[0]
    dish.menu_id = Number(dish.menu_id)
    dish.dish_id = Number(dish.dish_id)
    console.log(`[${correlationId}] fixture dish_id=${dish.dish_id} menu_id=${dish.menu_id}`)
  })

  let restored = false
  const restore = () => {
    if (!dish || restored) return
    mysqlExec(
      `UPDATE group_menu_section_dishes_v2 SET description_enabled = 1 WHERE id = ${dish.dish_id}`,
    )
    restored = true
  }
  process.on('exit', restore)
  process.on('uncaughtException', (err) => {
    restore()
    throw err
  })

  await run('description_disabled', async () => {
    mysqlExec(
      `UPDATE group_menu_section_dishes_v2 SET description_enabled = 0 WHERE id = ${dish.dish_id}`,
    )
    const check = mysqlRows(
      `SELECT COALESCE(description_enabled, 1) AS flag FROM group_menu_section_dishes_v2 WHERE id = ${dish.dish_id}`,
    )
    assert(Number(check[0].flag) === 0, 'description_enabled must be 0 after UPDATE')
  })

  let endpointDish = null
  await run('endpoint_omits_descripcion', async () => {
    const resp = await fetch(
      `${baseUrl()}/api/menuDeGruposBackend/getMenuForDisplay?id=${dish.menu_id}`,
      { headers: { 'x-correlation-id': correlationId } },
    )
    assert(resp.ok, `getMenuForDisplay must return 2xx, got ${resp.status}`)
    const body = await resp.json()
    assert(body.success === true, `getMenuForDisplay must succeed for menu ${dish.menu_id}`)
    const menu = body.menu
    assert(menu && Number(menu.id) === dish.menu_id, 'response menu.id must match requested id')

    const allDishes = [
      ...(Array.isArray(menu.entrantes) ? menu.entrantes : []),
      ...((menu.principales && Array.isArray(menu.principales.items)) ? menu.principales.items : []),
      ...(Array.isArray(menu.postre) ? menu.postre : []),
    ]
    endpointDish = allDishes.find((d) => Number(d.id) === dish.dish_id)
    assert(endpointDish, `dish ${dish.dish_id} must be present in getMenuForDisplay payload`)
    assert(
      !('descripcion' in endpointDish),
      `dish ${dish.dish_id} with description_enabled=0 must have NO descripcion key, got ${JSON.stringify(endpointDish.descripcion)}`,
    )
  })

  await withBrowserContext(correlationId, async ({ page, consoleCheckpoints }) => {
    await run('ui_hides_descripcion', async () => {
      await page.setExtraHTTPHeaders({ 'x-correlation-id': correlationId })
      await page.goto(`${baseUrl()}/menusdegrupos?menu=${dish.menu_id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(`[data-testid="menusdegrupos-tab-${dish.menu_id}"][aria-selected="true"]`, { timeout: 15_000 })
      for (const name of [
        'menusdegrupos_menu_detail_fetch_started',
        'menusdegrupos_menu_detail_received',
      ]) {
        await waitForConsoleCheckpoint(page, consoleCheckpoints, name)
      }
      const dishLocator = page.locator(`[data-testid="menusdegrupos-panel"] [data-dish-id="${dish.dish_id}"]`)
      await dishLocator.waitFor({ timeout: 15_000 })
      const panelText = await page.locator('[data-testid="menusdegrupos-panel"]').innerText()
      assert(
        !panelText.includes(dish.description_snapshot),
        `panel must NOT contain the disabled description "${dish.description_snapshot}"`,
      )
    })
  })

  restore()
  process.removeAllListeners('exit')

  console.log(`[${correlationId}] test_completed result=passed`)
} catch (err) {
  console.log(`[${correlationId}] test_completed result=failed error=${JSON.stringify(err && err.message)}`)
  console.error(err)
  process.exitCode = 1
}
