import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const Panel = ({ title, actions, children }: PanelProps) => (
  <section className="panel">
    <header className="panel__head">
      <h2 className="panel__title">{title}</h2>
      {actions ? <div className="panel__actions">{actions}</div> : null}
    </header>
    <div className="panel__body">{children}</div>
  </section>
);
