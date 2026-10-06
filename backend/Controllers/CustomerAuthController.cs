using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.DTOs;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/customer")]
    [Produces("application/json")]
    public class CustomerAuthController : ControllerBase
    {
        private readonly VirasatPatolaDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CustomerAuthController> _logger;

        public CustomerAuthController(
            VirasatPatolaDbContext context,
            IConfiguration configuration,
            ILogger<CustomerAuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
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

        private static bool VerifyPassword(string password, string storedHash, string storedSalt)
        {
            using var sha = SHA256.Create();
            var combined = Encoding.UTF8.GetBytes(password + storedSalt);
            var hash = Convert.ToBase64String(sha.ComputeHash(combined));
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(hash),
                Encoding.UTF8.GetBytes(storedHash));
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

        /// <summary>
        /// Registers a new customer with Mobile Number and Password
        /// </summary>
        [EnableRateLimiting("CustomerAuth")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] CustomerRegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var phone = NormalizePhone(dto.PhoneNumber);
            if (phone.Length != 10)
                return BadRequest(new { success = false, message = "Please enter a valid 10-digit mobile number." });

            var existing = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == phone);
            if (existing != null)
            {
                return Conflict(new { success = false, message = "An account with this mobile number already exists. Please login with your password." });
            }

            var (hash, salt) = HashPassword(dto.Password);

            var customer = new Customer
            {
                CustomerName = dto.CustomerName.Trim(),
                PhoneNumber = phone,
                PasswordHash = hash,
                PasswordSalt = salt,
                Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
                DeliveryAddress = string.IsNullOrWhiteSpace(dto.DeliveryAddress) ? null : dto.DeliveryAddress.Trim(),
                City = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim(),
                State = string.IsNullOrWhiteSpace(dto.State) ? null : dto.State.Trim(),
                PostalCode = string.IsNullOrWhiteSpace(dto.PostalCode) ? null : dto.PostalCode.Trim(),
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            var token = GenerateCustomerToken(customer);

            return Ok(new
            {
                success = true,
                message = "Account created successfully! Welcome to Virasat Patola.",
                token,
                customer = new
                {
                    id = customer.Id,
                    customerName = customer.CustomerName,
                    phoneNumber = customer.PhoneNumber,
                    email = customer.Email,
                    deliveryAddress = customer.DeliveryAddress,
                    city = customer.City,
                    state = customer.State,
                    postalCode = customer.PostalCode
                }
            });
        }

        /// <summary>
        /// Customer Login using Mobile Number and Password
        /// </summary>
        [EnableRateLimiting("CustomerAuth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] CustomerLoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var phone = NormalizePhone(dto.PhoneNumber);
            if (phone.Length != 10)
                return BadRequest(new { success = false, message = "Please enter a valid 10-digit mobile number." });

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == phone);
            if (customer == null)
            {
                return NotFound(new { success = false, message = "No account found with this mobile number. Please register first." });
            }

            if (!VerifyPassword(dto.Password, customer.PasswordHash, customer.PasswordSalt))
            {
                return Unauthorized(new { success = false, message = "Incorrect password. Please check and try again." });
            }

            customer.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateCustomerToken(customer);

            return Ok(new
            {
                success = true,
                message = $"Welcome back, {customer.CustomerName}!",
                token,
                customer = new
                {
                    id = customer.Id,
                    customerName = customer.CustomerName,
                    phoneNumber = customer.PhoneNumber,
                    email = customer.Email,
                    deliveryAddress = customer.DeliveryAddress,
                    city = customer.City,
                    state = customer.State,
                    postalCode = customer.PostalCode
                }
            });
        }

        /// <summary>
        /// Get Profile for Customer by phone or token
        /// </summary>
        [EnableRateLimiting("SensitiveLookup")]
        [HttpGet("profile/{phone}")]
        public async Task<IActionResult> GetProfile(string phone)
        {
            var cleanPhone = NormalizePhone(phone);
            var customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.PhoneNumber == cleanPhone);
            if (customer == null)
                return NotFound(new { success = false, message = "Customer not found." });

            return Ok(new
            {
                success = true,
                customer = new
                {
                    id = customer.Id,
                    customerName = customer.CustomerName,
                    phoneNumber = customer.PhoneNumber,
                    email = customer.Email,
                    deliveryAddress = customer.DeliveryAddress,
                    city = customer.City,
                    state = customer.State,
                    postalCode = customer.PostalCode
                }
            });
        }

        /// <summary>
        /// Update Profile for Customer
        /// </summary>
        [HttpPut("profile/{phone}")]
        public async Task<IActionResult> UpdateProfile(string phone, [FromBody] CustomerProfileUpdateDto dto)
        {
            var cleanPhone = NormalizePhone(phone);
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == cleanPhone);
            if (customer == null)
                return NotFound(new { success = false, message = "Customer not found." });

            customer.CustomerName = dto.CustomerName.Trim();
            customer.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
            customer.DeliveryAddress = string.IsNullOrWhiteSpace(dto.DeliveryAddress) ? null : dto.DeliveryAddress.Trim();
            customer.City = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim();
            customer.State = string.IsNullOrWhiteSpace(dto.State) ? null : dto.State.Trim();
            customer.PostalCode = string.IsNullOrWhiteSpace(dto.PostalCode) ? null : dto.PostalCode.Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Profile updated successfully.",
                customer = new
                {
                    id = customer.Id,
                    customerName = customer.CustomerName,
                    phoneNumber = customer.PhoneNumber,
                    email = customer.Email,
                    deliveryAddress = customer.DeliveryAddress,
                    city = customer.City,
                    state = customer.State,
                    postalCode = customer.PostalCode
                }
            });
        }

        /// <summary>
        /// Fetch all orders matching this Customer's mobile number
        /// </summary>
        [EnableRateLimiting("SensitiveLookup")]
        [HttpGet("orders/{phone}")]
        public async Task<IActionResult> GetCustomerOrders(string phone)
        {
            var cleanPhone = NormalizePhone(phone);
            if (cleanPhone.Length < 7)
                return BadRequest(new { success = false, message = "Invalid phone number." });

            var orders = await _context.Orders
                .Include(o => o.Items)
                .AsNoTracking()
                .Where(o => o.ContactPhone.Contains(cleanPhone))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                count = orders.Count,
                orders = orders.Select(o => new
                {
                    o.Id,
                    o.OrderReference,
                    o.CustomerName,
                    o.ContactPhone,
                    o.DeliveryAddress,
                    o.City,
                    o.State,
                    o.PostalCode,
                    o.Currency,
                    o.TotalAmount,
                    o.PaymentMode,
                    o.PaymentStatus,
                    o.OrderStatus,
                    o.TransactionId,
                    o.Notes,
                    o.CreatedAt,
                    items = o.Items.Select(i => new
                    {
                        i.Id,
                        i.SareeId,
                        i.SareeTitle,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    })
                })
            });
        }

        /// <summary>
        /// Allows a customer to change their password to their preferred custom password.
        /// </summary>
        [EnableRateLimiting("CustomerAuth")]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] CustomerChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            string? phone = null;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                phone = NormalizePhone(dto.PhoneNumber);
            }
            else if (User.Identity?.IsAuthenticated == true)
            {
                phone = NormalizePhone(User.FindFirstValue(ClaimTypes.MobilePhone) ?? string.Empty);
            }

            if (string.IsNullOrWhiteSpace(phone) || phone.Length != 10)
            {
                return BadRequest(new { success = false, message = "Valid mobile number is required to change password." });
            }

            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.PhoneNumber == phone);
            if (customer == null)
            {
                return NotFound(new { success = false, message = "Customer account not found." });
            }

            if (!VerifyPassword(dto.OldPassword, customer.PasswordHash, customer.PasswordSalt))
            {
                return BadRequest(new { success = false, message = "Incorrect current password. Please enter the password you received on WhatsApp." });
            }

            var (newHash, newSalt) = HashPassword(dto.NewPassword);
            customer.PasswordHash = newHash;
            customer.PasswordSalt = newSalt;
            customer.GeneratedPassword = dto.NewPassword;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Your password has been changed successfully! You can now login with your new password."
            });
        }
    }
}
