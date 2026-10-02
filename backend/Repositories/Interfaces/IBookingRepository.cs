/* ====================================================================================================
 * File Name: IBookingRepository.cs
 * Folder: backend/Repositories/Interfaces/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This interface defines methods for consultation and loom studio visit bookings.
 * Invokes stored procedures when customer books video call or loom visit.
 * Stored Procedure is executed.
 * 
 * Connected Stored Procedure:
 * - sp_CreateBooking -> Saves new booking and returns new Booking ID (OUTPUT).
 * ==================================================================================================== */

using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Repositories.Interfaces
{
    public interface IBookingRepository
    {
        /// <summary>
        /// Gets list of all scheduled bookings.
        /// </summary>
        Task<IEnumerable<Booking>> GetAllBookingsAsync();

        /// <summary>
        /// Finds single booking by ID.
        /// </summary>
        Task<Booking?> GetBookingByIdAsync(int id);

        /// <summary>
        /// Saves new booking by calling Stored Procedure sp_CreateBooking.
        /// Returns: Generated Booking ID.
        /// </summary>
        Task<int> CreateBookingAsync(BookingRequestDto dto);

        /// <summary>
        /// Updates booking status (e.g. Cancelled, Completed, etc.).
        /// </summary>
        Task<bool> UpdateBookingStatusAsync(int id, string status);

        /// <summary>
        /// Deletes booking record.
        /// </summary>
        Task<bool> DeleteBookingAsync(int id);
    }
}
