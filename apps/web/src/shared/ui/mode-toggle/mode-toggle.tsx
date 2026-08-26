import { modeStore, useMode } from '@/shared/lib';

/**
 * 명암 모드 토글 — 테마와 직교(각 테마의 dark/light 팔레트를 오간다).
 * 전환될 모드를 라벨로 보여준다(다크 → 라이트).
 */
export const ModeToggle = () => {
  const mode = useMode();
  const next = mode === 'light' ? 'dark' : 'light';
  const label = next === 'light' ? '☀ LIGHT' : '☾ DARK';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => modeStore.toggle()}
      aria-label={`${next} 모드로 전환`}
      title="명암 모드 전환"
    >
      {label}
    </button>
  );
};
