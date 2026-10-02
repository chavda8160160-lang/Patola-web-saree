using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class OrderStatusUpdateDto
    {
        [Required(ErrorMessage = "Status is required.")]
        [StringLength(100)]
        public string Status { get; set; } = string.Empty;

        public int Stage { get; set; } = 1;

        public string? CourierPartner { get; set; }

        public string? TrackingAwb { get; set; }
    }

    public class UpdatePaymentStatusDto
    {
        public string? OrderReference { get; set; }
        public int? OrderId { get; set; }

        [Required(ErrorMessage = "Payment status is required.")]
        public string PaymentStatus { get; set; } = "Paid";

        public string? TransactionId { get; set; }
    }

    public class VerifyCustomerOtpDto
    {
        public string? OrderReference { get; set; }
        public int? OrderId { get; set; }

        public string? OrderConfirmationOtp { get; set; }

        private string? _otp;
        public string Otp
        {
            get => !string.IsNullOrWhiteSpace(_otp) ? _otp : (OrderConfirmationOtp ?? string.Empty);
            set => _otp = value;
        }
    }

    public class VerifyDeliveryOtpDto
    {
        public string? OrderReference { get; set; }
        public int? OrderId { get; set; }

        [Required(ErrorMessage = "Delivery OTP is required.")]
        public string Otp { get; set; } = string.Empty;
    }
}
