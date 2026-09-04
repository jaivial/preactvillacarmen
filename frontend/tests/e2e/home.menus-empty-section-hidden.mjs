// E2E (mjs): home .vc-menus section must not render when no menus are fetched.
// Correlation id crosses browser -> backend -> logs; named checkpoints at each boundary.
import {
  assert,
  baseUrl,
  backendLogLines,
  assertBackendCheckpoints,
  createRunner,
  mysqlExec,
  mysqlRows,
  newCorrelationId,
  restaurantId,
  withBrowserContext,
} from './helpers/vc.lib.mjs'

const correlationId = newCorrelationId()
const run = createRunner(correlationId)
// API is reached through the preact dev proxy, matching existing suite convention.
const apiBase = baseUrl()

console.log(`[${correlationId}] test_started scenario=home_menus_empty_section_hidden`)
let previouslyActiveIds = []

function restoreFixtures() {
  if (previouslyActiveIds.length > 0) {
    mysqlExec(
      `UPDATE menus SET active = 1 WHERE restaurant_id = ${restaurantId()} AND id IN (${previouslyActiveIds.join(',')})`,
    )
  }
}

try {
  await run('fixture_prepared', async () => {
    // Start from a clean state: deactivate every public menu of this restaurant.
    const existing = mysqlRows(
      `SELECT id FROM menus WHERE restaurant_id = ${restaurantId()} AND is_draft = 0 AND active = 1`,
    )
    previouslyActiveIds = existing.map((r) => String(r.id))
    if (previouslyActiveIds.length > 0) {
      mysqlExec(
        `UPDATE menus SET active = 0 WHERE restaurant_id = ${restaurantId()} AND id IN (${previouslyActiveIds.join(',')})`,
      )
    }
  })

  await run('public_api_returns_empty', async () => {
    const res = await fetch(`${apiBase}/api/menus/home`, {
      headers: { 'x-correlation-id': correlationId },
    })
    assert(res.ok, `menus home api status ${res.status}`)
    const body = await res.json()
    assert(Array.isArray(body.menus), 'menus is an array')
    assert(body.menus.length === 0, `expected 0 home menus, got ${body.menus.length}`)
  })

  await run('frontend_section_hidden', async () => {
    await withBrowserContext(correlationId, async ({ page, consoleCheckpoints }) => {
      await page.goto(`${baseUrl()}/`, { waitUntil: 'networkidle' })
      const sectionCount = await page.locator('section.vc-menus').count()
      assert(sectionCount === 0, `expected 0 .vc-menus sections when no menus, got ${sectionCount}`)
      assert(
        consoleCheckpoints.includes('home_menus_empty'),
        'frontend observation point home_menus_empty not logged',
      )
    })
  })

  await run('backend_checkpoints_verified', async () => {
    assertBackendCheckpoints(backendLogLines(correlationId), [
      'home_menus_request_received',
      'home_menus_db_query_completed',
      'home_menus_response_sent',
    ])
  })

  restoreFixtures()
  console.log(`[${correlationId}] test_completed result=passed`)
  process.exit(0)
} catch (err) {
  console.log(`[${correlationId}] test_completed result=failed error=${JSON.stringify(err && err.message)}`)
  console.error(err)
  restoreFixtures()
  process.exit(1)
}
