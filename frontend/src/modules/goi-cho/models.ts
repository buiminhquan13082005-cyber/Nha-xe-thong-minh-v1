// Module GoiCho (Đăng ký xe và mua gói): khớp DTO của NhaXe.Modules.GoiCho.
import type { LoaiXeMa } from '@/shared/models';

export type TrangThaiDuyet = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'BI_GO';

export interface XeDuocDung {
  xeId: number;
  bienSo: string;
  loaiXeId: number;
  loaiXe: LoaiXeMa;
  trangThaiDuyet: TrangThaiDuyet;
  lyDoGo: string | null;
  /** Admin từ chối duyệt: lý do để chủ xe sửa và gửi lại ảnh. */
  lyDoTuChoi: string | null;
  coAnhGiayDangKy: boolean;
  chiaSeNhom: boolean;
  laChuXe: boolean;
  chuXeId: number;
  tenChuXe: string | null;
  goiHienTai: string | null;
  hetHanLuc: string | null;
  conHan: boolean;
  dangTrongBai: boolean;
  soNgayNo: number;
  soTienNo: number;
  /** Gói gần nhất bị Admin huỷ (sau đó chưa mua gói mới): app hiện hộp đỏ có lý do. */
  goiBiHuyTen: string | null;
  goiBiHuyLyDo: string | null;
  goiBiHuyLuc: string | null;
}

export interface ChoConBan {
  loaiXeId: number;
  loaiXe: LoaiXeMa;
  sucChua: number;
  soChoConBan: number;
}

export interface GoiCho {
  id: number;
  loaiXeId: number;
  ten: string;
  soNgay: number;
  gia: number;
}

export interface BangGia {
  choConBan: ChoConBan[];
  goi: GoiCho[];
}

export interface DangKyCho {
  id: number;
  tenGoi: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soTien: number;
  trangThai: string;
  muaLuc: string;
  lyDoHuy: string | null;
  gopY: string | null;
  huyLuc: string | null;
  huyBoiAdmin: boolean;
}

export interface KetQuaMuaGoi {
  dangKyChoId: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  soTien: number;
  laGiaHan: boolean;
}

export interface PhiQuaHan {
  luotGuiId: number;
  hetHanLuc: string;
  soNgayConNo: number;
  soTienConNo: number;
}

export interface XeChoDuyet {
  xeId: number;
  bienSo: string;
  loaiXeId: number;
  chuXeId: number;
  tenChuXe: string;
  coAnh: boolean;
  taoLuc: string;
  /** Loại xe đang hết chỗ: duyệt xong khách chưa mua gói được (server xếp các xe này xuống cuối). */
  loaiXeHetCho: boolean;
}

export interface KetQuaHangLoat {
  thanhCong: number[];
  loi: { xeId: number; ma: string; thongDiep: string }[];
}

export interface XemHuyGoi {
  dangKyChoId: number;
  tenGoi: string;
  chuaBatDau: boolean;
  soNgayConLai: number;
  soTienHoan: number;
}

export interface XeQuanLy {
  xeId: number;
  bienSo: string;
  loaiXeId: number;
  chuXeId: number;
  tenChuXe: string;
  hetHanLuc: string | null;
  dangTrongBai: boolean;
}

export interface ChinhSachHoan {
  ma: string;
  ten: string;
}

// ---------- Sơ đồ bãi (Admin) ----------

// ---------- Admin: gói, giá, sức chứa ----------

/** Một gói nhìn từ phía Admin (cả gói đã ngừng bán). */
export interface GoiAdmin {
  id: number;
  loaiXeId: number;
  ten: string;
  soNgay: number;
  gia: number;
  dangBan: boolean;
}

/** Sức chứa theo loại xe (cùng nguồn v_cho_con_ban với lúc chặn bán). */
export interface SucChuaLoaiXe {
  loaiXeId: number;
  loaiXe: LoaiXeMa;
  sucChua: number;
  soXeGiuSuat: number;
  soXeQuaHanTrongBai: number;
  soChoConBan: number;
  dangChiem: number;
  hetCho: boolean;
}

export interface BangGiaAdmin {
  sucChua: SucChuaLoaiXe[];
  goi: GoiAdmin[];
}
