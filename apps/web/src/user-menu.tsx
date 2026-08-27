import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Participant } from '@stock/contracts';
import { pathKeys, userMenuItems } from '@/shared/lib';

interface UserMenuProps {
  participant: Participant;
  onLogout: () => void;
  /** 실계좌 조회 기능이 꺼져 있으면 잔고·손익 항목을 숨긴다. */
  accountEnabled?: boolean;
}

/**
 * 우측 상단 프로필 드롭다운.
 *
 * 내 것(포트폴리오·프로필·잔고·주문이력)을 여기 모아 상단 네비를 탐색 화면만 남겼다.
 * 로그아웃도 같은 메뉴에 둔다 — 같은 "내 계정" 묶음이고, 헤더에 버튼이 하나 줄어든다.
 *
 * 열려 있을 때 바깥을 누르거나 Escape 를 누르면 닫고, 경로가 바뀌면(항목을 눌렀으면)
 * 자동으로 닫는다.
 */
export const UserMenu = ({ participant, onLogout, accountEnabled = true }: UserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // 실계좌 조회가 꺼져 있으면 잔고·손익 항목을 뺀다(서버가 막고 있어 눌러도 실패한다).
  const items = userMenuItems.filter(
    (item) => accountEnabled || item.to !== pathKeys.account.balance,
  );

  // 항목을 눌러 화면이 바뀌면 메뉴는 닫혀 있어야 한다.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="shell__user-avatar">{participant.avatarEmoji ?? '👤'}</span>
        <span className="shell__user-name">{participant.nickname}</span>
        <span className="user-menu__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="user-menu__panel" role="menu">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="user-menu__item" role="menuitem">
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="user-menu__item user-menu__item--logout"
            role="menuitem"
            onClick={onLogout}
          >
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
};
