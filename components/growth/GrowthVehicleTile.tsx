import { brand } from '../brand/tokens';

export type GrowthVehicleTileProps = {
  label: string;
  dissolving?: boolean;
  onClick: () => void;
  'data-testid'?: string;
};

const vehicleStyles = `
  @keyframes growth-vehicle-dissolve {
    to {
      filter: blur(6px);
      opacity: 0;
      transform: scale(0.92);
    }
  }
  .growth-vehicle-tile {
    appearance: none;
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
    perspective: 24em;
    position: relative;
    transform-style: preserve-3d;
    width: 5.2em;
  }
  .growth-vehicle-tile:focus-visible { outline: none; }
  .growth-vehicle-tile:focus-visible .growth-vehicle-tile__glass {
    box-shadow: 0 0 0 2px ${brand.nearBlack}, 0 0 0 4px ${brand.silver};
  }
  .growth-vehicle-tile--dissolving {
    animation: growth-vehicle-dissolve 520ms ease forwards;
    pointer-events: none;
  }
  .growth-vehicle-tile__face {
    display: block;
    height: 5.2em;
    position: relative;
    width: 5.2em;
  }
  .growth-vehicle-tile__edge {
    background: linear-gradient(145deg, ${brand.gunmetalLit} 0%, ${brand.gunmetal} 100%);
    border-radius: 1.15em;
    box-shadow: 0.35em -0.35em 0.7em rgba(0, 0, 0, 0.35);
    inset: 0;
    position: absolute;
    transform: rotate(12deg);
    transform-origin: 100% 100%;
    transition: transform 320ms cubic-bezier(0.83, 0, 0.17, 1);
  }
  .growth-vehicle-tile__glass {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    background: rgba(238, 241, 245, 0.1);
    border-radius: 1.15em;
    box-shadow: inset 0 0 0 1px ${brand.line};
    display: grid;
    inset: 0;
    place-items: center;
    position: absolute;
    transition: transform 320ms cubic-bezier(0.83, 0, 0.17, 1);
  }
  .growth-vehicle-tile:hover .growth-vehicle-tile__edge {
    transform: rotate(22deg) translate3d(-0.35em, -0.35em, 0.35em);
  }
  .growth-vehicle-tile:hover .growth-vehicle-tile__glass {
    transform: translate3d(0, 0, 1.2em);
  }
  .growth-vehicle-tile__label {
    color: ${brand.muted};
    display: block;
    font-size: 0.72rem;
    line-height: 1.3;
    margin-top: 0.85rem;
    max-width: 11em;
    opacity: 0.85;
    text-align: center;
    transition: color 280ms ease, opacity 280ms ease;
  }
  .growth-vehicle-tile:hover .growth-vehicle-tile__label {
    color: ${brand.silverBright};
    opacity: 1;
  }
`;

/** Frosted-glass control representing a concrete growth vehicle. */
export function GrowthVehicleTile({
  label,
  dissolving = false,
  onClick,
  'data-testid': testId,
}: GrowthVehicleTileProps) {
  return (
    <>
      <style>{vehicleStyles}</style>
      <button
        className={`growth-vehicle-tile${dissolving ? ' growth-vehicle-tile--dissolving' : ''}`}
        data-testid={testId}
        onClick={onClick}
        type="button"
      >
        <span aria-hidden="true" className="growth-vehicle-tile__face">
          <span className="growth-vehicle-tile__edge" />
          <span className="growth-vehicle-tile__glass" />
        </span>
        <span className="growth-vehicle-tile__label">{label}</span>
      </button>
    </>
  );
}
