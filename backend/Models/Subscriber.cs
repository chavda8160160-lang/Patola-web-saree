using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirasatPatola.Api.Models
{
    [Table("Subscribers")]
    public class Subscriber
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
    }
}
