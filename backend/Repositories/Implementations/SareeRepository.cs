/* ====================================================================================================
 * File Name: SareeRepository.cs
 * Folder: backend/Repositories/Implementations/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This class implements ISareeRepository.
 * It queries SQL Server Stored Procedures to fetch saree catalog lists and details.
 * If SQL Server is unavailable, it gracefully utilizes a secure In-Memory fallback for local development.
 * 
 * Stored Procedures Called:
 * 1. EXEC [dbo].[sp_GetSarees] @Category, @Motif, @Search, @MinPrice, @MaxPrice
 * 2. EXEC [dbo].[sp_GetSareeById] @Id
 * ==================================================================================================== */

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;

namespace VirasatPatola.Api.Repositories.Implementations
{
    public class SareeRepository : ISareeRepository
    {
        private readonly VirasatPatolaDbContext _context;

        public SareeRepository(VirasatPatolaDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Fetches sarees via Stored Procedure 'sp_GetSarees'.
        /// </summary>
        public async Task<IEnumerable<Saree>> GetSareesAsync(
            string? category, string? motif, string? search, decimal? minPrice, decimal? maxPrice)
        {
            if (_context.Database.IsSqlServer())
            {
                // Prepare SQL Server Stored Procedure Parameters
                var pCategory = new SqlParameter("@Category", (object?)category ?? DBNull.Value);
                var pMotif = new SqlParameter("@Motif", (object?)motif ?? DBNull.Value);
                var pSearch = new SqlParameter("@Search", (object?)search ?? DBNull.Value);
                var pMinPrice = new SqlParameter("@MinPrice", (object?)minPrice ?? DBNull.Value);
                var pMaxPrice = new SqlParameter("@MaxPrice", (object?)maxPrice ?? DBNull.Value);

                // Execute Stored Procedure
                return await _context.Sarees
                    .FromSqlRaw("EXEC [dbo].[sp_GetSarees] @Category, @Motif, @Search, @MinPrice, @MaxPrice",
                        pCategory, pMotif, pSearch, pMinPrice, pMaxPrice)
                    .ToListAsync();
            }
            else
            {
                // In-Memory Database Fallback (when SQL Server is disconnected)
                var query = _context.Sarees.AsQueryable();

                if (!string.IsNullOrWhiteSpace(category) && category.ToLower() != "all")
                    query = query.Where(s => s.Category.ToLower() == category.ToLower());

                if (!string.IsNullOrWhiteSpace(motif) && motif.ToLower() != "all")
                    query = query.Where(s => s.Motif.ToLower() == motif.ToLower());

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var term = search.ToLower();
                    query = query.Where(s => s.Title.ToLower().Contains(term) ||
                                             s.MotifName.ToLower().Contains(term) ||
                                             s.Description.ToLower().Contains(term));
                }

                if (minPrice.HasValue) query = query.Where(s => s.BasePriceINR >= minPrice.Value);
                if (maxPrice.HasValue) query = query.Where(s => s.BasePriceINR <= maxPrice.Value);

                return await query.ToListAsync();
            }
        }

        public async Task<(IReadOnlyList<Saree> Items, bool HasMore)> GetSareesPageAsync(
            string? category, string? motif, decimal? afterPrice, string? afterId, int pageSize)
        {
            var query = _context.Sarees.AsNoTracking().AsQueryable();
            var selectedCategory = (category ?? "all").Trim().ToLowerInvariant().Replace("-", string.Empty).Replace(" ", string.Empty);

            if (selectedCategory is "allsaree" or "allsarees" or "saree")
            {
                query = query.Where(s => !s.Category.ToLower().Contains("dupatta")
                    && !s.Title.ToLower().Contains("dupatta")
                    && !s.Weave.ToLower().Contains("dupatta")
                    && !s.Id.ToLower().Contains("dupatta"));
            }
            else if (selectedCategory is "alldupatta" or "alldupattas" or "dupatta")
            {
                query = query.Where(s => s.Category.ToLower().Contains("dupatta")
                    || s.Title.ToLower().Contains("dupatta")
                    || s.Weave.ToLower().Contains("dupatta")
                    || s.Id.ToLower().Contains("dupatta"));
            }
            else if (selectedCategory is "doubledupatta" or "singledupatta" or "semidupatta")
            {
                var type = selectedCategory.StartsWith("double") ? "double"
                    : selectedCategory.StartsWith("single") ? "single" : "semi";
                query = query.Where(s =>
                    (s.Category.ToLower().Contains("dupatta") || s.Title.ToLower().Contains("dupatta")
                        || s.Weave.ToLower().Contains("dupatta") || s.Id.ToLower().Contains("dupatta"))
                    && (s.Category.ToLower().Contains(type) || s.Title.ToLower().Contains(type) || s.Weave.ToLower().Contains(type)));
            }
            else if (selectedCategory is "doubleikat" or "singleikat" or "semipatola" or "zaributa" or "modern")
            {
                var type = selectedCategory switch
                {
                    "doubleikat" => "double",
                    "singleikat" => "single",
                    "semipatola" => "semi",
                    "zaributa" => "zari",
                    _ => "modern"
                };
                query = query.Where(s =>
                    !s.Category.ToLower().Contains("dupatta") && !s.Title.ToLower().Contains("dupatta")
                    && !s.Weave.ToLower().Contains("dupatta") && !s.Id.ToLower().Contains("dupatta")
                    && (s.Category.ToLower().Contains(type) || s.Title.ToLower().Contains(type) || s.Weave.ToLower().Contains(type))
                    && (selectedCategory != "zaributa" || s.Title.ToLower().Contains("buta") || s.Category.ToLower().Contains("buta")
                        || s.Weave.ToLower().Contains("buta") || s.Title.ToLower().Contains("zari") || s.Category.ToLower().Contains("zari")
                        || s.Weave.ToLower().Contains("zari")));
            }
            else if (selectedCategory != "all")
            {
                query = query.Where(s => s.Category.ToLower() == selectedCategory);
            }

            if (!string.IsNullOrWhiteSpace(motif) && !string.Equals(motif, "all", StringComparison.OrdinalIgnoreCase))
            {
                var selectedMotif = motif.Trim().ToLowerInvariant();
                query = query.Where(s => s.Motif.ToLower() == selectedMotif);
            }

            if (afterPrice.HasValue && !string.IsNullOrWhiteSpace(afterId))
            {
                var priceCursor = afterPrice.Value;
                var idCursor = afterId;
                query = query.Where(s => s.BasePriceINR < priceCursor
                    || (s.BasePriceINR == priceCursor && string.Compare(s.Id, idCursor) > 0));
            }

            var rows = await query
                .OrderByDescending(s => s.BasePriceINR)
                .ThenBy(s => s.Id)
                .Take(pageSize + 1)
                .ToListAsync();

            var hasMore = rows.Count > pageSize;
            if (hasMore) rows.RemoveAt(rows.Count - 1);
            return (rows, hasMore);
        }

        /// <summary>
        /// Finds a single saree by ID via Stored Procedure 'sp_GetSareeById'.
        /// </summary>
        public async Task<Saree?> GetSareeByIdAsync(string id)
        {
            if (_context.Database.IsSqlServer())
            {
                var pId = new SqlParameter("@Id", id);
                var result = await _context.Sarees
                    .FromSqlRaw("EXEC [dbo].[sp_GetSareeById] @Id", pId)
                    .ToListAsync();

                return result.FirstOrDefault();
            }
            else
            {
                return await _context.Sarees.FindAsync(id);
            }
        }

        /// <summary>
        /// Adds a new saree.
        /// </summary>
        public async Task<Saree> CreateSareeAsync(Saree saree)
        {
            saree.CreatedAt = DateTime.UtcNow;

            if (saree.DiscountPercent < 0) saree.DiscountPercent = 0;
            if (saree.DiscountPercent > 100) saree.DiscountPercent = 100;
            saree.FinalPriceINR = saree.BasePriceINR - (saree.BasePriceINR * saree.DiscountPercent / 100m);

            if (saree.StockQuantity <= 0)
            {
                saree.IsOutOfStock = true;
                if (string.IsNullOrWhiteSpace(saree.StockStatus) || saree.StockStatus == "In Stock")
                {
                    saree.StockStatus = "Out of Stock (Loom Order Only)";
                }
            }
            _context.Sarees.Add(saree);
            await _context.SaveChangesAsync();
            return saree;
        }

        /// <summary>
        /// Updates existing saree details.
        /// </summary>
        public async Task<Saree?> UpdateSareeAsync(string id, Saree updatedSaree)
        {
            var existing = await _context.Sarees.FindAsync(id);
            if (existing == null) return null;

            existing.Title = updatedSaree.Title;
            existing.Weave = updatedSaree.Weave;
            existing.Category = updatedSaree.Category;
            existing.Motif = updatedSaree.Motif;
            existing.MotifName = updatedSaree.MotifName;
            existing.BasePriceINR = updatedSaree.BasePriceINR;
            existing.DiscountPercent = Math.Clamp(updatedSaree.DiscountPercent, 0, 100);
            existing.FinalPriceINR = existing.BasePriceINR - (existing.BasePriceINR * existing.DiscountPercent / 100m);
            existing.TimeToWeave = updatedSaree.TimeToWeave;
            if (!string.IsNullOrWhiteSpace(updatedSaree.Image)) existing.Image = updatedSaree.Image;
            if (!string.IsNullOrWhiteSpace(updatedSaree.ImagesJson)) existing.ImagesJson = updatedSaree.ImagesJson;
            existing.Badge = updatedSaree.Badge;
            existing.Description = updatedSaree.Description;
            existing.Fabric = updatedSaree.Fabric;
            existing.Length = updatedSaree.Length;
            existing.Weight = updatedSaree.Weight;
            existing.Colors = updatedSaree.Colors;
            existing.Certification = updatedSaree.Certification;
            existing.StockQuantity = Math.Max(0, updatedSaree.StockQuantity);
            existing.IsOutOfStock = existing.StockQuantity == 0 || updatedSaree.IsOutOfStock;
            existing.StockStatus = existing.IsOutOfStock ? "Out of Stock (Loom Order Only)" : "In Stock";

            await _context.SaveChangesAsync();
            return existing;
        }

        /// <summary>
        /// Deletes saree.
        /// </summary>
        public async Task<bool> DeleteSareeAsync(string id)
        {
            var saree = await _context.Sarees.FindAsync(id);
            if (saree == null)
            {
                return false;
            }

            _context.Sarees.Remove(saree);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Updates saree stock status (In Stock / Out of Stock) and quantity.
        /// </summary>
        public async Task<Saree?> UpdateStockStatusAsync(string id, bool isOutOfStock, string? stockStatus, int? stockQuantity = null)
        {
            var saree = await _context.Sarees.FindAsync(id);
            if (saree == null)
            {
                return null;
            }

            if (stockQuantity.HasValue)
            {
                saree.StockQuantity = Math.Max(0, stockQuantity.Value);
                if (saree.StockQuantity == 0)
                {
                    isOutOfStock = true;
                }
                else if (saree.StockQuantity > 0 && isOutOfStock)
                {
                    // If restocked with positive quantity, restore In Stock
                    isOutOfStock = false;
                }
            }
            else if (!isOutOfStock && saree.StockQuantity <= 0)
            {
                // If admin marks as in stock but quantity was 0, reset to default 50
                saree.StockQuantity = 50;
            }

            saree.IsOutOfStock = isOutOfStock;
            saree.StockStatus = !string.IsNullOrWhiteSpace(stockStatus)
                ? stockStatus
                : (isOutOfStock ? "Out of Stock (Loom Order Only)" : "In Stock");

            await _context.SaveChangesAsync();
            return saree;
        }
    }
}
