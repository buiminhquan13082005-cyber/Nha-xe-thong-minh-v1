using Microsoft.EntityFrameworkCore;
using NhaXe.Modules.BaiXe.Application;

namespace NhaXe.Modules.BaiXe.Infrastructure;

/// <summary>
/// Đọc dữ liệu bãi: chỉ bảng khu_vuc, o_do của module BaiXe.
/// Không đọc luot_gui (của CongRaVao), không JOIN xe / loai_xe / dang_ky_cho (của GoiCho): những thứ đó hỏi qua Contracts.
/// </summary>
public class BaiXeQuery : IBaiXeQuery
{
    private readonly BaiXeDbContext _db;
    public BaiXeQuery(BaiXeDbContext db) => _db = db;

    public async Task<IReadOnlyList<KhuRow>> LayKhuAsync(CancellationToken ct) =>
        await _db.Database.SqlQuery<KhuRow>($"""
            SELECT k.id AS Id, k.ten AS Ten, k.loai_xe_id AS LoaiXeId FROM dbo.khu_vuc k
            """).ToListAsync(ct);

    public async Task<IReadOnlyList<ODoRow>> LayODoAsync(CancellationToken ct) =>
        await _db.Database.SqlQuery<ODoRow>($"""
            SELECT o.id AS Id, o.khu_vuc_id AS KhuId, o.ma_o AS MaO FROM dbo.o_do o
            """).ToListAsync(ct);
}
