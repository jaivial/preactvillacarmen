// Scenario: getActiveMenusForDisplay must return a SLIM payload.
// Per menu only: id, menu_title, menu_title_english (when a translation exists).
// No price, no sections, no dishes. Full content lives in getMenuForDisplay.
// Pipeline:
//   test_started
//   -> fixture_active_menus_queried (dev DB)
//   -> slim_list_fetched (direct API, x-correlation-id header)
//   -> correlation_header_echoed
//   -> slim_keys_asserted (id + menu_title [+ menu_title_english], nothing else)
//   -> backend_checkpoints_verified
//   -> test_completed
import {
  newCorrelationId,
  createRunner,
  mysqlRows,
  restaurantId,
  assert,
  baseUrl,
  backendLogLines,
  assertBackendCheckpoints,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
console.log(`[${correlationId}] test_started scenario=menusdegrupos.list-shape`)

try {
  const run = createRunner(correlationId)

  let groupIds = []
  await run('fixture_active_menus_queried', async () => {
    const rows = mysqlRows(
      `SELECT id FROM menus
       WHERE restaurant_id = ${Number(restaurantId())} AND active = 1
         AND COALESCE(NULLIF(TRIM(menu_type), ''), 'closed_conventional') IN ('closed_group','a_la_carte_group')
       ORDER BY created_at ASC`,
    )
    groupIds = rows.map((r) => Number(r.id))
    assert(groupIds.length >= 1, `fixture must contain at least 1 active group menu, got ${groupIds.length}`)
  })

  let response = null
  let body = null
  await run('slim_list_fetched', async () => {
    response = await fetch(`${baseUrl()}/api/menuDeGruposBackend/getActiveMenusForDisplay`, {
      headers: { 'x-correlation-id': correlationId },
    })
    assert(response.ok, `getActiveMenusForDisplay must return 2xx, got ${response.status}`)
    body = await response.json()
    assert(body.success === true, 'response must have success=true')
    assert(Array.isArray(body.menus), 'response must have menus array')
    assert(
      body.count === body.menus.length,
      `count (${body.count}) must equal menus length (${body.menus.length})`,
    )
    assert(
      body.menus.length === groupIds.length,
      `menus length ${body.menus.length} must equal fixture ${groupIds.length}`,
    )
  })

  await run('correlation_header_echoed', async () => {
    const echoed = response.headers.get('x-correlation-id')
    assert(echoed === correlationId, `backend must echo x-correlation-id, got ${JSON.stringify(echoed)}`)
  })

  await run('slim_keys_asserted', async () => {
    const ALLOWED = new Set(['id', 'menu_title', 'menu_title_english'])
    const bodyIds = []
    for (const menu of body.menus) {
      const keys = Object.keys(menu)
      const extra = keys.filter((k) => !ALLOWED.has(k))
      assert(extra.length === 0, `menu ${menu.id} must have ONLY id/menu_title/menu_title_english, got extra keys: ${JSON.stringify(extra)}`)
      assert(typeof menu.id === 'number' && menu.id > 0, `menu id must be a positive number, got ${JSON.stringify(menu.id)}`)
      assert(typeof menu.menu_title === 'string' && menu.menu_title.length > 0, `menu ${menu.id} must have a non-empty menu_title`)
      if ('menu_title_english' in menu) {
        assert(typeof menu.menu_title_english === 'string', `menu ${menu.id} menu_title_english must be a string when present`)
      }
      bodyIds.push(menu.id)
    }
    assert(
      JSON.stringify([...bodyIds].sort()) === JSON.stringify([...groupIds].sort()),
      `returned ids ${JSON.stringify(bodyIds)} must equal fixture ids ${JSON.stringify(groupIds)}`,
    )
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
