/* ====================================================================================================
 * File Name: NewsletterRepository.cs
 * Folder: backend/Repositories/Implementations/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This class implements INewsletterRepository.
 * It executes SQL Server Stored Procedure 'sp_SubscribeNewsletter' to register subscriber emails
 * for the Royal Gazette newsletter with duplicate checks.
 * 
 * Stored Procedure Called:
 * EXEC [dbo].[sp_SubscribeNewsletter] @Email, @IsNewSubscription OUTPUT
 * ==================================================================================================== */

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;

namespace VirasatPatola.Api.Repositories.Implementations
{
    public class NewsletterRepository : INewsletterRepository
    {
        private readonly VirasatPatolaDbContext _context;

        public NewsletterRepository(VirasatPatolaDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Retrieves the list of all subscribers.
        /// </summary>
        public async Task<IEnumerable<Subscriber>> GetAllSubscribersAsync()
        {
            return await _context.Subscribers
                .OrderByDescending(s => s.SubscribedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Subscribes an email using Stored Procedure 'sp_SubscribeNewsletter'.
        /// </summary>
        public async Task<(bool IsNew, string Message)> SubscribeAsync(string email)
        {
            var cleanEmail = email.Trim().ToLowerInvariant();

            if (_context.Database.IsSqlServer())
            {
                var pEmail = new SqlParameter("@Email", cleanEmail);
                var pIsNew = new SqlParameter
                {
                    ParameterName = "@IsNewSubscription",
                    SqlDbType = SqlDbType.Bit,
                    Direction = ParameterDirection.Output
                };

                // Execute Stored Procedure
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC [dbo].[sp_SubscribeNewsletter] @Email, @IsNewSubscription OUTPUT",
                    pEmail, pIsNew);

                bool isNew = (bool)(pIsNew.Value ?? true);
                string message = isNew 
                    ? "Welcome to the Royal Gazette! Subscribed via SQL Server Stored Procedure."
                    : "You are already subscribed to the Virasat Patola Royal Gazette.";

                return (isNew, message);
            }
            else
            {
                var exists = await _context.Subscribers.AnyAsync(s => s.Email == cleanEmail);
                if (exists)
                {
                    return (false, "You are already subscribed to the Royal Gazette.");
                }

                _context.Subscribers.Add(new Subscriber
                {
                    Email = cleanEmail,
                    SubscribedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                return (true, "Welcome to the Royal Gazette! Subscribed successfully.");
            }
        }
    }
}
