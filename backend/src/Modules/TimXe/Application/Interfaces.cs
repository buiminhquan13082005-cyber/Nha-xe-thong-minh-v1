using NhaXe.Modules.TimXe.Contracts;
using NhaXe.Modules.TimXe.Domain;

namespace NhaXe.Modules.TimXe.Application;

/// <summary>Phía ghi / đọc bảng của TimXe (giu_cho_khu, vi_tri_xe). Một lần LuuAsync = một transaction.</summary>
public interface ITimXeRepository
{
    Task<GiuChoKhu?> TimGiuDangGiuAsync(int luotGuiId, CancellationToken ct);
    /// <summary>Số suất DANG_GIU còn hạn theo khu.</summary>
    Task<IReadOnlyDictionary<int, int>> DemGiuTheoKhuAsync(DateTime bayGio, CancellationToken ct);
    /// <summary>Suất DANG_GIU đã quá hạn (tác vụ nền trả suất).</summary>
    Task<IReadOnlyList<GiuChoKhu>> LayGiuQuaHanAsync(DateTime bayGio, CancellationToken ct);
    /// <summary>Lần ghi gần nhất của lượt gửi (mọi nguồn) và lần gần nhất tại một camera (chống đọc lặp).</summary>
    Task<ViTriXe?> LayGhiCuoiAsync(int luotGuiId, CancellationToken ct);
    Task<DateTime?> LayLanCuoiTaiCameraAsync(int luotGuiId, int cameraId, CancellationToken ct);
    /// <summary>Suất được mời gần nhất của các lượt gửi (để hiện "Mời vào khu X" trên app).</summary>
    Task<IReadOnlyDictionary<int, GiuChoKhu>> LayGiuGanNhatAsync(IReadOnlyCollection<int> luotGuiIds, CancellationToken ct);
    Task<ThongKeDinhVi> LayThongKeAsync(DateTime tu, DateTime den, CancellationToken ct);

    void Them(GiuChoKhu g);
    void Them(ViTriXe v);
    Task LuuAsync(CancellationToken ct);
}

/// <summary>Tham số cau_hinh của TimXe (V004).</summary>
public interface ICauHinhTimXe
{
    Task<int> LayAsync(string khoa, int macDinh, CancellationToken ct);
}

public static class KhoaCauHinh
{
    public const string PhutGiu = "phut_giu_cho_khu";
    public const string GiayChongDocLap = "giay_chong_doc_lap";
    public const string PhanTramSapDay = "phan_tram_sap_day";
    public const string PhutChuaDinhVi = "phut_chua_dinh_vi";
}
