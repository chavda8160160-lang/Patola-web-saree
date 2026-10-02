namespace VirasatPatola.Api.DTOs
{
    public class StockUpdateDto
    {
        public bool IsOutOfStock { get; set; }
        public string? StockStatus { get; set; }
        public int? StockQuantity { get; set; }
    }
}
