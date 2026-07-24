import type { PackageStep } from '../../schemas/legalSchemas';
import { brand } from '../brand/tokens';

export type GrowthStepperProps = {
  steps: PackageStep[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
};

const stepperStyles = `
  .growth-stepper {
    background: linear-gradient(180deg, ${brand.gunmetal}, ${brand.gunmetalDeep});
    border: 1px solid ${brand.line};
    border-radius: 1.125rem;
    box-shadow: 0 1.25rem 3.125rem rgba(0, 0, 0, 0.45);
    color: ${brand.silverBright};
    margin: 0 auto;
    max-width: 27.5rem;
    overflow: hidden;
    width: 100%;
  }
  .growth-stepper__progress {
    align-items: center;
    display: flex;
    gap: 0.35rem;
    padding: 1.25rem 1.25rem 0.5rem;
  }
  .growth-stepper__progress-item {
    align-items: center;
    display: flex;
    flex: 1;
    gap: 0.35rem;
  }
  .growth-stepper__progress-item:last-child { flex: 0 0 auto; }
  .growth-stepper__dot {
    align-items: center;
    background: ${brand.inkSoft};
    border: 1px solid ${brand.line};
    border-radius: 999px;
    color: ${brand.muted};
    display: flex;
    flex: 0 0 1.7rem;
    font-size: 0.7rem;
    height: 1.7rem;
    justify-content: center;
  }
  .growth-stepper__dot--current {
    background: ${brand.silver};
    border-color: ${brand.silver};
    color: ${brand.nearBlack};
  }
  .growth-stepper__dot--complete {
    border-color: ${brand.champagne};
    color: ${brand.champagne};
  }
  .growth-stepper__connector {
    background: rgba(207, 213, 222, 0.15);
    border-radius: 2px;
    flex: 1;
    height: 2px;
  }
  .growth-stepper__connector--complete { background: rgba(196, 165, 116, 0.55); }
  .growth-stepper__body {
    min-height: 8.75rem;
    padding: 1rem 1.35rem 0.5rem;
  }
  .growth-stepper__body h2 {
    color: ${brand.silverBright};
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
  }
  .growth-stepper__line {
    color: ${brand.muted};
    font-size: 0.88rem;
    line-height: 1.45;
    margin: 0;
  }
  .growth-stepper__bump {
    background: rgba(196, 165, 116, 0.08);
    border: 1px solid rgba(196, 165, 116, 0.35);
    border-radius: 0.625rem;
    color: ${brand.champagne};
    font-size: 0.78rem;
    line-height: 1.35;
    margin-top: 0.85rem;
    padding: 0.65rem 0.75rem;
  }
  .growth-stepper__footer {
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    padding: 1rem 1.35rem 1.25rem;
  }
  .growth-stepper__button {
    appearance: none;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    padding: 0.55rem 1rem;
    text-transform: uppercase;
  }
  .growth-stepper__button--previous {
    background: transparent;
    border: 1px solid ${brand.lineSoft};
    color: ${brand.muted};
  }
  .growth-stepper__button--next {
    background: ${brand.gunmetal};
    border: 1.5px solid ${brand.silver};
    color: ${brand.silverBright};
    margin-left: auto;
  }
  .growth-stepper__button:hover { border-color: ${brand.silverBright}; color: ${brand.silverBright}; }
  .growth-stepper__button:focus-visible { outline: 2px solid ${brand.champagne}; outline-offset: 3px; }
`;

function getProgressDotClassName(index: number, currentIndex: number): string {
  if (index < currentIndex) {
    return 'growth-stepper__dot growth-stepper__dot--complete';
  }

  if (index === currentIndex) {
    return 'growth-stepper__dot growth-stepper__dot--current';
  }

  return 'growth-stepper__dot';
}

function getConnectorClassName(index: number, currentIndex: number): string {
  if (index < currentIndex) {
    return 'growth-stepper__connector growth-stepper__connector--complete';
  }

  return 'growth-stepper__connector';
}

/** Counted progress control for completing each step in a package. */
export function GrowthStepper({ steps, currentIndex, onBack, onNext }: GrowthStepperProps) {
  const currentStep = steps[currentIndex];

  if (!currentStep) {
    return null;
  }

  const currentStepNumber = currentIndex + 1;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;
  const primaryLine = currentStep.lines[0];
  const firstSpeedBump = currentStep.speed_bumps[0];

  return (
    <>
      <style>{stepperStyles}</style>
      <section aria-labelledby="growth-stepper-title" className="growth-stepper" data-testid="growth-stepper">
        <div aria-label={`Step ${currentStepNumber} of ${steps.length}`} className="growth-stepper__progress">
          {steps.map((step, index) => (
            <div className="growth-stepper__progress-item" key={step.id}>
              <span
                className={getProgressDotClassName(index, currentIndex)}
              >
                {index < currentIndex ? '✓' : index + 1}
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={getConnectorClassName(index, currentIndex)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="growth-stepper__body">
          <h2 id="growth-stepper-title">{currentStep.title}</h2>
          {primaryLine && <p className="growth-stepper__line">{primaryLine.text}</p>}
          {firstSpeedBump && <aside className="growth-stepper__bump">{firstSpeedBump}</aside>}
        </div>
        <footer className="growth-stepper__footer">
          {!isFirstStep && (
            <button className="growth-stepper__button growth-stepper__button--previous" onClick={onBack} type="button">
              Previous
            </button>
          )}
          <button className="growth-stepper__button growth-stepper__button--next" onClick={onNext} type="button">
            {isLastStep ? 'Arrival' : 'Next'}
          </button>
        </footer>
      </section>
    </>
  );
}
