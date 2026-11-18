using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NhaXe.Modules.ThongBao.Application;

namespace NhaXe.Api.Common;

/// <summary>
/// Kết nối thời gian thực (SignalR, WebSocket qua NGINX /hub/). Mỗi máy đăng nhập vào nhóm "tk-{id}" của tài khoản mình.
/// Client nhận sự kiện "thongBao" { loai, noiDung } rồi tải lại dữ liệu trang (Ra vào, Tìm xe, Cổng...).
/// Chạy 2 bản API: client dùng thẳng WebSocket (skipNegotiation) nên không cần sticky session; nhưng tin đẩy từ bản A
/// chỉ tới máy nối vào bản A. Vì vậy trang vẫn tự tải lại định kỳ; muốn đẩy chéo giữa các bản thì thêm Redis backplane.
/// </summary>
[Authorize]
public class ThongBaoHub : Hub
{
    public static string Nhom(int taiKhoanId) => $"tk-{taiKhoanId}";

    public override async Task OnConnectedAsync()
    {
        if (int.TryParse(Context.User?.FindFirst("sub")?.Value, out var id))
            await Groups.AddToGroupAsync(Context.ConnectionId, Nhom(id));
        await base.OnConnectedAsync();
    }
}

public class DaySignalR(IHubContext<ThongBaoHub> hub) : IDayThoiGianThuc
{
    public Task DayAsync(IReadOnlyCollection<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct) =>
        hub.Clients.Groups(taiKhoanIds.Select(ThongBaoHub.Nhom).ToList()).SendAsync("thongBao", new { loai, noiDung }, ct);
}
