import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 확인·취소 버튼 자리. 없으면 푸터를 그리지 않는다. */
  footer?: ReactNode;
}

/**
 * 모달 다이얼로그 (순수 표시용).
 *
 * 네이티브 `<dialog>` + `showModal()` 을 쓴다 — 포커스 트랩, Esc 닫기, 배경 클릭 차단,
 * 접근성 트리에서 뒤 내용 감추기를 브라우저가 처리한다. 직접 만들면 이 중 하나는 빠진다.
 *
 * 닫히는 경로가 세 갈래(Esc·배경 클릭·버튼)라 전부 `onClose` 로 모은다 — 열림 상태는
 * 상위가 소유하고, 이 컴포넌트는 그 상태를 DOM 에 반영만 한다.
 */
export const Dialog = ({ open, onClose, title, children, footer }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // open 은 상위가 소유한다. showModal/close 를 직접 호출해 DOM 을 상태에 맞춘다.
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Esc 로 닫으면 DOM 만 닫히고 상위 상태는 그대로다 — cancel/close 로 되돌려준다.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleClose = () => onClose();
    node.addEventListener('close', handleClose);
    return () => node.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      // 배경(::backdrop)을 누르면 닫는다. 내용 영역 클릭은 여기까지 올라오지 않는다.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog__panel">
        <div className="dialog__head">
          <h2 className="dialog__title">{title}</h2>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="dialog__body">{children}</div>

        {footer ? <div className="dialog__foot">{footer}</div> : null}
      </div>
    </dialog>
  );
};
