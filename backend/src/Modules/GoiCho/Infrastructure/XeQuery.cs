using Microsoft.EntityFrameworkCore;
using NhaXe.Modules.GoiCho.Application;

namespace NhaXe.Modules.GoiCho.Infrastructure;

/// <summary>
/// Phía ĐỌC của GoiCho. Chỉ đọc bảng của module mình (xe, loai_xe, goi_cho, dang_ky_cho) và view v_cho_con_ban.
/// Không JOIN sang luot_gui (CongRaVao) hay thanh_vien_nhom (NhomGiaDinh): phần đó use case hỏi qua Contracts.
/// Câu SQL dùng tham số nên không bị SQL injection.
/// </summary>
public class XeQuery : IXeQuery
{
    private readonly GoiChoDbContext _db;
    public XeQuery(GoiChoDbContext db) => _db = db;

    public async Task<IReadOnlyList<XeDuocDungDto>> LayXeDuocDungAsync(int taiKhoanId, IReadOnlyCollection<int> nguoiCungNhom,
                                                                    CancellationToken ct)
    {
        var nhom = string.Join(',', nguoiCungNhom); // chỉ gồm số nguyên; truyền như tham số rồi tách bằng STRING_SPLIT
        var ds = await _db.Database.SqlQuery<XeDuocDungDto>($"""
            SELECT x.id AS XeId, x.bien_so AS BienSo, x.loai_xe_id AS LoaiXeId, lx.ten AS LoaiXe,
                   x.trang_thai_duyet AS TrangThaiDuyet, x.ly_do_go AS LyDoGo, x.ly_do_tu_choi AS LyDoTuChoi,
                   CAST(CASE WHEN x.anh_giay_dang_ky IS NULL THEN 0 ELSE 1 END AS BIT) AS CoAnhGiayDangKy, x.chia_se_nhom AS ChiaSeNhom,
                   CAST(CASE WHEN x.tai_khoan_id = {taiKhoanId} THEN 1 ELSE 0 END AS BIT) AS LaChuXe,
                   x.tai_khoan_id AS ChuXeId, CAST(NULL AS NVARCHAR(100)) AS TenChuXe,
                   (SELECT TOP 1 g.ten FROM dbo.dang_ky_cho d JOIN dbo.goi_cho g ON g.id = d.goi_cho_id
                     WHERE d.xe_id = x.id AND d.trang_thai = 'CON_HAN'
                       AND d.ngay_bat_dau <= SYSDATETIME() AND d.ngay_ket_thuc > SYSDATETIME()) AS GoiHienTai,
                   hh.het_han AS HetHanLuc,
                   CAST(CASE WHEN hh.het_han > SYSDATETIME() THEN 1 ELSE 0 END AS BIT) AS ConHan,
                   CAST(0 AS BIT) AS DangTrongBai, 0 AS SoNgayNo, CAST(0 AS DECIMAL(12,0)) AS SoTienNo,
                   bh.ten AS GoiBiHuyTen, bh.ly_do_huy AS GoiBiHuyLyDo, bh.huy_luc AS GoiBiHuyLuc
            FROM dbo.xe x
            JOIN dbo.loai_xe lx  ON lx.id = x.loai_xe_id
            OUTER APPLY (SELECT MAX(d.ngay_ket_thuc) AS het_han FROM dbo.dang_ky_cho d
                         WHERE d.xe_id = x.id AND d.trang_thai <> 'HUY') hh
            -- gói gần nhất do người KHÁC chủ xe huỷ (tức Admin), và sau lúc huỷ chưa mua gói mới
            OUTER APPLY (SELECT TOP 1 g.ten, d.ly_do_huy, d.huy_luc
                         FROM dbo.dang_ky_cho d JOIN dbo.goi_cho g ON g.id = d.goi_cho_id
                         WHERE d.xe_id = x.id AND d.trang_thai = 'HUY' AND d.huy_boi_id <> x.tai_khoan_id
                           AND NOT EXISTS (SELECT 1 FROM dbo.dang_ky_cho m
                                           WHERE m.xe_id = x.id AND m.trang_thai <> 'HUY' AND m.mua_luc > d.huy_luc)
                         ORDER BY d.huy_luc DESC) bh
            -- xe của mình + xe bật chia sẻ của người cùng nhóm (quy tắc như Xe.DuocDungBoi)
            WHERE x.tai_khoan_id = {taiKhoanId}
               OR (x.chia_se_nhom = 1 AND x.tai_khoan_id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT({nhom}, ',')))
            """).ToListAsync(ct);
        return ds.OrderByDescending(x => x.LaChuXe).ThenBy(x => x.XeId).ToList();
    }

    public async Task<IReadOnlyList<DangKyChoDto>> LayLichSuGoiAsync(int xeId, CancellationToken ct)
    {
        var ds = await _db.Database.SqlQuery<DangKyChoDto>($"""
            SELECT d.id AS Id, g.ten AS TenGoi, d.ngay_bat_dau AS NgayBatDau, d.ngay_ket_thuc AS NgayKetThuc,
                   d.so_tien AS SoTien, d.trang_thai AS TrangThai, d.mua_luc AS MuaLuc,
                   d.ly_do_huy AS LyDoHuy, d.gop_y AS GopY, d.huy_luc AS HuyLuc,
                   CAST(CASE WHEN d.huy_boi_id IS NOT NULL AND d.huy_boi_id <> x.tai_khoan_id THEN 1 ELSE 0 END AS BIT) AS HuyBoiAdmin
            FROM dbo.dang_ky_cho d JOIN dbo.goi_cho g ON g.id = d.goi_cho_id JOIN dbo.xe x ON x.id = d.xe_id
            WHERE d.xe_id = {xeId}
            """).ToListAsync(ct);
        return ds.OrderByDescending(x => x.NgayBatDau).ToList();
    }

    public async Task<IReadOnlyList<XeQuanLyDto>> LayXeDaDuyetAsync(CancellationToken ct)
    {
        var ds = await _db.Database.SqlQuery<XeQuanLyDto>($"""
            SELECT x.id AS XeId, x.bien_so AS BienSo, x.loai_xe_id AS LoaiXeId, x.tai_khoan_id AS ChuXeId,
                   CAST(N'' AS NVARCHAR(100)) AS TenChuXe,
                   (SELECT MAX(d.ngay_ket_thuc) FROM dbo.dang_ky_cho d WHERE d.xe_id = x.id AND d.trang_thai <> 'HUY') AS HetHanLuc,
                   CAST(0 AS BIT) AS DangTrongBai
            FROM dbo.xe x
            WHERE x.trang_thai_duyet = 'DA_DUYET'
            """).ToListAsync(ct);
        return ds.OrderBy(x => x.XeId).ToList();
    }

    /// <summary>Cho module khác (qua IGoiChoModule): biển số, loại xe, chủ, hạn gói. Nợ quá hạn ghép ở GoiChoModule.</summary>
    public async Task<IReadOnlyList<TinhTrangXeRow>> LayTinhTrangXeAsync(IReadOnlyCollection<int> xeIds, CancellationToken ct)
    {
        var ds = string.Join(',', xeIds); // chỉ gồm số nguyên; truyền như tham số rồi tách bằng STRING_SPLIT
        return await _db.Database.SqlQuery<TinhTrangXeRow>($"""
            SELECT x.id AS XeId, x.bien_so AS BienSo, x.loai_xe_id AS LoaiXeId, lx.ten AS LoaiXe, x.tai_khoan_id AS ChuXeId,
                   (SELECT MAX(d.ngay_ket_thuc) FROM dbo.dang_ky_cho d WHERE d.xe_id = x.id AND d.trang_thai <> 'HUY') AS HetHanLuc
            FROM dbo.xe x
            JOIN dbo.loai_xe lx ON lx.id = x.loai_xe_id
            JOIN STRING_SPLIT({ds}, ',') s ON CAST(s.value AS INT) = x.id
            """).ToListAsync(ct);
    }

    public async Task<XeTaiCongRow?> TimXeTaiCongAsync(string bienSoChuan, CancellationToken ct) =>
        (await _db.Database.SqlQuery<XeTaiCongRow>($"""
            SELECT x.id AS XeId, x.bien_so AS BienSo, lx.ten AS LoaiXe, x.tai_khoan_id AS ChuXeId,
                   x.trang_thai_duyet AS TrangThaiDuyet,
                   CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.dang_ky_cho d
                                          WHERE d.xe_id = x.id AND d.trang_thai = 'CON_HAN'
                                            AND d.ngay_bat_dau <= SYSDATETIME() AND d.ngay_ket_thuc > SYSDATETIME())
                             THEN 1 ELSE 0 END AS BIT) AS CoGoiHieuLuc,
                   (SELECT MAX(d.ngay_ket_thuc) FROM dbo.dang_ky_cho d WHERE d.xe_id = x.id AND d.trang_thai <> 'HUY') AS HetHanLuc
            FROM dbo.xe x
            JOIN dbo.loai_xe lx ON lx.id = x.loai_xe_id
            WHERE x.bien_so = {bienSoChuan}
            """).ToListAsync(ct)).FirstOrDefault();

    public async Task<IReadOnlyList<ChoConBanDto>> LayChoConBanAsync(CancellationToken ct) =>
        await _db.Database.SqlQuery<ChoConBanDto>($"""
            SELECT loai_xe_id AS LoaiXeId, loai_xe AS LoaiXe, suc_chua AS SucChua,
                   CASE WHEN so_cho_con_ban < 0 THEN 0 ELSE so_cho_con_ban END AS SoChoConBan
            FROM dbo.v_cho_con_ban
            """).ToListAsync(ct);
}
