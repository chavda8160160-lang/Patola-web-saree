using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Services;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/virtual-tryon")]
    [Produces("application/json")]
    public class VirtualTryOnController : ControllerBase
    {
        private readonly VirasatPatolaDbContext _context;
        private readonly IVirtualTryOnService _tryOnService;
        private readonly ILogger<VirtualTryOnController> _logger;

        public VirtualTryOnController(
            VirasatPatolaDbContext context,
            IVirtualTryOnService tryOnService,
            ILogger<VirtualTryOnController> logger)
        {
            _context = context;
            _tryOnService = tryOnService;
            _logger = logger;
        }

        /// <summary>
        /// Generates a realistic AI Virtual Try-On preview for a customer photo wearing the specified Patola Saree.
        /// </summary>
        [HttpPost]
        [EnableRateLimiting("SensitiveLookup")]
        public async Task<IActionResult> GenerateTryOn([FromBody] VirtualTryOnRequestDto request, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid request parameters.", errors = ModelState });
            }

            if (string.IsNullOrWhiteSpace(request.ProductId))
            {
                return BadRequest(new { success = false, message = "A valid Patola product ID is required." });
            }

            if (string.IsNullOrWhiteSpace(request.PersonImageBase64))
            {
                return BadRequest(new { success = false, message = "Please upload a clear customer photo for the virtual try-on." });
            }

            // Security Validation: Validate image payload size (prevent DOS payload injection)
            if (request.PersonImageBase64.Length > 25 * 1024 * 1024)
            {
                return BadRequest(new { success = false, message = "Photo file is too large. Please upload an image under 15MB." });
            }

            // Security Validation: Basic MIME inspection
            var rawMime = request.PersonImageMimeType?.ToLowerInvariant() ?? string.Empty;
            if (!string.IsNullOrEmpty(rawMime) && 
                !rawMime.Contains("jpeg") && 
                !rawMime.Contains("jpg") && 
                !rawMime.Contains("png") && 
                !rawMime.Contains("webp") &&
                !rawMime.Contains("octet-stream"))
            {
                return BadRequest(new { success = false, message = "Unsupported image format. Please upload JPG, PNG, or WebP photo." });
            }

            // Load Saree directly from database to ensure genuine product data
            var saree = await _context.Sarees.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.ProductId, cancellationToken);
            if (saree == null)
            {
                return NotFound(new { success = false, message = "Selected Patola Saree was not found in the heritage vault." });
            }

            try
            {
                var result = await _tryOnService.ProcessTryOnAsync(request, saree, cancellationToken);
                return Ok(result);
            }
            catch (TimeoutException)
            {
                _logger.LogWarning("AI Try-On timed out for Saree ID {Id}", saree.Id);
                return StatusCode(StatusCodes.Status504GatewayTimeout, new
                {
                    success = false,
                    message = "AI Try-On service took too long to respond. Please try again with a lighter photo."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Virtual Try-On error for Saree ID {Id}", saree.Id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "We couldn't create your preview right now. Please try again."
                });
            }
        }
    }
}
