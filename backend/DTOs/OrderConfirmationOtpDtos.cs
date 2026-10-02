using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs;

public sealed class SendOrderConfirmationOtpDto
{
    [Required, StringLength(20, MinimumLength = 10)]
    public string Phone { get; set; } = string.Empty;
}

public sealed class VerifyOrderConfirmationOtpDto
{
    [Required, StringLength(20, MinimumLength = 10)]
    public string Phone { get; set; } = string.Empty;

    [Required, RegularExpression("^[0-9]{6}$")]
    public string Code { get; set; } = string.Empty;
}

public sealed class VerifyOrderConfirmationOtpResponseDto
{
    public bool Verified { get; set; }
    public string VerificationToken { get; set; } = string.Empty;
}
