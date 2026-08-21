import { useEffect, useState, useSyncExternalStore } from 'react';
import { debugLog } from '@/shared/lib';
import { DebugEntryRow } from './components/debug-entry-row';

const STORAGE_KEY = 'debug-panel-open';

/**
 * 인앱 디버그 패널.
 *
 * 개발자도구를 열 수 없는 환경(IDE 내장 프리뷰, 정책 제한 PC)에서도 원인을 확인할 수
 * 있게 콘솔 대신 화면에 로그를 띄운다. 에러·쿼리 실패·실시간 세션 변화가 모인다.
 *
 * 토글: 우하단 버튼 또는 `Ctrl+Shift+D`. 열림 상태는 localStorage 에 남는다.
 */
export const DebugPanel = () => {
  const entries = useSyncExternalStore(debugLog.subscribe, debugLog.getSnapshot);
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [errorOnly, setErrorOnly] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0');
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const errorCount = entries.filter((entry) => entry.level === 'error').length;
  const visible = errorOnly ? entries.filter((entry) => entry.level === 'error') : entries;

  if (!isOpen) {
    return (
      <button
        type="button"
        className={'debug-toggle' + (errorCount > 0 ? ' debug-toggle--alert' : '')}
        onClick={() => setIsOpen(true)}
        title="디버그 패널 (Ctrl+Shift+D)"
      >
        디버그{errorCount > 0 ? ` ${errorCount}` : ''}
      </button>
    );
  }

  return (
    <aside className="debug-panel">
      <header className="debug-panel__head">
        <strong>디버그 로그</strong>
        <span className="debug-panel__count">
          {entries.length}건{errorCount > 0 ? ` · 에러 ${errorCount}` : ''}
        </span>
        <label className="debug-panel__filter">
          <input
            type="checkbox"
            checked={errorOnly}
            onChange={(event) => setErrorOnly(event.target.checked)}
          />
          에러만
        </label>
        <button type="button" onClick={() => debugLog.clear()}>
          비우기
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(
              visible
                .map((entry) => `${entry.at} [${entry.source}] ${entry.message}\n${entry.detail ?? ''}`)
                .join('\n---\n'),
            );
          }}
        >
          전체 복사
        </button>
        <button type="button" onClick={() => setIsOpen(false)}>
          닫기
        </button>
      </header>

      <div className="debug-panel__body">
        {visible.length === 0 ? (
          <p className="state">기록된 항목이 없습니다.</p>
        ) : (
          visible.map((entry) => <DebugEntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </aside>
  );
};
