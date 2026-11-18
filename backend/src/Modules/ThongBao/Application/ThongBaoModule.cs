using NhaXe.Modules.TaiKhoan.Contracts;
using NhaXe.Modules.ThongBao.Contracts;
using LoaiTB = NhaXe.Modules.ThongBao.Domain.LoaiThongBao;

namespace NhaXe.Modules.ThongBao.Application;

/// <summary>
/// Đẩy thông báo tới máy đang mở app ngay lúc lưu (đề cương v10: SignalR, để không phụ thuộc độ trễ thông báo đẩy).
/// Cài đặt ở Api (SignalR Hub). Đẩy lỗi / máy không kết nối thì thôi: thông báo vẫn nằm trong hộp thư.
/// FCM (thông báo đẩy khi app đóng) chỉ dự kiến, cài đặt mới của interface này là đủ (OCP).
/// </summary>
public interface IDayThoiGianThuc
{
    Task DayAsync(IReadOnlyCollection<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct);
}

/// <summary>Cài đặt cổng công khai IThongBaoModule. Danh sách Admin hỏi module TaiKhoan qua ITaiKhoanModule.</summary>
public class ThongBaoModule : IThongBaoModule
{
    private readonly IThongBaoStore _store;
    private readonly ITaiKhoanModule _taiKhoan;
    private readonly IDayThoiGianThuc? _day;
    public ThongBaoModule(IThongBaoStore store, ITaiKhoanModule taiKhoan, IDayThoiGianThuc? day = null)
    { _store = store; _taiKhoan = taiKhoan; _day = day; }

    public Task GuiAsync(int taiKhoanId, string loai, string noiDung, CancellationToken ct = default) =>
        GuiNhieuAsync(new[] { taiKhoanId }, loai, noiDung, ct);

    public async Task GuiNhieuAsync(IEnumerable<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct = default)
    {
        var nd = LoaiTB.ChuanHoaNoiDung(loai, noiDung);
        var ds = taiKhoanIds.Distinct().ToList(); // một người không nhận hai lần cùng một tin
        if (ds.Count == 0) return;
        await _store.ThemAsync(ds, loai, nd, ct);
        await DayAsync(ds, loai, nd, ct);
    }

    public async Task GuiChoMoiAdminAsync(string loai, string noiDung, CancellationToken ct = default)
    {
        var nd = LoaiTB.ChuanHoaNoiDung(loai, noiDung);
        var admin = await _taiKhoan.LayAdminIdsAsync(ct);
        if (admin.Count == 0) return;
        await _store.ThemAsync(admin, loai, nd, ct);
        await DayAsync(admin, loai, nd, ct);
    }

    private async Task DayAsync(IReadOnlyCollection<int> ds, string loai, string nd, CancellationToken ct)
    {
        if (_day is null) return;
        try { await _day.DayAsync(ds, loai, nd, ct); }
        catch (Exception e) when (e is not OperationCanceledException) { } // đã lưu hộp thư, đẩy hỏng không sao
    }
}
