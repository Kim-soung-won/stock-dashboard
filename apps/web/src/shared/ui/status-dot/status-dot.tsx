interface StatusDotProps {
  tone: 'ok' | 'warn' | 'error';
  label: string;
}

/** 실시간 연결 상태처럼 "지금 살아있는지"를 알리는 표시. */
export const StatusDot = ({ tone, label }: StatusDotProps) => (
  <span className="status-dot">
    <i className={'status-dot__mark status-dot__mark--' + tone} />
    {label}
  </span>
);
