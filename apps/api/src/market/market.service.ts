import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { toRankingItems } from './ranking.mapper';
import {
  toDailyCandles,
  toMinuteCandles,
  toOrderBook,
  toQuote,
  toSymbols,
} from './market.mapper';

/** ka10099 `mrkt_tp` 값. 스펙 desc 그대로. */
const MARKET_TP: Readonly<Record<'kospi' | 'kosdaq' | 'etf', string>> = {
  kospi: '0',
  kosdaq: '10',
  etf: '8',
};

/** ka10080 `tic_scope` 값. */
const TIC_SCOPE: Readonly<Record<Exclude<CandleInterval, 'day'>, string>> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '60m': '60',
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

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly kiwoom: KiwoomRestClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 종목 마스터. 하루 한 번만 키움을 부르고 그 사이는 DB 캐시로 답한다
   * (매 요청 조회하면 유량만 태운다 — 시세가 아니라 정적 데이터다).
   */
  async getSymbols(market: MarketKind = 'kospi'): Promise<StockSymbol[]> {
    if (market === 'unknown') throw new BadRequestException('지원하지 않는 시장 구분입니다');

    const cached = await this.prisma.symbolCache.findMany({ where: { market } });
    const freshEnough =
      cached.length > 0 &&
      cached.every((row) => Date.now() - row.updatedAt.getTime() < SYMBOL_CACHE_TTL_MS);
    if (freshEnough) {
      return cached.map((row) => ({ code: row.code, name: row.name, market: row.market as MarketKind }));
    }

    const rows = await this.kiwoom.callAll<
      { list?: { code?: string; name?: string; marketName?: string }[] },
      { code?: string; name?: string; marketName?: string }
    >('ka10099', { mrkt_tp: MARKET_TP[market] }, (page) => page.list);

    const symbols = toSymbols(rows, market);
    await this.prisma.$transaction(
      symbols.map((symbol) =>
        this.prisma.symbolCache.upsert({
          // (market, code) 복합키 — 같은 코드가 여러 시장 목록에 나오기 때문.
          where: { market_code: { market, code: symbol.code } },
          create: { market, code: symbol.code, name: symbol.name },
          update: { name: symbol.name },
        }),
      ),
    );
    this.logger.log(`종목 마스터 갱신: ${market} ${symbols.length}건`);
    return symbols;
  }

  /** 현재가 스냅샷. 실시간 갱신은 WebSocket(0B)이 담당하고 이건 초기 렌더용이다. */
  async getQuote(code: string): Promise<Quote> {
    const result = await this.kiwoom.call<Record<string, string>>('ka10001', { stk_cd: code });
    return toQuote(result.data);
  }

  /** 과거 봉. 프론트는 이걸 캐시하고 마지막 봉만 실시간 체결로 갱신한다. */
  async getCandles(code: string, interval: CandleInterval, baseDate?: string): Promise<Candle[]> {
    const base = baseDate ?? this.today();

    if (interval === 'day') {
      const result = await this.kiwoom.call<{ stk_dt_pole_chart_qry?: Record<string, string>[] }>(
        'ka10081',
        { stk_cd: code, base_dt: base, upd_stkpc_tp: '1' },
      );
      return toDailyCandles(result.data.stk_dt_pole_chart_qry ?? []);
    }

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
    const spec = RANKING_SPEC[kind];
    const marketTp = RANKING_MARKET_TP[market];

    const result = await this.kiwoom.call<Record<string, Record<string, string>[] | undefined>>(
      spec.apiId,
      this.rankingBody(kind, marketTp),
    );
    return toRankingItems(kind, result.data[spec.listKey] ?? []);
  }

  private rankingBody(kind: RankingKind, marketTp: string): Record<string, string> {
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
