import { useState } from 'react';
import { AnhGiayDangKy } from '../components/AnhGiayDangKy';
import { GoiCuaXePanel } from '../components/GoiCuaXePanel';
import { ChoConBanThe } from '../components/GoiChoUi';
import { DangTai, ThongBao } from '@/shared/ui/ui';
import { useTaiDuLieu } from '@/shared/ui/useTaiDuLieu';
import { useApp } from '@/app/AppContext';
import type { XeQuanLy } from '../models';
import { timChoCon } from '../utils/choCon';
import { dinhDangNgay, hienThiBienSo, tenLoaiXe } from '@/shared/utils/format';

type Tab = 'cho-duyet' | 'da-duyet';

/** Trang Admin: chỉ điều phối 2 tab, mỗi tab là một component riêng (SRP). */
export function AdminDuyetXePage() {
  const [tab, setTab] = useState<Tab>('cho-duyet');
  return (
    <>
      <h1>Quản lý xe</h1>
      <div className="tab" role="tablist">
        <button className={tab === 'cho-duyet' ? 'chon' : ''} onClick={() => setTab('cho-duyet')}>Chờ duyệt</button>
        <button className={tab === 'da-duyet' ? 'chon' : ''} onClick={() => setTab('da-duyet')}>Xe đã duyệt</button>
      </div>
      {tab === 'cho-duyet' ? <BangChoDuyet /> : <BangXeDaDuyet />}
    </>
  );
}

function ONhanCho({ c }: { c?: { soChoConBan: number; sucChua: number } }) {
  if (!c) return <span className="mo">…</span>;
  return c.soChoConBan <= 0
    ? <span className="nhan nhan-loi">Hết chỗ (0 / {c.sucChua})</span>
    : <span className="nhan nhan-ok">Còn {c.soChoConBan} / {c.sucChua}</span>;
}

/**
 * Hàng chờ duyệt. Giúp Admin duyệt nhanh:
 * - server đã sắp: loại xe còn chỗ lên trước, rồi xe gửi lâu nhất;
 * - bấm "Xem" để mở ảnh giấy đăng ký cạnh biển số khách nhập, duyệt xong tự chuyển sang xe kế tiếp;
 * - chọn nhiều xe rồi duyệt / từ chối một lần (từ chối dùng chung một lý do).
 */
function BangChoDuyet() {
  const { services } = useApp();
  const ds = useTaiDuLieu(() => services.adminGoiCho.layXeChoDuyet());
  const bangGia = useTaiDuLieu(() => services.goiCho.layBangGia());
  const choCon = bangGia.duLieu?.choConBan;
  const coXeHetCho = ds.duLieu?.some((x) => x.loaiXeHetCho) ?? false;
  const [chon, setChon] = useState<Set<number>>(new Set());
  const [xemId, setXemId] = useState<number | null>(null);
  const [tuChoi, setTuChoi] = useState<number[] | null>(null);
  const [lyDo, setLyDo] = useState('');
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi' | 'canh-bao'; noiDung: string } | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  const dsXe = ds.duLieu ?? [];
  const bien = (id: number) => hienThiBienSo(dsXe.find((x) => x.xeId === id)?.bienSo ?? String(id));
  const xeDangXem = dsXe.find((x) => x.xeId === xemId) ?? null;

  function batTat(id: number) {
    setChon((c) => { const m = new Set(c); if (m.has(id)) m.delete(id); else m.add(id); return m; });
  }
  const chonHet = dsXe.length > 0 && dsXe.every((x) => chon.has(x.xeId));

  async function xuLy(ids: number[], dongY: boolean, lyDoTuChoi?: string) {
    setDangXuLy(true); setThongBao(null);
    try {
      const kq = await services.adminGoiCho.duyetHangLoat(ids, dongY, lyDoTuChoi);
      const viec = dongY ? 'duyệt' : 'từ chối';
      const hetChoDuyet = dongY ? kq.thanhCong.filter((id) => dsXe.find((x) => x.xeId === id)?.loaiXeHetCho).length : 0;
      let noiDung = kq.thanhCong.length ? `Đã ${viec} ${kq.thanhCong.length} xe: ${kq.thanhCong.map(bien).join(', ')}.` : `Không ${viec} được xe nào.`;
      if (hetChoDuyet) noiDung += ` ${hetChoDuyet} xe thuộc loại đang hết chỗ nên khách chưa mua gói được.`;
      if (kq.loi.length) noiDung += ' Bỏ qua: ' + kq.loi.map((l) => `${bien(l.xeId)} (${l.thongDiep})`).join('; ');
      setThongBao({ loai: kq.loi.length ? (kq.thanhCong.length ? 'canh-bao' : 'loi') : 'ok', noiDung });
      // xem ảnh từng xe: xử lý xong tự mở xe kế tiếp trong hàng chờ
      if (xemId !== null && kq.thanhCong.includes(xemId)) {
        const i = dsXe.findIndex((x) => x.xeId === xemId);
        const keTiep = dsXe.slice(i + 1).find((x) => !kq.thanhCong.includes(x.xeId));
        setXemId(keTiep?.xeId ?? null);
      }
      setChon(new Set()); setTuChoi(null); setLyDo('');
      await ds.taiLai();
    } catch (e) { setThongBao({ loai: 'loi', noiDung: (e as Error).message }); }
    finally { setDangXuLy(false); }
  }

  return (
    <>
      {choCon && <section className="luoi-cho">{choCon.map((c) => <ChoConBanThe key={c.loaiXeId} c={c} />)}</section>}
      {coXeHetCho && (
        <ThongBao loai="canh-bao">
          Có xe chờ duyệt thuộc loại đang hết chỗ (xếp cuối danh sách). Duyệt xe chỉ xác minh xe, không giữ chỗ: duyệt xong, khách chưa mua gói được cho tới khi có chỗ trống.
        </ThongBao>
      )}
      {thongBao && <ThongBao loai={thongBao.loai}>{thongBao.noiDung}</ThongBao>}
      {ds.loi && <ThongBao loai="loi">{ds.loi}</ThongBao>}
      {ds.dangTai && !ds.duLieu && <DangTai />}
      {ds.duLieu && dsXe.length === 0 && <ThongBao loai="tin">Không có xe nào chờ duyệt.</ThongBao>}

      {xeDangXem && (
        <section className="the xem-gdk">
          <div className="xem-gdk-anh"><AnhGiayDangKy xeId={xeDangXem.xeId} /></div>
          <div className="xem-gdk-tt">
            <div className="mo">Biển số khách nhập</div>
            <div className="bien-so">{hienThiBienSo(xeDangXem.bienSo)}</div>
            <dl className="xe-tt">
              <div><dt>Loại</dt><dd>{tenLoaiXe(xeDangXem.loaiXeId)}</dd></div>
              <div><dt>Chủ xe</dt><dd>{xeDangXem.tenChuXe}</dd></div>
              <div><dt>Gửi lúc</dt><dd>{dinhDangNgay(xeDangXem.taoLuc)}</dd></div>
            </dl>
            <p className="mo">Đối chiếu biển số, loại xe và tên chủ xe trên giấy đăng ký.</p>
            <div className="hang-nut">
              <button className="nut" disabled={dangXuLy || !xeDangXem.coAnh} onClick={() => xuLy([xeDangXem.xeId], true)}>Khớp, duyệt</button>
              <button className="nut nut-phu" disabled={dangXuLy} onClick={() => setTuChoi([xeDangXem.xeId])}>Không khớp, từ chối</button>
              <button className="nut nut-phu" onClick={() => setXemId(null)}>Đóng</button>
            </div>
          </div>
        </section>
      )}

      {tuChoi && (
        <section className="the form">
          <h3>Từ chối {tuChoi.length} xe: {tuChoi.map(bien).join(', ')}</h3>
          <label>Lý do (chủ xe sẽ thấy, ít nhất 5 ký tự)
            <input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Ảnh mờ, không đọc được biển số" autoFocus />
          </label>
          <div className="hang-nut">
            {['Ảnh mờ, không đọc được', 'Biển số không khớp giấy đăng ký', 'Tên chủ xe không khớp tài khoản'].map((g) => (
              <button key={g} type="button" className="nut nut-phu nut-nho" onClick={() => setLyDo(g)}>{g}</button>
            ))}
          </div>
          <div className="hang-nut">
            <button className="nut nut-nguy" disabled={dangXuLy || lyDo.trim().length < 5} onClick={() => xuLy(tuChoi, false, lyDo)}>Xác nhận từ chối</button>
            <button className="nut nut-phu" onClick={() => { setTuChoi(null); setLyDo(''); }}>Huỷ</button>
          </div>
        </section>
      )}

      {dsXe.length > 0 && (
        <>
          <div className="thanh-chon">
            <span>Đã chọn <strong>{chon.size}</strong> / {dsXe.length} xe</span>
            <button className="nut nut-nho" disabled={dangXuLy || chon.size === 0} onClick={() => xuLy([...chon], true)}>Duyệt các xe đã chọn</button>
            <button className="nut nut-phu nut-nho" disabled={dangXuLy || chon.size === 0} onClick={() => setTuChoi([...chon])}>Từ chối các xe đã chọn</button>
          </div>
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr>
                <th><input type="checkbox" aria-label="Chọn tất cả" checked={chonHet} onChange={() => setChon(chonHet ? new Set() : new Set(dsXe.map((x) => x.xeId)))} /></th>
                <th>Biển số</th><th>Loại</th><th>Chỗ còn</th><th>Chủ xe</th><th>Gửi lúc</th><th>Giấy đăng ký</th><th></th>
              </tr></thead>
              <tbody>
                {dsXe.map((x) => (
                  <tr key={x.xeId} className={x.xeId === xemId ? 'dong-chon' : ''}>
                    <td><input type="checkbox" aria-label={`Chọn ${x.bienSo}`} checked={chon.has(x.xeId)} onChange={() => batTat(x.xeId)} /></td>
                    <td className="bien-so nho">{hienThiBienSo(x.bienSo)}</td>
                    <td>{tenLoaiXe(x.loaiXeId)}</td>
                    <td><ONhanCho c={timChoCon(choCon, x.loaiXeId)} /></td>
                    <td>{x.tenChuXe}</td>
                    <td>{dinhDangNgay(x.taoLuc)}</td>
                    <td>{x.coAnh
                      ? <button className="nut nut-phu nut-nho" onClick={() => setXemId(x.xeId)}>Xem ảnh</button>
                      : <span className="nhan nhan-loi">Chưa có ảnh</span>}</td>
                    <td className="hang-nut">
                      <button className="nut nut-nho" disabled={dangXuLy || !x.coAnh} title={x.coAnh ? '' : 'Chưa có ảnh giấy đăng ký'} onClick={() => xuLy([x.xeId], true)}>Duyệt</button>
                      <button className="nut nut-phu nut-nho" disabled={dangXuLy} onClick={() => setTuChoi([x.xeId])}>Từ chối</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function BangXeDaDuyet() {
  const { services } = useApp();
  const ds = useTaiDuLieu(() => services.adminGoiCho.layXeDaDuyet());
  const [dangGo, setDangGo] = useState<XeQuanLy | null>(null);
  const [xemGoi, setXemGoi] = useState<XeQuanLy | null>(null);
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: 'ok' | 'loi'; noiDung: string } | null>(null);

  async function go() {
    if (!dangGo) return;
    if (lyDo.trim().length < 5) { setThongBao({ loai: 'loi', noiDung: 'Nhập lý do gỡ xe (ít nhất 5 ký tự).' }); return; }
    setDangGui(true); setThongBao(null);
    try {
      await services.adminGoiCho.goXe(dangGo.xeId, lyDo.trim());
      setThongBao({ loai: 'ok', noiDung: `Đã gỡ xe ${hienThiBienSo(dangGo.bienSo)}. Gói còn hạn (nếu có) đã bị huỷ, không hoàn tiền.` });
      setDangGo(null); setLyDo('');
      await ds.taiLai();
    } catch (e) { setThongBao({ loai: 'loi', noiDung: (e as Error).message }); }
    finally { setDangGui(false); }
  }

  return (
    <>
      {thongBao && <ThongBao loai={thongBao.loai}>{thongBao.noiDung}</ThongBao>}
      {ds.loi && <ThongBao loai="loi">{ds.loi}</ThongBao>}
      {ds.dangTai && !ds.duLieu && <DangTai />}

      {dangGo && (
        <div className="the xac-nhan xac-nhan-nguy">
          <h3>Gỡ xe {hienThiBienSo(dangGo.bienSo)} của {dangGo.tenChuXe}?</h3>
          <p>Xe sẽ không vào bãi được nữa. Gói còn hạn bị huỷ và không hoàn tiền. Chủ xe nhận được thông báo kèm lý do.</p>
          {dangGo.dangTrongBai && <ThongBao loai="canh-bao">Xe đang trong bãi: phải cho xe ra trước mới gỡ được.</ThongBao>}
          <div className="o-ly-do">
            <input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do, VD: dùng biển số giả" autoFocus />
            <button className="nut nut-nguy" onClick={go} disabled={dangGui}>{dangGui ? 'Đang gỡ…' : 'Gỡ xe'}</button>
            <button className="nut nut-phu" onClick={() => { setDangGo(null); setLyDo(''); }}>Huỷ</button>
          </div>
        </div>
      )}

      {xemGoi && <GoiCuaXePanel xe={xemGoi} khiDong={() => setXemGoi(null)} khiDaHuy={() => ds.taiLai()} />}

      {ds.duLieu && ds.duLieu.length === 0 && <ThongBao loai="tin">Chưa có xe nào đã duyệt.</ThongBao>}
      {ds.duLieu && ds.duLieu.length > 0 && (
        <div className="bang-cuon">
          <table className="bang">
            <thead><tr><th>Biển số</th><th>Loại</th><th>Chủ xe</th><th>Gói hết hạn</th><th>Trong bãi</th><th></th></tr></thead>
            <tbody>
              {ds.duLieu.map((x) => (
                <tr key={x.xeId}>
                  <td className="bien-so nho">{hienThiBienSo(x.bienSo)}</td>
                  <td>{tenLoaiXe(x.loaiXeId)}</td>
                  <td>{x.tenChuXe}</td>
                  <td>{dinhDangNgay(x.hetHanLuc)}</td>
                  <td>{x.dangTrongBai ? 'Đang gửi' : 'Không'}</td>
                  <td className="hang-nut">
                    <button className="nut nut-phu nut-nho" onClick={() => { setXemGoi(x); setDangGo(null); setThongBao(null); }}>Gói / Huỷ gói</button>
                    <button className="nut nut-nguy nut-nho" onClick={() => { setDangGo(x); setXemGoi(null); setLyDo(''); setThongBao(null); }}>Gỡ xe</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
