import { brand } from '../brand/tokens';

export type GrowthStairwayProps = {
  canBegin?: boolean;
  goalLabel: string;
  steps: Array<{ id: string; title: string; order: number }>;
  onBegin: () => void;
};

const stairwayStyles = `
  @keyframes growth-stairway-reveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .growth-stairway {
    align-items: center;
    color: ${brand.silverBright};
    display: flex;
    flex-direction: column;
    padding: 1rem 0 2rem;
    text-align: center;
  }
  .growth-stairway__field {
    aspect-ratio: 4 / 5;
    background:
      radial-gradient(80% 50% at 50% 15%, rgba(207, 213, 222, 0.08), transparent 55%),
      #050608;
    border: 1px solid ${brand.lineSoft};
    border-radius: 1.125rem;
    box-shadow: 0 1.5rem 3.75rem rgba(0, 0, 0, 0.5);
    margin-bottom: 1.25rem;
    max-width: 26.25rem;
    overflow: hidden;
    position: relative;
    width: 100%;
  }
  .growth-stairway__glow {
    background: radial-gradient(ellipse at center, rgba(196, 165, 116, 0.35), transparent 70%);
    filter: blur(0.5rem);
    height: 2.5rem;
    left: 30%;
    position: absolute;
    right: 30%;
    top: 8%;
  }
  .growth-stairway__stairs {
    bottom: 12%;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.45rem;
    height: 72%;
    left: 18%;
    position: absolute;
    right: 18%;
  }
  .growth-stairway__landing {
    align-items: center;
    animation: growth-stairway-reveal 600ms ease forwards;
    background: linear-gradient(90deg, transparent, rgba(207, 213, 222, 0.08), transparent);
    border: 1px solid rgba(207, 213, 222, 0.22);
    border-radius: 0.25rem;
    color: ${brand.muted};
    display: flex;
    flex: 1;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.58rem;
    justify-content: space-between;
    letter-spacing: 0.08em;
    opacity: 0;
    padding: 0 0.75rem;
    text-transform: uppercase;
    transform: translateY(0.5rem);
  }
  .growth-stairway__landing-order { color: ${brand.silver}; }
  .growth-stairway__title {
    color: ${brand.silverBright};
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.4rem;
  }
  .growth-stairway__goal {
    color: ${brand.muted};
    font-size: 0.85rem;
    line-height: 1.45;
    margin: 0 0 1.25rem;
    max-width: 36ch;
  }
  .growth-stairway__begin {
    appearance: none;
    background: ${brand.gunmetal};
    border: 1.5px solid ${brand.silver};
    border-radius: 999px;
    color: ${brand.silverBright};
    cursor: pointer;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    padding: 0.75rem 1.4rem;
    text-transform: uppercase;
  }
  .growth-stairway__begin:hover { background: ${brand.gunmetalLit}; border-color: ${brand.silverBright}; }
  .growth-stairway__begin:focus-visible { outline: 2px solid ${brand.champagne}; outline-offset: 3px; }
`;

const LANDING_TITLE_MAX_LENGTH = 28;
const LANDING_REVEAL_DELAY_MS = 120;
const LANDING_REVEAL_STAGGER_MS = 100;

function shortenTitle(title: string): string {
  if (title.length <= LANDING_TITLE_MAX_LENGTH) {
    return title;
  }

  return `${title.slice(0, LANDING_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

function getLandingAnimationDelay(index: number): string {
  return `${LANDING_REVEAL_DELAY_MS + index * LANDING_REVEAL_STAGGER_MS}ms`;
}

/** Reveals the ordered course as luminous landings before the user begins. */
export function GrowthStairway({ canBegin = true, goalLabel, steps, onBegin }: GrowthStairwayProps) {
  return (
    <>
      <style>{stairwayStyles}</style>
      <section aria-labelledby="growth-stairway-title" className="growth-stairway" data-testid="growth-stairway">
        <div aria-hidden="true" className="growth-stairway__field">
          <div className="growth-stairway__glow" />
          <div className="growth-stairway__stairs">
            {steps.map((step, index) => (
              <div
                className="growth-stairway__landing"
                key={step.id}
                style={{ animationDelay: getLandingAnimationDelay(index) }}
              >
                <span>{shortenTitle(step.title)}</span>
                <span className="growth-stairway__landing-order">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <h2 className="growth-stairway__title" id="growth-stairway-title">Your stairway</h2>
        <p className="growth-stairway__goal">{goalLabel}</p>
        {canBegin ? (
          <button className="growth-stairway__begin" onClick={onBegin} type="button">
            Begin the climb
          </button>
        ) : (
          <p className="growth-stairway__goal">
            This route has no steps to climb yet. Choose another status upgrade or return when it is ready.
          </p>
        )}
      </section>
    </>
  );
}
