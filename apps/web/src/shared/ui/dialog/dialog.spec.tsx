import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

/**
 * jsdom 은 <dialog> 의 showModal/close 를 구현하지 않는다. 브라우저가 하는 일(포커스
 * 트랩·Esc)을 검증할 수는 없으므로, **이 컴포넌트가 책임지는 것**만 본다:
 * 열림 상태를 DOM 에 반영하고, 닫히는 경로를 전부 onClose 로 모으는가.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

const Harness = ({ onClose }: { onClose: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        열기
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        title="매수 확인"
        footer={<button type="button">확정</button>}
      >
        <p>본문</p>
      </Dialog>
    </>
  );
};

describe('Dialog', () => {
  it('open=false 면 열려 있지 않다', () => {
    render(<Harness onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { hidden: true }).hasAttribute('open')).toBe(false);
  });

  it('open 이 되면 제목·본문·푸터를 보여준다', () => {
    render(<Harness onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('열기'));
    expect(screen.getByRole('dialog').hasAttribute('open')).toBe(true);
    expect(screen.getByText('본문')).toBeTruthy();
    expect(screen.getByText('확정')).toBeTruthy();
  });

  it('닫기 버튼을 누르면 상위에 알린다', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('열기'));
    fireEvent.click(screen.getByLabelText('닫기'));
    expect(onClose).toHaveBeenCalled();
  });

  it('배경(다이얼로그 바깥)을 누르면 닫는다', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('열기'));
    // 클릭 대상이 dialog 자신이면 배경이다(내용은 .dialog__panel 안에 있다).
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('내용을 눌렀을 때는 닫지 않는다', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('열기'));
    fireEvent.click(screen.getByText('본문'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('브라우저가 닫으면(Esc) 상위 상태도 따라 닫힌다', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('열기'));
    // Esc 는 브라우저가 close 이벤트로 알린다.
    (screen.getByRole('dialog') as HTMLDialogElement).close();
    expect(onClose).toHaveBeenCalled();
  });
});
