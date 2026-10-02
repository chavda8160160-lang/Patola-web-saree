using System.ComponentModel.DataAnnotations;

namespace VirasatPatola.Api.DTOs
{
    public class BookingRequestDto
    {
        [StringLength(150)]
        public string? FullName { get; set; } = "Valued Patron";

        [Phone]
        [StringLength(20)]
        public string? Phone { get; set; } = "9825012345";

        [EmailAddress]
        [StringLength(200)]
        public string? Email { get; set; } = "patron@patolacustomer.com";

        [StringLength(100)]
        public string? ExperienceType { get; set; } = "Virtual Video Call";

        public string? PreferredDate { get; set; }

        [StringLength(100)]
        public string? MotifPreference { get; set; } = "Nari Kunjar";

        
        public string? Notes { get; set; }
        
        public string? ReferencePhoto { get; set; }

        public DateTime ParsedPreferredDate
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(PreferredDate) && DateTime.TryParse(PreferredDate, out var dt))
                {
                    return dt;
                }
                return DateTime.UtcNow.AddDays(7);
            }
        }
    }
}

