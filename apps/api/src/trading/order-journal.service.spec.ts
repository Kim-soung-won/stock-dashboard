import type { Order } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceOrderRequest } from '@stock/contracts';
import type { PrismaService } from '../prisma/prisma.service';
import { OrderJournalService, toOrderRecord } from './order-journal.service';

/**
 * 주문 저널의 핵심 계약: **키움에 보내기 전에 멱등키로 선점**하고, 같은 키는 절대
 * 재전송하지 않는다. 체결가는 실시간 이벤트로 가중평균 누적한다.
 */
const request: PlaceOrderRequest = {
  idempotencyKey: 'idem-12345678',
  exchange: 'KRX',
  code: '005930',
  side: 'buy',
  quantity: 10,
  orderType: 'market',
  env: 'mock',
};

const makePrisma = () =>
  ({
    order: {
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'o1' } as Order),
      update: vi.fn().mockResolvedValue({ id: 'o1' } as Order),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    orderEvent: { create: vi.fn().mockResolvedValue({}) },
  }) as unknown as PrismaService;

describe('OrderJournalService.reserve', () => {
  let prisma: PrismaService;
  let service: OrderJournalService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OrderJournalService(prisma);
  });

  it('새 멱등키는 선점하고 submitted 이벤트를 남긴다(created=true)', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    const result = await service.reserve(request, { any: 'snapshot' });
    expect(result.created).toBe(true);
    expect(prisma.order.create).toHaveBeenCalledOnce();
    expect(prisma.orderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: 'submitted' }) }),
    );
  });

  it('이미 있는 멱등키는 재전송하지 않는다(created=false, create 미호출)', async () => {
    const existing = { id: 'prev', idempotencyKey: request.idempotencyKey } as Order;
    vi.mocked(prisma.order.findUnique).mockResolvedValue(existing);
    const result = await service.reserve(request, {});
    expect(result).toEqual({ created: false, order: existing });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});

describe('OrderJournalService.applyExecution', () => {
  let prisma: PrismaService;
  let service: OrderJournalService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OrderJournalService(prisma);
  });

  it('저널에 없는 주문번호 이벤트는 무시한다(HTS 등 외부 주문)', async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
    await service.applyExecution({
      orderNo: 'x',
      status: 'filled',
      sourceLabel: null,
      filledQuantity: 1,
      filledPrice: 100,
      payload: {},
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('체결가를 수량 가중평균으로 누적한다', async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValue({
      id: 'o1',
      filledQuantity: 10,
      averageFilledPrice: 1000,
    } as Order);
    await service.applyExecution({
      orderNo: 'A1',
      status: 'partiallyFilled',
      sourceLabel: '체결',
      filledQuantity: 10,
      filledPrice: 2000,
      payload: {},
    });
    // (1000*10 + 2000*10) / 20 = 1500
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'partiallyFilled', filledQuantity: 20, averageFilledPrice: 1500 } }),
    );
  });
});

describe('OrderJournalService.markAccepted', () => {
  it('접수는 accepted 일 뿐 체결이 아니다', async () => {
    const prisma = makePrisma();
    const service = new OrderJournalService(prisma);
    await service.markAccepted('o1', '0001', {});
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderNo: '0001', status: 'accepted' }) }),
    );
  });
});

describe('toOrderRecord', () => {
  it('Prisma row 를 계약 형태로(날짜는 ISO) 변환한다', () => {
    const record = toOrderRecord({
      id: 'o1',
      idempotencyKey: 'k',
      orderNo: '0001',
      code: '005930',
      name: null,
      side: 'buy',
      orderType: 'market',
      exchange: 'KRX',
      quantity: 10,
      price: null,
      filledQuantity: 0,
      averageFilledPrice: null,
      status: 'accepted',
      env: 'mock',
      failureReason: null,
      originalOrderNo: null,
      requestSnapshot: null,
      responseSnapshot: null,
      createdAt: new Date('2026-08-26T00:00:00.000Z'),
      updatedAt: new Date('2026-08-26T00:00:01.000Z'),
    } as Order);
    expect(record.createdAt).toBe('2026-08-26T00:00:00.000Z');
    expect(record.status).toBe('accepted');
    expect(record.side).toBe('buy');
  });
});
