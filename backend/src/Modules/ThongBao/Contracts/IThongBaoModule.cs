namespace NhaXe.Modules.ThongBao.Contracts;

/// <summary>
/// Cổng giao tiếp CÔNG KHAI của module Thông báo (số 6). Module khác muốn báo cho người dùng thì gọi interface này,
/// KHÔNG tự INSERT vào bảng thong_bao. Sau này đổi sang đẩy thông báo lên điện thoại (FCM) hay qua RabbitMQ
/// thì chỉ sửa trong module ThongBao, các module gọi không đổi.
/// </summary>
public interface IThongBaoModule
{
    /// <summary>Gửi một thông báo cho một tài khoản.</summary>
    Task GuiAsync(int taiKhoanId, string loai, string noiDung, CancellationToken ct = default);

    /// <summary>Gửi cùng một thông báo cho nhiều tài khoản (ví dụ chủ xe và người cùng nhóm được chia sẻ xe).</summary>
    Task GuiNhieuAsync(IEnumerable<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct = default);

    /// <summary>Gửi cùng một thông báo cho mọi Admin (danh sách Admin do module ThongBao tự hỏi module TaiKhoan).</summary>
    Task GuiChoMoiAdminAsync(string loai, string noiDung, CancellationToken ct = default);
}

/// <summary>Các loại thông báo module khác được gửi (khớp CHECK CK_tb_loai trong nha-xe.sql).</summary>
public static class LoaiThongBao
{
    public const string HuyGoi = "HUY_GOI";
    public const string XeBiGo = "XE_BI_GO";
    public const string KhachHuy = "KHACH_HUY";
    public const string SapHetHan = "SAP_HET_HAN";
    public const string QuaHan = "QUA_HAN";
    public const string Vao = "VAO";
    public const string Ra = "RA";
    public const string NghiMat = "NGHI_MAT";
    public const string HetHan = "HET_HAN";
    /// <summary>Chỉ dẫn khu, camera ghi xe vào khu (module TimXe).</summary>
    public const string Khu = "KHU";
    /// <summary>Nhóm gia đình: có yêu cầu tham gia, được duyệt.</summary>
    public const string Nhom = "NHOM";
    /// <summary>Gửi Admin: biển lạ trong bãi, lệch khu, xe chưa định vị.</summary>
    public const string DoiSoat = "DOI_SOAT";
    /// <summary>Đã xác nhận ra nhưng còn phí quá hạn: trả phí rồi barrier mới mở.</summary>
    public const string ChoThanhToan = "CHO_THANH_TOAN";
}
