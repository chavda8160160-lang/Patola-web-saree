using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirasatPatola.Api.Models
{
    [Table("Sarees")]
    public class Saree
    {
        [Key]
        [MaxLength(100)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        public int DiscountPercent { get; set; } = 0; // 0, 5, 10, 15, 20, 25, 30

        [Column(TypeName = "decimal(18,2)")]
        public decimal FinalPriceINR { get; set; } = 0; // Auto-calculated: BasePriceINR - discount

        [Required]
        [MaxLength(250)]
        public string Weave { get; set; } = "Double Ikat Handloom";

        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = "double-ikat"; // double-ikat, single-ikat, bridal, royal-heirloom

        [Required]
        [MaxLength(100)]
        public string Motif { get; set; } = "nari-kunjar"; // nari-kunjar, ratanchowk, chhabdi, pan-bhat

        [MaxLength(500)]
        public string MotifName { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePriceINR { get; set; }

        [MaxLength(250)]
        public string TimeToWeave { get; set; } = "9 Months Handcrafted";

        public string Image { get; set; } = string.Empty;

        public string? ImagesJson { get; set; }

        [MaxLength(250)]
        public string Badge { get; set; } = "Masterpiece Double Ikat";

        public string Description { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Fabric { get; set; } = "100% Pure Mulberry Silk & Natural Dyes";

        [MaxLength(250)]
        public string Length { get; set; } = "6.30 Meters (Includes Blouse Piece)";

        [MaxLength(250)]
        public string Weight { get; set; } = "Approx. 850 grams";

        [MaxLength(500)]
        public string Colors { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Certification { get; set; } = "Silk Mark Certified Handloom";

        public bool IsOutOfStock { get; set; } = false;

        [MaxLength(250)]
        public string StockStatus { get; set; } = "In Stock";

        public int StockQuantity { get; set; } = 50;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
