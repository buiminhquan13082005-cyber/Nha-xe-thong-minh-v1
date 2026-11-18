// Module TimXe (xe máy, định vị mức khu): khớp DTO của NhaXe.Modules.TimXe.Application.

export type MucCho = 'CON_NHIEU' | 'SAP_DAY' | 'DAY';
export type TrangThaiGiu = 'DANG_GIU' | 'DA_VAO' | 'HET_HAN' | 'HUY';

/** Suất được giữ trong khu sau khi qua cổng vào (mặc định 5 phút). */
export interface ChiDan { luotGuiId: number; khuId: number; khu: string; hetHanLuc: string; trangThai: TrangThaiGiu }

export interface KhuCho {
  id: number; ten: string; loaiXeId: number; sucChua: number;
  soXe: number; soGiu: number; conLai: number; muc: MucCho; khoangCachTuCong: number | null;
}

export interface DiemDuong { nutId: number; ten: string; x: number; y: number }
/** Đường ngắn nhất từ cổng tới khu (Dijkstra trên đồ thị nút / cạnh của bãi). */
export interface DuongDi { khuId: number; tongMet: number; diem: DiemDuong[] }

/** QUET: nguồn camera của dữ liệu mẫu cũ (trước V004), hiển thị như camera. */
export type NguonKhu = 'CAMERA_KHU' | 'QUET' | 'NGUOI_DUNG' | 'ADMIN';

export interface XeTimXe {
  xeId: number; bienSo: string; loaiXe: string; trongBai: boolean; thoiGianVao: string | null;
  khuId: number | null; khu: string | null; vaoKhuLuc: string | null; nguonKhu: NguonKhu | null;
  moiVao: ChiDan | null; duong: DuongDi | null;
  /** false: ô tô, định vị trong khu chưa làm. */
  hoTroDinhVi: boolean;
}

export interface TimXeCuaToi { bayGio: string; xe: XeTimXe[]; khuXeMay: KhuCho[] }

/** Số xe từng khu (mọi loại xe): camera hướng vào +1, camera hướng ra −1. Admin và người dùng cùng xem. */
export interface SoXeKhu { bayGio: string; khu: KhuCho[] }

/** DA_GHI: đã ghi vào / ra khu · BO_QUA: đọc lặp hoặc không cần ghi · KHONG_KHOP: biển không thuộc xe nào trong bãi · KHONG_THAY_BIEN: khung không có biển. */
export type KetQuaCamera = 'DA_GHI' | 'BO_QUA' | 'KHONG_KHOP' | 'KHONG_THAY_BIEN';
export interface KetQuaCameraKhu {
  ketQua: KetQuaCamera; bienSo: string | null; khuId: number; huong: 'VAO' | 'RA' | null; thongDiep: string; ungVien: string[] | null;
  doTinCay: number | null; khungBien: { x: number; y: number; rong: number; cao: number } | null;
  khu: string | null; soXeTrongKhu: number | null; sucChua: number | null;
}

export const TEN_MUC: Record<MucCho, string> = { CON_NHIEU: 'Còn nhiều', SAP_DAY: 'Sắp đầy', DAY: 'Đầy' };
export const TEN_NGUON: Record<NguonKhu, string> = { CAMERA_KHU: 'camera lối vào khu', QUET: 'camera', NGUOI_DUNG: 'bạn bấm "Đã đỗ xe"', ADMIN: 'quản lý bãi' };
