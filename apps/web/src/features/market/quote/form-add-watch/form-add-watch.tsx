import { useSymbolPicker } from '@/entities/market/symbol';
import { useWatchlist } from '@/entities/watchlist/item';
import { SymbolSearchInput } from '@/shared/ui';

/**
 * 관심종목 추가 폼 — **종목명으로도** 담을 수 있다.
 *
 * 예전에는 6자리 코드만 받았다. 코드를 외우고 있는 사용자는 없으므로 이름 검색을
 * 기본으로 두고, 코드를 그대로 붙여넣는 사용법도 그대로 통하게 남겼다.
 *
 * 대시보드와 관심종목 페이지가 같은 폼을 쓴다 — 같은 입력이 두 벌 있으면 한쪽만
 * 고쳐지는 일이 생긴다.
 */
export const FormAddWatch = () => {
  const watch = useWatchlist();
  const picker = useSymbolPicker();

  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!picker.code) return;
        watch.add(picker.code, picker.name);
        picker.reset();
      }}
    >
      <SymbolSearchInput
        className="symbol-search--compact"
        value={picker.query}
        onChange={picker.onChange}
        suggestions={picker.suggestions}
        isSearching={picker.isSearching}
        onPick={picker.onPick}
        placeholder="종목명 또는 코드로 추가"
      />
      <button type="submit" disabled={!picker.code}>
        추가
      </button>
    </form>
  );
};
