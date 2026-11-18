import { DangTai, ThongBao } from '@/shared/ui/ui';
import { useTaiDuLieu } from '@/shared/ui/useTaiDuLieu';
import { useApp } from '@/app/AppContext';
import anhSoDo from '@/assets/so-do-bai.png';
import { MucChoKhu } from '../components/MucChoKhu';
import type { KhuCho } from '../models';
import { TEN_MUC } from '../models';

/**
 * Vị trí chữ khu trên ảnh "Phương án bố trí bãi đỗ xe" (tỉ lệ % theo chiều rộng / cao ảnh).
 * Ảnh chỉ là sơ đồ ý tưởng để xem khu nào còn chỗ; số liệu lấy từ camera khu (hướng vào +1, hướng ra −1).
 */
const VI_TRI: Record<string, { x: number; y: number }> = {
  A: { x: 9.1, y: 24 }, B: { x: 16.1, y: 24 },
  C: { x: 10.2, y: 42.7 }, D: { x: 15.1, y: 42.7 }, E: { x: 18.3, y: 49.7 },
  F: { x: 30, y: 39.5 }, G: { x: 50.8, y: 39.5 }, H: { x: 66, y: 39.5 }, I: { x: 75.3, y: 40.9 },
  J: { x: 30.7, y: 49.1 }, K: { x: 46.3, y: 49.1 },
  L: { x: 26.1, y: 63.7 }, M: { x: 37.5, y: 63.7 }, N: { x: 46.9, y: 63.7 },
  O: { x: 72.3, y: 50.9 }, P: { x: 63.8, y: 73.1 }, Q: { x: 72.2, y: 73.1 },
  R: { x: 48.3, y: 26.9 }, S: { x: 82, y: 26.9 },
};

/** "Khu C" / "C" → "C". Khu đặt tên khác thì không có điểm trên ảnh (vẫn hiện trong danh sách bên dưới). */
const chuKhu = (ten: string) => /^(?:khu\s+)?([a-z])$/i.exec(ten.trim())?.[1].toUpperCase() ?? null;

/** Sơ đồ chỗ trống: Admin và người dùng cùng xem. Tự cập nhật mỗi 10 giây. */
export function SoDoChoTrongPage() {
  const { services } = useApp();
  const ds = useTaiDuLieu(() => services.timXe.laySoXeKhu(), [], 10_000);
  const theoChu = new Map<string, KhuCho>();
  ds.duLieu?.khu.forEach((k) => { const c = chuKhu(k.ten); if (c) theoChu.set(c, k); });

  return (
    <>
      <div className="tieu-de-trang">
        <h1>Sơ đồ chỗ trống</h1>
        <button className="nut nut-phu nut-nho" onClick={() => ds.taiLai()} disabled={ds.dangTai}>Tải lại</button>
      </div>
      <p className="mo">Số trên mỗi khu là số chỗ còn trống. Camera khu nhận diện xe đi vào / đi ra nên số liệu tự cập nhật.</p>
      <div className="chu-thich-so-do">
        <span><i className="cham muc-CON_NHIEU" /> {TEN_MUC.CON_NHIEU}</span>
        <span><i className="cham muc-SAP_DAY" /> {TEN_MUC.SAP_DAY}</span>
        <span><i className="cham muc-DAY" /> {TEN_MUC.DAY}</span>
        <span><i className="cham muc-CHUA" /> Chưa có số liệu</span>
      </div>
      {ds.loi && <ThongBao loai="loi">{ds.loi}</ThongBao>}
      <div className="so-do-anh">
        <img src={anhSoDo} alt="Sơ đồ bố trí bãi đỗ xe" />
        {Object.entries(VI_TRI).map(([chu, p]) => {
          const k = theoChu.get(chu);
          return (
            <div key={chu} className={`diem-khu muc-${k ? k.muc : 'CHUA'}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}
                 title={k ? `${k.ten}: ${k.soXe} xe đang đỗ, còn ${k.conLai}/${k.sucChua} chỗ (${TEN_MUC[k.muc]})` : `Khu ${chu}: chưa có số liệu`}>
              <b>{chu}</b>{k && <span>{k.conLai}</span>}
            </div>
          );
        })}
      </div>
      <h2>Chi tiết từng khu</h2>
      {ds.dangTai && !ds.duLieu && <DangTai />}
      {ds.duLieu && <MucChoKhu khu={ds.duLieu.khu} chiTiet />}
    </>
  );
}
