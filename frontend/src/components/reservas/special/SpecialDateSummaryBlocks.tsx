import { useI18n } from '../../../lib/i18n'
import type { Lang } from '../../../lib/i18n'

/**
 * Summary blocks for the "special date" (fecha festiva) wizard step.
 *
 * Coordination id: special_summary_blocks_v1
 *
 * Two independent blocks so each can be reused on its own:
 *  - `SpecialMenusSummary`   -> who comes (per menu section: persons + price
 *                              per person) and which main courses were chosen.
 *                              Reusable for special dates that do NOT require a
 *                              deposit (adelanto).
 *  - `SpecialAdelantoSummary` -> deposit per menu section plus the total to pay.
 *                              Only rendered when a deposit actually exists.
 *
 * Both share `SummarySection`, so the "title / 2 personas / 60€-per-person"
 * column layout and the dish list markup live in one place.
 */

export type SpecialMenuSummaryRow = {
  /** Stable key for the entry: the special-date menu id or the section entry id. */
  key: string
  label: string
  count: number
  /** Price per person in euros, or null when the menu has no fixed price. */
  price: number | null
  /** Chosen main courses. Empty means "mains still to be decided". */
  rows: { name: string; servings: number }[]
  /** Deposit per person in euros, or null when this entry has no deposit. */
  adelantoPerPerson: number | null
  /** Deposit amount for this entry (adelantoPerPerson * count), or 0. */
  adelantoTotal: number
}

/** EUR amount: integers stay clean, cents always show 2 decimals. */
function euro(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}\u20ac`
}

/** Local es/en pair, same convention as the wizard screen. */
function textFor(lang: Lang, es: string, en: string) {
  return lang === 'en' ? en : es
}

/**
 * One menu section: title on top, "2 personas" and "60€-per-person" stacked
 * underneath, then the chosen main courses. Column layout (not row) so long
 * menu names never push the counters off-screen on mobile.
 */
function SummarySection(props: {
  sectionKey: string
  label: string
  count: number
  price: number | null
  rows: { name: string; servings: number }[]
  mainsToBeDecidedLabel: string
  mainsLabel: string
  testId: string
}) {
  const { lang } = useI18n()
  const t = (es: string, en: string) => textFor(lang, es, en)
  const s = props.sectionKey
  return (
    <div class="resvSummarySection" data-ui="special-summary-section" data-testid={`${props.testId}-${s}`}>
      <div class="resvSummarySectionHead">
        <div class="resvSummarySectionTitle" data-testid={`${props.testId}-${s}-label`}>
          {props.label}
        </div>
        <div class="resvSummarySectionMeta" data-testid={`${props.testId}-${s}-meta`}>
          <span class="resvSummarySectionCount" data-testid={`${props.testId}-${s}-count`}>
            {props.count} {props.count === 1 ? t('persona', 'person') : t('personas', 'persons')}
          </span>
          {props.price != null ? (
            <span class="resvSummarySectionPrice" data-testid={`${props.testId}-${s}-price`}>
              {euro(props.price)}/{t('persona', 'person')}
            </span>
          ) : null}
        </div>
      </div>
      <div class="resvSummarySectionListTitle" data-testid={`${props.testId}-${s}-mains-title`}>
        {props.rows.length > 0 ? props.mainsLabel : props.mainsToBeDecidedLabel}
      </div>
      {props.rows.length > 0 ? (
        <ul class="resvSummarySectionList" data-testid={`${props.testId}-${s}-mains-list`}>
          {props.rows.map((r, i) => (
            <li key={`${r.name}-${i}`} data-testid={`${props.testId}-${s}-main-${i}`}>
              {r.name} x {r.servings}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Block 1: the selected festive menus and their main courses. Rendered on its
 * own for special dates that need main courses but no deposit.
 */
export function SpecialMenusSummary(props: {
  title: string
  /** Name of the festive date. Rendered as a dedicated heading above the title. */
  festiveDateTitle?: string
  items: SpecialMenuSummaryRow[]
}) {
  const { lang } = useI18n()
  const t = (es: string, en: string) => textFor(lang, es, en)
  const mainsLabel = t('Principales', 'Main courses')
  const pendingLabel = t('Principales por decidir', 'Mains to be decided')
  return (
    <div
      class="resvSummaryBlock"
      data-coordination-id="special_summary_blocks_v1"
      data-testid="reservas-summary-special-menu-block"
    >
      {props.festiveDateTitle ? (
        <div class="resvSummaryFestiveTitle" data-testid="reservas-summary-special-menu-festive-title">
          <span class="resvSummaryFestiveTitleLabel">{t('Fecha festiva', 'Festive date')}</span>
          <span class="resvSummaryFestiveTitleName">{props.festiveDateTitle}</span>
        </div>
      ) : null}
      <div class="resvSummaryBlockTitle" data-testid="reservas-summary-special-menu-title">
        {props.title}
      </div>
      <div class="resvSummarySectionWrap" data-testid="reservas-summary-special-menu-sections">
        {props.items.map((row) => (
          <SummarySection
            key={row.key}
            sectionKey={row.key}
            label={row.label}
            count={row.count}
            price={row.price}
            rows={row.rows}
            mainsLabel={mainsLabel}
            mainsToBeDecidedLabel={pendingLabel}
            testId="reservas-summary-special-menu-section"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Block 2: the deposit. Splits the total per menu section and closes with the
 * total to pay plus the chosen payment method.
 */
export function SpecialAdelantoSummary(props: {
  title: string
  items: SpecialMenuSummaryRow[]
  total: number
  paymentMethodLabel: string
}) {
  const { lang } = useI18n()
  const t = (es: string, en: string) => textFor(lang, es, en)
  const withDeposit = props.items.filter((r) => r.adelantoTotal > 0)
  if (props.total <= 0 || withDeposit.length === 0) return null
  return (
    <div
      class="resvSummaryBlock"
      data-coordination-id="special_summary_blocks_v1"
      data-testid="reservas-summary-special-menu-adelanto-block"
    >
      <div class="resvSummaryBlockTitle" data-testid="reservas-summary-special-menu-adelanto-title">
        {props.title}
      </div>
      <div class="resvSummarySectionWrap" data-testid="reservas-summary-special-menu-adelanto-sections">
        {withDeposit.map((row) => (
          <div
            class="resvSummaryAdelantoRow"
            key={row.key}
            data-testid={`reservas-summary-special-menu-adelanto-section-${row.key}`}
          >
            <span
              class="resvSummaryAdelantoLabel"
              data-testid={`reservas-summary-special-menu-adelanto-label-${row.key}`}
            >
              {row.label}
            </span>
            <span
              class="resvSummaryAdelantoValue"
              data-testid={`reservas-summary-special-menu-adelanto-value-${row.key}`}
            >
              {row.adelantoPerPerson != null ? euro(row.adelantoPerPerson) : ''} x {row.count} = {euro(row.adelantoTotal)}
            </span>
          </div>
        ))}
      </div>
      <div class="resvSummaryRow resvSummaryRow--total resvSummaryTotalAdelanto" data-testid="reservas-summary-row-special-menu-total-adelanto">
        <span data-testid="reservas-summary-label-special-menu-total-adelanto">
          {t('Total adelanto a pagar', 'Total deposit to pay')}
        </span>
        <span class="resvSummaryValue" data-testid="reservas-summary-value-special-menu-total-adelanto">
          {euro(props.total)}
          {props.paymentMethodLabel ? ` \u00b7 ${props.paymentMethodLabel}` : ''}
        </span>
      </div>
    </div>
  )
}
