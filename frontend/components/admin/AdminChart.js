import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';

/**
 * AdminChart — responsive, theme-aware area chart.
 *
 * Why this is rendered in real pixel space instead of a fixed 100x100 viewBox:
 * a viewBox of `0 0 100 100` stretched into a wide short container makes the
 * default `preserveAspectRatio="meet"` scale uniformly, so the plot only ever
 * fills the height and floats centred with dead space either side. Measuring the
 * container removes that whole class of bug and lets the ticks line up with the
 * data points exactly.
 *
 * Colour is applied through inline `style`, never through SVG presentation
 * attributes. Presentation attributes (`fill`, `stroke`, `stop-color`) do **not**
 * resolve CSS custom properties, so `stroke="var(--primary)"` silently renders
 * black — which is what made the previous version look like a black blob.
 *
 * @param {Array<{date?: string, label?: string, count?: number, value?: number}>} data
 * @param {'primary'|'success'|'info'|'warning'|'danger'|'accent'} tone
 */

const TONES = new Set(['primary', 'success', 'info', 'warning', 'danger', 'accent']);

const PAD = { top: 14, right: 18, bottom: 28, left: 44 };

/** Split the axis so every tick label lands on a whole number.
 *  Naively dividing a rounded max by 4 gives ticks like 0/13/25/38/50, which
 *  read as arbitrary. Choosing a divisor the max actually divides by keeps the
 *  labels clean without giving up vertical resolution. */
function axisTicks(max) {
    const nice = niceCeil(max);
    let divisor;
    if (nice <= 4) divisor = nice; // tiny ranges: 0..n in steps of 1
    else if (nice % 4 === 0) divisor = 4;
    else if (nice % 5 === 0) divisor = 5;
    else if (nice % 2 === 0) divisor = 2;
    else divisor = 4;
    return { max: nice, divisor: Math.max(divisor, 1) };
}

/** Deterministic compact numbers — avoids Intl locale drift between server and
 *  client render, which would otherwise cause a hydration mismatch. */
function compact(n) {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `${trim(v / 1_000_000_000)}B`;
    if (abs >= 1_000_000) return `${trim(v / 1_000_000)}M`;
    if (abs >= 1_000) return `${trim(v / 1_000)}k`;
    return String(v);
}

function trim(v) {
    return (Math.round(v * 10) / 10).toString();
}

function group(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Axis ticks must share one unit. Formatting each tick independently produces
 *  `0 / 375 / 750 / 1.1k / 1.5k`, which reads as inconsistent. Below 10k plain
 *  grouped numbers are shorter anyway, so only switch to k/M beyond that. */
function tickFmt(value, axisMax) {
    return axisMax >= 10_000 ? compact(value) : group(value);
}

/** Round the axis maximum up to a 1/2/5 x 10^n step so gridline labels read as
 *  whole numbers instead of raw maxima like 47. */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceCeil(v) {
    if (!Number.isFinite(v) || v <= 0) return 1;
    const exp = Math.floor(Math.log10(v));
    const base = 10 ** exp;
    const n = v / base;
    const step = NICE_STEPS.find((s) => s >= n) ?? 10;
    // Round away float noise (1.5 * 10 can land on 15.000000000000002).
    return Math.round(step * base);
}

export default function AdminChart({ data = [], tone = 'primary', unitLabel = 'messages' }) {
    const safeTone = TONES.has(tone) ? tone : 'primary';
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const gradientId = `chart-grad-${safeTone}-${uid}`;

    const wrapRef = useRef(null);
    const svgRef = useRef(null);
    const [width, setWidth] = useState(0);
    const [hover, setHover] = useState(null);

    /* -- series ------------------------------------------------------------ */
    const series = useMemo(
        () =>
            (Array.isArray(data) ? data : [])
                .map((d) => ({
                    label: d?.date ?? d?.label ?? '',
                    value: Math.max(0, Number(d?.count ?? d?.value ?? 0) || 0),
                }))
                .slice(-30),
        [data],
    );

    const total = useMemo(() => series.reduce((s, d) => s + d.value, 0), [series]);

    const peak = useMemo(() => {
        if (!series.length) return null;
        return series.reduce((best, d) => (d.value > best.value ? d : best), series[0]);
    }, [series]);

    const { max: axisMax, divisor } = useMemo(
        () => axisTicks(Math.max(0, ...series.map((d) => d.value))),
        [series],
    );
    const allZero = series.every((d) => d.value === 0);

    /* -- responsive width -------------------------------------------------- */
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;

        const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
        measure();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /* -- geometry ---------------------------------------------------------- */
    const ticks = useMemo(
        () => Array.from({ length: divisor + 1 }, (_, i) => (axisMax / divisor) * i),
        [axisMax, divisor],
    );

    /* Reserve exactly as much gutter as the widest tick label needs, so large
     * values ("10,000") are not clipped and small ones do not waste plot width. */
    const padLeft = useMemo(() => {
        if (!ticks.length) return PAD.left;
        const widest = Math.max(...ticks.map((v) => tickFmt(v, axisMax).length));
        return Math.min(68, Math.max(36, widest * 6 + 14));
    }, [ticks, axisMax]);

    const height = width > 0 && width < 420 ? 168 : 208;
    const innerW = Math.max(0, width - padLeft - PAD.right);
    const innerH = Math.max(0, height - PAD.top - PAD.bottom);
    const n = series.length;
    const ready = width > 0 && innerW > 0 && n > 0;

    const points = useMemo(() => {
        if (!ready) return [];
        return series.map((d, i) => ({
            ...d,
            x: n === 1 ? padLeft + innerW / 2 : padLeft + (i / (n - 1)) * innerW,
            y: PAD.top + innerH - (d.value / axisMax) * innerH,
        }));
    }, [series, n, ready, padLeft, innerW, innerH, axisMax]);

    const linePath = useMemo(() => {
        if (!points.length) return '';
        if (points.length === 1) return `M${points[0].x},${points[0].y}`;
        // Catmull-Rom-ish smoothing would overshoot on sparse data; a straight
        // polyline keeps peaks honest, which matters more than prettiness here.
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    }, [points]);

    const areaPath = useMemo(() => {
        if (!points.length) return '';
        const baseline = PAD.top + innerH;
        const first = points[0];
        const last = points[points.length - 1];
        return `${linePath} L${last.x.toFixed(2)},${baseline} L${first.x.toFixed(2)},${baseline} Z`;
    }, [linePath, points, innerH]);

    /* -- interaction ------------------------------------------------------- */
    const handleMove = useCallback(
        (e) => {
            const el = svgRef.current;
            if (!el || !points.length) return;
            const rect = el.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * width;

            let best = 0;
            let bestDist = Infinity;
            points.forEach((p, i) => {
                const d = Math.abs(p.x - x);
                if (d < bestDist) {
                    bestDist = d;
                    best = i;
                }
            });
            setHover(best);
        },
        [points, width],
    );

    const active = hover != null ? points[hover] : null;

    /* -- labels: thin out when they would collide -------------------------- */
    const step = ready && innerW / n < 34 ? Math.ceil(34 / (innerW / n)) : 1;
    const showLabel = (i) => i % step === 0 || i === n - 1;

    const ariaLabel = n
        ? `Area chart: ${unitLabel} over ${n} days. Total ${group(total)}. Peak ${group(peak?.value || 0)} on ${peak?.label}.`
        : 'Area chart: no data';

    /* -- states ------------------------------------------------------------ */
    if (!n) {
        return (
            <div className="h-40 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-elevated/40 text-muted">
                <BarChart3 size={20} aria-hidden="true" />
                <p className="text-sm">No chart data yet</p>
            </div>
        );
    }

    if (allZero) {
        return (
            <div className="h-40 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-elevated/40 text-muted">
                <BarChart3 size={20} aria-hidden="true" />
                <p className="text-sm">No {unitLabel} recorded in this period</p>
            </div>
        );
    }

    const strokeColor = `rgb(var(--${safeTone}-rgb))`;

    return (
        <div>
            {/* Summary — gives the plot a magnitude, which a bare line cannot. */}
            <div className="flex items-baseline justify-between gap-4 mb-3">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground tabular-nums">{group(total)}</span>
                    <span className="text-xs font-medium text-muted">total {unitLabel}</span>
                </div>
                {peak && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
                        <TrendingUp size={13} className="text-success" aria-hidden="true" />
                        <span>
                            Peak <span className="font-semibold text-foreground tabular-nums">{group(peak.value)}</span> on {peak.label}
                        </span>
                    </div>
                )}
            </div>

            <div ref={wrapRef} className="relative w-full" role="img" aria-label={ariaLabel}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height={height}
                    viewBox={`0 0 ${width || 1} ${height}`}
                    className="block touch-none"
                    aria-hidden="true"
                    onMouseMove={handleMove}
                    onMouseLeave={() => setHover(null)}
                >
                    <defs>
                        <linearGradient
                            id={gradientId}
                            gradientUnits="userSpaceOnUse"
                            x1="0"
                            y1={PAD.top}
                            x2="0"
                            y2={PAD.top + innerH}
                        >
                            {/* style, not stopColor= — attributes cannot read var() */}
                            <stop offset="0%" style={{ stopColor: strokeColor, stopOpacity: 0.26 }} />
                            <stop offset="100%" style={{ stopColor: strokeColor, stopOpacity: 0.02 }} />
                        </linearGradient>
                    </defs>

                    {ready && (
                        <>
                            {/* Gridlines + y ticks */}
                            {ticks.map((value, i) => {
                                const y = PAD.top + innerH - (i / divisor) * innerH;
                                const isBaseline = i === 0;
                                return (
                                    <g key={`grid-${i}`}>
                                        <line
                                            x1={padLeft}
                                            x2={padLeft + innerW}
                                            y1={y}
                                            y2={y}
                                            style={{
                                                stroke: 'rgb(var(--border-rgb))',
                                                strokeWidth: 1,
                                                strokeDasharray: isBaseline ? undefined : '3 4',
                                                strokeOpacity: isBaseline ? 1 : 0.7,
                                            }}
                                        />
                                        <text
                                            x={padLeft - 9}
                                            y={y + 3.5}
                                            textAnchor="end"
                                            style={{ fill: 'rgb(var(--text-muted-rgb))', fontSize: 10, fontWeight: 500 }}
                                        >
                                            {tickFmt(value, axisMax)}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Area */}
                            <path d={areaPath} style={{ fill: `url(#${gradientId})` }} />

                            {/* Line */}
                            <path
                                d={linePath}
                                fill="none"
                                style={{ stroke: strokeColor, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* Hover guide + marker */}
                            {active && (
                                <>
                                    <line
                                        x1={active.x}
                                        x2={active.x}
                                        y1={PAD.top}
                                        y2={PAD.top + innerH}
                                        style={{ stroke: 'rgb(var(--border-strong-rgb))', strokeWidth: 1 }}
                                    />
                                    <circle
                                        cx={active.x}
                                        cy={active.y}
                                        r={5}
                                        style={{ fill: 'rgb(var(--bg-surface-rgb))', stroke: strokeColor, strokeWidth: 2.5 }}
                                    />
                                </>
                            )}

                            {/* X ticks */}
                            {points.map((p, i) =>
                                showLabel(i) ? (
                                    <text
                                        key={`xt-${i}`}
                                        x={p.x}
                                        y={height - 8}
                                        textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                                        style={{ fill: 'rgb(var(--text-muted-rgb))', fontSize: 10, fontWeight: 500 }}
                                    >
                                        {p.label}
                                    </text>
                                ) : null,
                            )}
                        </>
                    )}
                </svg>

                {/* Tooltip */}
                {active && (
                    <div
                        className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-modal"
                        style={{ left: Math.min(Math.max(active.x, 48), Math.max(width - 48, 48)) }}
                    >
                        <p className="text-[11px] font-semibold text-foreground whitespace-nowrap tabular-nums">
                            {group(active.value)}
                        </p>
                        <p className="text-[10px] text-muted whitespace-nowrap">{active.label}</p>
                    </div>
                )}
            </div>

            {/* Text alternative for assistive tech — a chart is data. */}
            <table className="sr-only">
                <caption>{`${unitLabel} over ${n} days, total ${group(total)}`}</caption>
                <thead>
                    <tr>
                        <th scope="col">Day</th>
                        <th scope="col">{unitLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {series.map((d, i) => (
                        <tr key={`sr-${i}`}>
                            <th scope="row">{d.label}</th>
                            <td>{group(d.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
