
import React, { useEffect, useState } from 'react';
import type { EpistemicBand, PackageStep, PrimerPackage } from '../schemas/legalSchemas';
import { listPackages } from '../services/packagesClient';

const badgeStyles: Record<EpistemicBand, string> = {
  settled: 'border-[#756958] bg-[#3d2b1f]/60 text-[#ded5c4]',
  institutional: 'border-[#5c5348] bg-[#2a211b] text-[#c6bda9]',
  contested: 'border-[#9b762e] bg-[#5c4217]/50 text-[#f1ce7b]',
  perilous: 'border-[#9b4944] bg-[#572724]/60 text-[#ffb4ac]',
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
      className="h-full overflow-y-auto bg-[#0d0806] px-4 py-6 text-[#e8dfce] md:px-8 md:py-10"
    >
      <header className="mb-8 border-b border-[#3d2b1f] pb-6">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#d4af37]">Private Confidant</p>
        <h2 data-testid="heading-case-board" className="font-['Merriweather'] text-3xl font-bold text-[#f3ead7]">
          Case Map
        </h2>
        <p className="mt-2 text-sm text-[#b8aa95]">Primer packages — procedural goals</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,2fr)]">
        <aside aria-label="Primer package catalog" className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-[#d4af37]">Package catalog</h3>
          {packages.map((item) => {
            const selected = item.package_id === selectedPackageId;
            return (
              <button
                key={item.package_id}
                type="button"
                data-testid={`package-card-${item.package_id}`}
                onClick={() => setSelectedPackageId(item.package_id)}
                className={`w-full rounded border p-4 text-left transition-colors ${
                  selected
                    ? 'border-[#d4af37] bg-[#3d2b1f]/70'
                    : 'border-[#3d2b1f] bg-[#17100c] hover:border-[#806741]'
                }`}
              >
                <span className="block font-['Merriweather'] text-base text-[#f3ead7]">{item.title}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8aa95]">{item.outcome}</span>
              </button>
            );
          })}
          {!error && packages.length === 0 && (
            <p className="rounded border border-[#3d2b1f] bg-[#17100c] p-4 text-sm text-[#b8aa95]">
              Loading primer packages…
            </p>
          )}
        </aside>

        <section aria-live="polite">
          {error && (
            <p className="rounded border border-[#9b4944] bg-[#572724]/50 p-4 text-sm text-[#ffb4ac]">
              {error}
            </p>
          )}

          {selectedPackage && (
            <div>
              <div className="mb-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d4af37]">
                  {selectedPackage.course_kind} package
                </p>
                <h3 className="mt-2 font-['Merriweather'] text-2xl text-[#f3ead7]">{selectedPackage.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b8aa95]">{selectedPackage.outcome}</p>
              </div>

              <ol className="space-y-4">
                {sortSteps(selectedPackage.steps).map((step) => (
                  <li
                    key={step.id}
                    data-testid={`package-step-${step.id}`}
                    className="rounded border border-[#3d2b1f] bg-[#17100c] p-5"
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
                          className="mt-1 h-4 w-4 accent-[#d4af37]"
                        />
                        <span>
                          <span className="block font-['Merriweather'] text-lg text-[#f3ead7]">{step.title}</span>
                          {step.delivery && (step.delivery.method || step.delivery.destination) && (
                            <span className="mt-1 block text-sm text-[#b8aa95]">
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
                      <p className="mt-4 rounded border border-[#9b4944] bg-[#572724]/50 p-3 text-sm text-[#ffb4ac]">
                        Flagged — inventory only, not a recommended playbook.
                      </p>
                    )}

                    {step.epistemic === 'contested' && (
                      <p className="mt-4 rounded border border-[#9b762e] bg-[#5c4217]/40 p-3 text-sm text-[#f1ce7b]">
                        Contested — inventory with caveats; not settled procedure.
                      </p>
                    )}

                    {step.lines.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-[#d4af37]">Register lines</h4>
                        <ul className="mt-2 space-y-2">
                          {step.lines.map((line) => (
                            <li key={line.line_id} className="border-l-2 border-[#806741] pl-3 font-mono text-sm leading-6 text-[#d8cdbb]">
                              “{line.text}”
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {step.forms.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-[#d4af37]">Forms</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {step.forms.map((form) => (
                            <li key={form.form_id}>
                              {form.official_url ? (
                                <a
                                  href={form.official_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#d4af37] underline decoration-[#806741] underline-offset-4 hover:text-[#f3ead7]"
                                >
                                  {form.title}
                                </a>
                              ) : (
                                <span className="text-[#d8cdbb]">{form.title}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {step.speed_bumps.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-[#d4af37]">Speed bumps</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#d8cdbb]">
                          {step.speed_bumps.map((speedBump) => <li key={speedBump}>{speedBump}</li>)}
                        </ul>
                      </section>
                    )}

                    {step.flags.length > 0 && (
                      <section className="mt-4">
                        <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-[#e69a8c]">Flags</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#ffb4ac]">
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
