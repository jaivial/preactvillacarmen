import type { ComponentChildren } from 'preact'
import { Fragment } from 'preact'
import { useState } from 'preact/hooks'
import { StickyTabBar } from '../../components/ui'

export type MenuSectionTabPanel = {
  key: string
  label: string
  content: ComponentChildren
  hidden?: boolean
}

/**
 * Renders a menu's sections either stacked (default) or behind a sticky tab bar.
 *
 * Each public menu page keeps building its own sections and just hands them over
 * as panels, so the tab behaviour lives in one place and the pages stay dumb.
 *
 * Coordination id: menu_section_tabs_flag (DB `menus.show_section_tabs` ->
 * public REST `show_section_tabs` -> this component).
 */
export function MenuSectionTabs(props: {
  enabled?: boolean
  panels: MenuSectionTabPanel[]
  ariaLabel: string
  bubbleId: string
  testId: string
}) {
  const visible = props.panels.filter((panel) => !panel.hidden)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const activeKey = visible.some((panel) => panel.key === selectedKey) ? selectedKey : visible[0]?.key || ''
  const tabbed = !!props.enabled && visible.length > 1

  if (tabbed && typeof window !== 'undefined' && window.location.search.includes('vcdebug=1')) {
    // Named observation point: menu sections rendered as tabs.
    console.log(`[checkpoint] public_menu_section_tabs_rendered count=${visible.length} active=${activeKey}`)
  }

  return (
    <Fragment>
      {tabbed ? (
        <StickyTabBar
          items={visible.map((panel) => ({ key: panel.key, label: panel.label }))}
          activeKey={activeKey}
          onSelect={setSelectedKey}
          ariaLabel={props.ariaLabel}
          bubbleId={props.bubbleId}
          testId={props.testId}
        />
      ) : null}
      {visible.map((panel) =>
        tabbed && panel.key !== activeKey ? null : <Fragment key={panel.key}>{panel.content}</Fragment>,
      )}
    </Fragment>
  )
}
