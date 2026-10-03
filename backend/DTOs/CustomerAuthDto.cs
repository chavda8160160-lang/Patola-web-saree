using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class CustomerRegisterDto
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Name must be at least 2 characters.")]
        public string CustomerName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mobile Number is required.")]
        [RegularExpression(@"^[6-9]\d{9}$", ErrorMessage = "Please enter a valid 10-digit Indian mobile number.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 4, ErrorMessage = "Password must be at least 4 characters.")]
        public string Password { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        public string? Email { get; set; }

        public string? DeliveryAddress { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
    }

    public class CustomerLoginDto
    {
        [Required(ErrorMessage = "Mobile Number is required.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;
    }

    public class CustomerProfileUpdateDto
    {
        [Required]
        public string CustomerName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? DeliveryAddress { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
    }

    public class CustomerChangePasswordDto
    {
        public string? PhoneNumber { get; set; }

        [Required(ErrorMessage = "Current Password is required.")]
        public string OldPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New Password is required.")]
        [StringLength(100, MinimumLength = 4, ErrorMessage = "New password must be at least 4 characters.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
