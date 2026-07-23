import { useEffect, useRef, useState } from 'react';
import type { PrimerPackage } from '../../schemas/legalSchemas';
import { listPackages } from '../../services/packagesClient';
import { brand } from '../brand/tokens';
import { GrowthAreaCard } from './GrowthAreaCard';
import { GrowthFolder } from './GrowthFolder';
import { GrowthStairway } from './GrowthStairway';
import { GrowthStepper } from './GrowthStepper';
import { GrowthVehicleTile } from './GrowthVehicleTile';
import {
  GROWTH_STAGE_LABELS,
  canEnterClimb,
  previousGrowthStage,
  type GrowthStage,
} from './stages';
import { sortPackageSteps } from './sortSteps';
import { vehiclesForPackage, type GrowthVehicle } from './vehicles';

const DISSOLVE_DURATION_MS = 480;

export function GrowthBoard() {
  const [stage, setStage] = useState<GrowthStage>(0);
  const [packages, setPackages] = useState<PrimerPackage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<GrowthVehicle | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [dissolvingIds, setDissolvingIds] = useState<string[]>([]);
  const [landingMessage, setLandingMessage] = useState<string | null>(null);
  const advanceTimeout = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    void listPackages()
      .then((nextPackages) => {
        if (active) {
          setPackages(nextPackages);
        }
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

  useEffect(() => () => {
    if (advanceTimeout.current !== null) {
      window.clearTimeout(advanceTimeout.current);
    }
  }, []);

  const selectedPackage = packages.find((item) => item.package_id === selectedPackageId) ?? null;
  const selectedSteps = selectedPackage ? sortPackageSteps(selectedPackage.steps) : [];
  const selectedVehicles = selectedPackage ? vehiclesForPackage(selectedPackage) : [];
  const canClimb = canEnterClimb(Boolean(selectedVehicle), selectedSteps.length);

  function dissolvePeers(peerIds: string[], onComplete: () => void) {
    if (dissolvingIds.length > 0) {
      return;
    }

    setDissolvingIds(peerIds);
    advanceTimeout.current = window.setTimeout(() => {
      setDissolvingIds([]);
      onComplete();
    }, DISSOLVE_DURATION_MS);
  }

  function selectPackage(pkg: PrimerPackage) {
    dissolvePeers(
      packages.filter((item) => item.package_id !== pkg.package_id).map((item) => item.package_id),
      () => {
        setSelectedPackageId(pkg.package_id);
        setSelectedVehicle(null);
        setStepIndex(0);
        setStage(2);
      },
    );
  }

  function selectVehicle(vehicle: GrowthVehicle) {
    dissolvePeers(
      selectedVehicles.filter((item) => item.id !== vehicle.id).map((item) => item.id),
      () => {
        setSelectedVehicle(vehicle);
        setStage(3);
      },
    );
  }

  function moveBack() {
    const previousStage = previousGrowthStage(stage);
    if (previousStage !== null) {
      setStage(previousStage);
    }
  }

  function advanceStep() {
    setStepIndex((currentIndex) => Math.min(currentIndex + 1, selectedSteps.length - 1));
  }

  return (
    <main
      className="h-full overflow-y-auto px-4 py-6 font-sans md:px-8 md:py-10"
      data-testid="view-case-board"
      style={{ background: brand.panelBg, color: brand.silverBright }}
    >
      <header className="mb-8 flex items-start justify-between gap-4 border-b pb-6" style={{ borderColor: brand.lineSoft }}>
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em]" style={{ color: brand.champagne }}>
            Private Confidant
          </p>
          <h2
            className="text-3xl font-bold"
            data-testid="heading-case-board"
            style={{ color: brand.silverBright, letterSpacing: '-0.02em' }}
          >
            Growth
          </h2>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: brand.muted }}>
          {GROWTH_STAGE_LABELS[stage]}
        </span>
      </header>

      {stage > 0 && (
        <button
          className="mb-6 rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em]"
          onClick={moveBack}
          style={{ borderColor: brand.lineSoft, color: brand.muted }}
          type="button"
        >
          Back
        </button>
      )}

      {error && (
        <p className="rounded-lg border border-red-800/60 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <section aria-live="polite" data-testid={`growth-stage-${stage}`}>
        {stage === 0 && (
          <div className="mx-auto grid max-w-2xl gap-8 sm:grid-cols-2">
            <GrowthFolder
              data-testid="growth-folder-status-upgrades"
              onClick={() => setStage(1)}
              subtitle="Choose a procedural goal and its usable route."
              title="Status Upgrades"
            />
            <GrowthFolder
              data-testid="growth-folder-stairway"
              onClick={() => setLandingMessage('The stairway opens after you choose a status upgrade.')}
              quiet
              subtitle="A preview of the path waiting ahead."
              title="Stairway"
            />
            {landingMessage && (
              <p className="col-span-full text-center text-sm" style={{ color: brand.muted }}>
                {landingMessage}
              </p>
            )}
          </div>
        )}

        {stage === 1 && (
          <div aria-busy={dissolvingIds.length > 0} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((pkg) => (
              <GrowthAreaCard
                data-testid={`growth-area-${pkg.package_id}`}
                dissolving={dissolvingIds.includes(pkg.package_id)}
                key={pkg.package_id}
                onClick={() => selectPackage(pkg)}
                outcome={pkg.outcome}
                title={pkg.title}
              />
            ))}
            {!error && packages.length === 0 && (
              <p className="col-span-full text-sm" style={{ color: brand.muted }}>
                Loading status upgrades…
              </p>
            )}
          </div>
        )}

        {stage === 2 && selectedPackage && (
          <div aria-busy={dissolvingIds.length > 0}>
            <p className="mb-5 text-sm" style={{ color: brand.muted }}>
              Choose a vehicle for {selectedPackage.title}.
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {selectedVehicles.map((vehicle) => (
                <GrowthVehicleTile
                  data-testid={`growth-vehicle-${vehicle.id}`}
                  dissolving={dissolvingIds.includes(vehicle.id)}
                  key={vehicle.id}
                  label={vehicle.label}
                  onClick={() => selectVehicle(vehicle)}
                />
              ))}
            </div>
          </div>
        )}

        {stage === 3 && selectedPackage && (
          <GrowthStairway
            canBegin={canClimb}
            goalLabel={selectedVehicle ? `${selectedVehicle.label}: ${selectedPackage.outcome}` : selectedPackage.outcome}
            onBegin={() => {
              if (!canClimb) {
                return;
              }

              setStepIndex(0);
              setStage(4);
            }}
            steps={selectedSteps}
          />
        )}

        {stage === 4 && (
          <GrowthStepper
            currentIndex={stepIndex}
            onBack={() => setStepIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
            onNext={advanceStep}
            steps={selectedSteps}
          />
        )}
      </section>
    </main>
  );
}

export default GrowthBoard;
