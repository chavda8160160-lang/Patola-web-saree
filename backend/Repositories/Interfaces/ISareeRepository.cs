/* ====================================================================================================
 * File Name: ISareeRepository.cs
 * Folder: backend/Repositories/Interfaces/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This interface defines database functions for Patola Saree Catalog.
 * Part of Repository Pattern. Controller interacts with stored procedures 
 * via this interface.
 * 
 * Connected Stored Procedures:
 * 1. sp_GetSarees       -> Get list of all Patola sarees with filters and search.
 * 2. sp_GetSareeById    -> Get saree details by specific ID.
 * ==================================================================================================== */

using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Repositories.Interfaces
{
    public interface ISareeRepository
    {
        /// <summary>
        /// Gets sarees list by calling Stored Procedure sp_GetSarees.
        /// Filters: Category, Motif, Search term, Price Range.
        /// </summary>
        Task<IEnumerable<Saree>> GetSareesAsync(string? category, string? motif, string? search, decimal? minPrice, decimal? maxPrice);

        /// <summary>
        /// Gets one bounded catalog batch for storefront infinite scrolling.
        /// </summary>
        Task<(IReadOnlyList<Saree> Items, bool HasMore)> GetSareesPageAsync(
            string? category, string? motif, decimal? afterPrice, string? afterId, int pageSize);

        /// <summary>
        /// Gets single saree by calling Stored Procedure sp_GetSareeById.
        /// </summary>
        Task<Saree?> GetSareeByIdAsync(string id);

        /// <summary>
        /// Add new saree (Admin Catalog Expansion).
        /// </summary>
        Task<Saree> CreateSareeAsync(Saree saree);

        /// <summary>
        /// Update existing saree details (Admin Catalog Management).
        /// </summary>
        Task<Saree?> UpdateSareeAsync(string id, Saree updatedSaree);

        /// <summary>
        /// Delete saree.
        /// </summary>
        Task<bool> DeleteSareeAsync(string id);

        /// <summary>
        /// Update saree stock status (In Stock / Out of Stock) and quantity.
        /// </summary>
        Task<Saree?> UpdateStockStatusAsync(string id, bool isOutOfStock, string? stockStatus, int? stockQuantity = null);
    }
}
