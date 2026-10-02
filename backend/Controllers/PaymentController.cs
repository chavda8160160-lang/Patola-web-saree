using System.Net.Http.Headers;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Repositories.Interfaces;
using VirasatPatola.Api.Services;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly PaymentSessionStore _paymentSessions;
        private readonly IOrderRepository _orderRepository;

        public PaymentController(
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            PaymentSessionStore paymentSessions,
            IOrderRepository orderRepository)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _paymentSessions = paymentSessions;
            _orderRepository = orderRepository;
        }

        [HttpGet("config")]
        public ActionResult<PaymentConfigDto> GetConfig()
        {
            return Ok(new PaymentConfigDto
            {
                KeyId = _configuration["RazorpaySettings:KeyId"] ?? string.Empty,
                MerchantName = _configuration["RazorpaySettings:MerchantName"] ?? "Virasat Patola Handloom",
                TestMode = bool.TryParse(_configuration["RazorpaySettings:TestMode"], out var testMode) && testMode,
                SupportedCurrencies = "INR"
            });
        }

        [HttpPost("create-order")]
        public async Task<ActionResult<CreatePaymentOrderResponseDto>> CreatePaymentOrder([FromBody] CreatePaymentOrderRequestDto request)
        {
            if (request == null || request.Amount <= 0 || decimal.Round(request.Amount, 2) != request.Amount)
                return BadRequest(new { message = "A valid payment amount with up to two decimal places is required." });

            var currency = (request.Currency ?? "INR").Trim().ToUpperInvariant();
            if (currency != "INR")
                return BadRequest(new { message = "Online checkout currently accepts INR payments only." });

            var headerIdempotencyKey = Request.Headers["Idempotency-Key"].ToString().Trim();
            var bodyIdempotencyKey = request.IdempotencyKey?.Trim();
            if (!string.IsNullOrEmpty(headerIdempotencyKey)
                && !string.IsNullOrEmpty(bodyIdempotencyKey)
                && !string.Equals(headerIdempotencyKey, bodyIdempotencyKey, StringComparison.Ordinal))
                return BadRequest(new { message = "The idempotency key header and request body must match." });

            var idempotencyKey = string.IsNullOrEmpty(headerIdempotencyKey) ? bodyIdempotencyKey : headerIdempotencyKey;
            if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Length < 16 || idempotencyKey.Length > 128)
                return BadRequest(new { message = "A valid idempotency key is required for online checkout." });

            var fingerprintInput = string.Join("\u001f",
                request.Amount.ToString("0.00", CultureInfo.InvariantCulture), currency,
                request.OrderReference?.Trim() ?? string.Empty,
                request.CustomerName?.Trim() ?? string.Empty,
                request.CustomerEmail?.Trim() ?? string.Empty,
                request.CustomerPhone?.Trim() ?? string.Empty,
                request.Notes?.Trim() ?? string.Empty);
            var requestFingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(fingerprintInput)));
            using var idempotencyLock = await _paymentSessions.AcquireIdempotencyLockAsync(idempotencyKey);
            if (_paymentSessions.TryGetIdempotentOrder(idempotencyKey, out var cachedOrder))
            {
                if (!string.Equals(cachedOrder.RequestFingerprint, requestFingerprint, StringComparison.Ordinal))
                    return Conflict(new { message = "This idempotency key was already used for different checkout details." });
                return Ok(cachedOrder.Response);
            }

            var keyId = _configuration["RazorpaySettings:KeyId"] ?? string.Empty;
            var keySecret = _configuration["RazorpaySettings:KeySecret"] ?? string.Empty;
            var testMode = bool.TryParse(_configuration["RazorpaySettings:TestMode"], out var configuredTestMode) && configuredTestMode;
            if (testMode)
                keyId = string.IsNullOrWhiteSpace(keyId) ? "TEST-SIMULATOR" : keyId;
            else if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Online payment is not configured on the server." });

            var amountInPaise = checked((long)(request.Amount * 100));
            var orderReference = string.IsNullOrWhiteSpace(request.OrderReference)
                ? $"VP-{Guid.NewGuid():N}"[..12].ToUpperInvariant()
                : request.OrderReference.Trim();
            string razorpayOrderId;

            if (testMode)
            {
                // Test mode uses a local-only session for the clearly labelled simulator.
                razorpayOrderId = $"order_test_{Guid.NewGuid():N}"[..25];
            }
            else
            {
                try
                {
                    using var client = CreateRazorpayClient(keyId, keySecret);
                    var payload = JsonSerializer.Serialize(new
                    {
                        amount = amountInPaise,
                        currency,
                        receipt = orderReference.Length <= 40 ? orderReference : orderReference[..40],
                        notes = new { customer_name = request.CustomerName ?? string.Empty }
                    });
                    using var response = await client.PostAsync("https://api.razorpay.com/v1/orders",
                        new StringContent(payload, Encoding.UTF8, "application/json"));
                    if (!response.IsSuccessStatusCode)
                        return StatusCode(StatusCodes.Status502BadGateway, new { message = "Payment provider could not create the checkout session." });

                    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    razorpayOrderId = json.RootElement.GetProperty("id").GetString() ?? string.Empty;
                    var providerAmount = json.RootElement.GetProperty("amount").GetInt64();
                    var providerCurrency = json.RootElement.GetProperty("currency").GetString();
                    if (string.IsNullOrWhiteSpace(razorpayOrderId) || providerAmount != amountInPaise || providerCurrency != currency)
                        return StatusCode(StatusCodes.Status502BadGateway, new { message = "Payment provider returned an invalid checkout session." });
                }
                catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException or InvalidOperationException)
                {
                    return StatusCode(StatusCodes.Status502BadGateway, new { message = "Could not connect to the payment provider. Please retry." });
                }
            }

            _paymentSessions.Add(razorpayOrderId, request.Amount, currency, orderReference);
            var paymentOrderResponse = new CreatePaymentOrderResponseDto
            {
                Success = true,
                RazorpayOrderId = razorpayOrderId,
                Amount = request.Amount,
                AmountInPaise = amountInPaise,
                Currency = currency,
                KeyId = keyId,
                OrderReference = orderReference,
                MerchantName = _configuration["RazorpaySettings:MerchantName"] ?? "Virasat Patola Handloom",
                IsTestMode = testMode,
                Message = testMode ? "Test payment session created." : "Secure payment session created."
            };
            _paymentSessions.SaveIdempotentOrder(idempotencyKey, requestFingerprint, paymentOrderResponse);
            return Ok(paymentOrderResponse);
        }

        [HttpPost("verify-payment")]
        public async Task<ActionResult<VerifyPaymentResponseDto>> VerifyPayment([FromBody] VerifyPaymentRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RazorpayPaymentId)
                || string.IsNullOrWhiteSpace(request.RazorpayOrderId))
                return BadRequest(new { verified = false, message = "Payment and checkout session IDs are required." });

            if (!_paymentSessions.TryGet(request.RazorpayOrderId, out var session)
                || session.Amount != request.Amount
                || !string.Equals(session.Currency, request.Currency, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(session.OrderReference, request.OrderReference, StringComparison.Ordinal))
                return BadRequest(new { verified = false, message = "Payment session is invalid, expired, or does not match this checkout." });

            if (session.IsVerified)
            {
                if (!string.Equals(session.PaymentId, request.RazorpayPaymentId, StringComparison.Ordinal))
                    return BadRequest(new { verified = false, message = "This checkout session was already verified with a different payment." });

                return Ok(new VerifyPaymentResponseDto
                {
                    Verified = true,
                    TransactionId = request.RazorpayPaymentId,
                    OrderReference = session.OrderReference,
                    Status = "Paid",
                    Message = "Payment was already verified.",
                    TimestampUtc = DateTime.UtcNow
                });
            }

            var testMode = bool.TryParse(_configuration["RazorpaySettings:TestMode"], out var configuredTestMode) && configuredTestMode;
            if (testMode)
            {
                var isSimulatorPayment = request.RazorpayPaymentId.StartsWith("pay_test_", StringComparison.Ordinal)
                    || request.RazorpayPaymentId.StartsWith("sim_", StringComparison.Ordinal)
                    || request.RazorpayPaymentId.StartsWith("pay_upi_", StringComparison.Ordinal)
                    || request.RazorpayPaymentId.StartsWith("pay_card_", StringComparison.Ordinal)
                    || request.RazorpayPaymentId.StartsWith("pay_nb_", StringComparison.Ordinal);
                if (!isSimulatorPayment || !request.RazorpayOrderId.StartsWith("order_test_", StringComparison.Ordinal))
                    return BadRequest(new { verified = false, message = "Only simulator payments are accepted while test mode is enabled." });
            }
            else
            {
                var keySecret = _configuration["RazorpaySettings:KeySecret"];
                if (string.IsNullOrWhiteSpace(keySecret) || string.IsNullOrWhiteSpace(request.RazorpaySignature))
                    return BadRequest(new { verified = false, message = "A valid Razorpay signature is required." });

                var payload = $"{session.OrderId}|{request.RazorpayPaymentId}";
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
                var generatedSignature = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
                var suppliedSignature = request.RazorpaySignature.Trim().ToLowerInvariant();
                var generatedBytes = Encoding.ASCII.GetBytes(generatedSignature);
                var suppliedBytes = Encoding.ASCII.GetBytes(suppliedSignature);
                if (generatedBytes.Length != suppliedBytes.Length
                    || !CryptographicOperations.FixedTimeEquals(generatedBytes, suppliedBytes))
                    return BadRequest(new { verified = false, message = "Payment signature verification failed." });

                var keyId = _configuration["RazorpaySettings:KeyId"] ?? string.Empty;
                try
                {
                    using var client = CreateRazorpayClient(keyId, keySecret);
                    using var response = await client.GetAsync($"https://api.razorpay.com/v1/payments/{Uri.EscapeDataString(request.RazorpayPaymentId)}");
                    if (!response.IsSuccessStatusCode)
                        return BadRequest(new { verified = false, message = "Payment provider could not confirm this transaction." });

                    using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    var payment = json.RootElement;
                    var isCaptured = payment.TryGetProperty("status", out var status) && status.GetString() == "captured";
                    var amountMatches = payment.TryGetProperty("amount", out var amount) && amount.GetInt64() == (long)(session.Amount * 100);
                    var currencyMatches = payment.TryGetProperty("currency", out var currency) && currency.GetString() == session.Currency;
                    var orderMatches = payment.TryGetProperty("order_id", out var orderId) && orderId.GetString() == session.OrderId;
                    if (!isCaptured || !amountMatches || !currencyMatches || !orderMatches)
                        return BadRequest(new { verified = false, message = "Payment is not captured or does not match this order." });
                }
                catch (Exception ex) when (ex is HttpRequestException or JsonException or KeyNotFoundException or InvalidOperationException)
                {
                    return StatusCode(StatusCodes.Status502BadGateway, new { verified = false, message = "Could not verify payment status with the provider." });
                }
            }

            if (!_paymentSessions.MarkVerified(session.OrderId, request.RazorpayPaymentId))
                return BadRequest(new { verified = false, message = "Payment session could not be confirmed." });

            // Synchronize PaymentStatus = 'Paid' and TransactionId in SQL Server via sp_UpdatePaymentStatus
            if (!string.IsNullOrWhiteSpace(session.OrderReference))
            {
                await _orderRepository.UpdatePaymentStatusByReferenceAsync(session.OrderReference, "Paid", request.RazorpayPaymentId);
            }

            return Ok(new VerifyPaymentResponseDto
            {
                Verified = true,
                TransactionId = request.RazorpayPaymentId,
                OrderReference = session.OrderReference,
                Status = "Paid",
                Message = testMode ? "Test payment verified." : "Payment captured and verified.",
                TimestampUtc = DateTime.UtcNow
            });
        }

        private HttpClient CreateRazorpayClient(string keyId, string keySecret)
        {
            var client = _httpClientFactory.CreateClient();
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            return client;
        }
    }
}
