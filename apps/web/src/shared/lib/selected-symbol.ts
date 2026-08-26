/**
 * 화면이 "지금 보고 있는 종목"으로 들고 다니는 값.
 *
 * 코드만으로는 화면에 코드가 찍힌다. 표의 행에는 이미 종목명이 있으므로 선택할 때
 * 함께 넘겨서, 차트 제목·주문 폼이 이름을 보여줄 수 있게 한다(이름을 다시 조회하지
 * 않는다). 관심종목처럼 이름 스냅샷이 없을 수 있는 출처를 위해 name 은 nullable 이다.
 */
export interface SelectedSymbol {
  code: string;
  name: string | null;
}

/** 종목 선택 콜백. 표(feature)가 호출하고 화면(page)이 상태로 받는다. */
export type SelectSymbol = (symbol: SelectedSymbol) => void;

/** 표시용 라벨. 이름을 모르면 코드로 대체한다. */
export const symbolLabel = (symbol: SelectedSymbol): string => symbol.name ?? symbol.code;
