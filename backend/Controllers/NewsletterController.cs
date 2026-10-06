/* ====================================================================================================
 * File Name: NewsletterController.cs
 * Folder: backend/Controllers/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This API Controller handles subscriptions for the Royal Gazette newsletter.
 * When a customer enters their email in the footer, this controller uses 'INewsletterRepository'
 * to execute the SQL Server Stored Procedure 'sp_SubscribeNewsletter' and save it with duplicate checks.
 * 
 * API Endpoints:
 * - GET  /api/newsletter  -> View all subscribers
 * - POST /api/newsletter  -> Subscribe new email (Stored Procedure: sp_SubscribeNewsletter)
 * ==================================================================================================== */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class NewsletterController : ControllerBase
    {
        private readonly INewsletterRepository _newsletterRepository;

        // Dependency Injection: INewsletterRepository is injected
        public NewsletterController(INewsletterRepository newsletterRepository)
        {
            _newsletterRepository = newsletterRepository;
        }

        /// <summary>
        /// Get list of all subscribers
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Subscriber>>> GetSubscribers()
        {
            var subscribers = await _newsletterRepository.GetAllSubscribersAsync();
            return Ok(subscribers);
        }

        /// <summary>
        /// Subscribe email via Stored Procedure 'sp_SubscribeNewsletter'
        /// </summary>
        [EnableRateLimiting("SensitiveLookup")]
        [HttpPost]
        public async Task<ActionResult> Subscribe([FromBody] NewsletterDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var (isNew, message) = await _newsletterRepository.SubscribeAsync(dto.Email);

            return Ok(new
            {
                message = message,
                isNew = isNew
            });
        }
    }
}
