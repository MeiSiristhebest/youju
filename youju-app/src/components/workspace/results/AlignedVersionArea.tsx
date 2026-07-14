import { FileCheck } from 'lucide-react'
import { useAnalysisStore } from '../../../stores'

export function AlignedVersionArea() {
  const result = useAnalysisStore((state) => state.result)
  const alignedVersion = result?.alignedVersion

  return (
    <div className="p-4">
      {alignedVersion ? (
        <div className="rounded-lg border-l-4 border-accent bg-accent-bg/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-accent-bg text-accent flex items-center justify-center">
              <FileCheck size={15} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-ink">统一版本参照</h4>
              <p className="text-[11px] text-ink-faint">基于多材料交叉验证后的共识版本</p>
            </div>
          </div>
          <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
            {alignedVersion}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 mb-4 rounded-full bg-paper-dark flex items-center justify-center text-ink-faint border border-rule">
            <FileCheck size={28} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-ink mb-1">暂无统一版本</p>
          <p className="text-xs text-ink-faint">统一版本将在分析后生成</p>
        </div>
      )}
    </div>
  )
}
