import { render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventInquiryForm, validateEventInquiryValues, type EventInquiryValues } from './EventInquiryForm'
import { I18nProvider } from '../lib/i18n'
import { isoFromLocalDate } from '../lib/reservationCalendar'

const valid = (): EventInquiryValues => ({
  name: 'María García', email: 'maria@example.com', emailRepeat: 'maria@example.com', countryCode: '34', phone: '612345678',
  adults: 20, children: 3, eventType: 'wedding', date: '2027-01-15', notes: 'Sin gluten',
})

describe('event inquiry validation', () => {
  it('accepts a valid request and rejects mismatched contact data, dates and capacity', () => {
    expect(validateEventInquiryValues(valid(), '2026-10-22', '2028-10-22')).toBe('')
    expect(validateEventInquiryValues({ ...valid(), emailRepeat: 'other@example.com' }, '2026-10-22', '2028-10-22')).toBe('emailRepeat')
    expect(validateEventInquiryValues({ ...valid(), phone: '12' }, '2026-10-22', '2028-10-22')).toBe('phone')
    expect(validateEventInquiryValues({ ...valid(), adults: 499, children: 2 }, '2026-10-22', '2028-10-22')).toBe('guests')
    expect(validateEventInquiryValues({ ...valid(), adults: 0 }, '2026-10-22', '2028-10-22')).toBe('guests')
    expect(validateEventInquiryValues({ ...valid(), date: '2026-10-21' }, '2026-10-22', '2028-10-22')).toBe('date')
    expect(validateEventInquiryValues({ ...valid(), date: '2028-10-23' }, '2026-10-22', '2028-10-22')).toBe('date')
  })
})

describe('event inquiry UI', () => {
  let root: HTMLDivElement
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root) })
  afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals() })
  const mount = (lang: 'es' | 'en' = 'es') => act(() => { render(<I18nProvider initialLang={lang}><EventInquiryForm defaultEventType="wedding" /></I18nProvider>, root) })
  const input = (name: string) => root.querySelector(`[name="${name}"]`) as HTMLInputElement
  const change = (element: HTMLInputElement, value: string) => { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })) }

  it('limits counters, rejects invalid input without a request and preserves height while loading', async () => {
    let resolveResponse!: (value: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    mount()
    const decrement = root.querySelector('[data-testid="event-inquiry-adults-decrement"]') as HTMLButtonElement
    const increment = root.querySelector('[data-testid="event-inquiry-adults-increment"]') as HTMLButtonElement
    expect(decrement.disabled).toBe(false)
    act(() => { decrement.click(); decrement.click() })
    expect(root.querySelector('[data-testid="event-inquiry-adults-value"]')?.textContent).toBe('1')
    expect(decrement.disabled).toBe(true)
    const form = root.querySelector('form') as HTMLFormElement
    Object.defineProperty(form, 'offsetHeight', { configurable: true, value: 1234 })
    act(() => { (root.querySelector('[data-testid="event-inquiry-submit"]') as HTMLButtonElement).click() })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(root.textContent).toContain('Escribe tu nombre y apellidos.')
    act(() => { change(input('name'), 'María García'); change(input('email'), 'maria@example.com'); change(input('emailRepeat'), 'maria@example.com') })
    const firstDigit = root.querySelector('[data-testid="event-inquiry-phone-digit-0"]') as HTMLInputElement
    act(() => { change(firstDigit, '612345678') })
    const tomorrow = isoFromLocalDate(new Date(Date.now() + 86400000))
    // Tomorrow can fall in the next month, so move the calendar before picking it.
    if (new Date(Date.now() + 86400000).getMonth() !== new Date().getMonth()) {
      act(() => { (root.querySelector('[data-testid="event-inquiry-calendar-next-month"]') as HTMLButtonElement).click() })
    }
    act(() => { (root.querySelector(`[data-testid="event-inquiry-calendar-day-${tomorrow}"]`) as HTMLButtonElement).click() })
    expect(increment.disabled).toBe(false)
    act(() => { (root.querySelector('[data-testid="event-inquiry-submit"]') as HTMLButtonElement).click() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const loader = root.querySelector('[data-testid="event-inquiry-loading"]') as HTMLElement
    expect(loader.style.minHeight).toBe('1234px')
    await act(async () => { resolveResponse(new Response(JSON.stringify({ success: true, notifications: { customerEmail: true, customerWhatsApp: true, restaurantEmail: true, restaurantWhatsApp: 3 } }), { status: 200 })); await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(root.querySelector('[data-testid="event-inquiry-success"]')?.textContent).toContain('WhatsApp y email')
    expect(root.querySelector('[data-testid="event-inquiry-success"]')?.textContent).toContain('NO es una reserva')
  })

  it('renders the English disclaimer and does not treat the request as a reservation', () => {
    mount('en')
    expect(root.textContent).toContain('information request only and NOT a reservation')
    expect(root.textContent).toContain('Under 12 years old')
    expect(root.querySelectorAll('[data-testid^="event-inquiry-phone-digit-"]')).toHaveLength(9)
  })
})
