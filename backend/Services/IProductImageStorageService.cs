using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Services;

public interface IProductImageStorageService
{
    void StoreImages(Saree saree);
    Task MigrateLegacyImagesAsync(CancellationToken cancellationToken = default);
}
