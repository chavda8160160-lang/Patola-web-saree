using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class UpdateBookingStatusDto
    {
        [Required(ErrorMessage = "Status is required.")]
        [StringLength(50)]
        public string Status { get; set; } = "Confirmed";
    }
}
