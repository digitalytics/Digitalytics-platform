'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PieChart } from 'lucide-react';
import { computeBreakdown, formatDurationSecs, formatUserCostDisplay } from '@/lib/call-cost-utils';

interface Props {
  userCost: number;
  costDetails: unknown | null;
  durationMs?: number | null;
}

const POPUP_WIDTH = 256; // w-64

export function CallCostBreakdown({ userCost, costDetails, durationMs }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef  = useRef<HTMLDivElement>(null);

  const details = costDetails as {
    product_costs?: Array<{ product?: string; cost?: number }>;
    combined_cost?: number;
    total_duration_seconds?: number;
  } | null;

  const breakdown = computeBreakdown(details, userCost);

  const durationSecs =
    details?.total_duration_seconds ??
    (durationMs != null ? Math.round(durationMs / 1000) : null);

  const durationLabel = formatDurationSecs(durationSecs);
  const durationMin   = durationSecs ? (durationSecs / 60).toFixed(3) : null;
  const avgPerMin     =
    durationSecs && durationSecs > 0
      ? `${formatUserCostDisplay(userCost / (durationSecs / 60))}/min`
      : null;

  const mainItems  = breakdown.filter(b => !b.isAddon);
  const addonItems = breakdown.filter(b => b.isAddon);

  // Compute fixed position anchored to the button
  const updatePos = () => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    // Align right edge of popup to right edge of button; clamp to viewport
    let left = r.right - POPUP_WIDTH;
    if (left < 8) left = r.left;
    if (left + POPUP_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPUP_WIDTH - 8;
    setPos({ top: r.bottom + 6, left });
  };

  const handleToggle = () => {
    if (!open) updatePos();
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;

    const onOutside = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };

    const onScrollResize = () => updatePos();

    document.addEventListener('mousedown', onOutside);
    // Capture phase catches scroll events on any ancestor (including the table container)
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open]);

  const popup = (
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPUP_WIDTH, zIndex: 9999 }}
      className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total cost</p>
        <p className="text-lg font-bold text-gray-900 mt-0.5">{formatUserCostDisplay(userCost)}</p>
      </div>

      {/* Duration stats */}
      {durationSecs != null && (
        <div className="px-4 py-2.5 border-b border-gray-100 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-gray-400">Call duration</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              {durationLabel}
              {durationMin && (
                <span className="font-normal text-gray-400"> ({durationMin} min)</span>
              )}
            </p>
          </div>
          {avgPerMin && (
            <div>
              <p className="text-[11px] text-gray-400">Avg per minute</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{avgPerMin}</p>
            </div>
          )}
        </div>
      )}

      {/* Components */}
      {mainItems.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Components
          </p>
          <div className="space-y-1.5">
            {mainItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{item.name}</span>
                <span className="text-xs font-medium text-gray-800 tabular-nums">
                  {formatUserCostDisplay(item.userCost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {addonItems.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Add-on
          </p>
          <div className="space-y-1.5">
            {addonItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{item.name}</span>
                <span className="text-xs font-medium text-gray-800 tabular-nums">
                  {formatUserCostDisplay(item.userCost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No breakdown */}
      {breakdown.length === 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400">Detailed breakdown unavailable for this call.</p>
        </div>
      )}

      {/* Total footer */}
      <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Total</span>
        <span className="text-xs font-bold text-gray-900 tabular-nums">
          {formatUserCostDisplay(userCost)}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="text-gray-400 hover:text-[#004D3E] transition-colors"
        aria-label="Cost breakdown"
        title="Cost breakdown"
      >
        <PieChart size={13} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
}
