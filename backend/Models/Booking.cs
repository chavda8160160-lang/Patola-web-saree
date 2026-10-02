using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirasatPatola.Api.Models
{
    [Table("Bookings")]
    public class Booking
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(250)]
        public string ExperienceType { get; set; } = "Virtual Video Call"; // Virtual Video Call, Studio Loom Visit, etc.

        public DateTime PreferredDate { get; set; }

        [MaxLength(250)]
        public string MotifPreference { get; set; } = "Nari Kunjar";

        public string? Notes { get; set; }
        
        public string? ReferencePhoto { get; set; }

        [MaxLength(250)]
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Completed, Cancelled

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
