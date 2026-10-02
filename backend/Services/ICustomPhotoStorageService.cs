/* ====================================================================================================
 * File Name: ICustomPhotoStorageService.cs
 * Folder: backend/Services/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Interface for saving uploaded custom reference photos to physical disk storage
 * and returning clean, lightweight web URL paths (/assets/images/custom-bookings/...)
 * instead of storing megabyte-heavy Base64 strings directly in SQL Server.
 * ==================================================================================================== */

namespace VirasatPatola.Api.Services
{
    public interface ICustomPhotoStorageService
    {
        /// <summary>
        /// Saves raw base64 or photo data to physical disk file and returns web relative path.
        /// If input is already a web path or null, returns it unchanged.
        /// </summary>
        string? SaveBookingPhoto(string? rawPhotoInput, string? identifier = null);
    }
}
