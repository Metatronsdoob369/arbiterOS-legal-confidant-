
import React, { useEffect, useState } from 'react';
import type { EpistemicBand, PackageStep, PrimerPackage } from '../schemas/legalSchemas';
import { listPackages } from '../services/packagesClient';
import { brand } from './brand/tokens';

const badgeStyles: Record<EpistemicBand, string> = {
  settled: 'border-silver/30 bg-gunmetal/60 text-silver-bright',
  institutional: 'border-silver/20 bg-gunmetal-deep text-silver-den',
  contested: 'border-champagne/50 bg-champagne/10 text-champagne',
  perilous: 'border-red-800/60 bg-red-950/50 text-red-300',
};

function sortSteps(steps: PackageStep[]) {
  return [...steps].sort((left, right) => left.order - right.order);
}

export const CaseBoard: React.FC = () => {
  const [packages, setPackages] = useState<PrimerPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listPackages()
      .then((nextPackages) => {
        if (!active) return;
        setPackages(nextPackages);
        setSelectedPackageId((currentId) => currentId ?? nextPackages[0]?.package_id ?? null);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Unable to load primer packages.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedPackage = packages.find((item) => item.package_id === selectedPackageId);

  return (
    <main
      data-testid="view-case-board"
      className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-10 font-sans"
      style={{ background: brand.panelBg, color: brand.silverBright }}
    >
      <header className="mb-8 pb-6" style={{ borderBottom: `1px solid ${brand.lineSoft}` }}>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: brand.champagne }}>
          Private Confidant
        </p>
        <h2
          data-testid="heading-case-board"
          className="text-3xl font-bold"
          style={{ color: brand.silverBright, letterSpacing: '-0.02em' }}
        >
          Case Map
        </h2>
        <p className="mt-2 text-sm" style={{ color: brand.muted }}>
          Primer packages — procedural goals
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,2fr)]">
        <aside aria-label="Primer package catalog" className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: brand.champagne }}>
            Package catalog
          </h3>
          {packages.map((item) => {
            const selected = item.package_id === selectedPackageId;
            return (
              <button
                key={item.package_id}
                type="button"
                data-testid={`package-card-${item.package_id}`}
                onClick={() => setSelectedPackageId(item.package_id)}
                className="w-full rounded-lg border p-4 text-left transition-colors"
                style={{
                  borderColor: selected ? brand.silver : brand.lineSoft,
                  background: selected ? brand.gunmetal : brand.gunmetalDeep,
                  boxShadow: selected ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : undefined,
                }}
              >
                <span className="block text-base font-semibold" style={{ color: brand.silverBright }}>
                  {item.title}
                </span>
                <span className="mt-2 block text-sm leading-6" style={{ color: brand.muted }}>
                  {item.outcome}
                </span>
              </button>
            );
          })}
          {!error && packages.length === 0 && (
            <p
              className="rounded-lg border p-4 text-sm"
              style={{ borderColor: brand.lineSoft, background: brand.gunmetalDeep, color: brand.muted }}
            >
              Loading primer packages…
            </p>
          )}
        </aside>

        <section aria-live="polite">
          {error && (
            <p className="rounded-lg border border-red-800/60 bg-red-950/50 p-4 text-sm text-red-300">
              {error}
            </p>
          )}

          {selectedPackage && (
            <div>
              <div className="mb-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: brand.champagne }}>
                  {selectedPackage.course_kind} package
                </p>
                <h3 className="mt-2 text-2xl font-semibold" style={{ color: brand.silverBright }}>
                  {selectedPackage.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: brand.muted }}>
                  {selectedPackage.outcome}
                </p>
              </div>

              <ol className="space-y-4">
                {sortSteps(selectedPackage.steps).map((step) => (
                  <li
                    key={step.id}
                    data-testid={`package-step-${step.id}`}
                    className="rounded-lg border p-5"
                    style={{ borderColor: brand.lineSoft, background: brand.gunmetalDeep }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={completedSteps[step.id] ?? false}
                          onChange={() =>
                            setCompletedSteps((current) => ({
                              ...current,
                              [step.id]: !current[step.id],
                            }))
                          }
                          className="mt-1 h-4 w-4"
                          style={{ accentColor: brand.silver }}
                        />
                        <span>
                          <span className="block text-lg font-semibold" style={{ color: brand.silverBright }}>
                            {step.title}
                          </span>
                          {step.delivery && (step.delivery.method || step.delivery.destination) && (
                            <span className="mt-1 block text-sm" style={{ color: brand.muted }}>
                              Delivery: {[step.delivery.method, step.delivery.destination].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </label>
                      <span className={`w-fit rounded border px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${badgeStyles[step.epistemic]}`}>
                        {step.epistemic}
                      </span>
                    </div>

                    {step.epistemic === 'perilous' && (
                      <p className="mt-4 rounded border border-red-800/60 bg-red-950/50 p-3 text-sm text-red-300">
                        Flagged — inventory only, not a recommended playbook.
                      </p>
                    )}

                    {step.epistemic === 'contested' && (
                      <p
                        className="mt-4 rounded border p-3 text-sm"
                        style={{
                          borderColor: 'rgba(196,165,116,0.45)',
                          background: 'rgba(196,165,116,0.1)',
                          color: brand.champagne,
                        }}
                      >
                        Contested — inventory with caveats; not settled procedure.
                      </p>
                    )}

                    {step.lines.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: brand.champagne }}>
                          Register lines
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {step.lines.map((line) => (
                            <li
                              key={line.line_id}
                              className="border-l-2 pl-3 font-mono text-sm leading-6"
                              style={{ borderColor: brand.silver, color: brand.silver }}
                            >
                              “{line.text}”
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {step.forms.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: brand.champagne }}>
                          Forms
                        </h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {step.forms.map((form) => (
                            <li key={form.form_id}>
                              {form.official_url ? (
                                <a
                                  href={form.official_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline underline-offset-4 hover:opacity-90"
                                  style={{ color: brand.silver, textDecorationColor: brand.line }}
                                >
                                  {form.title}
                                </a>
                              ) : (
                                <span style={{ color: brand.silver }}>{form.title}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {step.speed_bumps.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: brand.champagne }}>
                          Speed bumps
                        </h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6" style={{ color: brand.silver }}>
                          {step.speed_bumps.map((speedBump) => <li key={speedBump}>{speedBump}</li>)}
                        </ul>
                      </section>
                    )}

                    {step.flags.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-red-300">Flags</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-red-300">
                          {step.flags.map((flag) => <li key={flag}>{flag}</li>)}
                        </ul>
                      </section>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
