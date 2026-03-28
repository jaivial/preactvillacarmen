import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock apiGetJson before importing the module under test.
vi.mock('../api', () => ({
  apiGetJson: vi.fn(),
  apiUrl: (path: string) => path,
  apiFetch: vi.fn(),
}))

import { apiGetJson } from '../api'
import type { SidebarMenu, HomeMenu, MenuByIDResponse } from '../types'

const mockGetJson = vi.mocked(apiGetJson)

describe('fetchMenuByID', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls /api/menus/{id} with the given menu id', async () => {
    const fakeResponse: MenuByIDResponse = {
      success: true,
      menu: {
        id: 42,
        slug: 'menu-del-dia-42',
        menu_title: 'Menu del Dia',
        menu_type: 'closed_conventional',
        price: '18',
        active: true,
        menu_subtitle: ['Entrante + Principal + Postre'],
        entrantes: [],
        principales: { titulo_principales: 'Principal', items: [] },
        postre: [],
        settings: {
          included_coffee: true,
          beverage: {},
          comments: [],
          min_party_size: 1,
          main_dishes_limit: false,
          main_dishes_limit_number: 1,
        },
        sections: [],
        show_dish_images: false,
        special_menu_image_url: '',
        show_menu_preview_image: false,
        menu_preview_image_url: '',
        created_at: '2026-01-01',
        modified_at: '2026-01-01',
      },
    }
    mockGetJson.mockResolvedValueOnce(fakeResponse)

    // Dynamic import to ensure mock is active
    const { fetchMenuByID } = await import('../menuApi')
    const result = await fetchMenuByID(42)

    expect(mockGetJson).toHaveBeenCalledTimes(1)
    expect(mockGetJson).toHaveBeenCalledWith('/api/menus/42')
    expect(result.id).toBe(42)
  })

  it('does NOT call /api/menus/public', async () => {
    mockGetJson.mockResolvedValueOnce({ success: true, menu: {} })
    const { fetchMenuByID } = await import('../menuApi')
    await fetchMenuByID(7)

    const calls = mockGetJson.mock.calls.map((c) => String(c[0]))
    expect(calls).not.toContainEqual(expect.stringContaining('/api/menus/public'))
  })
})

describe('fetchMenuSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls /api/menus/sidebar', async () => {
    const fakeResponse = {
      success: true,
      count: 2,
      menus: [
        { id: 1, slug: 'menu-1', menu_title: 'Menu 1', menu_type: 'closed_conventional', active: true },
        { id: 2, slug: 'menu-2', menu_title: 'Menu 2', menu_type: 'a_la_carte', active: true },
      ] as SidebarMenu[],
    }
    mockGetJson.mockResolvedValueOnce(fakeResponse)

    const { fetchMenuSidebar } = await import('../menuApi')
    const result = await fetchMenuSidebar()

    expect(mockGetJson).toHaveBeenCalledTimes(1)
    expect(mockGetJson).toHaveBeenCalledWith('/api/menus/sidebar')
    expect(result).toHaveLength(2)
  })
})

describe('fetchMenuHome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls /api/menus/home', async () => {
    const fakeResponse = {
      success: true,
      count: 1,
      menus: [
        {
          id: 1,
          slug: 'menu-1',
          menu_title: 'Menu 1',
          menu_type: 'closed_conventional',
          active: true,
          menu_subtitle: ['Subtitle'],
          show_menu_preview_image: true,
          menu_preview_image_url: 'https://example.com/img.jpg',
        },
      ] as HomeMenu[],
    }
    mockGetJson.mockResolvedValueOnce(fakeResponse)

    const { fetchMenuHome } = await import('../menuApi')
    const result = await fetchMenuHome()

    expect(mockGetJson).toHaveBeenCalledTimes(1)
    expect(mockGetJson).toHaveBeenCalledWith('/api/menus/home')
    expect(result).toHaveLength(1)
  })
})
