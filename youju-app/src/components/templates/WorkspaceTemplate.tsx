import type { ReactNode } from 'react'
import { Resizer } from '../common/ResizablePanel'

export interface WorkspaceTemplateProps {
  sidebar?: ReactNode
  toolbar?: ReactNode
  leftPanel?: ReactNode
  centerPanel?: ReactNode
  rightPanel?: ReactNode
  statusBar?: ReactNode
  leftPanelWidth?: number
  rightPanelWidth?: number
  leftPanelCollapsed?: boolean
  rightPanelCollapsed?: boolean
  sidebarCollapsed?: boolean
  onLeftPanelResize?: (delta: number) => void
  onRightPanelResize?: (delta: number) => void
  onLeftPanelCollapse?: () => void
  onLeftPanelExpand?: () => void
  onRightPanelCollapse?: () => void
  onRightPanelExpand?: () => void
  onSidebarCollapse?: () => void
  onSidebarExpand?: () => void
  className?: string
  children?: ReactNode
}

export function WorkspaceTemplate({
  sidebar,
  toolbar,
  leftPanel,
  centerPanel,
  rightPanel,
  statusBar,
  leftPanelWidth = 320,
  rightPanelWidth = 320,
  leftPanelCollapsed = false,
  rightPanelCollapsed = false,
  sidebarCollapsed = false,
  onLeftPanelResize,
  onRightPanelResize,
  onLeftPanelCollapse,
  onLeftPanelExpand,
  onRightPanelCollapse,
  onRightPanelExpand,
  onSidebarCollapse,
  onSidebarExpand,
  className = '',
  children,
}: WorkspaceTemplateProps) {
  return (
    <div className={`flex h-screen bg-paper text-ink overflow-hidden relative ${className}`}>
      {sidebar && !sidebarCollapsed && (
        <div data-ws-sidebar className="flex-shrink-0 h-full">
          {sidebar}
        </div>
      )}

      {sidebarCollapsed && onSidebarExpand && (
        <div
          className="hidden md:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2"
          style={{ width: '48px' }}
        >
          <button
            type="button"
            onClick={onSidebarExpand}
            aria-label="展开侧边栏"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {toolbar && (
          <div data-ws-topbar className="relative shrink-0">
            {toolbar}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex relative">
          {leftPanel && !leftPanelCollapsed && (
            <>
              <div
                data-ws-left-panel
                className="hidden sm:block flex-shrink-0 h-full"
                style={{ width: `${leftPanelWidth}px` }}
              >
                {leftPanel}
              </div>
              {onLeftPanelResize && (
                <div className="hidden sm:block h-full">
                  <Resizer onResize={onLeftPanelResize} />
                </div>
              )}
            </>
          )}

          {leftPanelCollapsed && onLeftPanelExpand && (
            <div
              className="hidden sm:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-r border-rule gap-2 h-full"
              style={{ width: '48px' }}
            >
              <button
                type="button"
                onClick={onLeftPanelExpand}
                aria-label="展开左侧面板"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}

          <div data-ws-center-panel className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {centerPanel}
          </div>

          {rightPanel && !rightPanelCollapsed && (
            <>
              {onRightPanelResize && (
                <div className="hidden lg:block h-full">
                  <Resizer onResize={onRightPanelResize} />
                </div>
              )}
              <div
                data-ws-right-panel
                className="hidden lg:block flex-shrink-0 h-full"
                style={{ width: `${rightPanelWidth}px` }}
              >
                {rightPanel}
              </div>
            </>
          )}

          {rightPanelCollapsed && onRightPanelExpand && (
            <div
              className="hidden lg:flex flex-shrink-0 flex-col items-center py-3 bg-paper border-l border-rule gap-2 h-full"
              style={{ width: '48px' }}
            >
              <button
                type="button"
                onClick={onRightPanelExpand}
                aria-label="展开右侧面板"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-paper-dark hover:text-ink transition-colors cursor-pointer border border-rule/60 bg-paper-dark/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {statusBar && (
          <div data-ws-statusbar className="shrink-0 border-t border-rule">
            {statusBar}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
