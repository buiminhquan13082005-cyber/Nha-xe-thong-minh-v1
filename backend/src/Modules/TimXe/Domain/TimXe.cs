using NhaXe.SharedKernel;

namespace NhaXe.Modules.TimXe.Domain;

// Thực thể và quy tắc của module TimXe (đề cương v10, mục "Chia khu, ghi nhận xe vào khu và tìm xe").
// Phạm vi hiện tại: XE MÁY (định vị mức khu). Phần ô tô trong khu (PKLot, ô trống) chưa làm.

public static class TrangThaiGiu
{
    public const string DangGiu = "DANG_GIU";
    public const string DaVao = "DA_VAO";
    public const string HetHan = "HET_HAN";
    public const string Huy = "HUY";
}

/// <summary>
/// Một suất được giữ trong khu sau khi xe qua cổng vào (bảng giu_cho_khu, UC-U22). Mặc định 5 phút.
/// Chỗ còn của khu = sức chứa − số xe đang ghi ở khu − số suất DANG_GIU chưa hết hạn.
/// </summary>
public class GiuChoKhu
{
    public int Id { get; private set; }
    public int LuotGuiId { get; private set; }
    public int KhuId { get; private set; }
    public DateTime BatDauLuc { get; private set; }
    public DateTime HetHanLuc { get; private set; }
    public string TrangThai { get; private set; } = TrangThaiGiu.DangGiu;
    public DateTime? KetThucLuc { get; private set; }

    private GiuChoKhu() { }

    public static GiuChoKhu Tao(int luotGuiId, int khuId, DateTime bayGio, int soPhut)
    {
        if (soPhut is < 1 or > 60)
            throw new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, "PHUT_GIU_SAI", "Thời gian giữ suất phải từ 1 đến 60 phút.");
        return new() { LuotGuiId = luotGuiId, KhuId = khuId, BatDauLuc = bayGio, HetHanLuc = bayGio.AddMinutes(soPhut) };
    }

    public bool ConGiu(DateTime bayGio) => TrangThai == TrangThaiGiu.DangGiu && bayGio < HetHanLuc;

    /// <summary>Xe đã được ghi vào một khu (camera, "Đã đỗ xe" hoặc Admin): suất kết thúc, xe chiếm chỗ thật.</summary>
    public void DaVao(DateTime bayGio) => KetThuc(TrangThaiGiu.DaVao, bayGio);
    /// <summary>Quá thời gian giữ mà xe chưa vào khu nào: trả suất.</summary>
    public bool HetHan(DateTime bayGio)
    {
        if (TrangThai != TrangThaiGiu.DangGiu || bayGio < HetHanLuc) return false;
        KetThuc(TrangThaiGiu.HetHan, bayGio);
        return true;
    }
    /// <summary>Xe ra cổng chính khi suất còn giữ.</summary>
    public void Huy(DateTime bayGio) => KetThuc(TrangThaiGiu.Huy, bayGio);

    private void KetThuc(string tt, DateTime bayGio)
    {
        if (TrangThai != TrangThaiGiu.DangGiu) return;
        TrangThai = tt;
        KetThucLuc = bayGio < BatDauLuc ? BatDauLuc : bayGio;
    }
}

public static class HuongDi
{
    public const string Vao = "VAO";
    public const string Ra = "RA";
}

public static class NguonGhi
{
    public const string CameraKhu = "CAMERA_KHU";
    public const string NguoiDung = "NGUOI_DUNG";
    public const string Admin = "ADMIN";
}

/// <summary>Một lần ghi nhận xe ở khu (bảng lịch sử vi_tri_xe). Xe máy: chỉ mức khu, không có ô.</summary>
public class ViTriXe
{
    public long Id { get; private set; }
    public int LuotGuiId { get; private set; }
    public int? CameraId { get; private set; }
    public int KhuId { get; private set; }
    public string? BienSoDocDuoc { get; private set; }
    public decimal? DoTinCay { get; private set; }
    public string Nguon { get; private set; } = NguonGhi.CameraKhu;
    public string? Huong { get; private set; }
    public DateTime ThayLuc { get; private set; }

    private ViTriXe() { }

    /// <summary>Camera lối vào khu: bắt buộc camera, biển đọc được và hướng (CHECK CK_vtx_camera_khu).</summary>
    public static ViTriXe TuCamera(int luotGuiId, int cameraId, int khuId, string bienSo, decimal? doTinCay, string huong, DateTime luc) =>
        new() { LuotGuiId = luotGuiId, CameraId = cameraId, KhuId = khuId, BienSoDocDuoc = bienSo, DoTinCay = doTinCay,
                Nguon = NguonGhi.CameraKhu, Huong = huong, ThayLuc = luc };

    /// <summary>Người dùng bấm "Đã đỗ xe" hoặc Admin gán / gỡ.</summary>
    public static ViTriXe ThuCong(int luotGuiId, int khuId, string nguon, string huong, DateTime luc) =>
        new() { LuotGuiId = luotGuiId, KhuId = khuId, Nguon = nguon, Huong = huong, ThayLuc = luc };
}

public static class MucCho
{
    public const string ConNhieu = "CON_NHIEU";
    public const string SapDay = "SAP_DAY";
    public const string Day = "DAY";
}

/// <summary>Quy tắc thuần (không DB) của TimXe: tính chỗ còn, mức chỗ, chọn khu, hướng đi qua lối vào khu.</summary>
public static class QuyTacKhu
{
    /// <summary>Đề cương v10: còn trên 20% là "Còn nhiều", từ 20% trở xuống là "Sắp đầy", hết là "Đầy".</summary>
    public static string Muc(int sucChua, int conLai, int phanTramSapDay)
    {
        if (conLai <= 0 || sucChua <= 0) return MucCho.Day;
        return conLai * 100 > sucChua * phanTramSapDay ? MucCho.ConNhieu : MucCho.SapDay;
    }

    public static int ConLai(int sucChua, int soXe, int soGiu) => Math.Max(0, sucChua - soXe - soGiu);

    public record UngVienKhu(int KhuId, int ConLai, double? KhoangCach);

    /// <summary>Khu còn chỗ và gần cổng nhất (khu chưa nối lối đi xếp sau cùng); bằng nhau thì khu id nhỏ trước. null: hết chỗ.</summary>
    public static int? ChonKhu(IEnumerable<UngVienKhu> ds) =>
        ds.Where(k => k.ConLai > 0)
          .OrderBy(k => k.KhoangCach ?? double.MaxValue).ThenBy(k => k.KhuId)
          .Select(k => (int?)k.KhuId).FirstOrDefault();

    /// <summary>
    /// Lối vào khu dùng chung cho vào và ra: xe chưa ghi ở khu này thì là VÀO (đang ghi ở khu khác thì chuyển hẳn sang khu mới);
    /// xe đang ghi ở chính khu này thì là RA.
    /// </summary>
    public static string Huong(int? khuDangGhi, int khuCamera) => khuDangGhi == khuCamera ? HuongDi.Ra : HuongDi.Vao;

    /// <summary>
    /// Hướng theo vai trò camera: KHU_VAO (camera soi hướng vào) luôn là VÀO, KHU_RA (camera soi hướng ra) luôn là RA.
    /// Camera kiểu cũ LOI_VAO_KHU dùng chung hai hướng thì suy theo khu đang ghi (<see cref="Huong"/>).
    /// </summary>
    public static string HuongTheoCamera(string vaiTroCamera, int? khuDangGhi, int khuCamera) => vaiTroCamera switch
    {
        "KHU_VAO" => HuongDi.Vao,
        "KHU_RA" => HuongDi.Ra,
        _ => Huong(khuDangGhi, khuCamera),
    };

    /// <summary>Cùng biển, cùng camera trong khoảng chống đọc lặp thì bỏ qua (xe dừng trước camera).</summary>
    public static bool DocLap(DateTime? lanTruocCungCamera, DateTime bayGio, int giay) =>
        lanTruocCungCamera is DateTime t && (bayGio - t).TotalSeconds < giay;
}
