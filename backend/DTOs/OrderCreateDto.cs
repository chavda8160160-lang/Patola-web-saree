using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class OrderCreateDto
    {
        [Required(ErrorMessage = "Recipient Name is required.")]
        [StringLength(150)]
        public string CustomerName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact phone is required.")]
        [StringLength(50)]
        public string ContactPhone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Delivery address is required.")]
        [StringLength(300)]
        public string DeliveryAddress { get; set; } = string.Empty;

        [Required(ErrorMessage = "City is required.")]
        [StringLength(100)]
        public string City { get; set; } = string.Empty;

        [Required(ErrorMessage = "State is required.")]
        [StringLength(100)]
        public string State { get; set; } = string.Empty;

        [Required(ErrorMessage = "Postal code is required.")]
        [StringLength(30)]
        public string PostalCode { get; set; } = string.Empty;

        public string Currency { get; set; } = "INR";

        [Required(ErrorMessage = "Checkout idempotency key is required.")]
        [StringLength(128, MinimumLength = 16)]
        public string IdempotencyKey { get; set; } = string.Empty;

        // Set by the API after canonicalizing the submitted checkout payload.
        public string? IdempotencyFingerprint { get; set; }

        public string PaymentMode { get; set; } = "UPI / NetBanking";

        public string? RazorpayOrderId { get; set; }

        public string? TransactionId { get; set; }

        public string? DeliveryOtp { get; set; }

        public string? OrderConfirmationOtp { get; set; }

        [StringLength(128)]
        public string? PhoneVerificationToken { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one saree item must be included in the order.")]
        public List<OrderItemDto> Items { get; set; } = new();
    }

    public class OrderItemDto
    {
        [Required]
        public string SareeId { get; set; } = string.Empty;

        [Required]
        public string SareeTitle { get; set; } = string.Empty;

        public decimal UnitPrice { get; set; }

        public int Quantity { get; set; } = 1;
    }
}
