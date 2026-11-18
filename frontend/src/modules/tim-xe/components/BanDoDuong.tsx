import type { DuongDi } from '../models';

/**
 * Vẽ đường ngắn nhất từ cổng tới khu (server tính bằng Dijkstra trên đồ thị nút / cạnh của bãi).
 * Toạ độ nút là mét trên mặt bằng bãi; ở đây chỉ co giãn cho vừa khung, không phải bản đồ thật.
 */
export function BanDoDuong({ duong }: { duong: DuongDi }) {
  const d = duong.diem;
  if (d.length < 2) return null;
  const xs = d.map((p) => p.x), ys = d.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 320, H = 160, le = 28;
  const rongChu = 70; // chừa bên phải cho nhãn điểm đầu / cuối
  const k = Math.min((W - 2 * le - rongChu) / Math.max(maxX - minX, 1), (H - 2 * le) / Math.max(maxY - minY, 1));
  const ox = le + (W - 2 * le - rongChu - (maxX - minX) * k) / 2, oy = (H - (maxY - minY) * k) / 2;
  const sx = (x: number) => ox + (x - minX) * k;
  const sy = (y: number) => oy + (y - minY) * k;
  const diem = d.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const dau = d[0], cuoi = d[d.length - 1];
  // Nhãn đặt lệch khỏi hướng đường: đoạn đứng thì ghi bên phải, đoạn ngang thì ghi bên dưới (đầu) / bên trên (cuối)
  const doc = (a: typeof dau, b: typeof dau) => Math.abs(sy(b.y) - sy(a.y)) > Math.abs(sx(b.x) - sx(a.x));
  const nhanDau = doc(dau, d[1]) ? { x: sx(dau.x) + 12, y: sy(dau.y) + 4, a: 'start' } : { x: sx(dau.x), y: sy(dau.y) + 22, a: 'middle' };
  const nhanCuoi = doc(d[d.length - 2], cuoi) ? { x: sx(cuoi.x) + 14, y: sy(cuoi.y) + 4, a: 'start' } : { x: sx(cuoi.x), y: sy(cuoi.y) - 16, a: 'middle' };
  return (
    <figure className="ban-do">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Đường từ ${dau.ten} tới ${cuoi.ten}, khoảng ${Math.round(duong.tongMet)} mét`}>
        <polyline points={diem} className="ban-do-duong" />
        {d.slice(1, -1).map((p) => <circle key={p.nutId} cx={sx(p.x)} cy={sy(p.y)} r={4} className="ban-do-nut" />)}
        <circle cx={sx(dau.x)} cy={sy(dau.y)} r={7} className="ban-do-dau" />
        <rect x={sx(cuoi.x) - 8} y={sy(cuoi.y) - 8} width={16} height={16} rx={4} className="ban-do-cuoi" />
        <text x={nhanDau.x} y={nhanDau.y} textAnchor={nhanDau.a} className="ban-do-chu">{dau.ten}</text>
        <text x={nhanCuoi.x} y={nhanCuoi.y} textAnchor={nhanCuoi.a} className="ban-do-chu ban-do-chu-dich">{cuoi.ten}</text>
      </svg>
      <figcaption className="mo">{d.map((p) => p.ten).join(' → ')} · khoảng {Math.round(duong.tongMet)} m</figcaption>
    </figure>
  );
}
