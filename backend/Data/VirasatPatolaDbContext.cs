using Microsoft.EntityFrameworkCore;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Data
{
    public class VirasatPatolaDbContext : DbContext
    {
        public VirasatPatolaDbContext(DbContextOptions<VirasatPatolaDbContext> options)
            : base(options)
        {
        }

        public DbSet<Saree> Sarees => Set<Saree>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<DeletedOrder> DeletedOrders => Set<DeletedOrder>();
        public DbSet<Subscriber> Subscribers => Set<Subscriber>();
        public DbSet<Customer> Customers => Set<Customer>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Saree indices for fast searching and filtering
            modelBuilder.Entity<Saree>()
                .HasIndex(s => s.Category);
            modelBuilder.Entity<Saree>()
                .HasIndex(s => s.Motif);
            modelBuilder.Entity<Saree>()
                .HasIndex(s => new { s.BasePriceINR, s.Id });
            modelBuilder.Entity<Saree>()
                .HasIndex(s => s.CreatedAt);

            // Order reference unique index
            modelBuilder.Entity<Order>()
                .HasIndex(o => o.OrderReference)
                .IsUnique();

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.CheckoutIdempotencyKey)
                .IsUnique()
                .HasFilter("[CheckoutIdempotencyKey] IS NOT NULL");

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.CreatedAt);

            // Deleted orders index for audit lookups
            modelBuilder.Entity<DeletedOrder>()
                .HasIndex(d => d.OrderReference);
            modelBuilder.Entity<DeletedOrder>()
                .HasIndex(d => d.DeletedAt);

            // Customer indexes
            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.PhoneNumber)
                .IsUnique();
            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email);

            // Subscriber unique email index
            modelBuilder.Entity<Subscriber>()
                .HasIndex(s => s.Email)
                .IsUnique();

            // Order to OrderItem 1-to-many relationship
            modelBuilder.Entity<OrderItem>()
                .HasOne(i => i.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
