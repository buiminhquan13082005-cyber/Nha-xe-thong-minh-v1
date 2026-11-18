namespace NhaXe.Modules.ThongBao.Application;

public class ThongBaoDto
{
    public int Id { get; set; }
    public string Loai { get; set; } = "";
    public string NoiDung { get; set; } = "";
    public DateTime GuiLuc { get; set; }
    public bool DaDoc { get; set; }
}

public record HopThuDto(int SoChuaDoc, IReadOnlyList<ThongBaoDto> ThongBao);
