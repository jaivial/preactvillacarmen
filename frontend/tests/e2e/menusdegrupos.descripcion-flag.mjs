// Scenario: every dish in getMenuForDisplay carries an explicit boolean
// `descripcion_enabled`. When backoffice disables it (0) the dish payload must
// include `descripcion_enabled: false`, omit `descripcion`, and the UI must not
// render the description for that dish. Enabled dishes carry `descripcion_enabled: true`.
// Pipeline:
//   test_started
//   -> fixture_dish_queried (dev DB: active v2 dish with a title)
//   -> seed_distinct_description
//   -> endpoint_enabled_flag_true (fresh fetch, flag true + descripcion present)
//   -> description_disabled (mysqlExec UPDATE description_enabled=0)
//   -> endpoint_flag_false_omits_descripcion (flag false, no descripcion key)
//   -> ui_hides_descripcion (open /menusdegrupos?menu=<id>, assert absent + checkpoints)
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
  waitForConsoleCheckpoint,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.descripcion-flag`)

let dish = null
const seededDescription = `Nota de cata e2e ${Date.now()}`
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
         AND COALESCE(NULLIF(TRIM(d.title_snapshot), ''), '') <> ''
       ORDER BY d.menu_id ASC, d.position ASC, d.id ASC
       LIMIT 1`,
    )
    assert(rows.length === 1, `fixture needs one active v2 dish with a non-empty title, got ${rows.length}`)
    dish = rows[0]
    dish.menu_id = Number(dish.menu_id)
    dish.dish_id = Number(dish.dish_id)
    console.log(`[${correlationId}] fixture dish_id=${dish.dish_id} menu_id=${dish.menu_id}`)
  })

  let restored = false
  const restore = () => {
    if (!dish || restored) return
    mysqlExec(
      `UPDATE group_menu_section_dishes_v2
       SET description_enabled = 1, description_snapshot = ${sqlQuote(dish.description_snapshot || dish.title_snapshot)}
       WHERE id = ${dish.dish_id}`,
    )
    restored = true
  }
  process.on('exit', restore)
  process.on('uncaughtException', (err) => {
    restore()
    throw err
  })

  await run('seed_distinct_description', async () => {
    mysqlExec(
      `UPDATE group_menu_section_dishes_v2
       SET description_enabled = 1, description_snapshot = ${sqlQuote(seededDescription)}
       WHERE id = ${dish.dish_id}`,
    )
    const check = mysqlRows(
      `SELECT description_snapshot, COALESCE(description_enabled, 1) AS flag FROM group_menu_section_dishes_v2 WHERE id = ${dish.dish_id}`,
    )
    assert(check[0]?.description_snapshot === seededDescription, 'seeded description must be persisted')
    assert(Number(check[0].flag) === 1, 'description_enabled must be 1 after seed')
  })

  const fetchMenu = async () => {
    const resp = await fetch(
      `${baseUrl()}/api/menuDeGruposBackend/getMenuForDisplay?id=${dish.menu_id}`,
      { headers: { 'x-correlation-id': correlationId } },
    )
    assert(resp.ok, `getMenuForDisplay must return 2xx, got ${resp.status}`)
    const body = await resp.json()
    assert(body.success === true, `getMenuForDisplay must succeed for menu ${dish.menu_id}`)
    const menu = body.menu
    const allDishes = [
      ...(Array.isArray(menu.entrantes) ? menu.entrantes : []),
      ...((menu.principales && Array.isArray(menu.principales.items)) ? menu.principales.items : []),
      ...(Array.isArray(menu.postre) ? menu.postre : []),
    ]
    const target = allDishes.find((d) => Number(d.id) === dish.dish_id)
    assert(target, `dish ${dish.dish_id} must be present in getMenuForDisplay payload`)
    return { menu, target }
  }

  await run('endpoint_enabled_flag_true', async () => {
    const { target } = await fetchMenu()
    assert(
      target.descripcion_enabled === true,
      `enabled dish must carry descripcion_enabled === true, got ${JSON.stringify(target.descripcion_enabled)}`,
    )
    assert(
      typeof target.descripcion === 'string' && target.descripcion.trim() !== '',
      `enabled dish must expose its descripcion, got ${JSON.stringify(target.descripcion)}`,
    )
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
  await run('endpoint_flag_false_omits_descripcion', async () => {
    const { target } = await fetchMenu()
    endpointDish = target
    assert(
      endpointDish.descripcion_enabled === false,
      `disabled dish must carry descripcion_enabled === false, got ${JSON.stringify(endpointDish.descripcion_enabled)}`,
    )
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
      const dishText = await dishLocator.innerText()
      assert(
        !dishText.includes(seededDescription),
        `dish card must NOT contain the disabled description "${seededDescription}", got "${dishText}"`,
      )
      const panelText = await page.locator('[data-testid="menusdegrupos-panel"]').innerText()
      assert(
        !panelText.includes(seededDescription),
        `panel must NOT contain the disabled description "${seededDescription}"`,
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
