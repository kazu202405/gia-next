// 売上導線レーダーチャート（純SVG・依存追加なし）。
// N軸（既定5）の 0〜100 スコアを五角形などで描画する。html2canvas-pro でも崩れない。

interface RadarAxis {
  label: string;
  score: number; // 0〜100
}

export function RadarChart({
  axes,
  size = 260,
}: {
  axes: RadarAxis[];
  size?: number;
}) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 38; // ラベル余白
  const levels = [0.25, 0.5, 0.75, 1];

  // 各軸の角度（真上始点・時計回り）
  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, ratio: number) => {
    const a = angleAt(i);
    return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)];
  };

  const gridPolygon = (ratio: number) =>
    axes
      .map((_, i) => {
        const [x, y] = point(i, ratio);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const dataPolygon = axes
    .map((ax, i) => {
      const [x, y] = point(i, Math.max(0, Math.min(100, ax.score)) / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* グリッド */}
      {levels.map((lv) => (
        <polygon
          key={lv}
          points={gridPolygon(lv)}
          fill="none"
          stroke="#d6dde5"
          strokeWidth={1}
        />
      ))}
      {/* 軸線 */}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(1)}
            y2={y.toFixed(1)}
            stroke="#e6ebf0"
            strokeWidth={1}
          />
        );
      })}
      {/* データ */}
      <polygon
        points={dataPolygon}
        fill="rgba(28,53,80,0.16)"
        stroke="#1c3550"
        strokeWidth={2}
      />
      {axes.map((ax, i) => {
        const [x, y] = point(i, Math.max(0, Math.min(100, ax.score)) / 100);
        return <circle key={i} cx={x} cy={y} r={3} fill="#1c3550" />;
      })}
      {/* ラベル */}
      {axes.map((ax, i) => {
        const [x, y] = point(i, 1.16);
        const a = angleAt(i);
        const anchor =
          Math.abs(Math.cos(a)) < 0.3
            ? "middle"
            : Math.cos(a) > 0
              ? "start"
              : "end";
        return (
          <text
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-[#1c3550]"
            style={{ fontSize: 10.5, fontWeight: 600 }}
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}
