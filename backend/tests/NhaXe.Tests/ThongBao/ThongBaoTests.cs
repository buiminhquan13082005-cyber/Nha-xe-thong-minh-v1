using NhaXe.Modules.ThongBao.Application;
using NhaXe.SharedKernel;

namespace NhaXe.Tests.ThongBao;

public class FakeThongBaoStore : IThongBaoStore
{
    public List<(int TaiKhoan, ThongBaoDto Tb)> Ds { get; } = new();
    public Task<IReadOnlyList<ThongBaoDto>> LayAsync(int tk, IReadOnlyCollection<string>? loai, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<ThongBaoDto>>(Ds.Where(x => x.TaiKhoan == tk && (loai is null || loai.Contains(x.Tb.Loai))).Select(x => x.Tb).ToList());
    public Task<int> DemChuaDocAsync(int tk, CancellationToken ct) => Task.FromResult(Ds.Count(x => x.TaiKhoan == tk && !x.Tb.DaDoc));
    public Task<int> DocHetAsync(int tk, CancellationToken ct)
    {
        var ds = Ds.Where(x => x.TaiKhoan == tk && !x.Tb.DaDoc).ToList();
        foreach (var x in ds) x.Tb.DaDoc = true;
        return Task.FromResult(ds.Count);
    }
    public Task<bool> DanhDauDaDocAsync(int tk, int id, CancellationToken ct)
    {
        var x = Ds.FirstOrDefault(d => d.TaiKhoan == tk && d.Tb.Id == id);
        if (x.Tb is null) return Task.FromResult(false);
        x.Tb.DaDoc = true; return Task.FromResult(true);
    }
    public Task ThemAsync(IReadOnlyList<int> taiKhoanIds, string loai, string noiDung, CancellationToken ct)
    {
        foreach (var tk in taiKhoanIds) Ds.Add((tk, new ThongBaoDto { Id = Ds.Count + 1, Loai = loai, NoiDung = noiDung }));
        return Task.CompletedTask;
    }
}

public class ThongBaoAdminTests
{
    [Fact]
    public async Task ChiLayKhachHuy_DemSoChuaDoc()
    {
        var s = new FakeThongBaoStore();
        s.Ds.Add((1, new ThongBaoDto { Id = 1, Loai = "KHACH_HUY", NoiDung = "An huỷ" }));
        s.Ds.Add((1, new ThongBaoDto { Id = 2, Loai = "KHACH_HUY", NoiDung = "Cúc huỷ", DaDoc = true }));
        s.Ds.Add((1, new ThongBaoDto { Id = 3, Loai = "VAO", NoiDung = "xe vào" }));
        var kq = await new LayThongBaoAdminUseCase(s).ThucHienAsync(1);
        Assert.Equal(2, kq.ThongBao.Count);
        Assert.Equal(1, kq.SoChuaDoc);
    }

    [Fact]
    public async Task DanhDauThongBaoCuaNguoiKhac_BaoKhongTimThay()
    {
        var s = new FakeThongBaoStore();
        s.Ds.Add((1, new ThongBaoDto { Id = 1, Loai = "KHACH_HUY" }));
        var loi = await Assert.ThrowsAsync<LoiNghiepVu>(() => new DanhDauDaDocUseCase(s).ThucHienAsync(99, 1));
        Assert.Equal("KHONG_TIM_THAY_THONG_BAO", loi.Ma);
    }
}

public class HopThuTests
{
    [Fact]
    public async Task HopThuKhach_LayMoiLoai_DocHetChiCuaMinh()
    {
        var s = new FakeThongBaoStore();
        s.Ds.Add((2, new ThongBaoDto { Id = 1, Loai = "VAO" }));
        s.Ds.Add((2, new ThongBaoDto { Id = 2, Loai = "SAP_HET_HAN" }));
        s.Ds.Add((3, new ThongBaoDto { Id = 3, Loai = "VAO" }));
        var hop = await new LayHopThuUseCase(s).ThucHienAsync(2);
        Assert.Equal((2, 2), (hop.ThongBao.Count, hop.SoChuaDoc));
        Assert.Equal(2, await new DocHetUseCase(s).ThucHienAsync(2));
        Assert.Equal(0, await new DemChuaDocUseCase(s).ThucHienAsync(2));
        Assert.Equal(1, await new DemChuaDocUseCase(s).ThucHienAsync(3));
    }
}
