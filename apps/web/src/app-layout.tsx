import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useSession } from '@/entities/auth/session';
import { leaderboardQueries } from '@/entities/competition/leaderboard';
import { portfolioQueries } from '@/entities/competition/portfolio';
import { healthQueries } from '@/entities/system/health';
import { formatWon, menuItems, pathKeys, useTheme } from '@/shared/lib';
import { DebugPanel, ModeToggle, ThemeToggle } from '@/shared/ui';
import { UserMenu } from './user-menu';

/**
 * 앱 셸 — STOCK ARCADE 상단 헤더 + 본문.
 *
 * claude.ai/design "Stock Arcade Dashboard" 를 이식한 스킨. 아케이드 게임기처럼
 * 헤더에 SCORE(내 평가금액) / HI-SCORE(리더보드 1위)를 상시 띄워, 어느 화면에 있든
 * 지금 내 순위·환경(MOCK/REAL)이 보이게 한다. 실전/모의 배지는 절대 눈에 덜 띄게 하지 않는다.
 *
 * 네비는 두 갈래다: 상단에 탐색 화면(리더보드·종목 탐색·관심종목), 우측 프로필
 * 드롭다운에 내 것(포트폴리오·프로필·잔고·주문이력). 로고는 메인 화면으로 돌아가는
 * 버튼이다 — 메인(시세+순위)은 메뉴 항목이 아니라 로고로 간다.
 */
export const AppLayout = () => {
  const navigate = useNavigate();
  const { data: health } = useQuery(healthQueries.status());
  const { participant } = useSession();
  const { data: portfolio } = useQuery(portfolioQueries.current());
  const { data: leaderboard } = useQuery(leaderboardQueries.current());
  const logout = useLogout();
  const theme = useTheme();
  const isReal = health?.kiwoomEnv === 'real';

  // 헤더는 그룹을 펼쳐 한 줄 네비로 보여준다(아케이드 캐비닛 상단 메뉴).
  const links = menuItems.flatMap(
    (group) => group.items as readonly { label: string; to: string }[],
  );
  const score = portfolio ? formatWon(portfolio.totalValue) : '—';
  const hiScore = leaderboard?.entries[0] ? formatWon(leaderboard.entries[0].totalValue) : '—';

  const onLogout = () => {
    logout();
    navigate(pathKeys.auth.login);
  };

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          {/* 로고 = 메인(시세·순위) 화면으로 돌아가는 버튼. */}
          <Link to={pathKeys.market.home} className="shell__brand-link" title="메인 화면">
            <span className="shell__brand-stock">STOCK</span>
            <span className="shell__brand-arcade">
              {theme === 'terminal' ? 'TERMINAL' : 'ARCADE'}
            </span>
          </Link>
          <span className="shell__brand-ver">v0.1</span>
          <span className={'env-badge ' + (isReal ? 'env-badge--real' : 'env-badge--mock')}>
            {isReal ? 'REAL' : 'MOCK'}
          </span>
        </div>

        <nav className="shell__nav">
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className="shell__link">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell__scores">
          <div className="shell__score">
            <div className="shell__score-label">SCORE</div>
            <div className="shell__score-value">{score}</div>
          </div>
          <div className="shell__score">
            <div className="shell__score-label">HI-SCORE</div>
            <div className="shell__score-value shell__score-value--hi">{hiScore}</div>
          </div>

          <div className="shell__session">
            <span className={'shell__session-dot ' + (isReal ? 'shell__session-dot--real' : '')} />
            <span>키움 세션 READY · {isReal ? '실전' : '모의'}</span>
          </div>

          <ThemeToggle />
          <ModeToggle />

          {participant ? (
            <UserMenu
              participant={participant}
              onLogout={onLogout}
              accountEnabled={health?.accountEnabled ?? true}
            />
          ) : null}
        </div>
      </header>

      <main className="shell__main">
        <Outlet />
      </main>

      {/* 개발자도구 없이도 원인을 볼 수 있는 창구. Ctrl+Shift+D */}
      <DebugPanel />
    </div>
  );
};
