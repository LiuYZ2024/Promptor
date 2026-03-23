interface NewSessionModalProps {
  onConfirm: () => void;
  onDismissForever: () => void;
  onClose: () => void;
}

export function NewSessionModal({ onConfirm, onDismissForever, onClose }: NewSessionModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background shadow-xl">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-foreground">
            如何按这个流程进行更稳定的 Vibe Coding
          </h2>
        </div>

        <div className="space-y-4 px-6 py-3 text-sm text-foreground/90">
          <section>
            <h3 className="mb-1 font-medium">1. 先调研，再规划，再实现</h3>
            <p className="text-muted-foreground">
              不要一上来就让 agent 写代码。先让它读懂现有代码和上下文，产出 research.md；再基于 research.md 产出 plan.md；等你审完 plan 后再进入实现。
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium">2. 每个阶段都有产物</h3>
            <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
              <li>调研阶段：research.md</li>
              <li>规划阶段：plan.md</li>
              <li>批注循环：更新后的 plan.md</li>
              <li>验证阶段：test-report.md</li>
            </ul>
            <p className="mt-1 text-muted-foreground">
              这些文件不是聊天记录，而是后续阶段的重要上下文。
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium">3. 你要做的是"审"和"批注"</h3>
            <p className="text-muted-foreground">
              Promptor 帮你生成适合外部 agent 的高质量 prompt，但真正关键的是你要阅读 research.md / plan.md，并在 plan.md 中直接加批注，再让 agent 更新方案。
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium">4. 为什么这样更省 token</h3>
            <p className="text-muted-foreground">
              因为问题大多不是"代码不会写"，而是"理解错了"和"方向走偏了"。把时间花在前期的 research、discussion、plan 和批注上，通常能显著减少返工和 token 浪费。
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-medium">5. 一个最重要的原则</h3>
            <p className="font-medium text-foreground">
              在 plan 没审定之前，不要进入实现。
            </p>
          </section>
        </div>

        <div className="border-t border-border px-6 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            你可以随时上传 research.md、plan.md 或带批注的文件，让 Promptor 帮你生成下一阶段更合适的 prompt。
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onDismissForever}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              不再显示
            </button>
            <button
              onClick={onConfirm}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
