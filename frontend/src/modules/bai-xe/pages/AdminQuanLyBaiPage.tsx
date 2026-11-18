import { useState } from 'react';
import { DangTai, ThongBao } from '@/shared/ui/ui';
import { useTaiDuLieu } from '@/shared/ui/useTaiDuLieu';
import { useApp } from '@/app/AppContext';
import { dinhDangNgay, tenLoaiXe } from '@/shared/utils/format';
import type { CameraBai, CauHinhBai, KhuQuanLy, OQuanLy, TrangThaiO, VaiTroCamera } from '../models';
import { TEN_VAI_TRO_CAMERA } from '../models';
import { TEN_TRANG_THAI_O } from '../models';
import { MucChoKhu } from '@/modules/tim-xe/components/MucChoKhu';
import type { KhuCho } from '@/modules/tim-xe/models';

type Tab = 'khu' | 'o' | 'camera';

/**
 * Trang Admin "Quản lý bãi": thêm / sửa / xoá khu, ô, camera và đặt tay trạng thái ô.
 * Mọi quy tắc (tên trùng, mã ô sai, camera khác khu, xoá thứ đang dùng) do backend kiểm; trang chỉ hiện lỗi trả về.
 */
export function AdminQuanLyBaiPage() {
  const { services } = useApp();
  const ch = useTaiDuLieu(() => services.baiXe.layCauHinh());
  // Số xe trong từng khu: camera khu hướng vào +1, hướng ra −1. Tự tải lại mỗi 5 giây.
  const soXe = useTaiDuLieu(() => services.timXe.laySoXeKhu(), [], 5_000);
  const [tab, setTab] = useState<Tab>('khu');
  const [tin, setTin] = useState<{ loai: 'ok' | 'loi'; noiDung: string } | null>(null);

  /** Chạy một thao tác ghi: báo lỗi nếu có, xong thì tải lại cấu hình. */
  async function lam(viec: () => Promise<unknown>, thanhCong: string) {
    setTin(null);
    try { await viec(); setTin({ loai: 'ok', noiDung: thanhCong }); await ch.taiLai(); return true; }
    catch (e) { setTin({ loai: 'loi', noiDung: (e as Error).message }); return false; }
  }

  return (
    <>
      <div className="tieu-de-trang">
        <h1>Quản lý bãi</h1>
        <button className="nut nut-phu nut-nho" onClick={() => { void ch.taiLai(); void soXe.taiLai(); }} disabled={ch.dangTai}>Tải lại</button>
      </div>
      <h2>Số xe trong các khu</h2>
      <p className="mo">Camera khu hướng vào nhận diện xe → cộng 1 vào khu; camera hướng ra nhận diện xe → trừ 1. Tự cập nhật mỗi 5 giây.</p>
      {soXe.loi && <ThongBao loai="loi">{soXe.loi}</ThongBao>}
      {soXe.duLieu && <MucChoKhu khu={soXe.duLieu.khu} chiTiet />}
      <h2>Cấu hình bãi</h2>
      <p className="mo">Khai báo khu, ô đỗ và camera. Mỗi khu nên có 2 camera: một camera soi hướng vào, một camera soi hướng ra.</p>
      <div className="tab">
        <button className={tab === 'khu' ? 'chon' : ''} onClick={() => setTab('khu')}>Khu</button>
        <button className={tab === 'o' ? 'chon' : ''} onClick={() => setTab('o')}>Ô đỗ</button>
        <button className={tab === 'camera' ? 'chon' : ''} onClick={() => setTab('camera')}>Camera</button>
      </div>
      {tin && <ThongBao loai={tin.loai}>{tin.noiDung}</ThongBao>}
      {ch.loi && <ThongBao loai="loi">{ch.loi}</ThongBao>}
      {ch.dangTai && !ch.duLieu && <DangTai />}
      {ch.duLieu && tab === 'khu' && <QuanLyKhu ch={ch.duLieu} lam={lam} soXe={soXe.duLieu?.khu ?? []} />}
      {ch.duLieu && tab === 'o' && <QuanLyO ch={ch.duLieu} lam={lam} />}
      {ch.duLieu && tab === 'camera' && <QuanLyCamera ch={ch.duLieu} lam={lam} />}
    </>
  );
}

type Lam = (viec: () => Promise<unknown>, thanhCong: string) => Promise<boolean>;
const tenKhu = (ch: CauHinhBai, id: number) => ch.khu.find((k) => k.id === id)?.ten ?? `#${id}`;

// ---------------- Khu ----------------

function QuanLyKhu({ ch, lam, soXe }: { ch: CauHinhBai; lam: Lam; soXe: KhuCho[] }) {
  const { services } = useApp();
  const dangCo = (id: number) => soXe.find((k) => k.id === id);
  const [moi, setMoi] = useState({ ten: '', loaiXeId: ch.loaiXe[0]?.id ?? 1, sucChua: 0 });
  const [sua, setSua] = useState<KhuQuanLy | null>(null);

  return (
    <>
      <form className="the hang-form" onSubmit={async (e) => {
        e.preventDefault();
        if (await lam(() => services.baiXe.themKhu(moi), `Đã thêm khu ${moi.ten}.`)) setMoi({ ...moi, ten: '' });
      }}>
        <input value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} placeholder="Tên khu, VD: Khu D" required />
        <ChonLoaiXe ch={ch} value={moi.loaiXeId} onChange={(v) => setMoi({ ...moi, loaiXeId: v })} />
        <input type="number" min={0} value={moi.sucChua} onChange={(e) => setMoi({ ...moi, sucChua: Number(e.target.value) })}
               aria-label="Sức chứa" title="Sức chứa (số xe tối đa của khu)" placeholder="Sức chứa" />
        <button className="nut">Thêm khu</button>
      </form>
      <div className="bang-cuon">
        <table className="bang">
          <thead><tr><th>Tên khu</th><th>Loại xe</th><th>Sức chứa</th><th>Đang có xe</th><th>Còn trống</th><th>Số ô</th><th>Số camera</th><th></th></tr></thead>
          <tbody>
            {ch.khu.map((k) => sua?.id === k.id ? (
              <tr key={k.id}>
                <td><input value={sua.ten} onChange={(e) => setSua({ ...sua, ten: e.target.value })} /></td>
                <td><ChonLoaiXe ch={ch} value={sua.loaiXeId} onChange={(v) => setSua({ ...sua, loaiXeId: v })} /></td>
                <td><input type="number" min={0} value={sua.sucChua} onChange={(e) => setSua({ ...sua, sucChua: Number(e.target.value) })} aria-label="Sức chứa" /></td>
                <td>{dangCo(k.id)?.soXe ?? '—'}</td><td>{dangCo(k.id)?.conLai ?? '—'}</td>
                <td>{k.soO}</td><td>{k.soCamera}</td>
                <td className="hang-nut">
                  <button className="nut nut-nho" onClick={async () => {
                    if (await lam(() => services.baiXe.suaKhu(k.id, { ten: sua.ten, loaiXeId: sua.loaiXeId, sucChua: sua.sucChua }), 'Đã lưu khu.')) setSua(null);
                  }}>Lưu</button>
                  <button className="nut nut-phu nut-nho" onClick={() => setSua(null)}>Huỷ</button>
                </td>
              </tr>
            ) : (
              <tr key={k.id}>
                <td><strong>{k.ten}</strong></td>
                <td>{tenLoaiXe(ch.loaiXe.find((l) => l.id === k.loaiXeId)?.ten ?? k.loaiXeId)}</td>
                <td>{k.sucChua}</td>
                <td><strong>{dangCo(k.id)?.soXe ?? '—'}</strong></td><td>{dangCo(k.id)?.conLai ?? '—'}</td>
                <td>{k.soO}</td><td>{k.soCamera}</td>
                <td className="hang-nut">
                  <button className="nut nut-phu nut-nho" onClick={() => setSua(k)}>Sửa</button>
                  <button className="nut nut-nguy nut-nho" onClick={() => confirm(`Xoá ${k.ten}?`) && lam(() => services.baiXe.xoaKhu(k.id), `Đã xoá ${k.ten}.`)}>Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ChonLoaiXe({ ch, value, onChange }: { ch: CauHinhBai; value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {ch.loaiXe.map((l) => <option key={l.id} value={l.id}>{tenLoaiXe(l.ten)}</option>)}
    </select>
  );
}

// ---------------- Ô đỗ ----------------

function QuanLyO({ ch, lam }: { ch: CauHinhBai; lam: Lam }) {
  const { services } = useApp();
  const [locKhu, setLocKhu] = useState<number | 0>(0);
  const [moi, setMoi] = useState({ khuId: ch.khu[0]?.id ?? 0, maO: '', cameraId: null as number | null });
  const ds = ch.o.filter((o) => !locKhu || o.khuId === locKhu);
  const cameraCuaKhu = (khuId: number) => ch.camera.filter((c) => c.khuId === khuId);

  return (
    <>
      <form className="the hang-form" onSubmit={async (e) => {
        e.preventDefault();
        if (await lam(() => services.baiXe.themO(moi), `Đã thêm ô ${moi.maO.toUpperCase()}.`)) setMoi({ ...moi, maO: '' });
      }}>
        <select value={moi.khuId} onChange={(e) => setMoi({ ...moi, khuId: Number(e.target.value), cameraId: null })}>
          {ch.khu.map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
        </select>
        <input value={moi.maO} onChange={(e) => setMoi({ ...moi, maO: e.target.value })} placeholder="Mã ô, VD: A05" required />
        <ChonCamera ds={cameraCuaKhu(moi.khuId)} value={moi.cameraId} onChange={(v) => setMoi({ ...moi, cameraId: v })} />
        <button className="nut">Thêm ô</button>
      </form>
      <div className="thanh-chon">
        <span className="mo">Lọc theo khu</span>
        <select value={locKhu} onChange={(e) => setLocKhu(Number(e.target.value))}>
          <option value={0}>Tất cả</option>
          {ch.khu.map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
        </select>
      </div>
      {ds.length === 0 ? <ThongBao loai="tin">Chưa có ô nào{locKhu ? ' trong khu này' : ''}. Khu không chia ô (VD xe máy) thì không cần thêm.</ThongBao> : (
        <div className="bang-cuon">
          <table className="bang">
            <thead><tr><th>Mã ô</th><th>Khu</th><th>Mã QR</th><th>Camera</th><th>Trạng thái</th><th>Cập nhật</th><th></th></tr></thead>
            <tbody>{ds.map((o) => <DongO key={o.id} o={o} ch={ch} cameras={cameraCuaKhu(o.khuId)} lam={lam} />)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DongO({ o, ch, cameras, lam }: { o: OQuanLy; ch: CauHinhBai; cameras: CameraBai[]; lam: Lam }) {
  const { services } = useApp();
  const [sua, setSua] = useState<{ maO: string; cameraId: number | null } | null>(null);
  return (
    <tr>
      <td>{sua ? <input value={sua.maO} onChange={(e) => setSua({ ...sua, maO: e.target.value })} size={6} /> : <strong>{o.maO}</strong>}</td>
      <td>{tenKhu(ch, o.khuId)}</td>
      <td className="mo">{o.maQr}</td>
      <td>{sua ? <ChonCamera ds={cameras} value={sua.cameraId} onChange={(v) => setSua({ ...sua, cameraId: v })} />
               : ch.camera.find((c) => c.id === o.cameraId)?.ten ?? '—'}</td>
      <td>
        <select className={`chon-tt tt-o-${o.trangThai}`} value={o.trangThai}
                onChange={(e) => lam(() => services.baiXe.datTrangThaiO(o.id, e.target.value as TrangThaiO), `Ô ${o.maO}: ${TEN_TRANG_THAI_O[e.target.value as TrangThaiO]}.`)}>
          {(Object.keys(TEN_TRANG_THAI_O) as TrangThaiO[]).map((t) => <option key={t} value={t}>{TEN_TRANG_THAI_O[t]}</option>)}
        </select>
      </td>
      <td className="mo">{o.capNhatLuc ? `${dinhDangNgay(o.capNhatLuc)} · ${o.nguon === 'AI' ? 'AI' : 'Admin'}` : '—'}</td>
      <td className="hang-nut">
        {sua ? (
          <>
            <button className="nut nut-nho" onClick={async () => {
              if (await lam(() => services.baiXe.suaO(o.id, { khuId: o.khuId, maO: sua.maO, cameraId: sua.cameraId }), 'Đã lưu ô.')) setSua(null);
            }}>Lưu</button>
            <button className="nut nut-phu nut-nho" onClick={() => setSua(null)}>Huỷ</button>
          </>
        ) : (
          <>
            <button className="nut nut-phu nut-nho" onClick={() => setSua({ maO: o.maO, cameraId: o.cameraId })}>Sửa</button>
            <button className="nut nut-nguy nut-nho" onClick={() => confirm(`Xoá ô ${o.maO}?`) && lam(() => services.baiXe.xoaO(o.id), `Đã xoá ô ${o.maO}.`)}>Xoá</button>
          </>
        )}
      </td>
    </tr>
  );
}

function ChonCamera({ ds, value, onChange }: { ds: CameraBai[]; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Không gắn camera</option>
      {ds.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
    </select>
  );
}

// ---------------- Camera ----------------

function QuanLyCamera({ ch, lam }: { ch: CauHinhBai; lam: Lam }) {
  const { services } = useApp();
  const trong = { khuId: ch.khu[0]?.id ?? 0, ten: '', nguonAnh: '', dangBat: true, vaiTro: 'KHU_VAO' as VaiTroCamera };
  const [moi, setMoi] = useState(trong);
  const [sua, setSua] = useState<CameraBai | null>(null);

  return (
    <>
      <form className="the hang-form" onSubmit={async (e) => {
        e.preventDefault();
        if (await lam(() => services.baiXe.themCamera(moi), `Đã thêm camera ${moi.ten}.`)) setMoi({ ...trong, khuId: moi.khuId });
      }}>
        <select value={moi.khuId} onChange={(e) => setMoi({ ...moi, khuId: Number(e.target.value) })}>
          {ch.khu.map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
        </select>
        <input value={moi.ten} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} placeholder="Tên camera" required />
        <input value={moi.nguonAnh} onChange={(e) => setMoi({ ...moi, nguonAnh: e.target.value })} placeholder="rtsp://… hoặc /anh-mau/cam.jpg" required />
        <ChonVaiTro value={moi.vaiTro} onChange={(v) => setMoi({ ...moi, vaiTro: v })} />
        <button className="nut">Thêm camera</button>
      </form>
      <div className="bang-cuon">
        <table className="bang">
          <thead><tr><th>Tên</th><th>Khu</th><th>Vai trò</th><th>Nguồn ảnh</th><th>Đang bật</th><th></th></tr></thead>
          <tbody>
            {ch.camera.map((c) => sua?.id === c.id ? (
              <tr key={c.id}>
                <td><input value={sua.ten} onChange={(e) => setSua({ ...sua, ten: e.target.value })} /></td>
                <td>{tenKhu(ch, c.khuId)}</td>
                <td><ChonVaiTro value={sua.vaiTro} onChange={(v) => setSua({ ...sua, vaiTro: v })} /></td>
                <td><input value={sua.nguonAnh} onChange={(e) => setSua({ ...sua, nguonAnh: e.target.value })} /></td>
                <td><input type="checkbox" checked={sua.dangBat} onChange={(e) => setSua({ ...sua, dangBat: e.target.checked })} /></td>
                <td className="hang-nut">
                  <button className="nut nut-nho" onClick={async () => {
                    if (await lam(() => services.baiXe.suaCamera(c.id, sua), 'Đã lưu camera.')) setSua(null);
                  }}>Lưu</button>
                  <button className="nut nut-phu nut-nho" onClick={() => setSua(null)}>Huỷ</button>
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td><strong>{c.ten}</strong></td>
                <td>{tenKhu(ch, c.khuId)}</td>
                <td>{TEN_VAI_TRO_CAMERA[c.vaiTro] ?? c.vaiTro}</td>
                <td className="mo">{c.nguonAnh}</td>
                <td>{c.dangBat ? <span className="nhan nhan-ok">Bật</span> : <span className="nhan nhan-cho">Tắt</span>}</td>
                <td className="hang-nut">
                  <button className="nut nut-phu nut-nho" onClick={() => setSua(c)}>Sửa</button>
                  <button className="nut nut-nguy nut-nho" onClick={() => confirm(`Xoá ${c.ten}?`) && lam(() => services.baiXe.xoaCamera(c.id), `Đã xoá ${c.ten}.`)}>Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ChonVaiTro({ value, onChange }: { value: VaiTroCamera; onChange: (v: VaiTroCamera) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as VaiTroCamera)} aria-label="Vai trò camera">
      {(Object.keys(TEN_VAI_TRO_CAMERA) as VaiTroCamera[]).map((v) => <option key={v} value={v}>{TEN_VAI_TRO_CAMERA[v]}</option>)}
    </select>
  );
}
