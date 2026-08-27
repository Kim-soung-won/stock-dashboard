import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type {
  Candle,
  CandleInterval,
  MarketKind,
  OrderBook,
  Quote,
  RankingItem,
  RankingKind,
  RankingMarket,
  StockSymbol,
} from '@stock/contracts';
import { KiwoomRestClient } from '../kiwoom/kiwoom-rest.client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStockCode, parseAmount, type RestApiId } from '@stock/kiwoom-codes';
import { toRankingItems } from './ranking.mapper';
import type { TrRankingKind } from './ranking.mapper';
import {
  marketCapOf,
  rankSymbolMatches,
  toMarketCapRanking,
  toMinuteCandles,
  toPeriodCandles,
  toOrderBook,
  toQuote,
  toSymbols,
} from './market.mapper';
import type { SymbolMasterRow } from './market.mapper';

/** ka10099 `mrkt_tp` 값. 스펙 desc 그대로. */
const MARKET_TP: Readonly<Record<'kospi' | 'kosdaq' | 'etf', string>> = {
  kospi: '0',
  kosdaq: '10',
  etf: '8',
};

/** ka10080 `tic_scope` 값 (분봉 전용). */
const TIC_SCOPE: Partial<Record<CandleInterval, string>> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '60m': '60',
};

/**
 * 일/주/월/연봉 조회 — TR 과 응답 배열 키. 요청 파라미터(stk_cd·base_dt·upd_stkpc_tp)와
 * 응답 필드(dt·OHLCV)가 모두 같아 변환(toPeriodCandles)을 공유한다.
 */
const PERIOD_CHART: Partial<Record<CandleInterval, { tr: RestApiId; key: string }>> = {
  day: { tr: 'ka10081', key: 'stk_dt_pole_chart_qry' },
  week: { tr: 'ka10082', key: 'stk_stk_pole_chart_qry' },
  month: { tr: 'ka10083', key: 'stk_mth_pole_chart_qry' },
  year: { tr: 'ka10094', key: 'stk_yr_pole_chart_qry' },
};

/** 순위 TR 의 시장구분 값. 조회계 mrkt_tp 는 3자리다(종목 마스터의 mrkt_tp 와 다르다). */
const RANKING_MARKET_TP: Readonly<Record<RankingMarket, string>> = {
  all: '000',
  kospi: '001',
  kosdaq: '101',
};

/** 순위 TR 별 호출 정의. 응답 리스트 키가 TR 마다 다르다. */
const RANKING_SPEC = {
  views: { apiId: 'ka00198', listKey: 'item_inq_rank' },
  volume: { apiId: 'ka10030', listKey: 'tdy_trde_qty_upper' },
  value: { apiId: 'ka10032', listKey: 'trde_prica_upper' },
  gainers: { apiId: 'ka10027', listKey: 'pred_pre_flu_rt_upper' },
  losers: { apiId: 'ka10027', listKey: 'pred_pre_flu_rt_upper' },
} as const;

/** 종목 마스터 캐시 수명. 상장/폐지가 반영되면 되므로 하루면 충분하다. */
const SYMBOL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 종목명 검색이 훑는 시장. 사용자는 "삼성전자"가 어느 시장인지 모르고 검색한다. */
const SEARCHABLE_MARKETS: readonly ('kospi' | 'kosdaq' | 'etf')[] = ['kospi', 'kosdaq', 'etf'];

/** 검색 결과 상한. 자동완성 목록이라 많이 줄 이유가 없다. */
const SYMBOL_SEARCH_MAX = 50;

/** 시가총액 순위에 담는 종목 수. 다른 순위 TR 이 주는 분량과 비슷하게 맞춘다. */
const MARKET_CAP_RANKING_SIZE = 100;

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  /** 진행 중인 종목 마스터 워밍업(중복 호출 합류용). 유량 절약이 목적이다. */
  private symbolWarmUp: Promise<void> | null = null;

  constructor(
    private readonly kiwoom: KiwoomRestClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 부팅 시 종목 마스터 캐시를 미리 채운다(비어 있거나 만료된 시장만).
   *
   * 종목명 검색은 이 캐시로만 답한다 — 첫 사용자가 "검색 결과가 없습니다"를 보지 않게
   * 미리 데운다. 캐시가 신선하면 키움을 부르지 않으므로 재시작 비용은 없다.
   */
  onModuleInit(): void {
    void this.warmSymbolCache();
  }

  /**
   * 종목 마스터. 하루 한 번만 키움을 부르고 그 사이는 DB 캐시로 답한다
   * (매 요청 조회하면 유량만 태운다 — 시세가 아니라 정적 데이터다).
   */
  async getSymbols(market: MarketKind = 'kospi'): Promise<StockSymbol[]> {
    if (market === 'unknown') throw new BadRequestException('지원하지 않는 시장 구분입니다');

    const cached = await this.prisma.symbolCache.findMany({ where: { market } });
    const withinTtl =
      cached.length > 0 &&
      cached.every((row) => Date.now() - row.updatedAt.getTime() < SYMBOL_CACHE_TTL_MS);
    // 파생 칼럼(시가총액)이 추가되기 전에 채워진 캐시는 TTL 안이어도 다시 받아야 한다.
    // 종목마다 null 일 수는 있으니(ETF·신규상장) "전부 null" 만 미완성으로 본다.
    const hasDerived = cached.some((row) => row.marketCap !== null);
    if (withinTtl && hasDerived) {
      return cached.map(toCachedSymbol);
    }

    const rows = await this.kiwoom.callAll<{ list?: SymbolMasterRow[] }, SymbolMasterRow>(
      'ka10099',
      { mrkt_tp: MARKET_TP[market] },
      (page) => page.list,
    );

    const symbols = toSymbols(rows, market);
    // 시가총액 정렬은 DB 가 해야 하므로(전 종목을 앱으로 끌어올 수 없다) 파생값도 함께 적재한다.
    const derived = new Map(
      rows
        .filter((row) => row.code)
        .map((row) => [
          normalizeStockCode(row.code ?? ''),
          { lastPrice: parseAmount(row.lastPrice), listCount: parseAmount(row.listCount) },
        ]),
    );

    await this.prisma.$transaction(
      symbols.map((symbol) => {
        const extra = derived.get(symbol.code);
        const cacheFields = {
          name: symbol.name,
          lastPrice: extra?.lastPrice ?? null,
          listCount: extra?.listCount === undefined ? null : toBigIntOrNull(extra.listCount),
          marketCap: toBigIntOrNull(symbol.marketCap),
        };
        return this.prisma.symbolCache.upsert({
          // (market, code) 복합키 — 같은 코드가 여러 시장 목록에 나오기 때문.
          where: { market_code: { market, code: symbol.code } },
          create: { market, code: symbol.code, ...cacheFields },
          update: cacheFields,
        });
      }),
    );
    this.logger.log(`종목 마스터 갱신: ${market} ${symbols.length}건`);
    return symbols;
  }

  /**
   * 종목명·코드 부분일치 검색(전 시장 통합).
   *
   * 이름으로 종목을 고르는 입력(관심종목 추가·주문·매매)이 공통으로 쓴다. 브라우저가
   * 시장별 마스터 3개를 통째로 받아 훑는 대신 DB 캐시를 질의한다 — 응답이 상한 건수로
   * 끝나고, 사용자가 아직 안 열어본 시장(코스닥·ETF)도 함께 걸린다.
   *
   * 키움을 부르는 건 캐시가 비었거나 만료됐을 때뿐이다(getSymbols 와 같은 규칙).
   */
  async searchSymbols(keyword: string, limit: number): Promise<StockSymbol[]> {
    const needle = keyword.trim();
    if (!needle) return [];

    // 캐시가 비었으면 배경에서 채우고, 이 요청은 지금 있는 것으로 답한다.
    // ka10099 페이지네이션은 유량 제한(KIWOOM_RPS)에 걸려 분 단위로 걸린다 — 검색 요청을
    // 그만큼 붙잡아 두면 입력창이 멈춘 것처럼 보인다. 채워지면 다음 검색부터 걸린다.
    void this.warmSymbolCache();

    const rows = await this.prisma.symbolCache.findMany({
      where: {
        OR: [
          { code: { contains: needle, mode: 'insensitive' } },
          { name: { contains: needle, mode: 'insensitive' } },
        ],
      },
      // 관련도 정렬은 mapper 가 한다. DB 는 후보만 넉넉히 주면 된다.
      take: SYMBOL_SEARCH_MAX * 20,
    });

    return rankSymbolMatches(rows.map(toCachedSymbol), needle, Math.min(limit, SYMBOL_SEARCH_MAX));
  }

  /**
   * 검색 대상 시장의 마스터 캐시를 채운다(비었거나 만료된 시장만). **배경 작업이다.**
   *
   * 검색은 첫 타이핑에 몰려 들어오므로 진행 중인 워밍업을 공유한다 — 그러지 않으면
   * 같은 ka10099 를 시장마다 동시에 여러 번 부르고 유량 제한에 걸린다. 한 시장씩
   * 순차로 도는 것도 같은 이유다.
   */
  private warmSymbolCache(): Promise<void> {
    if (this.symbolWarmUp) return this.symbolWarmUp;
    this.symbolWarmUp = (async () => {
      for (const market of SEARCHABLE_MARKETS) {
        try {
          // getSymbols 가 신선도를 판정하고, 신선하면 키움을 부르지 않는다.
          await this.getSymbols(market);
        } catch (error) {
          // 한 시장이 실패해도 나머지로 검색은 되게 한다(검색은 부가 기능이다).
          this.logger.warn(`종목 마스터 워밍업 실패: ${market} — ${String(error)}`);
        }
      }
    })().finally(() => {
      this.symbolWarmUp = null;
    });
    return this.symbolWarmUp;
  }

  /** 현재가 스냅샷. 실시간 갱신은 WebSocket(0B)이 담당하고 이건 초기 렌더용이다. */
  async getQuote(code: string): Promise<Quote> {
    const result = await this.kiwoom.call<Record<string, string>>('ka10001', { stk_cd: code });
    return toQuote(result.data);
  }

  /** 과거 봉. 프론트는 이걸 캐시하고 마지막 봉만 실시간 체결로 갱신한다. */
  async getCandles(code: string, interval: CandleInterval, baseDate?: string): Promise<Candle[]> {
    const base = baseDate ?? this.today();

    // 일/주/월/연봉 — 같은 요청/응답 구조, 응답 배열 키만 다르다.
    const period = PERIOD_CHART[interval];
    if (period) {
      const result = await this.kiwoom.call<Record<string, Record<string, string>[] | undefined>>(
        period.tr,
        { stk_cd: code, base_dt: base, upd_stkpc_tp: '1' },
      );
      return toPeriodCandles(result.data[period.key] ?? []);
    }

    // 분봉 — ka10080, tic_scope 로 간격을 지정한다.
    const scope = TIC_SCOPE[interval];
    if (!scope) throw new BadRequestException(`지원하지 않는 봉 간격: ${interval}`);
    const result = await this.kiwoom.call<{ stk_min_pole_chart_qry?: Record<string, string>[] }>(
      'ka10080',
      { stk_cd: code, tic_scope: scope, upd_stkpc_tp: '1', base_dt: base },
    );
    return toMinuteCandles(result.data.stk_min_pole_chart_qry ?? []);
  }

  async getOrderBook(code: string): Promise<OrderBook> {
    const result = await this.kiwoom.call<Record<string, string>>('ka10004', { stk_cd: code });
    return toOrderBook(code, result.data);
  }

  /**
   * 순위(인기) 조회.
   *
   * 키움에는 "인기 종목" TR 이 없어서 성격이 다른 순위 TR 을 kind 로 묶었다.
   * 각 TR 의 필수 파라미터가 제각각이라(거래량조건·신용구분·관리종목포함 …) 여기서
   * "전체 조회" 기본값을 채운다. 값의 의미는 스펙 desc 참고.
   */
  async getRanking(kind: RankingKind, market: RankingMarket = 'all'): Promise<RankingItem[]> {
    // 시가총액만 출처가 다르다 — 키움 순위 TR 이 없어 우리 종목 캐시에서 만든다.
    if (kind === 'marketCap') return this.getMarketCapRanking(market);

    const spec = RANKING_SPEC[kind];
    const marketTp = RANKING_MARKET_TP[market];

    const result = await this.kiwoom.call<Record<string, Record<string, string>[] | undefined>>(
      spec.apiId,
      this.rankingBody(kind, marketTp),
    );
    return toRankingItems(kind, result.data[spec.listKey] ?? []);
  }

  /**
   * 시가총액 상위 — 종목 마스터 캐시에서 정렬한다(키움 호출 없음).
   *
   * 시가총액은 상장주식수 x 전일종가로 파생한 값이라 하루 단위로만 바뀐다. 그래서
   * 정렬·상한을 DB 에 맡기고(전 종목을 앱으로 끌어올 수 없다) 결과만 받는다.
   *
   * ETF 는 뺀다 — 시가총액 순위에서 기대하는 것은 상장기업이다. `market='etf'` 만
   * 걸러서는 부족하다: ka10099 의 시장 구분은 배타적이지 않아 **코스피/코스닥 목록에
   * 상장 ETF 가 섞여 온다**(같은 코드가 두 시장에 들어 있다). 그래서 ETF 목록의 코드를
   * 따로 읽어 제외한다.
   */
  private async getMarketCapRanking(market: RankingMarket): Promise<RankingItem[]> {
    // 캐시가 비었으면 배경에서 채우고 지금 있는 것으로 답한다(검색과 같은 규칙).
    void this.warmSymbolCache();

    const markets = market === 'all' ? ['kospi', 'kosdaq'] : [market];
    const etfs = await this.prisma.symbolCache.findMany({
      where: { market: 'etf' },
      select: { code: true },
    });

    const rows = await this.prisma.symbolCache.findMany({
      where: {
        market: { in: markets },
        marketCap: { not: null },
        code: { notIn: etfs.map((row) => row.code) },
      },
      orderBy: { marketCap: 'desc' },
      take: MARKET_CAP_RANKING_SIZE,
    });

    return toMarketCapRanking(
      rows.map((row) => ({
        code: row.code,
        name: row.name,
        lastPrice: row.lastPrice,
        marketCap: row.marketCap === null ? null : Number(row.marketCap),
      })),
    );
  }

  private rankingBody(kind: TrRankingKind, marketTp: string): Record<string, string> {
    if (kind === 'views') {
      // qry_tp 4 = 당일 누적. 1분/10분/1시간 단위도 있다.
      return { qry_tp: '4' };
    }
    if (kind === 'volume') {
      return {
        mrkt_tp: marketTp,
        sort_tp: '1', // 1:거래량
        mang_stk_incls: '1', // 관리종목 미포함
        crd_tp: '0',
        trde_qty_tp: '0',
        pric_tp: '0',
        trde_prica_tp: '0',
        mrkt_open_tp: '0',
        stex_tp: '1', // KRX
      };
    }
    if (kind === 'value') {
      return { mrkt_tp: marketTp, mang_stk_incls: '0', stex_tp: '1' };
    }
    return {
      mrkt_tp: marketTp,
      sort_tp: kind === 'gainers' ? '1' : '3', // 1:상승률, 3:하락률
      trde_qty_cnd: '0000',
      stk_cnd: '1', // 관리종목 제외
      crd_cnd: '0',
      updown_incls: '1',
      pric_cnd: '0',
      trde_prica_cnd: '0',
      stex_tp: '1',
    };
  }

  /** 키움 날짜 파라미터는 yyyyMMdd 문자열이다. */
  private today(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  }
}

/** 종목 캐시 행 → 도메인 StockSymbol. BigInt 는 계약(number)으로 좁혀서 내보낸다. */
const toCachedSymbol = (row: {
  code: string;
  name: string;
  market: string;
  marketCap: bigint | null;
}): StockSymbol => ({
  code: row.code,
  name: row.name,
  market: row.market as MarketKind,
  marketCap: row.marketCap === null ? null : Number(row.marketCap),
});

/** 시가총액·상장주식수는 Int 범위를 넘어 BigInt 칼럼이다. 값이 없으면 0 이 아니라 null. */
const toBigIntOrNull = (value: number | null): bigint | null =>
  value === null ? null : BigInt(Math.trunc(value));
