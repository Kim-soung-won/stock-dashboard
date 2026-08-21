/**
 * 아주 단순한 토큰버킷. 키움은 유량 초과를 에러코드(1700/1701/1702)로 알려주는데,
 * 정확한 한도가 공개되지 않아 "우리가 먼저 조절"하는 쪽으로 설계했다.
 *
 * 브라우저 탭마다 폴링하면 앱 단위 유량이 순식간에 소진되므로, 모든 REST 호출은
 * 반드시 이 리미터를 통과한다(= BFF 를 두는 이유 중 하나).
 */
export class RateLimiter {
  private queue: (() => void)[] = [];
  private tokens: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly ratePerSecond: number) {
    this.tokens = ratePerSecond;
  }

  async acquire(): Promise<void> {
    this.ensureTimer();
    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }

  /** 유량 에러를 맞았을 때 즉시 버킷을 비워 다음 호출을 미룬다. */
  penalize(): void {
    this.tokens = 0;
  }

  private ensureTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tokens = this.ratePerSecond;
      while (this.tokens > 0 && this.queue.length > 0) {
        this.tokens -= 1;
        this.queue.shift()?.();
      }
      if (this.queue.length === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        this.tokens = this.ratePerSecond;
      }
    }, 1000);
    this.timer.unref?.();
  }
}
