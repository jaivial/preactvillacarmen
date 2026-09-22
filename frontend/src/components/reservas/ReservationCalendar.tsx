import type { Lang } from '../../lib/i18n'
import { buildCalendarCells, isCalendarDateDisabled, monthName, type CalendarRuleContext } from '../../lib/reservationCalendar'

/**
 * The reservation month calendar, extracted from the booking wizard so the
 * self-service modify wizard shows the exact same grid, navigation, statuses
 * and legend.
 *
 * The view month is controlled by the caller because it also drives the
 * month-availability fetch.
 *
 * Coordination id: reservation_calendar_rules_v1
 */
export function ReservationCalendar(props: {
  testId: string
  title: string
  selectedDate: string | null
  todayISO: string
  viewMonth0: number
  viewYear: number
  onViewChange: (month0: number, year: number) => void
  monthAvailability: Record<string, { freeBookingSeats: number }> | null
  rules: CalendarRuleContext
  onPickDate: (iso: string, inMonth: boolean) => void
  text: (es: string, en: string) => string
  lang: Lang
}) {
  const t = props.testId
  const cells = buildCalendarCells(props.viewYear, props.viewMonth0)
  const weekdays = props.lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const stepMonth = (delta: number) => {
    let month = props.viewMonth0 + delta
    let year = props.viewYear
    if (month < 0) {
      month = 11
      year -= 1
    } else if (month > 11) {
      month = 0
      year += 1
    }
    props.onViewChange(month, year)
  }

  return (
    <div class="resvCard" data-testid={`${t}-card`}>
      <div class="resvCardHead" data-testid={`${t}-card-head`}>
        <div class="resvCardTitle" data-testid={`${t}-card-title`}>{props.title}</div>
      </div>

      <div class="resvCalendar" data-testid={t}>
        <div class="resvCalendarHead" data-testid={`${t}-head`}>
          <button
            type="button"
            class="resvCalNav"
            data-testid={`${t}-prev-month`}
            aria-label={props.text('Mes anterior', 'Previous month')}
            onClick={() => stepMonth(-1)}
          >
            ‹
          </button>
          <div class="resvCalTitle" data-testid={`${t}-month-title`}>
            {monthName(props.viewMonth0, props.lang)} {props.viewYear}
          </div>
          <button
            type="button"
            class="resvCalNav"
            data-testid={`${t}-next-month`}
            aria-label={props.text('Mes siguiente', 'Next month')}
            onClick={() => stepMonth(1)}
          >
            ›
          </button>
        </div>

        <div class="resvCalWeekdays" aria-hidden="true" data-testid={`${t}-weekdays`}>
          {weekdays.map((day, index) => (
            <div key={index} data-testid={`${t}-weekday-${index}`}>{day}</div>
          ))}
        </div>

        <div class="resvCalDays" data-testid={`${t}-days`}>
          {cells.map((c) => {
            const free = props.monthAvailability?.[c.iso]?.freeBookingSeats
            const fullyBooked = typeof free === 'number' && free <= 0
            const disabled = isCalendarDateDisabled(c.iso, c.inMonth, props.rules)
            const isSelected = props.selectedDate === c.iso
            const isToday = c.iso === props.todayISO

            let cls = 'resvDay'
            if (!c.inMonth) cls += ' other'
            if (disabled) cls += ' disabled'
            if (fullyBooked) cls += ' full'
            if (isSelected && !disabled) cls += ' selected'
            if (isToday && !disabled) cls += ' today'

            return (
              <button
                type="button"
                class={cls}
                key={c.iso}
                data-testid={`${t}-day-${c.iso}`}
                disabled={disabled}
                onClick={() => props.onPickDate(c.iso, c.inMonth)}
              >
                {c.date.getDate()}
              </button>
            )
          })}
        </div>

        <div class="resvLegend" aria-hidden="true" data-testid={`${t}-legend`}>
          <div class="resvLegendItem" data-testid={`${t}-legend-available`}>
            <i class="swatch available" data-testid={`${t}-legend-available-swatch`} /> {props.text('Disponible', 'Available')}
          </div>
          <div class="resvLegendItem" data-testid={`${t}-legend-selected`}>
            <i class="swatch selected" data-testid={`${t}-legend-selected-swatch`} /> {props.text('Seleccionado', 'Selected')}
          </div>
          <div class="resvLegendItem" data-testid={`${t}-legend-unavailable`}>
            <i class="swatch disabled" data-testid={`${t}-legend-unavailable-swatch`} /> {props.text('No disponible', 'Unavailable')}
          </div>
          <div class="resvLegendItem" data-testid={`${t}-legend-full`}>
            <i class="swatch full" data-testid={`${t}-legend-full-swatch`} /> {props.text('Completo', 'Full')}
          </div>
        </div>
      </div>
    </div>
  )
}
