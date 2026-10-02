/* ====================================================================================================
 * File Name: OrderRepository.cs
 * Folder: backend/Repositories/Implementations/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This class implements IOrderRepository.
 * When a customer places an order, this repository calculates saree prices, prepares JSON line items,
 * and calls SQL Server Stored Procedure 'sp_CreateOrder' to save the order inside an ACID Transaction.
 * 
 * Stored Procedure Called:
 * EXEC [dbo].[sp_CreateOrder] @OrderReference, @CustomerName, @ContactPhone, @DeliveryAddress, 
 *                             @City, @PostalCode, @Currency, @TotalAmount, @PaymentMode, 
 *                             @ItemsJson, @NewOrderId OUTPUT
 * ==================================================================================================== */

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;
using VirasatPatola.Api.Services;

namespace VirasatPatola.Api.Repositories.Implementations
{
    public class OrderRepository : IOrderRepository
    {
        private readonly VirasatPatolaDbContext _context;

        public OrderRepository(VirasatPatolaDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Retrieves all orders with their line items.
        /// </summary>
        public async Task<IEnumerable<Order>> GetAllOrdersAsync()
        {
            return await _context.Orders
                .Include(o => o.Items)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        /// <summary>
        /// Finds order by reference number (e.g. VP-104829).
        /// </summary>
        public async Task<Order?> GetOrderByReferenceAsync(string orderReference)
        {
            return await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());
        }

        public async Task<Order?> GetOrderByIdempotencyKeyAsync(string idempotencyKey)
        {
            return await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.CheckoutIdempotencyKey == idempotencyKey);
        }

        public async Task<decimal> CalculateOrderTotalAsync(IEnumerable<OrderItemDto> items)
        {
            decimal total = 0;
            foreach (var item in items)
            {
                if (item.Quantity < 1) throw new ArgumentException("Each order item must have a positive quantity.");
                var catalogSaree = await _context.Sarees.FindAsync(item.SareeId);
                decimal unitPrice;
                if (catalogSaree != null)
                {
                    if (catalogSaree.FinalPriceINR > 0)
                        unitPrice = catalogSaree.FinalPriceINR;
                    else if (catalogSaree.DiscountPercent > 0)
                        unitPrice = Math.Round(catalogSaree.BasePriceINR - (catalogSaree.BasePriceINR * catalogSaree.DiscountPercent / 100m));
                    else if (item.UnitPrice > 0 && item.UnitPrice < catalogSaree.BasePriceINR)
                        unitPrice = item.UnitPrice;
                    else
                        unitPrice = catalogSaree.BasePriceINR;
                }
                else
                {
                    unitPrice = item.UnitPrice;
                }

                if (unitPrice <= 0) throw new ArgumentException("Order item price must be positive.");
                total += unitPrice * item.Quantity;
            }
            return total;
        }

        /// <summary>
        /// Saves order by executing Stored Procedure 'sp_CreateOrder'.
        /// </summary>
        /// <summary>
        /// Saves order by executing Stored Procedure 'sp_CreateOrder'.
        /// Sets OrderStatus = 'Pending' and PaymentStatus = 'Pending'.
        /// </summary>
        public async Task<(int OrderId, string OrderReference, decimal TotalAmount, string OrderConfirmationOtp, string DeliveryOtp)> CreateOrderAsync(OrderCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IdempotencyKey) || string.IsNullOrWhiteSpace(dto.IdempotencyFingerprint))
                throw new ArgumentException("Checkout idempotency details are required.");

            var randomRef = $"VP-{Random.Shared.Next(100000, 999999)}";

            var priorOrder = await _context.Orders
                .FirstOrDefaultAsync(o => o.CheckoutIdempotencyKey == dto.IdempotencyKey);
            if (priorOrder != null)
            {
                if (!string.Equals(priorOrder.CheckoutIdempotencyFingerprint, dto.IdempotencyFingerprint, StringComparison.Ordinal))
                    throw new CheckoutIdempotencyConflictException();
                return (priorOrder.Id, priorOrder.OrderReference, priorOrder.TotalAmount, priorOrder.OrderConfirmationOtp ?? string.Empty, priorOrder.DeliveryOtp ?? string.Empty);
            }

            // Calculate total amount and line items
            decimal computedTotal = 0;
            var lineItemsData = new List<object>();

            foreach (var itemDto in dto.Items)
            {
                var catalogSaree = await _context.Sarees.FindAsync(itemDto.SareeId);
                decimal unitPrice;
                if (catalogSaree != null)
                {
                    if (catalogSaree.FinalPriceINR > 0)
                    {
                        unitPrice = catalogSaree.FinalPriceINR;
                    }
                    else if (catalogSaree.DiscountPercent > 0)
                    {
                        unitPrice = Math.Round(catalogSaree.BasePriceINR - (catalogSaree.BasePriceINR * catalogSaree.DiscountPercent / 100m));
                    }
                    else if (itemDto.UnitPrice > 0 && itemDto.UnitPrice < catalogSaree.BasePriceINR)
                    {
                        unitPrice = itemDto.UnitPrice;
                    }
                    else
                    {
                        unitPrice = catalogSaree.BasePriceINR;
                    }
                }
                else
                {
                    unitPrice = itemDto.UnitPrice;
                }

                decimal lineTotal = unitPrice * itemDto.Quantity;
                computedTotal += lineTotal;

                lineItemsData.Add(new
                {
                    sareeId = itemDto.SareeId,
                    sareeTitle = catalogSaree?.Title ?? itemDto.SareeTitle,
                    unitPrice = unitPrice,
                    quantity = itemDto.Quantity,
                    lineTotal = lineTotal
                });
            }

            string finalConfirmationOtp = !string.IsNullOrWhiteSpace(dto.OrderConfirmationOtp)
                ? dto.OrderConfirmationOtp.Trim()
                : Random.Shared.Next(100000, 999999).ToString();

            string finalDeliveryOtp = !string.IsNullOrWhiteSpace(dto.DeliveryOtp)
                ? dto.DeliveryOtp.Trim()
                : (1000 + Math.Abs(randomRef.GetHashCode()) % 9000).ToString();

            if (_context.Database.IsSqlServer())
            {
                // Convert line items to JSON format
                var itemsJson = JsonSerializer.Serialize(lineItemsData);

                var pOrderRef = new SqlParameter("@OrderReference", randomRef);
                var pCustomerName = new SqlParameter("@CustomerName", dto.CustomerName.Trim());
                var pContactPhone = new SqlParameter("@ContactPhone", dto.ContactPhone.Trim());
                var pDeliveryAddress = new SqlParameter("@DeliveryAddress", dto.DeliveryAddress.Trim());
                var pCity = new SqlParameter("@City", dto.City.Trim());
                var pState = new SqlParameter("@State", dto.State.Trim());
                var pPostalCode = new SqlParameter("@PostalCode", dto.PostalCode.Trim());
                var pCurrency = new SqlParameter("@Currency", dto.Currency ?? "INR");
                var pTotalAmount = new SqlParameter("@TotalAmount", computedTotal);
                var pPaymentMode = new SqlParameter("@PaymentMode", dto.PaymentMode ?? "UPI / NetBanking");
                var pItemsJson = new SqlParameter("@ItemsJson", itemsJson);
                var pOrderConfirmationOtp = new SqlParameter("@OrderConfirmationOtp", finalConfirmationOtp);
                var pDeliveryOtp = new SqlParameter("@DeliveryOtp", (object?)finalDeliveryOtp ?? DBNull.Value);
                var pCheckoutKey = new SqlParameter("@CheckoutIdempotencyKey", dto.IdempotencyKey);
                var pCheckoutFingerprint = new SqlParameter("@CheckoutIdempotencyFingerprint", dto.IdempotencyFingerprint);

                var pNewOrderId = new SqlParameter
                {
                    ParameterName = "@NewOrderId",
                    SqlDbType = SqlDbType.Int,
                    Direction = ParameterDirection.Output
                };

                // Execute Stored Procedure 'sp_CreateOrder' with exact 15 database parameters
                await _context.Database.ExecuteSqlRawAsync(
                    @"EXEC [dbo].[sp_CreateOrder] 
                        @OrderReference = @OrderReference, 
                        @CustomerName = @CustomerName, 
                        @ContactPhone = @ContactPhone, 
                        @DeliveryAddress = @DeliveryAddress, 
                        @City = @City, 
                        @State = @State, 
                        @PostalCode = @PostalCode, 
                        @Currency = @Currency, 
                        @TotalAmount = @TotalAmount, 
                        @PaymentMode = @PaymentMode, 
                        @ItemsJson = @ItemsJson, 
                        @DeliveryOtp = @DeliveryOtp, 
                        @CheckoutIdempotencyKey = @CheckoutIdempotencyKey, 
                        @CheckoutIdempotencyFingerprint = @CheckoutIdempotencyFingerprint, 
                        @NewOrderId = @NewOrderId OUTPUT",
                    pOrderRef, pCustomerName, pContactPhone, pDeliveryAddress, pCity, pState, pPostalCode, pCurrency, pTotalAmount, pPaymentMode, pItemsJson, pDeliveryOtp, pCheckoutKey, pCheckoutFingerprint, pNewOrderId);

                int orderId = (int)(pNewOrderId.Value ?? 0);

                // Initialize Step 1 DB state:
                // For Cash on Delivery: OrderStatus is Confirmed right away (cash collected on delivery).
                // For Online Payment: OrderStatus is Pending until online payment and customer confirmation OTP are done.
                if (orderId > 0)
                {
                    bool isCod = dto.PaymentMode?.Contains("Cash on Delivery", StringComparison.OrdinalIgnoreCase) == true;
                    string initialOrderStatus = isCod ? "Confirmed" : "Pending";

                    await _context.Database.ExecuteSqlRawAsync(
                        @"UPDATE [dbo].[Orders] 
                          SET [OrderStatus] = @OrderStatus, 
                              [PaymentStatus] = 'Pending', 
                              [OrderConfirmationOtp] = @OrderConfirmationOtp 
                          WHERE [Id] = @OrderId",
                        new SqlParameter("@OrderStatus", initialOrderStatus),
                        new SqlParameter("@OrderConfirmationOtp", finalConfirmationOtp),
                        new SqlParameter("@OrderId", orderId));
                }

                var savedOrder = await _context.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderId);
                return (orderId, savedOrder?.OrderReference ?? randomRef, savedOrder?.TotalAmount ?? computedTotal, finalConfirmationOtp, finalDeliveryOtp ?? string.Empty);
            }
            else
            {
                // In-Memory Fallback
                var order = new Order
                {
                    OrderReference = randomRef,
                    CustomerName = dto.CustomerName.Trim(),
                    ContactPhone = dto.ContactPhone.Trim(),
                    DeliveryAddress = dto.DeliveryAddress.Trim(),
                    City = dto.City.Trim(),
                    State = dto.State.Trim(),
                    PostalCode = dto.PostalCode.Trim(),
                    Currency = dto.Currency ?? "INR",
                    TotalAmount = computedTotal,
                    PaymentMode = dto.PaymentMode ?? "UPI / NetBanking",
                    PaymentStatus = "Pending",
                    OrderStatus = "Pending",
                    OrderConfirmationOtp = finalConfirmationOtp,
                    DeliveryOtp = finalDeliveryOtp,
                    CheckoutIdempotencyKey = dto.IdempotencyKey,
                    CheckoutIdempotencyFingerprint = dto.IdempotencyFingerprint,
                    CreatedAt = DateTime.UtcNow,
                    Items = lineItemsData.Select(d => {
                        var json = JsonSerializer.Serialize(d);
                        using var doc = JsonDocument.Parse(json);
                        var root = doc.RootElement;
                        var uPrice = root.GetProperty("unitPrice").GetDecimal();
                        var qty = root.GetProperty("quantity").GetInt32();
                        return new OrderItem
                        {
                            SareeId = root.GetProperty("sareeId").GetString() ?? "",
                            SareeTitle = root.GetProperty("sareeTitle").GetString() ?? "",
                            UnitPrice = uPrice,
                            Quantity = qty,
                            LineTotal = uPrice * qty
                        };
                    }).ToList()
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();
                return (order.Id, order.OrderReference, order.TotalAmount, finalConfirmationOtp, finalDeliveryOtp ?? string.Empty);
            }
        }

        /// <summary>
        /// Updates order status (Admin Dashboard / Store Manager)
        /// </summary>
        public async Task<bool> UpdateOrderStatusAsync(string orderReference, string newStatus)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());
            if (order == null) return false;

            order.OrderStatus = newStatus;

            // When Stage 5 / Delivered is chosen from fulfillment, automatically mark Payment as Paid & clear DeliveryOtp
            if (newStatus.Contains("Delivered", StringComparison.OrdinalIgnoreCase) || newStatus.Contains("Stage 5", StringComparison.OrdinalIgnoreCase))
            {
                order.PaymentStatus = "Paid";
                if (string.IsNullOrWhiteSpace(order.TransactionId))
                {
                    order.TransactionId = order.PaymentMode?.Contains("Cash on Delivery", StringComparison.OrdinalIgnoreCase) == true
                        ? "COD-DELIVERY-PAID"
                        : "DELIVERY-COMPLETED-PAID";
                }
                order.DeliveryOtp = null;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Updates payment status and transaction ID via sp_UpdatePaymentStatus
        /// </summary>
        public async Task<bool> UpdatePaymentStatusAsync(int orderId, string paymentStatus, string transactionId)
        {
            if (_context.Database.IsSqlServer())
            {
                var pOrderId = new SqlParameter("@OrderId", orderId);
                var pStatus = new SqlParameter("@PaymentStatus", paymentStatus);
                var pTxnId = new SqlParameter("@TransactionId", (object?)transactionId ?? DBNull.Value);

                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC [dbo].[sp_UpdatePaymentStatus] @OrderId, @PaymentStatus, @TransactionId",
                    pOrderId, pStatus, pTxnId);
                return true;
            }
            else
            {
                var order = await _context.Orders.FindAsync(orderId);
                if (order == null) return false;
                order.PaymentStatus = paymentStatus;
                order.TransactionId = transactionId;
                await _context.SaveChangesAsync();
                return true;
            }
        }

        public async Task<bool> UpdatePaymentStatusByReferenceAsync(string orderReference, string paymentStatus, string transactionId)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());
            if (order == null) return false;
            return await UpdatePaymentStatusAsync(order.Id, paymentStatus, transactionId);
        }

        /// <summary>
        /// Verifies customer order confirmation OTP via sp_VerifyOrderConfirmationOtp
        /// </summary>
        public async Task<(bool Success, string Message)> VerifyOrderConfirmationOtpAsync(int orderId, string otp)
        {
            if (_context.Database.IsSqlServer())
            {
                try
                {
                    var pOrderId = new SqlParameter("@OrderId", orderId);
                    var pOtp = new SqlParameter("@OrderConfirmationOtp", (otp ?? string.Empty).Trim());

                    await _context.Database.ExecuteSqlRawAsync(
                        "EXEC [dbo].[sp_VerifyOrderConfirmationOtp] @OrderId, @OrderConfirmationOtp",
                        pOrderId, pOtp);
                    return (true, "Order confirmed successfully via OTP.");
                }
                catch (SqlException ex)
                {
                    return (false, ex.Message);
                }
            }
            else
            {
                var order = await _context.Orders.FindAsync(orderId);
                if (order == null || order.OrderConfirmationOtp == null)
                    return (false, "Order not found or OTP already used.");
                if (order.PaymentStatus != "Paid")
                    return (false, "Payment is not completed.");
                if (order.OrderConfirmationOtp != (otp ?? string.Empty).Trim())
                    return (false, "Invalid OTP.");

                order.OrderStatus = "Confirmed";
                order.OrderConfirmationOtp = null;
                await _context.SaveChangesAsync();
                return (true, "Order confirmed successfully.");
            }
        }

        public async Task<(bool Success, string Message)> VerifyOrderConfirmationOtpByReferenceAsync(string orderReference, string otp)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());
            if (order == null) return (false, "Order not found.");
            return await VerifyOrderConfirmationOtpAsync(order.Id, otp);
        }

        /// <summary>
        /// Verifies customer delivery handover OTP via sp_VerifyDeliveryOtp
        /// </summary>
        public async Task<(bool Success, string Message)> VerifyDeliveryOtpAsync(int orderId, string otp)
        {
            if (_context.Database.IsSqlServer())
            {
                try
                {
                    var pOrderId = new SqlParameter("@OrderId", orderId);
                    var pOtp = new SqlParameter("@DeliveryOtp", (otp ?? string.Empty).Trim());

                    await _context.Database.ExecuteSqlRawAsync(
                        "EXEC [dbo].[sp_VerifyDeliveryOtp] @OrderId, @DeliveryOtp",
                        pOrderId, pOtp);

                    // If it was Cash on Delivery, mark PaymentStatus as 'Paid' upon delivery!
                    await _context.Database.ExecuteSqlRawAsync(
                        @"UPDATE [dbo].[Orders] 
                          SET [PaymentStatus] = 'Paid', 
                              [TransactionId] = COALESCE([TransactionId], 'CASH-COLLECTED') 
                          WHERE [Id] = @OrderId AND [PaymentMode] LIKE '%Cash on Delivery%'",
                        new SqlParameter("@OrderId", orderId));

                    return (true, "Delivery OTP verified successfully. Order marked as Delivered.");
                }
                catch (SqlException ex)
                {
                    return (false, ex.Message);
                }
            }
            else
            {
                var order = await _context.Orders.FindAsync(orderId);
                if (order == null || order.DeliveryOtp == null)
                    return (false, "Order not found or Delivery OTP already used.");
                if (order.OrderStatus != "Shipped")
                    return (false, "Order is not ready for delivery.");
                if (order.DeliveryOtp != (otp ?? string.Empty).Trim())
                    return (false, "Invalid Delivery OTP.");

                order.OrderStatus = "Delivered";
                order.DeliveryOtp = null;
                await _context.SaveChangesAsync();
                return (true, "Delivery OTP verified successfully. Order marked as Delivered.");
            }
        }

        public async Task<(bool Success, string Message)> VerifyDeliveryOtpByReferenceAsync(string orderReference, string otp)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());
            if (order == null) return (false, "Order not found.");
            return await VerifyDeliveryOtpAsync(order.Id, otp);
        }

        /// <summary>
        /// Permanently deletes an order from active Orders and archives a complete snapshot into DeletedOrders table.
        /// </summary>
        public async Task<bool> DeleteOrderAsync(string orderReference)
        {
            try
            {
                var order = await _context.Orders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.OrderReference.ToLower() == orderReference.ToLower());

                if (order != null)
                {
                    // Archive to DeletedOrders table before deletion
                    var itemsList = order.Items?.Select(i => new
                    {
                        sareeId = i.SareeId,
                        sareeTitle = i.SareeTitle,
                        unitPrice = i.UnitPrice,
                        quantity = i.Quantity,
                        lineTotal = i.LineTotal
                    }).ToList() ?? new();

                    var archived = new DeletedOrder
                    {
                        OrderReference = order.OrderReference,
                        CustomerName = order.CustomerName,
                        ContactPhone = order.ContactPhone,
                        DeliveryAddress = order.DeliveryAddress,
                        City = order.City,
                        PostalCode = order.PostalCode,
                        Currency = order.Currency,
                        TotalAmount = order.TotalAmount,
                        PaymentMode = order.PaymentMode,
                        LastOrderStatus = order.OrderStatus,
                        OriginalCreatedAt = order.CreatedAt,
                        DeletedAt = DateTime.UtcNow,
                        DeletedBy = "Store Admin / Manager",
                        ItemsJson = JsonSerializer.Serialize(itemsList)
                    };

                    _context.DeletedOrders.Add(archived);

                    if (order.Items != null && order.Items.Any())
                    {
                        _context.OrderItems.RemoveRange(order.Items);
                    }
                    _context.Orders.Remove(order);
                    await _context.SaveChangesAsync();
                    return true;
                }

                return false;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>
        /// Retrieves all archived deleted orders (Read-only history for Store Admin).
        /// </summary>
        public async Task<IEnumerable<DeletedOrder>> GetDeletedOrdersAsync()
        {
            return await _context.DeletedOrders
                .OrderByDescending(d => d.DeletedAt)
                .ToListAsync();
        }
    }
}
