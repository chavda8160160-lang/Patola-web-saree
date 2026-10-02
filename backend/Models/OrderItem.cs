using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace VirasatPatola.Api.Models
{
    [Table("OrderItems")]
    public class OrderItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int OrderId { get; set; }

        [ForeignKey("OrderId")]
        [JsonIgnore]
        public Order? Order { get; set; }

        [Required]
        [MaxLength(200)]
        public string SareeId { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string SareeTitle { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        public int Quantity { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal LineTotal { get; set; }
    }
}
