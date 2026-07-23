import { brand } from '../brand/tokens';

export type GrowthAreaCardProps = {
  title: string;
  outcome: string;
  dissolving?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};

const cardStyles = `
  @keyframes growth-dissolve {
    to {
      filter: blur(6px);
      opacity: 0;
      transform: scale(0.92);
    }
  }
  .growth-area-card {
    appearance: none;
    background: linear-gradient(180deg, ${brand.gunmetal} 0%, ${brand.gunmetalDeep} 100%);
    border: 1px solid ${brand.lineSoft};
    border-radius: 14px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 1.1rem 1.15rem;
    text-align: left;
    transition: border-color 280ms ease, box-shadow 280ms ease, transform 280ms ease;
    width: 100%;
  }
  .growth-area-card:hover {
    border-color: ${brand.silver};
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transform: translateY(-3px);
  }
  .growth-area-card:focus-visible {
    outline: 2px solid ${brand.silver};
    outline-offset: 3px;
  }
  .growth-area-card--dissolving {
    animation: growth-dissolve 520ms ease forwards;
    pointer-events: none;
  }
`;

/** A selectable area that states the outcome it unlocks. */
export function GrowthAreaCard({
  title,
  outcome,
  dissolving = false,
  onClick,
  'data-testid': testId,
}: GrowthAreaCardProps) {
  return (
    <>
      <style>{cardStyles}</style>
      <button
        className={`growth-area-card${dissolving ? ' growth-area-card--dissolving' : ''}`}
        data-testid={testId}
        onClick={onClick}
        type="button"
      >
        <span
          style={{
            color: brand.silverBright,
            display: 'block',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.45rem',
          }}
        >
          {title}
        </span>
        <span
          style={{
            color: brand.muted,
            display: 'block',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          {outcome}
        </span>
      </button>
    </>
  );
}
