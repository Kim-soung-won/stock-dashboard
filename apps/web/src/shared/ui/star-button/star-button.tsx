interface StarButtonProps {
  watched: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title?: string;
}

/**
 * 관심종목 ★ 토글 (순수 표시용).
 *
 * 데이터(watched 여부·토글 동작)는 상위 feature 가 entities/watchlist 훅으로 주입한다.
 * 행이 클릭 가능한 표 안에 놓이므로 클릭 전파를 막아 행 선택과 충돌하지 않게 한다.
 */
export const StarButton = ({ watched, onToggle, disabled, title }: StarButtonProps) => (
  <button
    type="button"
    className={'star-btn' + (watched ? ' star-btn--on' : '')}
    aria-pressed={watched}
    title={title ?? (watched ? '관심종목에서 제거' : '관심종목에 추가')}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
  >
    {watched ? '★' : '☆'}
  </button>
);
