import { useState } from 'react';
import { DangTai, ThongBao } from '@/shared/ui/ui';
import { useTaiDuLieu } from '@/shared/ui/useTaiDuLieu';
import { useApp } from '@/app/AppContext';
import type { ThongBaoApp } from '../models';
import { DanhSachThongBao } from '../components/DanhSachThongBao';

/** Hộp thư Admin: khách huỷ gói (lý do, góp ý), nghi mất xe, cổng ra không mở vì hết giờ. Dữ liệu từ GET /api/admin/thong-bao. */
export function AdminThongBaoPage() {
  const { services } = useApp();
  const hop = useTaiDuLieu(() => services.thongBao.layHopThuAdmin(), [], 15_000);
  const [loi, setLoi] = useState<string | null>(null);

  async function daDoc(t: ThongBaoApp) {
    if (t.daDoc) return;
    setLoi(null);
    try { await services.thongBao.danhDauDaDoc(t.id); await hop.taiLai(); }
    catch (e) { setLoi((e as Error).message); }
  }

  return (
    <>
      <div className="tieu-de-trang">
        <h1>Thông báo</h1>
        <button className="nut nut-phu nut-nho" onClick={() => hop.taiLai()} disabled={hop.dangTai}>Tải lại</button>
      </div>
      <p className="mo">Khách tự huỷ gói (kèm lý do, góp ý), người dùng xe báo "Không phải tôi" ở cổng ra, xe chờ quá 60 giây không ai xác nhận. Bấm vào thông báo để đánh dấu đã đọc.</p>
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
