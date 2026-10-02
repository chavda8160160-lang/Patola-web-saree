/* ====================================================================================================
 * File Name: CustomPhotoStorageService.cs
 * Folder: backend/Services/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * High-performance enterprise file storage for custom bespoke saree photos.
 * Decodes client-uploaded Base64 image payloads and writes them directly to physical disk:
 * 1. Root assets directory: assets/images/custom-bookings/
 * 2. Frontend public assets directory: frontend/public/assets/images/custom-bookings/
 * 
 * Returns clean, lightweight relative web paths (e.g. /assets/images/custom-bookings/cst_booking_xxx.jpg)
 * for storage in SQL Server Bookings table, keeping database queries fast and lightweight.
 * ==================================================================================================== */

using VirasatPatola.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace VirasatPatola.Api.Services
{
    public class CustomPhotoStorageService : ICustomPhotoStorageService
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<CustomPhotoStorageService> _logger;
        private readonly string _projectRoot;
        private readonly string _assetsDir;
        private readonly string _frontendPublicDir;

        public CustomPhotoStorageService(IWebHostEnvironment env, ILogger<CustomPhotoStorageService> logger)
        {
            _env = env;
            _logger = logger;

            _projectRoot = Path.GetFullPath(Path.Combine(_env.ContentRootPath, ".."));
            _assetsDir = Path.Combine(_projectRoot, "assets", "images", "custom-bookings");
            _frontendPublicDir = Path.Combine(_projectRoot, "frontend", "public", "assets", "images", "custom-bookings");

            EnsureDirectoriesExist();
        }

        private void EnsureDirectoriesExist()
        {
            try
            {
                if (!Directory.Exists(_assetsDir))
                {
                    Directory.CreateDirectory(_assetsDir);
                }

                var frontendPublicRoot = Path.Combine(_projectRoot, "frontend", "public");
                if (Directory.Exists(frontendPublicRoot) && !Directory.Exists(_frontendPublicDir))
                {
                    Directory.CreateDirectory(_frontendPublicDir);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not ensure custom booking photo directories exist.");
            }
        }

        public string? SaveBookingPhoto(string? rawPhotoInput, string? identifier = null)
        {
            if (string.IsNullOrWhiteSpace(rawPhotoInput))
            {
                return null;
            }

            var trimmed = rawPhotoInput.Trim();
            if (trimmed.Length > 7_000_000) return null;

            // Allow existing local asset paths only; do not persist arbitrary external URLs.
            if (trimmed.StartsWith("/assets/images/", StringComparison.Ordinal) && !trimmed.Contains("..", StringComparison.Ordinal))
                return trimmed;
            if (!trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) || !trimmed.Contains(";base64,", StringComparison.OrdinalIgnoreCase))
                return null;

            try
            {
                EnsureDirectoriesExist();

                string ext = ".jpg";
                if (trimmed.Contains("image/png", StringComparison.OrdinalIgnoreCase))
                {
                    ext = ".png";
                }
                else if (trimmed.Contains("image/webp", StringComparison.OrdinalIgnoreCase))
                {
                    ext = ".webp";
                }

                int base64MarkerIndex = trimmed.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
                string base64Payload = base64MarkerIndex >= 0 ? trimmed.Substring(base64MarkerIndex + 7).Trim() : trimmed;

                byte[] imageBytes = Convert.FromBase64String(base64Payload);
                if (imageBytes.Length == 0 || imageBytes.Length > 5_000_000) return null;
                bool validImage = ext switch
                {
                    ".png" => imageBytes.Length >= 8 && imageBytes[0] == 0x89 && imageBytes[1] == 0x50 && imageBytes[2] == 0x4E && imageBytes[3] == 0x47,
                    ".webp" => imageBytes.Length >= 12 && Encoding.ASCII.GetString(imageBytes, 0, 4) == "RIFF" && Encoding.ASCII.GetString(imageBytes, 8, 4) == "WEBP",
                    _ => imageBytes.Length >= 3 && imageBytes[0] == 0xFF && imageBytes[1] == 0xD8 && imageBytes[2] == 0xFF
                };
                if (!validImage) return null;

                string fileName = $"cst_booking_{Guid.NewGuid():N}{ext}";


                // Save to project root assets
                string path1 = Path.Combine(_assetsDir, fileName);
                File.WriteAllBytes(path1, imageBytes);

                // Save to frontend public assets if folder exists
                if (Directory.Exists(Path.Combine(_projectRoot, "frontend", "public")))
                {
                    string path2 = Path.Combine(_frontendPublicDir, fileName);
                    File.WriteAllBytes(path2, imageBytes);
                }

                string relativeWebUrl = $"/assets/images/custom-bookings/{fileName}";
                _logger.LogInformation("Saved custom booking reference photo to {WebUrl} ({Bytes} bytes)", relativeWebUrl, imageBytes.Length);

                return relativeWebUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save custom booking photo to disk.");
                // If writing file fails, do not throw fatal exception
                return null;
            }
        }

        /// <summary>
        /// Scans Bookings table on startup for any legacy Base64 photos, extracts them to disk,
        /// and updates the database row with clean relative web URLs.
        /// </summary>
        public static async Task MigrateLegacyBase64BookingsAsync(VirasatPatolaDbContext context, IWebHostEnvironment env, ILogger logger)
        {
            try
            {
                var projectRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, ".."));
                var assetsDir = Path.Combine(projectRoot, "assets", "images", "custom-bookings");
                var frontendPublicDir = Path.Combine(projectRoot, "frontend", "public", "assets", "images", "custom-bookings");

                if (!Directory.Exists(assetsDir)) Directory.CreateDirectory(assetsDir);
                if (Directory.Exists(Path.Combine(projectRoot, "frontend", "public")) && !Directory.Exists(frontendPublicDir))
                {
                    Directory.CreateDirectory(frontendPublicDir);
                }

                var legacyBookings = await context.Bookings
                    .Where(b => b.ReferencePhoto != null && b.ReferencePhoto.StartsWith("data:image"))
                    .ToListAsync();

                if (!legacyBookings.Any()) return;

                logger.LogInformation("Found {Count} legacy bookings with embedded Base64 photos. Migrating to disk...", legacyBookings.Count);

                foreach (var b in legacyBookings)
                {
                    try
                    {
                        var raw = b.ReferencePhoto!;
                        string ext = raw.Contains("image/png", StringComparison.OrdinalIgnoreCase) ? ".png" :
                                     raw.Contains("image/webp", StringComparison.OrdinalIgnoreCase) ? ".webp" : ".jpg";

                        int base64Idx = raw.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
                        string base64Payload = base64Idx >= 0 ? raw.Substring(base64Idx + 7).Trim() : raw.Trim();
                        byte[] bytes = Convert.FromBase64String(base64Payload);

                        string fileName = $"cst_booking_{b.Id}{ext}";
                        File.WriteAllBytes(Path.Combine(assetsDir, fileName), bytes);
                        if (Directory.Exists(Path.Combine(projectRoot, "frontend", "public")))
                        {
                            File.WriteAllBytes(Path.Combine(frontendPublicDir, fileName), bytes);
                        }

                        b.ReferencePhoto = $"/assets/images/custom-bookings/{fileName}";
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to migrate legacy photo for Booking #{Id}", b.Id);
                    }
                }

                await context.SaveChangesAsync();
                logger.LogInformation("Successfully migrated legacy Base64 photos to disk files.");
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not complete legacy Base64 photo migration.");
            }
        }
    }
}


