using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class NewsletterDto
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Valid email is required.")]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;
    }
}
