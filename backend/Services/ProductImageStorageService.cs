using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Services;

public sealed class ProductImageStorageService : IProductImageStorageService
{
    private const int MaxImageBytes = 15 * 1024 * 1024; // 15 MB per image (supports 4K Ultra-HD photos)
    private readonly VirasatPatolaDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ProductImageStorageService> _logger;
    private readonly string _imageDirectory;

    public ProductImageStorageService(
        VirasatPatolaDbContext db,
        IWebHostEnvironment environment,
        ILogger<ProductImageStorageService> logger)
    {
        _db = db;
        _environment = environment;
        _logger = logger;
        _imageDirectory = Path.Combine(environment.ContentRootPath, "wwwroot", "uploads", "sarees");
    }

    public void StoreImages(Saree saree)
    {
        ArgumentNullException.ThrowIfNull(saree);
        var saved = new Dictionary<string, string>(StringComparer.Ordinal);
        saree.Image = StoreImageValue(saree.Image, saved);

        if (string.IsNullOrWhiteSpace(saree.ImagesJson)) return;
        try
        {
            var images = JsonSerializer.Deserialize<List<string>>(saree.ImagesJson);
            if (images is not null)
            {
                saree.ImagesJson = JsonSerializer.Serialize(images.Select(image => StoreImageValue(image, saved)));
            }
        }
        catch (JsonException)
        {
            // Keep legacy non-array or malformed values unchanged; catalog reads already handle these safely.
        }
    }

    public async Task MigrateLegacyImagesAsync(CancellationToken cancellationToken = default)
    {
        if (!_db.Database.IsSqlServer()) return;

        var sarees = await _db.Sarees
            .Where(s => s.Image.StartsWith("data:image") || (s.ImagesJson != null && s.ImagesJson.Contains("data:image")))
            .ToListAsync(cancellationToken);
        if (sarees.Count == 0) return;

        var migrated = 0;
        foreach (var saree in sarees)
        {
            try
            {
                StoreImages(saree);
                migrated++;
            }
            catch (Exception ex) when (ex is InvalidDataException or FormatException or IOException)
            {
                _logger.LogWarning(ex, "Could not migrate embedded product photos for saree {SareeId}.", saree.Id);
            }
        }

        if (migrated > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Migrated embedded photos for {Count} sarees to {Directory}.", migrated, _imageDirectory);
        }
    }

    private string StoreImageValue(string? value, IDictionary<string, string> saved)
    {
        if (string.IsNullOrWhiteSpace(value)) return value ?? string.Empty;
        var trimmed = value.Trim();
        if (!trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            if ((trimmed.StartsWith("/assets/images/", StringComparison.Ordinal)
                    || trimmed.StartsWith("/uploads/sarees/", StringComparison.Ordinal))
                && !trimmed.Contains("..", StringComparison.Ordinal))
                return trimmed;
            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
                return trimmed;
            throw new InvalidDataException("Product photos must be valid image data or a supported image URL.");
        }

        if (saved.TryGetValue(trimmed, out var existingUrl)) return existingUrl;
        var comma = trimmed.IndexOf(',');
        if (comma < 0 || !trimmed[..comma].Contains(";base64", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The uploaded image data is malformed.");

        var mimeType = trimmed[5..trimmed.IndexOf(';')].ToLowerInvariant();
        var (extension, signature) = mimeType switch
        {
            "image/jpeg" or "image/jpg" => (".jpg", new byte[] { 0xFF, 0xD8, 0xFF }),
            "image/png" => (".png", new byte[] { 0x89, 0x50, 0x4E, 0x47 }),
            "image/webp" => (".webp", Encoding.ASCII.GetBytes("RIFF")),
            _ => throw new InvalidDataException("Only JPEG, PNG, and WebP product photos are supported.")
        };

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(trimmed[(comma + 1)..]);
        }
        catch (FormatException ex)
        {
            throw new InvalidDataException("The uploaded image data is malformed.", ex);
        }

        if (bytes.Length == 0 || bytes.Length > MaxImageBytes || !HasSignature(bytes, signature, extension))
            throw new InvalidDataException("The image is empty, too large, or does not match its declared image format.");

        Directory.CreateDirectory(_imageDirectory);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(_imageDirectory, fileName);
        File.WriteAllBytes(destination, bytes);
        var url = $"/uploads/sarees/{fileName}";
        saved[trimmed] = url;
        return url;
    }

    private static bool HasSignature(byte[] bytes, byte[] signature, string extension)
    {
        if (bytes.Length < signature.Length) return false;
        if (!bytes.AsSpan(0, signature.Length).SequenceEqual(signature)) return false;
        return extension != ".webp"
            || (bytes.Length >= 12 && Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP");
    }
}
