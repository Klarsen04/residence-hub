"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A drafted cross-section of the residence hall — the spatial anchor the whole
 * landing journey moves through. Rendered as clean architectural line-work
 * (charcoal ink on ivory) with each storey labelled like a floor plan.
 *
 * Floors carry data-attributes so the page's ScrollTrigger timeline can light
 * them up one at a time as the visitor "descends" through the building.
 */

const FLOORS = [
  { id: "roof", label: "ROOFTOP", code: "R", detail: "Sky lounge & terrace" },
  { id: "l3", label: "LEVEL 03", code: "03", detail: "Quiet study floors" },
  { id: "l2", label: "LEVEL 02", code: "02", detail: "Resident rooms" },
  { id: "l1", label: "LEVEL 01", code: "01", detail: "Community kitchen" },
  { id: "ground", label: "GROUND", code: "G", detail: "Lobby & mailroom" },
] as const;

export const BuildingDiagram = forwardRef<SVGSVGElement, { className?: string }>(
  function BuildingDiagram({ className }, ref) {
    const floorHeight = 92;
    const top = 40;
    const width = 320;
    const left = 40;

    return (
      <svg
        ref={ref}
        viewBox="0 0 400 560"
        fill="none"
        className={cn("w-full h-auto", className)}
        aria-label="Cross-section of the residence hall"
        role="img"
      >
        {/* Ground line */}
        <line
          x1="8"
          y1={top + FLOORS.length * floorHeight}
          x2="392"
          y2={top + FLOORS.length * floorHeight}
          stroke="hsl(var(--charcoal) / 0.5)"
          strokeWidth="1.5"
        />

        {FLOORS.map((floor, i) => {
          const y = top + i * floorHeight;
          return (
            <g key={floor.id} data-floor={floor.id} className="floor-group">
              {/* Slab */}
              <rect
                x={left}
                y={y}
                width={width}
                height={floorHeight}
                className="floor-fill"
                fill="hsl(var(--sage) / 0.06)"
                stroke="hsl(var(--charcoal) / 0.55)"
                strokeWidth="1.25"
              />

              {/* Room partitions */}
              {i !== 0 && (
                <>
                  <line
                    x1={left + width * 0.33}
                    y1={y}
                    x2={left + width * 0.33}
                    y2={y + floorHeight}
                    stroke="hsl(var(--charcoal) / 0.2)"
                    strokeWidth="1"
                  />
                  <line
                    x1={left + width * 0.66}
                    y1={y}
                    x2={left + width * 0.66}
                    y2={y + floorHeight}
                    stroke="hsl(var(--charcoal) / 0.2)"
                    strokeWidth="1"
                  />
                </>
              )}

              {/* Windows */}
              {[0.14, 0.47, 0.8].map((fx) => (
                <rect
                  key={fx}
                  x={left + width * fx}
                  y={y + 24}
                  width={34}
                  height={30}
                  rx="1"
                  className="floor-window"
                  fill="hsl(var(--warm-yellow) / 0.35)"
                  stroke="hsl(var(--charcoal) / 0.35)"
                  strokeWidth="0.75"
                />
              ))}

              {/* Floor code, drafting style */}
              <text
                x={left - 12}
                y={y + floorHeight / 2 + 4}
                textAnchor="end"
                className="floor-code"
                fill="hsl(var(--terracotta))"
                style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 1 }}
              >
                {floor.code}
              </text>
            </g>
          );
        })}

        {/* Roof cap */}
        <path
          d={`M${left - 8} ${top} L200 ${top - 26} L${left + width + 8} ${top}`}
          fill="hsl(var(--terracotta) / 0.14)"
          stroke="hsl(var(--charcoal) / 0.55)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />

        {/* Entrance */}
        <rect
          x={left + width / 2 - 24}
          y={top + FLOORS.length * floorHeight - 40}
          width={48}
          height={40}
          fill="hsl(var(--charcoal) / 0.12)"
          stroke="hsl(var(--charcoal) / 0.55)"
          strokeWidth="1.25"
        />
      </svg>
    );
  }
);

export { FLOORS };
