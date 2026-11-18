import type {
  BangGiaAdmin, ChinhSachHoan, DangKyCho, GoiAdmin, KetQuaHangLoat, SucChuaLoaiXe, XeChoDuyet, XemHuyGoi, XeQuanLy,
} from '../models';
import type { IHttpClient } from '@/shared/api/httpClient';

/** Các việc Admin làm trong module GoiCho: duyệt / gỡ xe, huỷ gói có lý do, đổi giá gói, đổi sức chứa. */
export interface IAdminGoiChoService {
  layXeChoDuyet(): Promise<XeChoDuyet[]>;
  duyetXe(xeId: number, dongY: boolean, lyDo?: string): Promise<void>;
  duyetHangLoat(xeIds: number[], dongY: boolean, lyDo?: string): Promise<KetQuaHangLoat>;
  layXeDaDuyet(): Promise<XeQuanLy[]>;
  goXe(xeId: number, lyDo: string): Promise<void>;
  // huỷ gói có lý do
  layLichSuGoi(xeId: number): Promise<DangKyCho[]>;
  layChinhSachHoan(): Promise<ChinhSachHoan[]>;
  xemHuyGoi(dangKyChoId: number, chinhSach: string): Promise<XemHuyGoi>;
  huyGoi(dangKyChoId: number, lyDo: string, chinhSach: string): Promise<XemHuyGoi>;
  // gói, giá, sức chứa
  layBangGia(): Promise<BangGiaAdmin>;
  doiGia(goiId: number, gia: number): Promise<GoiAdmin>;
  doiSucChua(loaiXeId: number, sucChua: number): Promise<SucChuaLoaiXe>;
}

export class ApiAdminGoiChoService implements IAdminGoiChoService {
  constructor(private readonly http: IHttpClient) {}
  layXeChoDuyet() { return this.http.get<XeChoDuyet[]>('/api/admin/xe/cho-duyet'); }
  duyetXe(xeId: number, dongY: boolean, lyDo?: string) { return this.http.put<void>(`/api/admin/xe/${xeId}/duyet`, { dongY, lyDo: lyDo ?? null }); }
  duyetHangLoat(xeIds: number[], dongY: boolean, lyDo?: string) {
    return this.http.post<KetQuaHangLoat>('/api/admin/xe/duyet-hang-loat', { xeIds, dongY, lyDo: lyDo ?? null });
  }
  layXeDaDuyet() { return this.http.get<XeQuanLy[]>('/api/admin/xe/da-duyet'); }
  goXe(xeId: number, lyDo: string) { return this.http.put<void>(`/api/admin/xe/${xeId}/go`, { lyDo }); }

  layLichSuGoi(xeId: number) { return this.http.get<DangKyCho[]>(`/api/admin/xe/${xeId}/dang-ky`); }
  layChinhSachHoan() { return this.http.get<ChinhSachHoan[]>('/api/admin/chinh-sach-hoan'); }
  xemHuyGoi(id: number, chinhSach: string) {
    return this.http.get<XemHuyGoi>(`/api/admin/dang-ky-cho/${id}/huy?chinhSach=${encodeURIComponent(chinhSach)}`);
  }
  huyGoi(id: number, lyDo: string, chinhSach: string) {
    return this.http.post<XemHuyGoi>(`/api/admin/dang-ky-cho/${id}/huy`, { lyDo, chinhSach });
  }

  layBangGia() { return this.http.get<BangGiaAdmin>('/api/admin/goi-cho'); }
  doiGia(goiId: number, gia: number) { return this.http.put<GoiAdmin>(`/api/admin/goi-cho/${goiId}/gia`, { gia }); }
  doiSucChua(loaiXeId: number, sucChua: number) { return this.http.put<SucChuaLoaiXe>(`/api/admin/loai-xe/${loaiXeId}/suc-chua`, { sucChua }); }
}
