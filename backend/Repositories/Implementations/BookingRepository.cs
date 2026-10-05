
/* ====================================================================================================
 * File Name: BookingRepository.cs
 * Folder: backend/Repositories/Implementations/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This class implements IBookingRepository.
 * When a customer books a loom visit or video consultation, this repository calls
 * SQL Server Stored Procedure 'sp_CreateBooking' to obtain a new Booking ID.
 * 
 * Stored Procedure Called:
 * EXEC [dbo].[sp_CreateBooking] @FullName, @Phone, @Email, @ExperienceType, @PreferredDate, @MotifPreference, @Notes, @NewBookingId OUTPUT
 * ==================================================================================================== */

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;

namespace VirasatPatola.Api.Repositories.Implementations
{
    public class BookingRepository : IBookingRepository
    {
        private readonly VirasatPatolaDbContext _context;
        private readonly Services.ICustomPhotoStorageService _photoStorage;

        public BookingRepository(VirasatPatolaDbContext context, Services.ICustomPhotoStorageService photoStorage)
        {
            _context = context;
            _photoStorage = photoStorage;
        }

        /// <summary>
        /// Retrieves all bookings.
        /// </summary>
        public async Task<IEnumerable<Booking>> GetAllBookingsAsync()
        {
            return await _context.Bookings
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Retrieves a specific booking by ID.
        /// </summary>
        public async Task<Booking?> GetBookingByIdAsync(int id)
        {
            return await _context.Bookings.FindAsync(id);
        }

        /// <summary>
        /// Creates a new booking by executing Stored Procedure 'sp_CreateBooking'.
        /// </summary>
        public async Task<int> CreateBookingAsync(BookingRequestDto dto)
        {
            // Process uploaded custom reference photo (Save Base64 to physical disk, keep database column clean)
            if (!string.IsNullOrWhiteSpace(dto.ReferencePhoto))
            {
                dto.ReferencePhoto = _photoStorage.SaveBookingPhoto(dto.ReferencePhoto, dto.Phone);
            }

            if (_context.Database.IsSqlServer())
            {
                var pFullName = new SqlParameter("@FullName", (dto.FullName ?? "Patron").Trim());
                var pPhone = new SqlParameter("@Phone", (dto.Phone ?? "9825012345").Trim());
                var pEmail = new SqlParameter("@Email", (dto.Email ?? "patron@patolacustomer.com").Trim().ToLowerInvariant());
                var pExperienceType = new SqlParameter("@ExperienceType", string.IsNullOrWhiteSpace(dto.ExperienceType) ? "Virtual Video Call" : dto.ExperienceType);
                var pPreferredDate = new SqlParameter("@PreferredDate", dto.ParsedPreferredDate.Date);
                var pMotifPreference = new SqlParameter("@MotifPreference", dto.MotifPreference ?? "Nari Kunjar");
                var pNotes = new SqlParameter("@Notes", (object?)dto.Notes ?? DBNull.Value);
                var pReferencePhoto = new SqlParameter("@ReferencePhoto", (object?)dto.ReferencePhoto ?? DBNull.Value);

                var pNewBookingId = new SqlParameter
                {
                    ParameterName = "@NewBookingId",
                    SqlDbType = SqlDbType.Int,
                    Direction = ParameterDirection.Output
                };

                // Execute Stored Procedure
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC [dbo].[sp_CreateBooking] @FullName, @Phone, @Email, @ExperienceType, @PreferredDate, @MotifPreference, @Notes, @ReferencePhoto, @NewBookingId OUTPUT",
                    pFullName, pPhone, pEmail, pExperienceType, pPreferredDate, pMotifPreference, pNotes, pReferencePhoto, pNewBookingId);

                return (int)(pNewBookingId.Value ?? 0);
            }
            else
            {
                // In-Memory Fallback
                var booking = new Booking
                {
                    FullName = (dto.FullName ?? "Patron").Trim(),
                    Phone = (dto.Phone ?? "9825012345").Trim(),
                    Email = (dto.Email ?? "patron@patolacustomer.com").Trim().ToLowerInvariant(),
                    ExperienceType = string.IsNullOrWhiteSpace(dto.ExperienceType) ? "Virtual Video Call" : dto.ExperienceType,
                    PreferredDate = dto.ParsedPreferredDate,
                    MotifPreference = dto.MotifPreference ?? "Nari Kunjar",
                    Notes = dto.Notes,
                    ReferencePhoto = dto.ReferencePhoto,
                    Status = "Confirmed",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();
                return booking.Id;
            }
        }

        /// <summary>
        /// Updates booking status (Cancelled, Completed, Weaving, etc.).
        /// </summary>
        public async Task<bool> UpdateBookingStatusAsync(int id, string status)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return false;

            var cleanStatus = string.IsNullOrWhiteSpace(status) ? "Confirmed" : status.Trim();
            if (cleanStatus.Length > 50) cleanStatus = cleanStatus.Substring(0, 50);

            booking.Status = cleanStatus;
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Permanently deletes a booking record and archives snapshot to DeletedOrders table.
        /// </summary>
        public async Task<bool> DeleteBookingAsync(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return false;

            try
            {
                bool isCustom = (booking.ExperienceType ?? "").ToLower().Contains("custom") ||
                                (booking.ExperienceType ?? "").ToLower().Contains("bespoke") ||
                                (booking.Notes ?? "").ToLower().Contains("[bespoke custom patola]");

                string refPrefix = isCustom ? "CST" : "BK";
                string orderRef = $"{refPrefix}-{booking.Id}";

                var itemsList = new List<object>
                {
                    new
                    {
                        sareeId = $"custom-{booking.Id}",
                        sareeTitle = isCustom ? $"Bespoke Custom Patola ({booking.MotifPreference ?? "Custom Motif"})" : $"Loom Studio Visit ({booking.ExperienceType ?? "Consultation"})",
                        unitPrice = 0m,
                        quantity = 1,
                        lineTotal = 0m
                    }
                };

                var archived = new DeletedOrder
                {
                    OrderReference = orderRef,
                    CustomerName = booking.FullName ?? "Valued Patron",
                    ContactPhone = booking.Phone ?? "",
                    Email = booking.Email ?? "",
                    DeliveryAddress = booking.Notes ?? "",
                    City = "",
                    PostalCode = "",
                    State = "",
                    Currency = "INR",
                    TotalAmount = 0m,
                    PaymentMode = isCustom ? "Bespoke Loom Commission" : "Studio Consultation",
                    LastOrderStatus = booking.Status ?? "Active",
                    OriginalCreatedAt = booking.CreatedAt,
                    DeletedAt = DateTime.UtcNow,
                    DeletedBy = "Store Admin / Manager",
                    ItemsJson = System.Text.Json.JsonSerializer.Serialize(itemsList)
                };

                _context.DeletedOrders.Add(archived);
            }
            catch { }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
