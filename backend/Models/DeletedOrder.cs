using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirasatPatola.Api.Models
{
    /// <summary>
    /// Permanent Audit / Archive table for orders deleted by the Admin.
    /// Preserves full historical snapshot including items, financial totals, customer details, and deletion timestamp.
    /// </summary>
    [Table("DeletedOrders")]
    public class DeletedOrder
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string OrderReference { get; set; } = string.Empty; // e.g. VP-104829

        [Required]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Email { get; set; }

        [MaxLength(1000)]
        public string DeliveryAddress { get; set; } = string.Empty;

        [MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [MaxLength(30)]
        public string PostalCode { get; set; } = string.Empty;

        [MaxLength(100)]
        public string State { get; set; } = string.Empty;

        [MaxLength(10)]
        public string Currency { get; set; } = "INR";

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [MaxLength(250)]
        public string PaymentMode { get; set; } = "UPI / NetBanking";

        [MaxLength(250)]
        public string LastOrderStatus { get; set; } = "Confirmed";

        public DateTime OriginalCreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime DeletedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(150)]
        public string DeletedBy { get; set; } = "Store Admin / Manager";

        /// <summary>
        /// JSON snapshot of all line items (saree title, unit price, quantity, line total, etc.)
        /// </summary>
        public string ItemsJson { get; set; } = "[]";
    }
}
