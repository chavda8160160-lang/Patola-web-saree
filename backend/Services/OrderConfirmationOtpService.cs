using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace VirasatPatola.Api.Services;

public sealed class OrderConfirmationOtpService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan VerificationLifetime = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan SendWindow = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan SendCooldown = TimeSpan.FromSeconds(45);
    private const int MaxSendsPerWindow = 3;
    private const int MaxVerifyAttempts = 5;

    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ConcurrentDictionary<string, PhoneOtpState> _phoneStates = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, VerifiedTokenState> _verifiedTokens = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _phoneLocks = new(StringComparer.Ordinal);

    public OrderConfirmationOtpService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public bool IsEnabled => bool.TryParse(_configuration["OrderConfirmationOtp:Enabled"], out var enabled) && enabled;

    public async Task SendCodeAsync(string suppliedPhone, CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var phone = NormalizePhone(suppliedPhone);
        RemoveExpiredTokens();
        var gate = _phoneLocks.GetOrAdd(phone, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            var now = DateTimeOffset.UtcNow;
            var state = _phoneStates.GetOrAdd(phone, _ => new PhoneOtpState());
            if (now - state.WindowStartedAt >= SendWindow)
            {
                state.WindowStartedAt = now;
                state.SendCount = 0;
            }
            if (state.LastSentAt.HasValue && now - state.LastSentAt.Value < SendCooldown)
                throw new OtpRequestException("Please wait before requesting another code.");
            if (state.SendCount >= MaxSendsPerWindow)
                throw new OtpRequestException("Too many codes were requested. Please try again later.");

            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            state.SendCount++;
            state.LastSentAt = now;

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://2factor.in/API/V1/OTP/SEND")
            {
                Content = JsonContent.Create(new
                {
                    to = phone,
                    template_name = _configuration["OrderConfirmationOtp:TemplateName"],
                    var1 = code
                })
            };
            request.Headers.TryAddWithoutValidation("X-API-Key", _configuration["OrderConfirmationOtp:ApiKey"]);

            try
            {
                using var response = await _httpClientFactory.CreateClient().SendAsync(request, cancellationToken);
                var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
                if (!response.IsSuccessStatusCode || !ProviderAcceptedMessage(responseText))
                    throw new OtpProviderException("Could not send the confirmation code. Please retry shortly.");
            }
            catch (HttpRequestException)
            {
                throw new OtpProviderException("Could not connect to the SMS provider. Please retry shortly.");
            }

            state.CodeHash = Hash(phone + ":" + code);
            state.ExpiresAt = now.Add(OtpLifetime);
            state.VerifyAttempts = 0;
        }
        finally
        {
            gate.Release();
        }
    }

    public string VerifyCode(string suppliedPhone, string code)
    {
        var phone = NormalizePhone(suppliedPhone);
        if (!_phoneStates.TryGetValue(phone, out var state))
            throw new OtpRequestException("The code is invalid or expired. Request a new code.");

        var gate = _phoneLocks.GetOrAdd(phone, _ => new SemaphoreSlim(1, 1));
        gate.Wait();
        try
        {
            if (state.CodeHash is null || !state.ExpiresAt.HasValue || state.ExpiresAt.Value <= DateTimeOffset.UtcNow)
                throw new OtpRequestException("The code is invalid or expired. Request a new code.");
            if (state.VerifyAttempts >= MaxVerifyAttempts)
            {
                state.CodeHash = null;
                throw new OtpRequestException("Too many incorrect attempts. Request a new code.");
            }

            state.VerifyAttempts++;
            var expected = Convert.FromHexString(state.CodeHash);
            var supplied = Convert.FromHexString(Hash(phone + ":" + code));
            if (!CryptographicOperations.FixedTimeEquals(expected, supplied))
            {
                if (state.VerifyAttempts >= MaxVerifyAttempts) state.CodeHash = null;
                throw new OtpRequestException("The code is incorrect or expired.");
            }

            state.CodeHash = null;
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');
            _verifiedTokens[Hash(token)] = new VerifiedTokenState(phone, DateTimeOffset.UtcNow.Add(VerificationLifetime));
            return token;
        }
        finally
        {
            gate.Release();
        }
    }

    public bool TryReserveVerifiedToken(string suppliedPhone, string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;
        string phone;
        try { phone = NormalizePhone(suppliedPhone); }
        catch (OtpPhoneValidationException) { return false; }
        var key = Hash(token);
        if (!_verifiedTokens.TryGetValue(key, out var state)
            || state.ExpiresAt <= DateTimeOffset.UtcNow
            || !string.Equals(state.Phone, phone, StringComparison.Ordinal)
            || state.IsReserved)
            return false;
        return _verifiedTokens.TryUpdate(key, state with { IsReserved = true }, state);
    }

    public void ReleaseVerifiedToken(string token)
    {
        if (!string.IsNullOrWhiteSpace(token)
            && _verifiedTokens.TryGetValue(Hash(token), out var state)
            && state.IsReserved)
            _verifiedTokens.TryUpdate(Hash(token), state with { IsReserved = false }, state);
    }

    public void CompleteVerifiedToken(string token)
    {
        if (!string.IsNullOrWhiteSpace(token))
            _verifiedTokens.TryRemove(Hash(token), out _);
    }

    public static string NormalizePhone(string suppliedPhone)
    {
        var digits = new string((suppliedPhone ?? string.Empty).Where(char.IsDigit).ToArray());
        if (digits.Length == 10) digits = "91" + digits;
        if (digits.Length != 12 || !digits.StartsWith("91", StringComparison.Ordinal))
            throw new OtpPhoneValidationException("Enter a valid 10-digit Indian mobile number.");
        return "+" + digits;
    }

    private void RemoveExpiredTokens()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var item in _verifiedTokens)
            if (item.Value.ExpiresAt <= now) _verifiedTokens.TryRemove(item.Key, out _);
    }

    private void EnsureConfigured()
    {
        if (!IsEnabled
            || string.IsNullOrWhiteSpace(_configuration["OrderConfirmationOtp:ApiKey"])
            || string.IsNullOrWhiteSpace(_configuration["OrderConfirmationOtp:TemplateName"]))
            throw new OtpServiceUnavailableException("Order confirmation OTP is not configured on the server.");
    }

    private static bool ProviderAcceptedMessage(string responseBody)
    {
        try
        {
            using var json = JsonDocument.Parse(responseBody);
            return json.RootElement.TryGetProperty("status", out var status)
                && string.Equals(status.GetString(), "sent", StringComparison.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string Hash(string value)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private sealed class PhoneOtpState
    {
        public DateTimeOffset WindowStartedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? LastSentAt { get; set; }
        public int SendCount { get; set; }
        public string? CodeHash { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public int VerifyAttempts { get; set; }
    }

    private sealed record VerifiedTokenState(string Phone, DateTimeOffset ExpiresAt, bool IsReserved = false);
}

public sealed class OtpRequestException(string message) : Exception(message);
public sealed class OtpServiceUnavailableException(string message) : Exception(message);
public sealed class OtpPhoneValidationException(string message) : Exception(message);
public sealed class OtpProviderException(string message) : Exception(message);
