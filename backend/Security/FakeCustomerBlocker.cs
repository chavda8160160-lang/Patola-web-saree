using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace VirasatPatola.Api.Security
{
    /// <summary>
    /// Enterprise Anti-Spam &amp; Fake Customer Detection Service
    /// Automatically detects and blocks fake inquiries, bot submissions, dummy phone numbers, and disposable emails.
    /// </summary>
    public static class FakeCustomerBlocker
    {
        // Blocked IPs with expiry timestamp (UTC)
        private static readonly ConcurrentDictionary<string, DateTime> _blockedIps = new();

        // Known disposable and temporary spam email domains
        private static readonly HashSet<string> _disposableEmailDomains = new(StringComparer.OrdinalIgnoreCase)
        {
            "tempmail.com", "mailinator.com", "trashmail.com", "10minutemail.com",
            "guerrillamail.com", "dispostable.com", "fake.com", "yopmail.com",
            "sharklasers.com", "fakemailgenerator.com", "getairmail.com", "throwawaymail.com"
        };

        // Obvious dummy/fake phone patterns
        private static readonly HashSet<string> _knownDummyPhones = new()
        {
            "1234567890", "0123456789", "0000000000", "1111111111", "2222222222",
            "3333333333", "4444444444", "5555555555", "6666666666", "7777777777",
            "8888888888", "9999999999", "9876543210"
        };

        /// <summary>
        /// Check if an IP address is currently blocked
        /// </summary>
        public static bool IsIpBlocked(string? ip)
        {
            if (string.IsNullOrWhiteSpace(ip)) return false;
            if (ip == "127.0.0.1" || ip == "::1" || ip == "localhost") return false;
            if (_blockedIps.TryGetValue(ip, out var expiry))
            {
                if (DateTime.UtcNow < expiry) return true;
                _blockedIps.TryRemove(ip, out _); // Expired
            }
            return false;
        }

        /// <summary>
        /// Block an IP address for a specified duration
        /// </summary>
        public static void BlockIp(string? ip, TimeSpan duration)
        {
            if (string.IsNullOrWhiteSpace(ip)) return;
            if (ip == "127.0.0.1" || ip == "::1" || ip == "localhost") return;
            _blockedIps[ip] = DateTime.UtcNow.Add(duration);
        }

        /// <summary>
        /// Validates customer details against bot and fake submission signatures.
        /// Returns (isFake, reason).
        /// </summary>
        public static (bool IsFake, string Reason) EvaluateCustomer(string fullName, string phone, string? email, string? ip)
        {
            // 1. Check if IP is already blocked
            if (IsIpBlocked(ip))
            {
                return (true, "This device/IP has been temporarily blocked due to previous fraudulent activity.");
            }

            // 2. Clean and validate phone number
            var cleanPhone = Regex.Replace(phone ?? "", @"\D", "");
            if (cleanPhone.Length > 10 && cleanPhone.StartsWith("91"))
            {
                cleanPhone = cleanPhone.Substring(2);
            }

            if (string.IsNullOrWhiteSpace(cleanPhone) || cleanPhone.Length != 10)
            {
                TriggerBlock(ip);
                return (true, "Invalid mobile number. Please provide a valid 10-digit number.");
            }

            // Check dummy list
            if (_knownDummyPhones.Contains(cleanPhone))
            {
                TriggerBlock(ip);
                return (true, "Fake/Dummy phone numbers are not permitted on Virasat Patola.");
            }

            // Indian mobile numbers must start with 6, 7, 8, or 9
            char firstDigit = cleanPhone[0];
            if (firstDigit < '6' || firstDigit > '9')
            {
                TriggerBlock(ip);
                return (true, "Invalid mobile number prefix. Legitimate mobile numbers in India start with 6, 7, 8, or 9.");
            }

            // Check all identical digits: e.g. 8888888888, 7777777777
            if (Regex.IsMatch(cleanPhone, @"^(\d)\1{9}$"))
            {
                TriggerBlock(ip);
                return (true, "Repetitive dummy digits detected. Fake customer detected.");
            }

            // 3. Email validation
            if (!string.IsNullOrWhiteSpace(email))
            {
                var cleanEmail = email.Trim().ToLowerInvariant();
                var parts = cleanEmail.Split('@');
                if (parts.Length == 2 && _disposableEmailDomains.Contains(parts[1]))
                {
                    TriggerBlock(ip);
                    return (true, "Disposable or fake temporary emails are prohibited.");
                }
            }

            // 4. Name validation (no XSS or bot script tags)
            if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 2)
            {
                return (true, "Customer name is too short or invalid.");
            }

            if (Regex.IsMatch(fullName, @"<[^>]+>|javascript:|alert\(|script", RegexOptions.IgnoreCase))
            {
                TriggerBlock(ip);
                return (true, "Malicious script injection detected. Client has been blocked.");
            }

            return (false, string.Empty);
        }

        private static void TriggerBlock(string? ip)
        {
            if (!string.IsNullOrWhiteSpace(ip))
            {
                BlockIp(ip, TimeSpan.FromHours(2));
            }
        }
    }
}
