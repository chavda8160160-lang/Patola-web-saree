using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class VirtualTryOnRequestDto
    {
        [Required]
        public string ProductId { get; set; } = string.Empty;

        [Required]
        public string PersonImageBase64 { get; set; } = string.Empty;

        public string? PersonImageMimeType { get; set; } = "image/jpeg";

        public string? DrapeStyle { get; set; } = "classic-gujarati"; // classic-gujarati, modern-nivi, bridal-pleated

        public string? SareeImageOverride { get; set; }

        public string? ApiKey { get; set; }
    }

    public class VirtualTryOnResponseDto
    {
        public bool Success { get; set; } = false;
        public string? GeneratedImageUrl { get; set; }
        public string? OriginalPersonImageUrl { get; set; }
        public string? ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal PriceINR { get; set; }
        public string? ProviderUsed { get; set; }
        public int ExecutionTimeMs { get; set; }
        public string? Message { get; set; }
    }
}
