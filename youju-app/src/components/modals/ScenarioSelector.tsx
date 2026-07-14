import { X } from 'lucide-react'
import { SCENARIOS } from '../../constants/workspace'
import type { ScenarioType } from '../../types'

interface ScenarioSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectScenario: (scenarioId: ScenarioType) => void
}

export function ScenarioSelector({ isOpen, onClose, onSelectScenario }: ScenarioSelectorProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl bg-paper border border-rule rounded-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div>
            <h2 className="text-lg font-semibold text-ink font-display">选择分析场景</h2>
            <p className="text-xs text-ink-faint mt-0.5">选择一个场景模板开始分析</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {SCENARIOS.map((scenario) => {
              const Icon = scenario.iconComponent
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className="group p-4 bg-paper-dark/30 border border-rule/60 rounded-xl hover:border-accent/50 hover:bg-accent-bg/10 transition-all text-left"
                  onClick={() => {
                    onSelectScenario(scenario.id as ScenarioType)
                    onClose()
                  }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-paper-dark to-paper border border-rule/60 flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:border-accent-faint transition-all mb-3">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-sm font-medium text-ink mb-1">{scenario.name}</h4>
                  <p className="text-xs text-ink-faint line-clamp-2">{scenario.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
