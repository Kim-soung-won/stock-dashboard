import type { DebugEntry } from '@/shared/lib';

interface DebugEntryRowProps {
  entry: DebugEntry;
}

/** 로그 한 줄. 상세(리포트 전문·스택)는 접어 둔다. 이 패널 전용 sub 컴포넌트. */
export const DebugEntryRow = ({ entry }: DebugEntryRowProps) => (
  <div className={'debug-entry debug-entry--' + entry.level}>
    <div className="debug-entry__head">
      <span className="debug-entry__at">{entry.at}</span>
      <span className="debug-entry__source">{entry.source}</span>
      <span className="debug-entry__message">{entry.message}</span>
    </div>
    {entry.detail ? (
      <details>
        <summary>상세</summary>
        <pre>{entry.detail}</pre>
      </details>
    ) : null}
  </div>
);
