// Scenario: disabling the Descripcion toggle in the backoffice menu editor
// (/app/menus/crear?menuId=<id>) must persist description_enabled=0 through the
// autosave path (PATCH single dish), survive a page reload, and hide the
// description in the public getMenuForDisplay payload.
// Pipeline:
//   test_started
//   -> fixture_dish_queried (dev DB: active v2 dish on the target menu)
//   -> seed_enabled_description (flag 1 + distinct description)
//   -> bo_login (POST /api/admin/login, cookie kept by browser context)
//   -> bo_toggle_off (click Descripcion switch, wait DB flag=0 via autosave)
//   -> bo_reload_keeps_off (editor reload shows switch unchecked)
//   -> endpoint_flag_false (getMenuForDisplay carries descripcion_enabled=false, no descripcion)
//   -> fixture_restored
//   -> test_completed
import {
  newCorrelationId,
  createRunner,
  mysqlRows,
  mysqlExec,
  sqlQuote,
  restaurantId,
  rootEnv,
  assert,
  withBrowserContext,
  baseUrl,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menuscrear.description-toggle-persist`)

const boUrl = `https://${rootEnv().URL || 'backoffice-dev.menustudioai.com'}`
const MENU_ID = Number(process.env.VC_TEST_MENU_ID || 1)

let dish = null
const seededDescription = `Nota de cata e2e ${Date.now()}`
try {
  const run = createRunner(correlationId)

  await run('fixture_dish_queried', async () => {
    const rows = mysqlRows(
      `SELECT d.id AS dish_id, d.title_snapshot,
              COALESCE(NULLIF(TRIM(d.description_snapshot), ''), '') AS description_snapshot
       FROM group_menu_section_dishes_v2 d
       JOIN menus m ON m.id = d.menu_id AND m.restaurant_id = ${Number(restaurantId())} AND m.active = 1
       WHERE d.restaurant_id = ${Number(restaurantId())} AND d.menu_id = ${MENU_ID} AND d.active = 1
         AND COALESCE(NULLIF(TRIM(d.title_snapshot), ''), '') <> ''
       ORDER BY d.position ASC, d.id ASC
       LIMIT 1`,
    )
    assert(rows.length === 1, `fixture needs one active dish on menu ${MENU_ID}, got ${rows.length}`)
    dish = rows[0]
    dish.dish_id = Number(dish.dish_id)
    console.log(`[${correlationId}] fixture dish_id=${dish.dish_id} menu_id=${MENU_ID}`)
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

  await run('seed_enabled_description', async () => {
    mysqlExec(
      `UPDATE group_menu_section_dishes_v2
       SET description_enabled = 1, description_snapshot = ${sqlQuote(seededDescription)}
       WHERE id = ${dish.dish_id}`,
    )
    const check = mysqlRows(
      `SELECT COALESCE(description_enabled, 1) AS flag FROM group_menu_section_dishes_v2 WHERE id = ${dish.dish_id}`,
    )
    assert(Number(check[0].flag) === 1, 'description_enabled must be 1 after seed')
  })

  const dbFlag = () => {
    const rows = mysqlRows(
      `SELECT COALESCE(description_enabled, 1) AS flag FROM group_menu_section_dishes_v2 WHERE id = ${dish.dish_id}`,
    )
    return Number(rows[0].flag)
  }

  const switchSel = (clientId) => `[data-testid="menu-item-editor-description-switch-${clientId}"]`
  const titleSel = (clientId) => `[data-testid="menu-item-editor-title-input-${clientId}"]`
  const expandAllSections = async (page) => {
    const toggles = page.locator('[data-testid^="menu-section-editor-toggle-"]')
    const n = await toggles.count()
    for (let i = 0; i < n; i++) await toggles.nth(i).click().catch(() => {})
  }
  const findClientIdByTitle = (page, title) =>
    page.waitForFunction(
      (t) => {
        const inputs = [...document.querySelectorAll('[data-testid^="menu-item-editor-title-input-"]')]
        const el = inputs.find((i) => i.value === t)
        return el ? el.getAttribute('data-testid').replace('menu-item-editor-title-input-', '') : null
      },
      title,
      { timeout: 30_000, polling: 500 },
    )

  await withBrowserContext(correlationId, async ({ page }) => {
    await run('bo_login', async () => {
      const env = rootEnv()
      const resp = await page.request.post(`${boUrl}/api/admin/login`, {
        data: { identifier: env.LOGIN_USER, email: env.LOGIN_USER, password: env.LOGIN_PASSWORD },
        headers: { 'x-correlation-id': correlationId },
      })
      assert(resp.ok(), `backoffice login must succeed, got ${resp.status()}`)
    })

    await run('bo_toggle_off', async () => {
      await page.setExtraHTTPHeaders({ 'x-correlation-id': correlationId })
      await page.goto(`${boUrl}/app/menus/crear?menuId=${MENU_ID}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid^="menu-section-editor-"]', { timeout: 30_000 })
      await expandAllSections(page)
      const clientId = await findClientIdByTitle(page, dish.title_snapshot)
      const cid = await clientId.jsonValue()
      await page.waitForSelector(switchSel(cid), { timeout: 15_000 })
      const checked = await page.getAttribute(switchSel(cid), 'aria-checked')
      if (checked === 'true') {
        await page.click(switchSel(cid))
      }
      // autosave: wait until the DB flag actually flips to 0
      for (let waited = 0; waited < 30_000; waited += 500) {
        if (dbFlag() === 0) break
        await page.waitForTimeout(500)
      }
      assert(dbFlag() === 0, `autosave must persist description_enabled=0 for dish ${dish.dish_id}, flag still ${dbFlag()}`)
    })

    await run('bo_reload_keeps_off', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid^="menu-section-editor-"]', { timeout: 30_000 })
      await expandAllSections(page)
      const clientId = await findClientIdByTitle(page, dish.title_snapshot)
      const cid = await clientId.jsonValue()
      await page.waitForSelector(titleSel(cid), { timeout: 15_000 })
      for (let waited = 0; waited < 20_000; waited += 500) {
        const checked = await page.getAttribute(switchSel(cid), 'aria-checked')
        if (checked === 'false') break
        await page.waitForTimeout(500)
      }
      const checkedAfter = await page.getAttribute(switchSel(cid), 'aria-checked')
      assert(checkedAfter === 'false', `after reload the Descripcion switch must stay off, got aria-checked=${checkedAfter}`)
    })
  })

  await run('endpoint_flag_false', async () => {
    const resp = await fetch(
      `${baseUrl()}/api/menuDeGruposBackend/getMenuForDisplay?id=${MENU_ID}`,
      { headers: { 'x-correlation-id': correlationId } },
    )
    assert(resp.ok, `getMenuForDisplay must return 2xx, got ${resp.status}`)
    const body = await resp.json()
    assert(body.success === true, 'getMenuForDisplay must succeed')
    const menu = body.menu
    const allDishes = [
      ...(Array.isArray(menu.entrantes) ? menu.entrantes : []),
      ...((menu.principales && Array.isArray(menu.principales.items)) ? menu.principales.items : []),
      ...(Array.isArray(menu.postre) ? menu.postre : []),
    ]
    const target = allDishes.find((d) => Number(d.id) === dish.dish_id)
    assert(target, `dish ${dish.dish_id} must be present in getMenuForDisplay payload`)
    assert(target.descripcion_enabled === false, `endpoint must report descripcion_enabled=false, got ${JSON.stringify(target.descripcion_enabled)}`)
    assert(!('descripcion' in target), 'endpoint must omit descripcion when disabled')
  })

  restore()
  process.removeAllListeners('exit')

  console.log(`[${correlationId}] test_completed result=passed`)
} catch (err) {
  console.log(`[${correlationId}] test_completed result=failed error=${JSON.stringify(err && err.message)}`)
  console.error(err)
  process.exitCode = 1
}
