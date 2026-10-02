using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirasatPatola.Api.Models
{
    [Table("Orders")]
    public class Order
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string OrderReference { get; set; } = string.Empty; // e.g. VP-104829

        [Required]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? DeliveryAddress { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? State { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string PostalCode { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Currency { get; set; } = "INR";

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [MaxLength(250)]
        public string? PaymentMode { get; set; } = "UPI / NetBanking";

        [MaxLength(50)]
        public string? PaymentStatus { get; set; } = "Pending";

        [MaxLength(250)]
        public string? OrderStatus { get; set; } = "Pending";

        [MaxLength(20)]
        public string? OrderConfirmationOtp { get; set; }

        [MaxLength(20)]
        public string? DeliveryOtp { get; set; }

        [MaxLength(200)]
        public string? TransactionId { get; set; }

        public string? Notes { get; set; }

        [MaxLength(128)]
        public string? CheckoutIdempotencyKey { get; set; }

        [MaxLength(64)]
        public string? CheckoutIdempotencyFingerprint { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property for line items
        public List<OrderItem> Items { get; set; } = new();
    }
}
