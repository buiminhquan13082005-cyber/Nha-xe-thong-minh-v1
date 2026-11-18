import type { ThongBaoApp } from '../models';
import { NHAN_LOAI } from '../models';
import { dinhDangNgay } from '@/shared/utils/format';

/** Danh sách thông báo (component trình bày thuần, dùng chung cho hộp thư khách và hộp thư Admin). Bấm = đánh dấu đã đọc. */
export function DanhSachThongBao({ ds, khiBam }: { ds: ThongBaoApp[]; khiBam: (t: ThongBaoApp) => void }) {
  return (
    <ul className="ds-thong-bao">
      {ds.map((t) => {
        const nhan = NHAN_LOAI[t.loai] ?? { ten: t.loai, mau: 'tin' as const };
        return (
          <li key={t.id}>
            <button className={`the tb ${t.daDoc ? 'tb-da-doc' : ''}`} onClick={() => khiBam(t)}>
              <div className="xe-dau">
                <span>
                  <span className={`nhan nhan-${nhan.mau}`}>{nhan.ten}</span>{' '}
                  {!t.daDoc && <span className="nhan nhan-loi">Mới</span>}
                </span>
                <span className="mo">{dinhDangNgay(t.guiLuc)}</span>
              </div>
              <p>{t.noiDung}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
