import { render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MenuSection } from './MenuShared'
import { toDishList } from './menuPublicHelpers'
import { I18nProvider } from '../../lib/i18n'

describe('shared menu dish pricing', () => {
  let root: HTMLDivElement
  beforeEach(() => { root = document.createElement('div'); document.body.appendChild(root) })
  afterEach(() => { render(null, root); root.remove() })

  it('shows configured dish prices only when requested by the landing', () => {
    const [dish] = toDishList({ dishes: [{
      id: 501, title: 'Arroz de prueba', description: 'Descripción', price: 12.5,
      price_enabled: true, active: true, allergens: [], sort_order: 1,
    }] } as any)
    act(() => { render(<I18nProvider><MenuSection title="Nuestros arroces" dishes={[dish]} showDishPrice /></I18nProvider>, root) })
    expect(root.querySelector('.dishCardPrice')?.textContent).toBe('+12.50€')
    act(() => { render(<I18nProvider><MenuSection title="Carta" dishes={[dish]} /></I18nProvider>, root) })
    expect(root.querySelector('.dishCardPrice')).toBeNull()
  })
})
