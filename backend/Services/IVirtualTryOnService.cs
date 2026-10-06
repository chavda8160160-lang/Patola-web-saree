using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Services
{
    public interface IVirtualTryOnService
    {
        Task<VirtualTryOnResponseDto> ProcessTryOnAsync(
            VirtualTryOnRequestDto request,
            Saree saree,
            CancellationToken cancellationToken = default);
    }
}
