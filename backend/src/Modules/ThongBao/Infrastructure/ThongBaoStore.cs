using Microsoft.EntityFrameworkCore;
using NhaXe.Modules.ThongBao.Application;

namespace NhaXe.Modules.ThongBao.Infrastructure;

public class ThongBaoStore : IThongBaoStore
{
    private readonly ThongBaoDbContext _db;
    public ThongBaoStore(ThongBaoDbContext db) => _db = db;

    public async Task<IReadOnlyList<ThongBaoDto>> LayAsync(int taiKhoanId, IReadOnlyCollection<string>? cacLoai, CancellationToken ct)
    {
        // danh sách loại truyền như MỘT tham số rồi tách bằng STRING_SPLIT; null = mọi loại
        var loai = cacLoai is null ? null : string.Join(',', cacLoai);
        return await _db.Database.SqlQuery<ThongBaoDto>($"""
            SELECT TOP 100 id AS Id, loai AS Loai, noi_dung AS NoiDung, gui_luc AS GuiLuc, da_doc AS DaDoc
            FROM dbo.thong_bao
            WHERE tai_khoan_id = {taiKhoanId}
              AND ({loai} IS NULL OR loai IN (SELECT value FROM STRING_SPLIT({loai}, ',')))
            ORDER BY gui_luc DESC, id DESC
            """).ToListAsync(ct);
    }

    public Task<int> DemChuaDocAsync(int taiKhoanId, CancellationToken ct) =>
        _db.Database.SqlQuery<int>($"SELECT COUNT(*) AS Value FROM dbo.thong_bao WHERE tai_khoan_id = {taiKhoanId} AND da_doc = 0")
           .SingleAsync(ct);

    public async Task<bool> DanhDauDaDocAsync(int taiKhoanId, int thongBaoId, CancellationToken ct) =>
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE dbo.thong_bao SET da_doc = 1 WHERE id = {thongBaoId} AND tai_khoan_id = {taiKhoanId}", ct) > 0;

    public Task<int> DocHetAsync(int taiKhoanId, CancellationToken ct) =>
        _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE dbo.thong_bao SET da_doc = 1 WHERE tai_khoan_id = {taiKhoanId} AND da_doc = 0", ct);

    public async Task ThemAsync(IReadOnlyList<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct)
    {
        foreach (var id in taiKhoanIds)
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT dbo.thong_bao (tai_khoan_id, loai, noi_dung) VALUES ({id}, {loai}, {noiDung})", ct);
    }
}
