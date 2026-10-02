/* ====================================================================================================
 * File Name: IOrderRepository.cs
 * Folder: backend/Repositories/Interfaces/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This interface defines methods for customer orders and checkout processing.
 * Saves order header and line items (sarees) to SQL Server using transaction
 * and stored procedures safely.
 * 
 * Connected Stored Procedure:
 * - sp_CreateOrder -> Saves order header and JSON line items and generates order reference (VP-XXXXXX).
 * ==================================================================================================== */

using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Repositories.Interfaces
{
    public interface IOrderRepository
    {
        /// <summary>
        /// Gets list of all orders (for Admin Dashboard).
        /// </summary>
        Task<IEnumerable<Order>> GetAllOrdersAsync();

        /// <summary>
        /// Finds order details by order reference number (e.g. VP-104829).
        /// </summary>
        Task<Order?> GetOrderByReferenceAsync(string orderReference);

        /// <summary>Finds an already-created order for an idempotent checkout retry.</summary>
        Task<Order?> GetOrderByIdempotencyKeyAsync(string idempotencyKey);

        /// <summary>Calculates the catalog-backed order total before payment is accepted.</summary>
        Task<decimal> CalculateOrderTotalAsync(IEnumerable<OrderItemDto> items);

        /// <summary>
        /// Books new order by calling Stored Procedure sp_CreateOrder.
        /// Returns: (int orderId, string orderReference, decimal totalAmount, string orderConfirmationOtp, string deliveryOtp)
        /// </summary>
        Task<(int OrderId, string OrderReference, decimal TotalAmount, string OrderConfirmationOtp, string DeliveryOtp)> CreateOrderAsync(OrderCreateDto dto);

        /// <summary>
        /// Updates order status (for Admin Dashboard / Store Manager).
        /// </summary>
        Task<bool> UpdateOrderStatusAsync(string orderReference, string newStatus);

        /// <summary>
        /// Updates payment status and transaction ID via sp_UpdatePaymentStatus.
        /// </summary>
        Task<bool> UpdatePaymentStatusAsync(int orderId, string paymentStatus, string transactionId);
        Task<bool> UpdatePaymentStatusByReferenceAsync(string orderReference, string paymentStatus, string transactionId);

        /// <summary>
        /// Verifies customer confirmation OTP via sp_VerifyOrderConfirmationOtp and marks OrderStatus = 'Confirmed'.
        /// </summary>
        Task<(bool Success, string Message)> VerifyOrderConfirmationOtpAsync(int orderId, string otp);
        Task<(bool Success, string Message)> VerifyOrderConfirmationOtpByReferenceAsync(string orderReference, string otp);

        /// <summary>
        /// Verifies delivery OTP via sp_VerifyDeliveryOtp and marks OrderStatus = 'Delivered'.
        /// </summary>
        Task<(bool Success, string Message)> VerifyDeliveryOtpAsync(int orderId, string otp);
        Task<(bool Success, string Message)> VerifyDeliveryOtpByReferenceAsync(string orderReference, string otp);

        /// <summary>
        /// Permanently deletes an order by order reference and archives snapshot to DeletedOrders table.
        /// </summary>
        Task<bool> DeleteOrderAsync(string orderReference);

        /// <summary>
        /// Retrieves all archived deleted orders (Read-only history for Store Admin).
        /// </summary>
        Task<IEnumerable<DeletedOrder>> GetDeletedOrdersAsync();
    }
}
