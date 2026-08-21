import { Injectable } from '@nestjs/common';
import type { Balance, PendingOrder } from '@stock/contracts';
import { KiwoomRestClient } from '../kiwoom/kiwoom-rest.client';
import { toBalance, toPendingOrders } from './account.mapper';

type Row = Record<string, string | undefined>;

@Injectable()
export class AccountService {
  constructor(private readonly kiwoom: KiwoomRestClient) {}

  /**
   * 잔고 + 예수금. 두 TR 을 합쳐 화면 한 장을 만든다.
   * kt00018 은 연속조회가 있으므로 보유 종목은 끝까지 따라간다.
   */
  async getBalance(): Promise<Balance> {
    const [balanceHead, positions, deposit] = await Promise.all([
      this.kiwoom.call<Row>('kt00018', { qry_tp: '1', dmst_stex_tp: 'KRX' }),
      this.kiwoom.callAll<{ acnt_evlt_remn_indv_tot?: Row[] }, Row>(
        'kt00018',
        { qry_tp: '2', dmst_stex_tp: 'KRX' },
        (page) => page.acnt_evlt_remn_indv_tot,
      ),
      this.kiwoom.call<Row>('kt00001', { qry_tp: '3' }),
    ]);

    return toBalance(balanceHead.data, deposit.data, positions);
  }

  /** 미체결 주문. 주문 화면과 계좌 화면이 함께 쓴다. */
  async getPendingOrders(code?: string): Promise<PendingOrder[]> {
    const rows = await this.kiwoom.callAll<{ oso?: Row[] }, Row>(
      'ka10075',
      {
        all_stk_tp: code ? '1' : '0',
        trde_tp: '0',
        stk_cd: code ?? '',
        stex_tp: '0',
      },
      (page) => page.oso,
    );
    return toPendingOrders(rows);
  }
}
