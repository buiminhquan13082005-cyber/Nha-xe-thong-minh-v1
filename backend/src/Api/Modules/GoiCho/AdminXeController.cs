using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NhaXe.Api.Common;
using NhaXe.Modules.GoiCho.Application;

namespace NhaXe.Api.Modules.GoiCho;

/// <summary>DongY = false thì bắt buộc LyDo (≥ 5 ký tự), chủ xe sẽ thấy lý do này.</summary>
public record DuyetXeYeuCau(bool DongY, string? LyDo);
public record GoXeYeuCau(string? LyDo);

[ApiController]
[Authorize(Roles = "ADMIN")]
[Route("api/admin/xe")]
[Tags("2c. GoiCho · Admin: duyệt xe")]
public class AdminXeController : ControllerBase
{
    [HttpGet("cho-duyet")]
    public Task<IReadOnlyList<XeChoDuyetDto>> ChoDuyet([FromServices] LayXeChoDuyetUseCase uc, CancellationToken ct) => uc.ThucHienAsync(ct);

    [HttpPut("{xeId:int}/duyet")]
    public async Task<IActionResult> Duyet(int xeId, [FromBody] DuyetXeYeuCau yc, [FromServices] DuyetXeUseCase uc, CancellationToken ct)
    {
        await uc.ThucHienAsync(xeId, yc.DongY, yc.LyDo, ct);
        return NoContent();
    }

    /// <summary>Duyệt / từ chối nhiều xe một lần (tối đa 50). Xe lỗi được liệt kê riêng, xe khác vẫn xử lý.</summary>
    [HttpPost("duyet-hang-loat")]
    public Task<KetQuaHangLoatDto> DuyetHangLoat([FromBody] DuyetHangLoatLenh lenh, [FromServices] DuyetHangLoatUseCase uc, CancellationToken ct)
        => uc.ThucHienAsync(lenh, ct);

    [HttpGet("da-duyet")]
    public Task<IReadOnlyList<XeQuanLyDto>> DaDuyet([FromServices] LayXeDaDuyetUseCase uc, CancellationToken ct) => uc.ThucHienAsync(ct);

    /// <summary>Gỡ xe phạm quy (gỡ mềm). Gói còn hạn bị huỷ, không hoàn tiền.</summary>
    [HttpPut("{xeId:int}/go")]
    public async Task<IActionResult> Go(int xeId, [FromBody] GoXeYeuCau yc, [FromServices] GoXeUseCase uc, CancellationToken ct)
    {
        await uc.ThucHienAsync(User.TaiKhoanId(), xeId, yc.LyDo, ct);
        return NoContent();
    }
}
