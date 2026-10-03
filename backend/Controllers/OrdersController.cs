/* ====================================================================================================
 * File Name: OrdersController.cs
 * Folder: backend/Controllers/
 * 
 * What this file does:
 * ----------------------------------------------------------------------------------------------------
 * This API Controller manages saree orders and checkout workflows.
 * When a customer submits the checkout form, this controller uses 'IOrderRepository'
 * to execute the SQL Server Stored Procedure 'sp_CreateOrder' in a transaction to save the order
 * and generates a unique 'VP-XXXXXX' reference.
 * 
 * API Endpoints:
 * - GET  /api/orders             -> View all orders
 * - GET  /api/orders/{orderRef}  -> Find order by reference number
 * - POST /api/orders             -> Book new order (Stored Procedure: sp_CreateOrder)
 * ==================================================================================================== */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;
using VirasatPatola.Api.Repositories.Interfaces;
using VirasatPatola.Api.Security;
using VirasatPatola.Api.Services;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly PaymentSessionStore _paymentSessions;
        private readonly OrderConfirmationOtpService _confirmationOtp;
        private readonly VirasatPatolaDbContext _context;
        private readonly IConfiguration _configuration;

        // Dependency Injection
        public OrdersController(
            IOrderRepository orderRepository,
            PaymentSessionStore paymentSessions,
            OrderConfirmationOtpService confirmationOtp,
            VirasatPatolaDbContext context,
            IConfiguration configuration)
        {
            _orderRepository = orderRepository;
            _paymentSessions = paymentSessions;
            _confirmationOtp = confirmationOtp;
            _context = context;
            _configuration = configuration;
        }

        private static string NormalizePhone(string raw)
        {
            var digits = new string((raw ?? string.Empty).Where(char.IsDigit).ToArray());
            if (digits.Length == 12 && digits.StartsWith("91"))
                digits = digits.Substring(2);
            else if (digits.Length > 10)
                digits = digits.Substring(digits.Length - 10);
            return digits;
        }

        private static (string Hash, string Salt) HashPassword(string password)
        {
            var saltBytes = RandomNumberGenerator.GetBytes(16);
            var salt = Convert.ToBase64String(saltBytes);
            using var sha = SHA256.Create();
            var combined = Encoding.UTF8.GetBytes(password + salt);
            var hash = Convert.ToBase64String(sha.ComputeHash(combined));
            return (hash, salt);
        }

        private string GenerateCustomerToken(Customer customer)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"] ?? "VirasatPatola_RoyalHeritage_SecureSecretKey_2026_Handcrafted_Silk";
            var issuer = _configuration["JwtSettings:Issuer"] ?? "VirasatPatolaApi";
            var audience = _configuration["JwtSettings:Audience"] ?? "VirasatPatolaClient";

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("CustomerId", customer.Id.ToString()),
                    new Claim("CustomerName", customer.CustomerName),
                    new Claim(ClaimTypes.MobilePhone, customer.PhoneNumber),
                    new Claim(ClaimTypes.Role, "Customer")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        [EnableRateLimiting("OrderOtpSend")]
        [HttpPost("confirmation-otp/send")]
        public async Task<IActionResult> SendConfirmationOtp([FromBody] SendOrderConfirmationOtpDto request, CancellationToken cancellationToken)
        {
            try
            {
                await _confirmationOtp.SendCodeAsync(request.Phone, cancellationToken);
                return Ok(new { sent = true, message = "A confirmation code was sent to your phone." });
            }
            catch (OtpServiceUnavailableException ex)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { sent = false, message = ex.Message });
            }
            catch (OtpProviderException ex)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { sent = false, message = ex.Message });
            }
            catch (OtpPhoneValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (OtpRequestException ex)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new { sent = false, message = ex.Message });
            }
        }

        [EnableRateLimiting("OrderOtpVerify")]
        [HttpPost("confirmation-otp/verify")]
        public IActionResult VerifyConfirmationOtp([FromBody] VerifyOrderConfirmationOtpDto request)
        {
            try
            {
                var token = _confirmationOtp.VerifyCode(request.Phone, request.Code);
                return Ok(new VerifyOrderConfirmationOtpResponseDto { Verified = true, VerificationToken = token });
            }
            catch (OtpPhoneValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (OtpRequestException ex)
            {
                return BadRequest(new { verified = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get all orders (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            var orders = await _orderRepository.GetAllOrdersAsync();
            return Ok(orders);
        }

        /// <summary>
        /// Get all archived deleted orders (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpGet("deleted")]
        public async Task<ActionResult<IEnumerable<DeletedOrder>>> GetDeletedOrders()
        {
            var deletedOrders = await _orderRepository.GetDeletedOrdersAsync();
            return Ok(deletedOrders);
        }

        [EnableRateLimiting("SensitiveLookup")]
        [HttpGet("track/by-phone")]
        public async Task<IActionResult> GetOrdersByPhone([FromQuery] string phone)
        {
            if (new string((phone ?? string.Empty).Where(char.IsDigit).ToArray()).Length < 7)
                return BadRequest(new { message = "Enter the mobile number used for these orders." });

            var matchingOrders = (await _orderRepository.GetAllOrdersAsync())
                .Where(o => PhoneMatches(o.ContactPhone, phone ?? string.Empty))
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new
                {
                    o.OrderReference,
                    o.CustomerName,
                    o.DeliveryAddress,
                    o.City,
                    o.PostalCode,
                    o.Currency,
                    o.TotalAmount,
                    o.PaymentMode,
                    o.PaymentStatus,
                    o.OrderStatus,
                    o.TransactionId,
                    o.OrderConfirmationOtp,
                    o.DeliveryOtp,
                    o.CreatedAt,
                    o.Items
                });
            return Ok(matchingOrders);
        }
        /// <summary>
        /// Find order by reference number (e.g. VP-104829)
        /// </summary>
        [EnableRateLimiting("SensitiveLookup")]
        [HttpGet("{orderRef}")]
        public async Task<IActionResult> GetOrderByReference(string orderRef, [FromQuery] string phone)
        {
            var order = await _orderRepository.GetOrderByReferenceAsync(orderRef);
            if (order == null || !PhoneMatches(order.ContactPhone, phone))
                return NotFound(new { message = "Order reference or phone number was not recognized." });

            return Ok(new
            {
                order.OrderReference,
                order.CustomerName,
                order.DeliveryAddress,
                order.City,
                order.PostalCode,
                ContactPhone = "••••" + new string(order.ContactPhone.Where(char.IsDigit).TakeLast(4).ToArray()),
                order.Currency,
                order.TotalAmount,
                order.PaymentMode,
                order.PaymentStatus,
                order.OrderStatus,
                order.TransactionId,
                order.OrderConfirmationOtp,
                order.DeliveryOtp,
                order.CreatedAt,
                order.Items
            });
        }

        private static bool PhoneMatches(string storedPhone, string suppliedPhone)
        {
            var stored = new string((storedPhone ?? string.Empty).Where(char.IsDigit).ToArray());
            var supplied = new string((suppliedPhone ?? string.Empty).Where(char.IsDigit).ToArray());
            if (stored.Length >= 10 && supplied.Length >= 10)
            {
                stored = stored.Substring(stored.Length - 10);
                supplied = supplied.Substring(supplied.Length - 10);
            }
            return stored.Length >= 7 && supplied.Length >= 7 &&
                System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                    System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(stored)),
                    System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(supplied)));
        }

        /// <summary>
        /// Save new order via Stored Procedure 'sp_CreateOrder'
        /// </summary>
        [HttpPost]
        public async Task<ActionResult> CreateOrder([FromBody] OrderCreateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var headerIdempotencyKey = Request.Headers["Idempotency-Key"].ToString().Trim();
            if (!string.IsNullOrEmpty(headerIdempotencyKey)
                && !string.Equals(headerIdempotencyKey, dto.IdempotencyKey?.Trim(), StringComparison.Ordinal))
                return BadRequest(new { message = "The idempotency key header and request body must match." });
            dto.IdempotencyKey = dto.IdempotencyKey?.Trim() ?? string.Empty;
            var fingerprintData = new
            {
                customerName = dto.CustomerName.Trim(),
                contactPhone = dto.ContactPhone.Trim(),
                deliveryAddress = dto.DeliveryAddress.Trim(),
                city = dto.City.Trim(),
                state = dto.State.Trim(),
                postalCode = dto.PostalCode.Trim(),
                currency = (dto.Currency ?? "INR").Trim().ToUpperInvariant(),
                paymentMode = (dto.PaymentMode ?? string.Empty).Trim(),
                razorpayOrderId = dto.RazorpayOrderId?.Trim() ?? string.Empty,
                transactionId = dto.TransactionId?.Trim() ?? string.Empty,
                items = dto.Items.OrderBy(item => item.SareeId, StringComparer.Ordinal)
                    .Select(item => new { item.SareeId, item.SareeTitle, item.UnitPrice, item.Quantity })
                    .ToArray()
            };
            dto.IdempotencyFingerprint = Convert.ToHexString(
                SHA256.HashData(Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(fingerprintData))));

            using var submissionLock = await _paymentSessions.AcquireIdempotencyLockAsync(dto.IdempotencyKey);
            var existingOrder = await _orderRepository.GetOrderByIdempotencyKeyAsync(dto.IdempotencyKey);
            if (existingOrder != null)
            {
                if (!string.Equals(existingOrder.CheckoutIdempotencyFingerprint, dto.IdempotencyFingerprint, StringComparison.Ordinal))
                    return Conflict(new { message = "This checkout retry has different order details. Please contact support before submitting again." });

                return Ok(new
                {
                    message = "This checkout was already saved.",
                    orderId = existingOrder.Id,
                    orderReference = existingOrder.OrderReference,
                    totalAmount = existingOrder.TotalAmount,
                    currency = existingOrder.Currency,
                    deliveryOtp = existingOrder.DeliveryOtp,
                    status = existingOrder.OrderStatus
                });
            }
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var (isFake, reason) = FakeCustomerBlocker.EvaluateCustomer(dto.CustomerName, dto.ContactPhone, null, ip);
            if (isFake)
            {
                return BadRequest(new { message = $"Security Alert: {reason}", isBlocked = true });
            }

            var orderCurrency = dto.Currency ?? "INR";
            var isOnlinePayment = (dto.PaymentMode ?? string.Empty).Contains("Razorpay", StringComparison.OrdinalIgnoreCase)
                || (dto.PaymentMode ?? string.Empty).Contains("Online", StringComparison.OrdinalIgnoreCase);
            var reservedPaymentOrderId = string.Empty;
            if (isOnlinePayment && !string.IsNullOrWhiteSpace(dto.RazorpayOrderId) && !string.IsNullOrWhiteSpace(dto.TransactionId))
            {
                var expectedTotal = await _orderRepository.CalculateOrderTotalAsync(dto.Items);
                if (_paymentSessions.TryReserveVerified(dto.RazorpayOrderId, dto.TransactionId, expectedTotal, orderCurrency))
                {
                    reservedPaymentOrderId = dto.RazorpayOrderId;
                }
            }

            var reservedOtpToken = string.Empty;
            if (_confirmationOtp.IsEnabled)
            {
                if (string.IsNullOrWhiteSpace(dto.PhoneVerificationToken)
                    || !_confirmationOtp.TryReserveVerifiedToken(dto.ContactPhone, dto.PhoneVerificationToken))
                {
                    if (!string.IsNullOrEmpty(reservedPaymentOrderId)) _paymentSessions.ReleaseReservation(reservedPaymentOrderId);
                    return BadRequest(new { message = "Verify your phone number before placing this order." });
                }
                reservedOtpToken = dto.PhoneVerificationToken;
            }
            int orderId;
            string orderRef;
            decimal total;
            string confirmationOtp;
            string deliveryOtp;
            try
            {
                (orderId, orderRef, total, confirmationOtp, deliveryOtp) = await _orderRepository.CreateOrderAsync(dto);
            }
            catch (CheckoutIdempotencyConflictException)
            {
                if (!string.IsNullOrEmpty(reservedPaymentOrderId)) _paymentSessions.ReleaseReservation(reservedPaymentOrderId);
                if (!string.IsNullOrEmpty(reservedOtpToken)) _confirmationOtp.ReleaseVerifiedToken(reservedOtpToken);
                return Conflict(new { message = "This checkout key was already used with different order details." });
            }
            catch (SqlException ex) when (ex.Number == 51001)
            {
                if (!string.IsNullOrEmpty(reservedPaymentOrderId)) _paymentSessions.ReleaseReservation(reservedPaymentOrderId);
                if (!string.IsNullOrEmpty(reservedOtpToken)) _confirmationOtp.ReleaseVerifiedToken(reservedOtpToken);
                return Conflict(new { message = "This checkout key was already used with different order details." });
            }
            catch
            {
                if (!string.IsNullOrEmpty(reservedPaymentOrderId)) _paymentSessions.ReleaseReservation(reservedPaymentOrderId);
                if (!string.IsNullOrEmpty(reservedOtpToken)) _confirmationOtp.ReleaseVerifiedToken(reservedOtpToken);
                throw;
            }
            if (!string.IsNullOrEmpty(reservedPaymentOrderId)) _paymentSessions.Complete(reservedPaymentOrderId);
            if (!string.IsNullOrEmpty(reservedOtpToken)) _confirmationOtp.CompleteVerifiedToken(reservedOtpToken);
            var createdOrder = await _orderRepository.GetOrderByReferenceAsync(orderRef);

            // Auto Account & Login generation for Customer in Customers table
            Customer? customer = null;
            bool isNewCustomer = false;
            string? customerPassword = null;
            string? customerToken = null;

            try
            {
                var cleanPhone = NormalizePhone(dto.ContactPhone);
                if (cleanPhone.Length == 10)
                {
                    customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == cleanPhone);
                    if (customer == null)
                    {
                        isNewCustomer = true;
                        customerPassword = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
                        var (hash, salt) = HashPassword(customerPassword);

                        customer = new Customer
                        {
                            CustomerName = dto.CustomerName.Trim(),
                            PhoneNumber = cleanPhone,
                            PasswordHash = hash,
                            PasswordSalt = salt,
                            GeneratedPassword = customerPassword,
                            DeliveryAddress = dto.DeliveryAddress?.Trim(),
                            City = dto.City?.Trim(),
                            State = dto.State?.Trim(),
                            PostalCode = dto.PostalCode?.Trim(),
                            CreatedAt = DateTime.UtcNow,
                            LastLoginAt = DateTime.UtcNow
                        };

                        _context.Customers.Add(customer);
                        await _context.SaveChangesAsync();
                    }
                    else
                    {
                        // Existing customer: keep or update address details
                        if (string.IsNullOrWhiteSpace(customer.DeliveryAddress) && !string.IsNullOrWhiteSpace(dto.DeliveryAddress))
                            customer.DeliveryAddress = dto.DeliveryAddress.Trim();
                        if (string.IsNullOrWhiteSpace(customer.City) && !string.IsNullOrWhiteSpace(dto.City))
                            customer.City = dto.City.Trim();
                        if (string.IsNullOrWhiteSpace(customer.State) && !string.IsNullOrWhiteSpace(dto.State))
                            customer.State = dto.State.Trim();
                        if (string.IsNullOrWhiteSpace(customer.PostalCode) && !string.IsNullOrWhiteSpace(dto.PostalCode))
                            customer.PostalCode = dto.PostalCode.Trim();

                        customerPassword = customer.GeneratedPassword;
                        customer.LastLoginAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }

                    customerToken = GenerateCustomerToken(customer);
                }
            }
            catch
            {
                // Non-blocking fallback
            }

            return Ok(new
            {
                message = "Order placed successfully via Stored Procedure in SQL Server. Initial OrderStatus = Pending, PaymentStatus = Pending.",
                orderId = orderId,
                orderReference = orderRef,
                totalAmount = total,
                currency = dto.Currency ?? "INR",
                orderStatus = createdOrder?.OrderStatus ?? "Pending",
                paymentStatus = createdOrder?.PaymentStatus ?? "Pending",
                orderConfirmationOtp = createdOrder?.OrderConfirmationOtp ?? confirmationOtp,
                deliveryOtp = createdOrder?.DeliveryOtp ?? deliveryOtp,
                status = createdOrder?.OrderStatus ?? "Pending",
                customerAccount = customer != null ? new
                {
                    isNewAccount = isNewCustomer,
                    phoneNumber = customer.PhoneNumber,
                    customerName = customer.CustomerName,
                    password = customerPassword,
                    token = customerToken
                } : null
            });
        }

        /// <summary>
        /// Updates payment status and transaction ID via Stored Procedure sp_UpdatePaymentStatus
        /// </summary>
        [HttpPost("payment-status")]
        [HttpPost("{orderRef}/payment-status")]
        public async Task<IActionResult> UpdatePaymentStatus(string? orderRef, [FromBody] UpdatePaymentStatusDto dto)
        {
            var targetRef = !string.IsNullOrWhiteSpace(orderRef) ? orderRef : dto.OrderReference;
            if (string.IsNullOrWhiteSpace(targetRef) && (!dto.OrderId.HasValue || dto.OrderId.Value <= 0))
            {
                return BadRequest(new { message = "Order reference or Order ID is required." });
            }

            bool success;
            if (!string.IsNullOrWhiteSpace(targetRef))
            {
                success = await _orderRepository.UpdatePaymentStatusByReferenceAsync(targetRef, dto.PaymentStatus, dto.TransactionId ?? string.Empty);
            }
            else
            {
                success = await _orderRepository.UpdatePaymentStatusAsync(dto.OrderId!.Value, dto.PaymentStatus, dto.TransactionId ?? string.Empty);
            }

            if (!success)
            {
                return NotFound(new { message = "Order not found." });
            }

            return Ok(new
            {
                success = true,
                message = $"PaymentStatus updated to '{dto.PaymentStatus}' and TransactionId saved successfully via sp_UpdatePaymentStatus.",
                paymentStatus = dto.PaymentStatus,
                transactionId = dto.TransactionId
            });
        }

        /// <summary>
        /// Verifies customer confirmation OTP via Stored Procedure sp_VerifyOrderConfirmationOtp
        /// </summary>
        [HttpPost("verify-confirmation-otp")]
        [HttpPost("{orderRef}/verify-confirmation-otp")]
        public async Task<IActionResult> VerifyCustomerConfirmationOtp(string? orderRef, [FromBody] VerifyCustomerOtpDto dto)
        {
            var targetRef = !string.IsNullOrWhiteSpace(orderRef) ? orderRef : dto.OrderReference;
            if (string.IsNullOrWhiteSpace(targetRef) && (!dto.OrderId.HasValue || dto.OrderId.Value <= 0))
            {
                return BadRequest(new { verified = false, message = "Order reference or Order ID is required." });
            }

            if (string.IsNullOrWhiteSpace(dto.Otp))
            {
                return BadRequest(new { verified = false, message = "Confirmation OTP is required." });
            }

            (bool success, string message) result;
            if (!string.IsNullOrWhiteSpace(targetRef))
            {
                result = await _orderRepository.VerifyOrderConfirmationOtpByReferenceAsync(targetRef, dto.Otp);
            }
            else
            {
                result = await _orderRepository.VerifyOrderConfirmationOtpAsync(dto.OrderId!.Value, dto.Otp);
            }

            if (!result.success)
            {
                return BadRequest(new { verified = false, message = result.message });
            }

            return Ok(new
            {
                verified = true,
                success = true,
                orderStatus = "Confirmed",
                message = "Order Confirmation OTP verified successfully via sp_VerifyOrderConfirmationOtp. OrderStatus is now Confirmed!"
            });
        }

        /// <summary>
        /// Verifies customer delivery handover OTP via Stored Procedure sp_VerifyDeliveryOtp
        /// </summary>
        [HttpPost("verify-delivery-otp")]
        [HttpPost("{orderRef}/verify-delivery-otp")]
        public async Task<IActionResult> VerifyCustomerDeliveryOtp(string? orderRef, [FromBody] VerifyDeliveryOtpDto dto)
        {
            var targetRef = !string.IsNullOrWhiteSpace(orderRef) ? orderRef : dto.OrderReference;
            if (string.IsNullOrWhiteSpace(targetRef) && (!dto.OrderId.HasValue || dto.OrderId.Value <= 0))
            {
                return BadRequest(new { verified = false, message = "Order reference or Order ID is required." });
            }

            if (string.IsNullOrWhiteSpace(dto.Otp))
            {
                return BadRequest(new { verified = false, message = "Delivery OTP is required." });
            }

            (bool success, string message) result;
            if (!string.IsNullOrWhiteSpace(targetRef))
            {
                result = await _orderRepository.VerifyDeliveryOtpByReferenceAsync(targetRef, dto.Otp);
            }
            else
            {
                result = await _orderRepository.VerifyDeliveryOtpAsync(dto.OrderId!.Value, dto.Otp);
            }

            if (!result.success)
            {
                return BadRequest(new { verified = false, message = result.message });
            }

            return Ok(new
            {
                verified = true,
                success = true,
                orderStatus = "Delivered",
                message = "Delivery OTP verified successfully via sp_VerifyDeliveryOtp. OrderStatus is now Delivered!"
            });
        }

        /// <summary>
        /// Update order fulfillment and delivery tracking status (Admin Only - Requires JWT)
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpPatch("{orderRef}/status")]
        [HttpPut("{orderRef}/status")]
        public async Task<ActionResult> UpdateOrderStatus(string orderRef, [FromBody] OrderStatusUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Status))
            {
                return BadRequest(new { message = "Status cannot be empty." });
            }

            var updated = await _orderRepository.UpdateOrderStatusAsync(orderRef, dto.Status);
            if (!updated)
            {
                return NotFound(new { message = $"Order reference '{orderRef}' not found." });
            }

            return Ok(new
            {
                message = "Order status updated successfully.",
                orderReference = orderRef,
                newStatus = dto.Status,
                stage = dto.Stage,
                courierPartner = dto.CourierPartner,
                trackingAwb = dto.TrackingAwb
            });
        }

        /// <summary>
        /// Permanently deletes an order by order reference (Admin Only - Requires JWT).
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpDelete("{orderRef}")]
        public async Task<IActionResult> DeleteOrder(string orderRef)
        {
            var deleted = await _orderRepository.DeleteOrderAsync(orderRef);
            return Ok(new
            {
                success = true,
                message = deleted ? $"Order '{orderRef}' deleted successfully." : $"Order '{orderRef}' was already removed or not found.",
                orderReference = orderRef
            });
        }
    }
}



