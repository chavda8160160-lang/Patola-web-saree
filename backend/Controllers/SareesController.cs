/* ====================================================================================================
 * File Name: SareesController.cs
 * Folder: backend/Controllers/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This API Controller provides HTTP Endpoints for the Saree Catalog.
 * Rather than connecting directly to the Database, it utilizes Dependency Injection
 * with 'ISareeRepository' to execute SQL Server Stored Procedures.
 * 
 * API Endpoints:
 * - GET  /api/sarees          -> Stored Procedure: sp_GetSarees
 * - GET  /api/sarees/{id}     -> Stored Procedure: sp_GetSareeById
 * - POST /api/sarees          -> Add new saree to catalog
 * ==================================================================================================== */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Services;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class SareesController : ControllerBase
    {
        private readonly ISareeRepository _sareeRepository;
        private readonly IMemoryCache _cache;
        private readonly IProductImageStorageService _imageStorage;
        private static int _catalogCacheVersion = 1;
        private static readonly TimeSpan DefaultLeaseDuration = TimeSpan.FromMinutes(10);

        private sealed record CacheLeaseEntry<T>(T Data, DateTime GrantedAtUtc, DateTime ExpiresAtUtc);
        private sealed record SareeScrollCursor(decimal Price, string Id);

        // Dependency Injection: ISareeRepository and IMemoryCache injected
        public SareesController(ISareeRepository sareeRepository, IMemoryCache cache, IProductImageStorageService imageStorage)
        {
            _sareeRepository = sareeRepository;
            _cache = cache;
            _imageStorage = imageStorage;
        }

        private static void InvalidateCache()
        {
            Interlocked.Increment(ref _catalogCacheVersion);
        }

        private bool TryGetFromLease<T>(string cacheKey, out T? data)
        {
            data = default;
            if (_cache.TryGetValue(cacheKey, out CacheLeaseEntry<T>? lease) && lease != null)
            {
                var remainingSeconds = Math.Max(0, (int)(lease.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds);
                if (remainingSeconds > 0)
                {
                    Response.Headers["X-Cache"] = "HIT-RAM-LEASE";
                    Response.Headers["X-Cache-Lease-Remaining"] = $"{remainingSeconds}s";
                    data = lease.Data;
                    return true;
                }
            }
            return false;
        }

        private void SetCacheLease<T>(string cacheKey, T data, TimeSpan? customLease = null)
        {
            var duration = customLease ?? DefaultLeaseDuration;
            var grantedAt = DateTime.UtcNow;
            var expiresAt = grantedAt.Add(duration);
            var lease = new CacheLeaseEntry<T>(data, grantedAt, expiresAt);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(duration);

            _cache.Set(cacheKey, lease, cacheOptions);
            Response.Headers["X-Cache"] = "MISS-LEASE-GRANTED";
            Response.Headers["X-Cache-Lease-Duration"] = $"{duration.TotalMinutes}m";
            Response.Headers["X-Cache-Lease-Remaining"] = $"{(int)duration.TotalSeconds}s";
        }

        /// <summary>
        /// Retrieve sarees via Stored Procedure 'sp_GetSarees' with Cache Lease
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Saree>>> GetSarees(
            [FromQuery] string? category,
            [FromQuery] string? motif,
            [FromQuery] string? search,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice)
        {
            string cacheKey = $"sarees_v{_catalogCacheVersion}_{category ?? "all"}_{motif ?? "all"}_{search ?? "all"}_{minPrice ?? 0}_{maxPrice ?? 0}";

            if (TryGetFromLease<IEnumerable<Saree>>(cacheKey, out var cachedSarees) && cachedSarees != null)
            {
                return Ok(cachedSarees);
            }

            var sarees = await _sareeRepository.GetSareesAsync(category, motif, search, minPrice, maxPrice);

            SetCacheLease(cacheKey, sarees, DefaultLeaseDuration);
            return Ok(sarees);
        }

        /// <summary>
        /// Returns a bounded catalog batch for storefront infinite scrolling.
        /// The cursor is an opaque continuation token; no numbered pages are shown to customers.
        /// </summary>
        [HttpGet("scroll")]
        public async Task<IActionResult> GetSareesForScroll(
            [FromQuery] string? category,
            [FromQuery] string? motif,
            [FromQuery] string? cursor,
            [FromQuery] int? limit)
        {
            decimal? afterPrice = null;
            string? afterId = null;
            if (!string.IsNullOrWhiteSpace(cursor))
            {
                if (cursor.Length > 512 || !TryDecodeScrollCursor(cursor, out var decodedCursor))
                    return BadRequest(new { message = "The catalog continuation cursor is invalid." });
                afterPrice = decodedCursor.Price;
                afterId = decodedCursor.Id;
            }

            var pageSize = Math.Clamp(limit ?? 24, 8, 48);
            var cacheKey = $"saree_scroll_v{_catalogCacheVersion}_{category ?? "all"}_{motif ?? "all"}_{cursor ?? "first"}_{pageSize}";
            if (TryGetFromLease<object>(cacheKey, out var cachedPage) && cachedPage != null)
            {
                return Ok(cachedPage);
            }

            var (items, hasMore) = await _sareeRepository.GetSareesPageAsync(category, motif, afterPrice, afterId, pageSize);
            var response = new
            {
                items,
                nextCursor = hasMore && items.Count > 0
                    ? EncodeScrollCursor(items[^1].BasePriceINR, items[^1].Id)
                    : null
            };

            SetCacheLease(cacheKey, (object)response, DefaultLeaseDuration);
            return Ok(response);
        }

        private static string EncodeScrollCursor(decimal price, string id)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(new SareeScrollCursor(price, id));
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json))
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static bool TryDecodeScrollCursor(string cursor, out SareeScrollCursor decoded)
        {
            decoded = new SareeScrollCursor(0, string.Empty);
            try
            {
                var base64 = cursor.Replace('-', '+').Replace('_', '/');
                base64 += new string('=', (4 - base64.Length % 4) % 4);
                var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(base64));
                var parsed = System.Text.Json.JsonSerializer.Deserialize<SareeScrollCursor>(json);
                if (parsed == null || string.IsNullOrWhiteSpace(parsed.Id)) return false;
                decoded = parsed;
                return true;
            }
            catch (FormatException)
            {
                return false;
            }
            catch (System.Text.Json.JsonException)
            {
                return false;
            }
        }

        /// <summary>
        /// Retrieve saree by ID via Stored Procedure 'sp_GetSareeById' with Cache Lease
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Saree>> GetSareeById(string id)
        {
            string cacheKey = $"saree_v{_catalogCacheVersion}_{id}";

            if (TryGetFromLease<Saree>(cacheKey, out var cachedSaree) && cachedSaree != null)
            {
                return Ok(cachedSaree);
            }

            var saree = await _sareeRepository.GetSareeByIdAsync(id);
            if (saree == null)
            {
                return NotFound(new { message = $"Saree with ID '{id}' was not found in our catalog." });
            }

            SetCacheLease(cacheKey, saree, DefaultLeaseDuration);
            return Ok(saree);
        }

        /// <summary>
        /// Add new saree (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [RequestSizeLimit(25 * 1024 * 1024)]
        public async Task<ActionResult<Saree>> CreateSaree([FromBody] Saree newSaree)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                _imageStorage.StoreImages(newSaree);
            }
            catch (InvalidDataException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var created = await _sareeRepository.CreateSareeAsync(newSaree);
            InvalidateCache();
            return Ok(created);
        }

        /// <summary>
        /// Update existing saree details (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        [RequestSizeLimit(25 * 1024 * 1024)]
        public async Task<ActionResult<Saree>> UpdateSaree(string id, [FromBody] Saree updatedSaree)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                _imageStorage.StoreImages(updatedSaree);
            }
            catch (InvalidDataException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var updated = await _sareeRepository.UpdateSareeAsync(id, updatedSaree);
            if (updated == null)
            {
                return NotFound(new { message = $"Saree with ID '{id}' was not found." });
            }

            InvalidateCache();
            return Ok(updated);
        }

        /// <summary>
        /// Delete saree (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSaree(string id)
        {
            var deleted = await _sareeRepository.DeleteSareeAsync(id);
            if (!deleted)
            {
                return NotFound(new { message = $"Saree with ID '{id}' was not found." });
            }

            InvalidateCache();
            return Ok(new { success = true, message = $"Saree '{id}' was deleted successfully from catalog." });
        }

        /// <summary>
        /// Update saree stock status (In Stock / Out of Stock) and quantity (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/stock")]
        public async Task<ActionResult<Saree>> UpdateStockStatus(string id, [FromBody] StockUpdateDto dto)
        {
            var updated = await _sareeRepository.UpdateStockStatusAsync(id, dto.IsOutOfStock, dto.StockStatus, dto.StockQuantity);
            if (updated == null)
            {
                return NotFound(new { message = $"Saree with ID '{id}' was not found." });
            }

            InvalidateCache();
            return Ok(updated);
        }
    }
}
