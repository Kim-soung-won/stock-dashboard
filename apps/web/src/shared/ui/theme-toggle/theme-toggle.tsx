import { themeStore, useTheme } from '@/shared/lib';

/**
 * 스킨 전환 토글 — 헤더에 놓는 아케이드 캐비닛 스위치.
 * 다음 테마 이름을 라벨로 보여줘, 무엇으로 바뀌는지 미리 알린다(도트 → 터미널).
 */
export const ThemeToggle = () => {
  const theme = useTheme();
  const next = theme === 'terminal' ? 'arcade' : 'terminal';
  const label = next === 'terminal' ? '> TERMINAL' : '● DOT';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => themeStore.toggle()}
      aria-label={`${next} 테마로 전환`}
      title="테마 전환"
    >
      {label}
    </button>
  );
};
