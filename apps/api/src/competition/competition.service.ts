import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Participant as ParticipantRow, Portfolio as PortfolioRow } from '@prisma/client';
import type { Portfolio, PaperTrade, Season, TradeRequest, TradeResult } from '@stock/contracts';
import { toParticipant } from '../auth/auth.service';
import { MarketService } from '../market/market.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BUY_FEE_RATE,
  feeOf,
  normalizeCode,
  SELL_FEE_RATE,
  SELL_TAX_RATE,
} from './competition.constants';
import { buildPortfolio, toPaperTrade } from './competition.mapper';
import { LeaderboardService } from './leaderboard.service';
import { PricebookService } from './pricebook.service';
import { SeasonService, toSeason } from './season.service';

/**
 * 모의투자 체결 엔진 (페이퍼 트레이딩).
 *
 * 키움 주문 API 를 쓰지 않는다 — 우리 DB 가 현금·보유의 진실이다. 체결가는
 * 클라이언트가 아니라 **서버가 관측한 시세**(getQuote 스냅샷)로만 정한다. 잔고·보유·저널
 * 갱신은 한 트랜잭션으로 원자적으로 처리하고, 같은 참가자의 연타는 직렬화해 이중 지출을 막는다.
 */
@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name);
  /** 참가자별 직렬화 큐 (연타로 인한 이중 지출 방지). */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly season: SeasonService,
    private readonly pricebook: PricebookService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getSeason(): Promise<Season> {
    return toSeason(await this.season.getActiveSeasonRow(), Date.now());
  }

  /** 내 포트폴리오(현금+보유+평가). 없으면 시드머니로 생성한다. */
  async getPortfolio(participant: ParticipantRow): Promise<Portfolio> {
    const seasonRow = await this.season.getActiveSeasonRow();
    const portfolio = await this.ensurePortfolio(participant.id, seasonRow.id, seasonRow.startingCash);
    return this.composePortfolio(participant, portfolio);
  }

  async listTrades(participant: ParticipantRow, limit = 50): Promise<PaperTrade[]> {
    const seasonRow = await this.season.getActiveSeasonRow();
    const portfolio = await this.ensurePortfolio(participant.id, seasonRow.id, seasonRow.startingCash);
    const rows = await this.prisma.paperTrade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toPaperTrade);
  }

  /** 시장가 매매. 참가자별로 직렬화해 실행한다. */
  async trade(participant: ParticipantRow, request: TradeRequest): Promise<TradeResult> {
    return this.serialize(participant.id, () => this.executeTrade(participant, request));
  }

  private async executeTrade(
    participant: ParticipantRow,
    request: TradeRequest,
  ): Promise<TradeResult> {
    const now = Date.now();
    const seasonRow = await this.season.getActiveSeasonRow();
    this.season.assertTradable(seasonRow, now);

    const code = normalizeCode(request.code);
    // 체결가·종목명은 서버가 관측한 시세에서만 온다(클라이언트 가격은 신뢰하지 않는다).
    const quote = await this.market.getQuote(code);
    if (quote.price === null || quote.price <= 0) {
      throw new BadRequestException('현재가를 확인할 수 없어 체결할 수 없습니다');
    }
    const price = quote.price;
    const amount = price * request.quantity;

    const portfolio = await this.ensurePortfolio(
      participant.id,
      seasonRow.id,
      seasonRow.startingCash,
    );

    const tradeRow = await this.prisma.$transaction(async (tx) => {
      const holding = await tx.holding.findUnique({
        where: { portfolioId_code: { portfolioId: portfolio.id, code } },
      });

      if (request.side === 'buy') {
        const fee = feeOf(amount, BUY_FEE_RATE);
        const cost = amount + fee;
        if (portfolio.cash < cost) {
          throw new BadRequestException(
            `현금이 부족합니다 (필요 ${cost.toLocaleString()}원 / 보유 ${portfolio.cash.toLocaleString()}원)`,
          );
        }
        const nextQty = (holding?.quantity ?? 0) + request.quantity;
        const nextAvg = Math.round(
          ((holding?.averagePrice ?? 0) * (holding?.quantity ?? 0) + amount) / nextQty,
        );
        await tx.holding.upsert({
          where: { portfolioId_code: { portfolioId: portfolio.id, code } },
          create: {
            portfolioId: portfolio.id,
            code,
            name: quote.name,
            quantity: request.quantity,
            averagePrice: nextAvg,
          },
          update: { quantity: nextQty, averagePrice: nextAvg, name: quote.name },
        });
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cash: { decrement: cost } },
        });
        return tx.paperTrade.create({
          data: {
            portfolioId: portfolio.id,
            code,
            name: quote.name,
            side: 'buy',
            quantity: request.quantity,
            price,
            fee,
            tax: 0,
            cashDelta: -cost,
          },
        });
      }

      // sell
      if (!holding || holding.quantity < request.quantity) {
        throw new BadRequestException(
          `보유 수량이 부족합니다 (보유 ${holding?.quantity ?? 0}주)`,
        );
      }
      const fee = feeOf(amount, SELL_FEE_RATE);
      const tax = feeOf(amount, SELL_TAX_RATE);
      const proceeds = amount - fee - tax;
      const remaining = holding.quantity - request.quantity;
      if (remaining === 0) {
        await tx.holding.delete({ where: { id: holding.id } });
      } else {
        await tx.holding.update({ where: { id: holding.id }, data: { quantity: remaining } });
      }
      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: { cash: { increment: proceeds } },
      });
      return tx.paperTrade.create({
        data: {
          portfolioId: portfolio.id,
          code,
          name: holding.name,
          side: 'sell',
          quantity: request.quantity,
          price,
          fee,
          tax,
          cashDelta: proceeds,
        },
      });
    });

    this.logger.log(
      `체결 ${participant.nickname} ${request.side} ${code} x${request.quantity} @${price}`,
    );

    // 보유 종목 집합이 바뀌었을 수 있으니 가격북 구독을 갱신하고 순위를 다시 밀어준다.
    await this.leaderboard.onPortfolioChanged();

    const fresh = await this.prisma.portfolio.findUniqueOrThrow({ where: { id: portfolio.id } });
    return {
      trade: toPaperTrade(tradeRow),
      portfolio: await this.composePortfolio(participant, fresh),
    };
  }

  /** (참가자, 시즌) 포트폴리오를 보장한다 — 없으면 시드머니로 생성. */
  private async ensurePortfolio(
    participantId: string,
    seasonId: string,
    startingCash: number,
  ): Promise<PortfolioRow> {
    const existing = await this.prisma.portfolio.findUnique({
      where: { participantId_seasonId: { participantId, seasonId } },
    });
    if (existing) return existing;
    const created = await this.prisma.portfolio.create({
      data: { participantId, seasonId, startingCash, cash: startingCash },
    });
    // 새 참가자가 리더보드에 즉시 나타나도록 순위를 다시 밀어준다(틱/체결을 기다리지 않는다).
    await this.leaderboard.onPortfolioChanged();
    return created;
  }

  private async composePortfolio(
    participant: ParticipantRow,
    portfolio: PortfolioRow,
  ): Promise<Portfolio> {
    const holdings = await this.prisma.holding.findMany({ where: { portfolioId: portfolio.id } });
    // 가격북 구독(전 참가자 보유 합집합)은 LeaderboardService 가 유지한다. 여기선 읽기만 한다.
    return buildPortfolio({
      seasonId: portfolio.seasonId,
      participant: toParticipant(participant),
      startingCash: portfolio.startingCash,
      cash: portfolio.cash,
      holdings,
      getPrice: (code) => this.pricebook.getPrice(code),
      now: new Date().toISOString(),
    });
  }

  /** 참가자별 작업 직렬화 — 이전 작업이 끝난 뒤에 다음을 실행한다. */
  private serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    // 락 체인에는 실패를 삼킨 버전을 저장한다: (1) 매매가 거부돼도 다음 작업을 막지 않고
    // (2) 아무도 await 하지 않는 락 프로미스에서 미처리 거부(unhandledRejection)가 나지 않는다.
    // 호출자에게는 실제 결과/거부를 그대로 돌려주는 next 를 반환한다.
    const chain = next.catch(() => undefined);
    this.locks.set(key, chain);
    void chain.finally(() => {
      if (this.locks.get(key) === chain) this.locks.delete(key);
    });
    return next;
  }
}
