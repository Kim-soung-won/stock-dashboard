import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { healthQueries } from '@/entities/system/health';
import { menuItems } from '@/shared/lib';
import { DebugPanel } from '@/shared/ui';

/**
 * 앱 셸. 슬라이스가 아니라 진입점이므로 src 직속에 둔다(하우스 스타일: app 계층 없음).
 *
 * 실전/모의 배지를 셸에 박아둔 이유: 어느 화면에 있든 실주문 환경인지 보여야 한다.
 */
export const AppLayout = () => {
  const { data: health } = useQuery(healthQueries.status());
  const isReal = health?.kiwoomEnv === 'real';

  return (
    <div className="shell">
      <aside className="shell__nav">
        <div className="shell__brand">
          키움 대시보드
          <span className={'env-badge ' + (isReal ? 'env-badge--real' : 'env-badge--mock')}>
            {isReal ? 'REAL' : 'MOCK'}
          </span>
        </div>
        {menuItems.map((group) => (
          <nav key={group.group} className="shell__group">
            <h3>{group.group}</h3>
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} className="shell__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        ))}
      </aside>
      <main className="shell__main">
        <Outlet />
      </main>
      {/* 개발자도구 없이도 원인을 볼 수 있는 창구. Ctrl+Shift+D */}
      <DebugPanel />
    </div>
  );
};
