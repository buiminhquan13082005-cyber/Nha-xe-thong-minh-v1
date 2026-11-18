import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DangTai, ThongBao } from '@/shared/ui/ui';
import { useTaiDuLieu } from '@/shared/ui/useTaiDuLieu';
import { useApp } from '@/app/AppContext';
import type { ThongBaoApp } from '../models';
import { DanhSachThongBao } from '../components/DanhSachThongBao';

/** Hộp thư của khách: xe vào / ra, chờ xác nhận ra, sắp hết hạn gói, nợ quá hạn, nghi mất xe. Tự tải lại mỗi 15 giây. */
export function ThongBaoPage() {
  const { services } = useApp();
  const hop = useTaiDuLieu(() => services.thongBao.layHopThu(), [], 15_000);
  const [loi, setLoi] = useState<string | null>(null);

  async function lam(viec: () => Promise<unknown>) {
    setLoi(null);
    try { await viec(); await hop.taiLai(); } catch (e) { setLoi((e as Error).message); }
  }
  const daDoc = (t: ThongBaoApp) => !t.daDoc && lam(() => services.thongBao.danhDauDaDoc(t.id));
  const coYeuCauRa = hop.duLieu?.thongBao.some((t) => t.loai === 'RA' && !t.daDoc && t.noiDung.includes('đang ở cổng ra'));

  return (
    <>
      <div className="tieu-de-trang">
        <h1>Thông báo</h1>
        <div className="hang-nut" style={{ marginTop: 0 }}>
          <button className="nut nut-phu nut-nho" onClick={() => lam(() => services.thongBao.docHet())}
                  disabled={!hop.duLieu || hop.duLieu.soChuaDoc === 0}>Đánh dấu đã đọc hết</button>
          <button className="nut nut-phu nut-nho" onClick={() => hop.taiLai()} disabled={hop.dangTai}>Tải lại</button>
        </div>
      </div>
      {coYeuCauRa && <ThongBao loai="canh-bao">Có xe đang chờ bạn xác nhận ở cổng ra. <Link to="/ra-vao">Mở trang Ra vào</Link></ThongBao>}
      {loi && <ThongBao loai="loi">{loi}</ThongBao>}
      {hop.loi && <ThongBao loai="loi">{hop.loi}</ThongBao>}
      {hop.dangTai && !hop.duLieu && <DangTai />}
      {hop.duLieu && hop.duLieu.thongBao.length === 0 && <ThongBao loai="tin">Chưa có thông báo nào.</ThongBao>}
      {hop.duLieu && hop.duLieu.thongBao.length > 0 && (
        <>
          <p><strong>{hop.duLieu.soChuaDoc}</strong> thông báo chưa đọc</p>
          <DanhSachThongBao ds={hop.duLieu.thongBao} khiBam={daDoc} />
        </>
      )}
    </>
  );
}
