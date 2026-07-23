import { brand } from '../brand/tokens';

export type GrowthFolderProps = {
  title: string;
  subtitle: string;
  quiet?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};

const folderStyles = `
  .growth-folder {
    appearance: none;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 1rem;
    text-align: center;
  }
  .growth-folder:focus-visible {
    outline: 2px solid ${brand.silver};
    outline-offset: 4px;
    border-radius: 12px;
  }
  .growth-folder--quiet { opacity: 0.55; }
  .growth-folder--quiet:hover { opacity: 0.8; }
  .growth-folder__shape {
    height: 120px;
    margin: 0 auto 1rem;
    position: relative;
    transform-origin: center bottom;
    transition: transform 500ms ease;
    width: 160px;
  }
  .growth-folder:hover .growth-folder__shape { transform: translateY(-6px); }
  .growth-folder__back {
    background: ${brand.gunmetalLit};
    border-radius: 0 14px 14px 14px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    inset: 0;
    position: absolute;
  }
  .growth-folder__tab {
    background: ${brand.gunmetalLit};
    border-radius: 6px 6px 0 0;
    bottom: 98%;
    height: 14px;
    left: 0;
    position: absolute;
    width: 48px;
  }
  .growth-folder__front {
    background: linear-gradient(180deg, ${brand.gunmetalLit} 0%, ${brand.gunmetal} 100%);
    border: 1px solid ${brand.line};
    border-radius: 6px 14px 14px 14px;
    inset: 0;
    position: absolute;
    transform-origin: bottom center;
    transition: transform 520ms cubic-bezier(0.83, 0, 0.17, 1);
  }
  .growth-folder:hover .growth-folder__front { transform: skewX(8deg) scaleY(0.72); }
`;

/** Large folder control used to choose a growth path. */
export function GrowthFolder({
  title,
  subtitle,
  quiet = false,
  onClick,
  'data-testid': testId,
}: GrowthFolderProps) {
  return (
    <>
      <style>{folderStyles}</style>
      <button
        className={`growth-folder${quiet ? ' growth-folder--quiet' : ''}`}
        data-testid={testId}
        onClick={onClick}
        type="button"
      >
        <span aria-hidden="true" className="growth-folder__shape">
          <span className="growth-folder__back" />
          <span className="growth-folder__tab" />
          <span className="growth-folder__front" />
        </span>
        <span
          style={{
            color: brand.silverBright,
            display: 'block',
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </span>
        <span
          style={{
            color: brand.muted,
            display: 'block',
            fontSize: '0.78rem',
            lineHeight: 1.35,
            margin: '0.35rem auto 0',
            maxWidth: '22ch',
          }}
        >
          {subtitle}
        </span>
      </button>
    </>
  );
}
