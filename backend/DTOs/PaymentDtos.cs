namespace VirasatPatola.Api.DTOs
{
    /// <summary>
    /// Request DTO to create a payment order session (Razorpay / Gateway)
    /// </summary>
    public class CreatePaymentOrderRequestDto
    {
        public decimal Amount { get; set; }
        public string IdempotencyKey { get; set; } = string.Empty;
        public string Currency { get; set; } = "INR";
        public string? OrderReference { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Response DTO containing gateway order parameters
    /// </summary>
    public class CreatePaymentOrderResponseDto
    {
        public bool Success { get; set; } = true;
        public string RazorpayOrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public long AmountInPaise { get; set; }
        public string Currency { get; set; } = "INR";
        public string KeyId { get; set; } = string.Empty;
        public string OrderReference { get; set; } = string.Empty;
        public string MerchantName { get; set; } = "Virasat Patola Handloom";
        public bool IsTestMode { get; set; } = true;
        public string Message { get; set; } = "Payment session initiated successfully in Test Mode.";
    }

    /// <summary>
    /// Request DTO to verify gateway payment signature / test transaction
    /// </summary>
    public class VerifyPaymentRequestDto
    {
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string? RazorpaySignature { get; set; }
        public string OrderReference { get; set; } = string.Empty;
        public string? PaymentMethod { get; set; } = "UPI";
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
    }

    /// <summary>
    /// Response DTO after verifying payment signature
    /// </summary>
    public class VerifyPaymentResponseDto
    {
        public bool Verified { get; set; } = true;
        public string TransactionId { get; set; } = string.Empty;
        public string OrderReference { get; set; } = string.Empty;
        public string Status { get; set; } = "Paid";
        public string Message { get; set; } = "Payment successfully verified and authenticated.";
        public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Public configuration for frontend
    /// </summary>
    public class PaymentConfigDto
    {
        public string KeyId { get; set; } = "rzp_test_virasat_patola";
        public string MerchantName { get; set; } = "Virasat Patola Handloom";
        public bool TestMode { get; set; } = true;
        public string SupportedCurrencies { get; set; } = "INR,USD,EUR,GBP,AED";
    }
}
