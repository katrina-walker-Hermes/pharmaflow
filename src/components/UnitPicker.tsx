import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export const STANDARD_UNIT_OPTIONS = [
  'Ampoule',
  'Flacon',
  'Boîte de',
  'Carton',
  'Rouleau',
  'Unité',
] as const;

export type StandardUnitType = typeof STANDARD_UNIT_OPTIONS[number];

export function parseUnitValue(unit?: string): { base: StandardUnitType; boxCount: string } {
  const raw = (unit || '').trim();
  if (!raw) return { base: 'Unité', boxCount: '' };

  const lower = raw.toLowerCase();
  if (lower.startsWith('ampoule')) return { base: 'Ampoule', boxCount: '' };
  if (lower.startsWith('flacon')) return { base: 'Flacon', boxCount: '' };
  if (lower.startsWith('carton')) return { base: 'Carton', boxCount: '' };
  if (lower.startsWith('rouleau')) return { base: 'Rouleau', boxCount: '' };
  if (lower.startsWith('boîte') || lower.startsWith('boite')) {
    const match = raw.match(/(\d+)/);
    return { base: 'Boîte de', boxCount: match ? match[1] : '' };
  }
  return { base: 'Unité', boxCount: '' };
}

export function formatUnitDisplay(unit?: string): string {
  const clean = (unit || '').trim();
  return clean || 'Unité';
}

interface UnitPickerProps {
  value: string;
  onChange: (newUnit: string) => void;
  compact?: boolean;
  label?: string;
}

export default function UnitPicker({ value, onChange, compact = false, label }: UnitPickerProps) {
  const parsed = parseUnitValue(value);
  const [selectedBase, setSelectedBase] = useState<StandardUnitType>(parsed.base);
  const [boxCount, setBoxCount] = useState<string>(parsed.boxCount);

  useEffect(() => {
    const p = parseUnitValue(value);
    setSelectedBase(p.base);
    if (p.base === 'Boîte de') {
      setBoxCount(p.boxCount);
    }
  }, [value]);

  const handleSelectBase = (base: StandardUnitType) => {
    setSelectedBase(base);
    if (base === 'Boîte de') {
      const countStr = boxCount.trim();
      onChange(countStr ? `Boîte de ${countStr}` : 'Boîte');
    } else {
      onChange(base);
    }
  };

  const handleBoxCountChange = (val: string) => {
    const digitsOnly = val.replace(/[^0-9]/g, '');
    setBoxCount(digitsOnly);
    onChange(digitsOnly ? `Boîte de ${digitsOnly}` : 'Boîte');
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-slate-700">{label}</label>
      )}
      <div className={clsx("flex flex-wrap gap-1.5", compact && "gap-1")}>
        {STANDARD_UNIT_OPTIONS.map((opt) => {
          const isActive = selectedBase === opt;
          const displayLabel =
            opt === 'Boîte de'
              ? 'Boîte de (n)'
              : opt === 'Carton'
              ? 'Carton'
              : opt === 'Rouleau'
              ? 'Rouleau'
              : opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelectBase(opt)}
              className={clsx(
                "rounded-lg font-semibold border transition-all active:scale-95",
                compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
                isActive
                  ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {selectedBase === 'Boîte de' && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-teal-900 whitespace-nowrap">
            Boîte de :
          </span>
          <input
            type="number"
            min="1"
            placeholder="Ex: 10, 20, 50, 100"
            value={boxCount}
            onChange={(e) => handleBoxCountChange(e.target.value)}
            className="w-28 rounded-lg border border-teal-400 bg-teal-50/40 px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white"
          />
          <span className="text-[11px] text-slate-500">unités / boîte</span>
        </div>
      )}
    </div>
  );
}
