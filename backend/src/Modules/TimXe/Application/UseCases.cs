using Microsoft.Extensions.Logging;
using NhaXe.Modules.AiBienSo.Contracts;
using NhaXe.Modules.BaiXe.Contracts;
using NhaXe.Modules.CongRaVao.Contracts;
using NhaXe.Modules.GoiCho.Contracts;
using NhaXe.Modules.ThongBao.Contracts;
using NhaXe.Modules.TimXe.Contracts;
using NhaXe.Modules.TimXe.Domain;
using NhaXe.SharedKernel;

namespace NhaXe.Modules.TimXe.Application;

// Use case của TimXe (đề cương v10, UC-U17, U18, U19, U22, A-đối soát). Chỉ XE MÁY: ô tô qua cổng bình thường
// nhưng chưa được chỉ khu / định vị (phần ô tô trong khu để làm sau).
// Gọi module khác chỉ qua Contracts: BaiXe (khu, camera, đường), CongRaVao (lượt đang mở, ghi khu), GoiCho (biển, loại xe,
// quyền dùng xe), AiBienSo (đọc biển ở lối vào khu), ThongBao (báo người dùng / Admin).

public static class LoaiXeMa
{
    public const string XeMay = "XE_MAY";
}

/// <summary>Số liệu chỗ của từng khu tại một thời điểm (dùng chung cho chọn khu, mức chỗ, màn hình Admin).</summary>
public class TinhChoKhu(IBaiXeModule baiXe, ICongRaVaoModule cong, ITimXeRepository repo)
{
    public record Khu(KhuThongTin ThongTin, int SoXe, int SoGiu, int ConLai);

    public async Task<IReadOnlyList<Khu>> ThucHienAsync(DateTime bayGio, IReadOnlyList<LuotGuiDangMo>? dangMo = null, CancellationToken ct = default)
    {
        var khu = await baiXe.LayKhuAsync(ct);
        dangMo ??= await cong.LayLuotGuiDangMoAsync(ct);
        var soXe = dangMo.Where(l => l.ViTriKhuId is not null).GroupBy(l => l.ViTriKhuId!.Value).ToDictionary(g => g.Key, g => g.Count());
        var soGiu = await repo.DemGiuTheoKhuAsync(bayGio, ct);
        return khu.Select(k =>
        {
            var x = soXe.GetValueOrDefault(k.Id); var g = soGiu.GetValueOrDefault(k.Id);
            return new Khu(k, x, g, QuyTacKhu.ConLai(k.SucChua, x, g));
        }).ToList();
    }
}

/// <summary>
/// Nghe XeDaVao (CongRaVao không gọi TimXe): xe máy thì chọn khu còn chỗ gần cổng nhất, giữ 1 suất 5 phút,
/// báo người dùng xe "Mời vào khu X". Hết chỗ mọi khu thì báo Admin (không chặn xe vì gói đã giữ suất loại xe).
/// Nghe XeDaRa: suất còn giữ thì huỷ.
/// </summary>
public class NgheCongTimXe(IGoiChoModule goiCho, TinhChoKhu tinhCho, ITimXeRepository repo, ICauHinhTimXe cauHinh,
                           IThongBaoModule thongBao, IClock clock, ILogger<NgheCongTimXe>? log = null)
    : INghe<XeDaVao>, INghe<XeDaRa>
{
    public async Task XuLyAsync(XeDaVao e, CancellationToken ct)
    {
        if (await repo.TimGiuDangGiuAsync(e.LuotGuiId, ct) is not null) return; // sự kiện đến lần hai: đã giữ rồi
        var xe = (await goiCho.LayTinhTrangXeAsync(new[] { e.XeId }, ct)).GetValueOrDefault(e.XeId);
        if (xe is null || xe.LoaiXe != LoaiXeMa.XeMay) return; // ô tô: chưa làm phần chỉ khu
        var bayGio = clock.BayGio;
        var khu = (await tinhCho.ThucHienAsync(bayGio, ct: ct)).Where(k => k.ThongTin.LoaiXeId == xe.LoaiXeId).ToList();
        var chon = QuyTacKhu.ChonKhu(khu.Select(k => new QuyTacKhu.UngVienKhu(k.ThongTin.Id, k.ConLai, k.ThongTin.KhoangCachTuCong)));
        if (chon is null)
        {
            await thongBao.GuiChoMoiAdminAsync(LoaiThongBao.DoiSoat, $"Xe {xe.BienSo} vào bãi nhưng mọi khu xe máy đã đầy (theo số xe ghi và suất giữ). Kiểm tra số liệu khu.", ct);
            return;
        }
        var phut = await cauHinh.LayAsync(KhoaCauHinh.PhutGiu, 5, ct);
        repo.Them(GiuChoKhu.Tao(e.LuotGuiId, chon.Value, bayGio, phut));
        await repo.LuuAsync(ct);
        var ten = khu.First(k => k.ThongTin.Id == chon).ThongTin.Ten;
        try
        {
            await thongBao.GuiNhieuAsync(await goiCho.LayNguoiDungXeAsync(e.XeId, ct), LoaiThongBao.Khu,
                $"Xe {xe.BienSo}: mời vào {ten}. Bãi giữ cho bạn 1 chỗ trong {phut} phút, mở mục Tìm xe để xem đường đi.", ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException) { log?.LogWarning(ex, "Gửi chỉ dẫn khu lỗi"); }
    }

    public async Task XuLyAsync(XeDaRa e, CancellationToken ct)
    {
        var g = await repo.TimGiuDangGiuAsync(e.LuotGuiId, ct);
        if (g is null) return;
        g.Huy(e.Luc);
        await repo.LuuAsync(ct);
    }
}

/// <summary>Màn hình cổng hỏi "mời xe vào khu nào" sau khi cho qua (CongRaVao không biết TimXe).</summary>
public class LayChiDanUseCase(ITimXeRepository repo, IBaiXeModule baiXe)
{
    public async Task<ChiDanDto?> ThucHienAsync(int luotGuiId, CancellationToken ct = default)
    {
        var g = (await repo.LayGiuGanNhatAsync(new[] { luotGuiId }, ct)).GetValueOrDefault(luotGuiId);
        if (g is null) return null;
        var khu = (await baiXe.LayKhuAsync(ct)).FirstOrDefault(k => k.Id == g.KhuId);
        return new ChiDanDto(luotGuiId, g.KhuId, khu?.Ten ?? $"Khu #{g.KhuId}", g.HetHanLuc, g.TrangThai);
    }
}

/// <summary>Vị trí biển trên ảnh (tỉ lệ 0..1) để màn hình camera khu vẽ ô đè lên hình.</summary>
public record KhungBienDto(double X, double Y, double Rong, double Cao);

/// <summary>Kết quả xử lý một ảnh của camera khu. SoXeTrongKhu / SucChua: số liệu khu ngay sau khi ghi.</summary>
public record KetQuaCameraKhuDto(string KetQua, string? BienSo, int KhuId, string? Huong, string ThongDiep, IReadOnlyList<string>? UngVien = null,
                                 decimal? DoTinCay = null, KhungBienDto? KhungBien = null, string? Khu = null, int? SoXeTrongKhu = null, int? SucChua = null);

public static class KetQuaCamera
{
    public const string DaGhi = "DA_GHI";
    public const string BoQua = "BO_QUA";
    /// <summary>Đọc được biển nhưng không khớp xe nào đang trong bãi.</summary>
    public const string KhongKhop = "KHONG_KHOP";
    /// <summary>Tự quét: khung hình không có biển số (không ghi gì, không báo ai).</summary>
    public const string KhongThayBien = "KHONG_THAY_BIEN";
}

/// <summary>
/// Camera khu gửi ảnh (màn hình tự quét mỗi giây, hoặc Admin gõ biển): đọc biển (Model A + PaddleOCR), so CHỈ với xe đang có lượt
/// gửi mở, khớp chính xác trước rồi gần đúng (lệch ≤ 1, đúng một ứng viên).
/// Camera KHU_VAO → ghi xe VÀO khu (số xe của khu +1); camera KHU_RA → ghi xe RA khỏi khu (số xe của khu −1).
/// Camera kiểu cũ LOI_VAO_KHU: chưa ghi ở khu này → VÀO, đang ghi ở khu này → RA.
/// Cùng biển cùng camera trong 30 giây thì bỏ qua. Sai loại khu vẫn ghi và báo Admin. Không khớp: báo Admin (trừ khi tự quét).
/// </summary>
public class XuLyCameraKhuUseCase(IBaiXeModule baiXe, ICongRaVaoModule cong, IGoiChoModule goiCho, IAiBienSoModule ai,
                                  ITimXeRepository repo, ICauHinhTimXe cauHinh, IThongBaoModule thongBao, IClock clock,
                                  TinhChoKhu? tinhCho = null, ILogger<XuLyCameraKhuUseCase>? log = null)
{
    public static bool LaCameraKhu(string vaiTro) =>
        vaiTro is VaiTroCameraCongKhai.KhuVao or VaiTroCameraCongKhai.KhuRa or VaiTroCameraCongKhai.LoiVaoKhu;

    public async Task<KetQuaCameraKhuDto> ThucHienAsync(int cameraId, string? bienSoGoTay, byte[]? anh, string? loaiAnh, CancellationToken ct = default,
                                                        bool tuDong = false)
    {
        var cam = await baiXe.LayCameraAsync(cameraId, ct)
                  ?? throw new LoiNghiepVu(LoaiLoi.KhongTimThay, "KHONG_TIM_THAY_CAMERA", "Không tìm thấy camera.");
        if (!LaCameraKhu(cam.VaiTro))
            throw new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, "KHONG_PHAI_CAMERA_KHU", "Camera này không phải camera khu (hướng vào / hướng ra).");
        if (!cam.DangBat)
            throw new LoiNghiepVu(LoaiLoi.XungDot, "CAMERA_DANG_TAT", "Camera đang tắt.");
        var bayGio = clock.BayGio;

        // 1. Đọc biển
        string? bien; decimal? tinCay; IReadOnlyList<string> ungVienAi = Array.Empty<string>(); KhungBienDto? khung = null;
        if (!string.IsNullOrWhiteSpace(bienSoGoTay)) { bien = ChuanHoa(bienSoGoTay); tinCay = 1m; }
        else if (anh is not null && loaiAnh is not null)
        {
            var kq = await ai.DocAsync(new AnhBienSo(anh, loaiAnh), ct);
            bien = kq.BienSo; tinCay = Math.Round((decimal)kq.DoTinCay, 4);
            ungVienAi = kq.UngVien.Select(u => u.BienSo).ToList();
            var k0 = (kq.BienSo is null ? null : kq.UngVien.FirstOrDefault(u => u.BienSo == kq.BienSo)?.Khung) ?? kq.UngVien.FirstOrDefault()?.Khung;
            if (k0 is not null) khung = new KhungBienDto(k0.X, k0.Y, k0.Rong, k0.Cao);
            if (tuDong && bien is null && ungVienAi.Count == 0)
                return new(KetQuaCamera.KhongThayBien, null, cam.KhuId, null, "Không thấy biển số trong khung hình");
        }
        else throw new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, "THIEU_ANH", "Gửi ảnh camera hoặc biển số.");

        // 2. So với xe đang trong bãi
        var dangMo = await cong.LayLuotGuiDangMoAsync(ct);
        var xe = await goiCho.LayTinhTrangXeAsync(dangMo.Select(l => l.XeId), ct);
        var ds = dangMo.Where(l => xe.ContainsKey(l.XeId)).Select(l => (Luot: l, Xe: xe[l.XeId])).ToList();
        (LuotGuiDangMo Luot, TinhTrangXeGoi Xe)? khop = null;
        if (bien is not null)
        {
            var (k, _, _) = KhopBienSo.Tim(bien, ds.Select(d => new Hop(d)), h => h.Gia.Xe.BienSo);
            if (k is not null) khop = k.Gia;
        }
        else if (ungVienAi.Count > 0) // AI chưa chắc: chỉ nhận khi đúng một ứng viên khớp chính xác xe trong bãi
        {
            var trung = ds.Where(d => ungVienAi.Contains(d.Xe.BienSo)).ToList();
            if (trung.Count == 1) { khop = trung[0]; bien = trung[0].Xe.BienSo; }
        }
        var khu = (await baiXe.LayKhuAsync(ct)).FirstOrDefault(k => k.Id == cam.KhuId);
        var tenKhu = khu?.Ten ?? $"khu #{cam.KhuId}";
        if (khop is null)
        {
            var hien = bien ?? ungVienAi.FirstOrDefault() ?? "(không đọc được)";
            if (!tuDong) await BaoAdmin($"Camera {cam.Ten} ({tenKhu}): biển {hien} không khớp xe nào đang trong bãi.", ct);
            return new(KetQuaCamera.KhongKhop, bien, cam.KhuId, null, "Biển số không khớp xe nào đang gửi trong bãi", ungVienAi,
                       tinCay, khung, tenKhu);
        }
        var (luot, tt) = khop.Value;

        // 3. Chống đọc lặp
        var giay = await cauHinh.LayAsync(KhoaCauHinh.GiayChongDocLap, 30, ct);
        if (QuyTacKhu.DocLap(await repo.LayLanCuoiTaiCameraAsync(luot.LuotGuiId, cameraId, ct), bayGio, giay))
            return new(KetQuaCamera.BoQua, tt.BienSo, cam.KhuId, null, $"Đọc lặp trong {giay} giây: bỏ qua", null, tinCay, khung, tenKhu);

        // 4. Hướng theo camera (vào / ra) và ghi
        var huong = QuyTacKhu.HuongTheoCamera(cam.VaiTro, luot.ViTriKhuId, cam.KhuId);
        if (huong == HuongDi.Vao && cam.VaiTro == VaiTroCameraCongKhai.KhuVao && luot.ViTriKhuId == cam.KhuId)
            return new(KetQuaCamera.BoQua, tt.BienSo, cam.KhuId, HuongDi.Vao, $"Xe {tt.BienSo} đã được ghi trong {tenKhu} rồi",
                       null, tinCay, khung, tenKhu, await SoXeAsync(cam.KhuId, ct), khu?.SucChua);
        if (huong == HuongDi.Ra && luot.ViTriKhuId != cam.KhuId)
            return new(KetQuaCamera.BoQua, tt.BienSo, cam.KhuId, HuongDi.Ra, $"Xe {tt.BienSo} chưa được ghi trong {tenKhu}: không trừ số xe",
                       null, tinCay, khung, tenKhu, await SoXeAsync(cam.KhuId, ct), khu?.SucChua);

        repo.Them(ViTriXe.TuCamera(luot.LuotGuiId, cameraId, cam.KhuId, tt.BienSo, tinCay, huong, bayGio));
        if (huong == HuongDi.Vao) (await repo.TimGiuDangGiuAsync(luot.LuotGuiId, ct))?.DaVao(bayGio);
        await repo.LuuAsync(ct);
        await cong.GhiViTriAsync(luot.LuotGuiId, huong == HuongDi.Vao ? cam.KhuId : null, huong == HuongDi.Vao ? NguonGhi.CameraKhu : null, bayGio, ct);

        if (khu is not null && khu.LoaiXeId != tt.LoaiXeId)
            await BaoAdmin($"Xe {tt.BienSo} ({tt.LoaiXe}) vừa đi qua camera {tenKhu} không dành cho loại xe này.", ct);
        if (huong == HuongDi.Vao)
            await Bao(goiCho.LayNguoiDungXeAsync(luot.XeId, ct), $"Xe {tt.BienSo} đã vào {tenKhu} lúc {bayGio:HH:mm}.", ct);
        return new(KetQuaCamera.DaGhi, tt.BienSo, cam.KhuId, huong,
            huong == HuongDi.Vao ? $"Xe {tt.BienSo} vào {tenKhu}" : $"Xe {tt.BienSo} ra khỏi {tenKhu}",
            null, tinCay, khung, tenKhu, await SoXeAsync(cam.KhuId, ct), khu?.SucChua);
    }

    /// <summary>Số xe đang ghi ở khu (sau khi vừa ghi), để màn hình camera hiện ngay.</summary>
    private async Task<int?> SoXeAsync(int khuId, CancellationToken ct) =>
        tinhCho is null ? null : (await tinhCho.ThucHienAsync(clock.BayGio, ct: ct)).FirstOrDefault(k => k.ThongTin.Id == khuId)?.SoXe;

    private sealed record Hop((LuotGuiDangMo Luot, TinhTrangXeGoi Xe) Gia);

    internal static string ChuanHoa(string s) => new(s.ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());

    private async Task BaoAdmin(string noiDung, CancellationToken ct)
    {
        try { await thongBao.GuiChoMoiAdminAsync(LoaiThongBao.DoiSoat, noiDung, ct); }
        catch (Exception e) when (e is not OperationCanceledException) { log?.LogWarning(e, "Báo Admin lỗi"); }
    }

    private async Task Bao(Task<IReadOnlyList<int>> nguoi, string noiDung, CancellationToken ct)
    {
        try { await thongBao.GuiNhieuAsync(await nguoi, LoaiThongBao.Khu, noiDung, ct); }
        catch (Exception e) when (e is not OperationCanceledException) { log?.LogWarning(e, "Báo người dùng lỗi"); }
    }
}

/// <summary>Kiểm quyền dùng xe và lấy lượt gửi đang mở của xe.</summary>
internal static class LuotCuaXe
{
    public static async Task<LuotGuiDangMo> LayAsync(IGoiChoModule goiCho, ICongRaVaoModule cong, int taiKhoanId, int xeId, CancellationToken ct)
    {
        if (!(await goiCho.LayNguoiDungXeAsync(xeId, ct)).Contains(taiKhoanId))
            throw new LoiNghiepVu(LoaiLoi.KhongTimThay, "KHONG_TIM_THAY_XE", "Không tìm thấy xe.");
        return (await cong.LayLuotGuiDangMoCuaXeAsync(new[] { xeId }, ct)).GetValueOrDefault(xeId)
               ?? throw new LoiNghiepVu(LoaiLoi.XungDot, "XE_KHONG_TRONG_BAI", "Xe không ở trong bãi.");
    }
}

/// <summary>
/// "Đã đỗ xe" (UC-U19): xác nhận phụ bên cạnh camera. Xe chưa có khu thì ghi theo người dùng chọn.
/// Camera đã ghi xe ở khu khác thì tin camera, không đổi, báo Admin để kiểm tra.
/// </summary>
public class DaDoXeUseCase(IGoiChoModule goiCho, ICongRaVaoModule cong, IBaiXeModule baiXe, ITimXeRepository repo,
                           IThongBaoModule thongBao, IClock clock)
{
    public async Task<string> ThucHienAsync(int taiKhoanId, int xeId, int khuId, CancellationToken ct = default)
    {
        var luot = await LuotCuaXe.LayAsync(goiCho, cong, taiKhoanId, xeId, ct);
        var khu = (await baiXe.LayKhuAsync(ct)).FirstOrDefault(k => k.Id == khuId)
                  ?? throw new LoiNghiepVu(LoaiLoi.KhongTimThay, "KHONG_TIM_THAY_KHU", "Không tìm thấy khu.");
        var xe = (await goiCho.LayTinhTrangXeAsync(new[] { xeId }, ct))[xeId];
        if (xe.LoaiXe != LoaiXeMa.XeMay)
            throw new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, "CHUA_HO_TRO_O_TO", "Định vị khu hiện chỉ áp dụng cho xe máy.");
        if (khu.LoaiXeId != xe.LoaiXeId)
            throw new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, "SAI_LOAI_KHU", $"{khu.Ten} không dành cho loại xe này.");
        var bayGio = clock.BayGio;

        var cuoi = await repo.LayGhiCuoiAsync(luot.LuotGuiId, ct);
        if (luot.ViTriKhuId is int dangGhi && cuoi?.Nguon == NguonGhi.CameraKhu)
        {
            if (dangGhi == khuId) return $"Camera đã ghi xe ở {khu.Ten}.";
            var tenGhi = (await baiXe.LayKhuAsync(ct)).FirstOrDefault(k => k.Id == dangGhi)?.Ten ?? $"khu #{dangGhi}";
            await thongBao.GuiChoMoiAdminAsync(LoaiThongBao.DoiSoat,
                $"Xe {xe.BienSo}: người dùng báo đỗ ở {khu.Ten} nhưng camera đã ghi ở {tenGhi}. Hệ thống giữ theo camera.", ct);
            return $"Camera đã ghi xe ở {tenGhi}, hệ thống giữ theo camera. Admin sẽ kiểm tra.";
        }
        repo.Them(ViTriXe.ThuCong(luot.LuotGuiId, khuId, NguonGhi.NguoiDung, HuongDi.Vao, bayGio));
        (await repo.TimGiuDangGiuAsync(luot.LuotGuiId, ct))?.DaVao(bayGio);
        await repo.LuuAsync(ct);
        await cong.GhiViTriAsync(luot.LuotGuiId, khuId, NguonGhi.NguoiDung, bayGio, ct);
        return $"Đã ghi xe ở {khu.Ten}.";
    }
}

public record ChiDanDto(int LuotGuiId, int KhuId, string Khu, DateTime HetHanLuc, string TrangThai);
public record KhuChoDto(int Id, string Ten, int LoaiXeId, int SucChua, int SoXe, int SoGiu, int ConLai, string Muc, double? KhoangCachTuCong);
public record XeCuaToiDto(int XeId, string BienSo, string LoaiXe, bool TrongBai, DateTime? ThoiGianVao, int? KhuId, string? Khu,
                          DateTime? VaoKhuLuc, string? NguonKhu, ChiDanDto? MoiVao, DuongDiDto? Duong, bool HoTroDinhVi);
public record TimXeCuaToiDto(DateTime BayGio, IReadOnlyList<XeCuaToiDto> Xe, IReadOnlyList<KhuChoDto> KhuXeMay);
public record SoXeKhuDto(DateTime BayGio, IReadOnlyList<KhuChoDto> Khu);
public record DaDoXeLenh(int XeId, int KhuId);
public record GanKhuLenh(int LuotGuiId, int? KhuId);

/// <summary>Mức chỗ các khu (Còn nhiều / Sắp đầy / Đầy). Khu xe máy: tính từ dữ liệu, không phải AI.</summary>
public class LayMucChoUseCase(TinhChoKhu tinhCho, ICauHinhTimXe cauHinh, IGoiChoModule goiCho, IClock clock)
{
    public async Task<IReadOnlyList<KhuChoDto>> ThucHienAsync(bool chiXeMay = true, IReadOnlyList<LuotGuiDangMo>? dangMo = null, CancellationToken ct = default)
    {
        var pt = await cauHinh.LayAsync(KhoaCauHinh.PhanTramSapDay, 20, ct);
        var xeMay = (await goiCho.LaySucChuaAsync(ct)).FirstOrDefault(l => l.LoaiXe == LoaiXeMa.XeMay)?.LoaiXeId;
        return (await tinhCho.ThucHienAsync(clock.BayGio, dangMo, ct))
            .Where(k => !chiXeMay || k.ThongTin.LoaiXeId == xeMay)
            .Select(k => new KhuChoDto(k.ThongTin.Id, k.ThongTin.Ten, k.ThongTin.LoaiXeId, k.ThongTin.SucChua, k.SoXe, k.SoGiu, k.ConLai,
                QuyTacKhu.Muc(k.ThongTin.SucChua, k.ConLai, pt), k.ThongTin.KhoangCachTuCong)).ToList();
    }
}

/// <summary>
/// Tìm xe (UC-U17, U18): các xe tài khoản được dùng, khu đang ghi, giờ vào khu, suất được mời, đường đi từ cổng.
/// Chỉ đọc khu đã lưu, không chờ camera. Chỉ người có quyền dùng xe mới thấy (lấy theo tài khoản trong token).
/// </summary>
public class TimXeCuaToiUseCase(IGoiChoModule goiCho, ICongRaVaoModule cong, IBaiXeModule baiXe, ITimXeRepository repo,
                                LayMucChoUseCase mucCho, IClock clock)
{
    public async Task<TimXeCuaToiDto> ThucHienAsync(int taiKhoanId, CancellationToken ct = default)
    {
        var bayGio = clock.BayGio;
        var xe = await goiCho.LayXeDuocDungAsync(taiKhoanId, ct);
        var dangMo = await cong.LayLuotGuiDangMoAsync(ct);
        var cua = dangMo.Where(l => xe.Any(x => x.XeId == l.XeId)).ToDictionary(l => l.XeId);
        var tt = await goiCho.LayTinhTrangXeAsync(xe.Select(x => x.XeId), ct);
        var khu = (await baiXe.LayKhuAsync(ct)).ToDictionary(k => k.Id);
        var giu = await repo.LayGiuGanNhatAsync(cua.Values.Select(l => l.LuotGuiId).ToList(), ct);

        var ds = new List<XeCuaToiDto>();
        foreach (var x in xe.OrderBy(x => x.BienSo))
        {
            var loai = tt.GetValueOrDefault(x.XeId)?.LoaiXe ?? "";
            var hoTro = loai == LoaiXeMa.XeMay;
            if (!cua.TryGetValue(x.XeId, out var l))
            { ds.Add(new(x.XeId, x.BienSo, loai, false, null, null, null, null, null, null, null, hoTro)); continue; }
            var g = giu.GetValueOrDefault(l.LuotGuiId);
            var moi = g is not null && g.ConGiu(bayGio) && l.ViTriKhuId is null
                ? new ChiDanDto(l.LuotGuiId, g.KhuId, khu.GetValueOrDefault(g.KhuId)?.Ten ?? "", g.HetHanLuc, g.TrangThai) : null;
            var khuDich = l.ViTriKhuId ?? moi?.KhuId;
            var duong = hoTro && khuDich is int kd ? await baiXe.TimDuongAsync(kd, ct) : null;
            var nguon = l.ViTriKhuId is null ? null : (await repo.LayGhiCuoiAsync(l.LuotGuiId, ct))?.Nguon;
            ds.Add(new(x.XeId, x.BienSo, loai, true, l.ThoiGianVao, l.ViTriKhuId,
                l.ViTriKhuId is int k ? khu.GetValueOrDefault(k)?.Ten : null, l.ViTriLuc, nguon, moi, duong, hoTro));
        }
        return new TimXeCuaToiDto(bayGio, ds, await mucCho.ThucHienAsync(true, dangMo, ct));
    }
}

/// <summary>
/// Số xe từng khu (mọi loại xe) cho trang Quản lý bãi và sơ đồ chỗ trống (Admin và người dùng cùng xem).
/// Số xe trong khu tăng khi camera hướng vào ghi xe, giảm khi camera hướng ra ghi xe (hoặc xe ra cổng chính).
/// </summary>
public class LaySoXeKhuUseCase(LayMucChoUseCase mucCho, IClock clock)
{
    public async Task<SoXeKhuDto> ThucHienAsync(CancellationToken ct = default) =>
        new(clock.BayGio, await mucCho.ThucHienAsync(false, ct: ct));
}

/// <summary>Admin gán xe vào khu (khuId) hoặc gỡ xe khỏi khu (khuId = null) từng xe một; không sửa số tay.</summary>
public class AdminGanKhuUseCase(ICongRaVaoModule cong, IBaiXeModule baiXe, ITimXeRepository repo, IClock clock)
{
    public async Task ThucHienAsync(GanKhuLenh lenh, CancellationToken ct = default)
    {
        var luot = (await cong.LayLuotGuiDangMoAsync(ct)).FirstOrDefault(l => l.LuotGuiId == lenh.LuotGuiId)
                   ?? throw new LoiNghiepVu(LoaiLoi.KhongTimThay, "KHONG_TIM_THAY_LUOT", "Không tìm thấy lượt gửi đang mở.");
        var bayGio = clock.BayGio;
        if (lenh.KhuId is int khuId)
        {
            _ = (await baiXe.LayKhuAsync(ct)).FirstOrDefault(k => k.Id == khuId)
                ?? throw new LoiNghiepVu(LoaiLoi.KhongTimThay, "KHONG_TIM_THAY_KHU", "Không tìm thấy khu.");
            repo.Them(ViTriXe.ThuCong(luot.LuotGuiId, khuId, NguonGhi.Admin, HuongDi.Vao, bayGio));
            (await repo.TimGiuDangGiuAsync(luot.LuotGuiId, ct))?.DaVao(bayGio);
        }
        else
        {
            if (luot.ViTriKhuId is null) return;
            repo.Them(ViTriXe.ThuCong(luot.LuotGuiId, luot.ViTriKhuId.Value, NguonGhi.Admin, HuongDi.Ra, bayGio));
        }
        await repo.LuuAsync(ct);
        await cong.GhiViTriAsync(luot.LuotGuiId, lenh.KhuId, lenh.KhuId is null ? null : NguonGhi.Admin, bayGio, ct);
    }
}

/// <summary>Tác vụ nền gọi mỗi 30 giây: trả các suất giữ quá hạn.</summary>
public class HetHanGiuChoUseCase(ITimXeRepository repo, IClock clock)
{
    public async Task<int> ThucHienAsync(CancellationToken ct = default)
    {
        var bayGio = clock.BayGio;
        var ds = await repo.LayGiuQuaHanAsync(bayGio, ct);
        var dem = ds.Count(g => g.HetHan(bayGio));
        if (dem > 0) await repo.LuuAsync(ct);
        return dem;
    }
}

public class TimXeModule(ITimXeRepository repo) : ITimXeModule
{
    public Task<ThongKeDinhVi> LayThongKeDinhViAsync(DateTime tu, DateTime den, CancellationToken ct = default) => repo.LayThongKeAsync(tu, den, ct);
}
