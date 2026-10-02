/* ====================================================================================================
 * File Name: INewsletterRepository.cs
 * Folder: backend/Repositories/Interfaces/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This interface defines methods for Royal Gazette newsletter subscriptions.
 * Saves customer email with duplicate check into SQL Server.
 * 
 * Connected Stored Procedure:
 * - sp_SubscribeNewsletter -> Adds new email or notifies if already present.
 * ==================================================================================================== */

using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Repositories.Interfaces
{
    public interface INewsletterRepository
    {
        /// <summary>
        /// Gets list of all subscribers.
        /// </summary>
        Task<IEnumerable<Subscriber>> GetAllSubscribersAsync();

        /// <summary>
        /// Subscribes email by calling Stored Procedure sp_SubscribeNewsletter.
        /// Returns: (bool isNewSubscription, string message)
        /// </summary>
        Task<(bool IsNew, string Message)> SubscribeAsync(string email);
    }
}
