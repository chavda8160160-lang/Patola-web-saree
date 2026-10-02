/* ====================================================================================================
 * File Name: AuthController.cs
 * Folder: backend/Controllers/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * High-Security JWT Authentication Controller.
 * Issues cryptographically signed HMAC-SHA256 JWT tokens for Master Admin access.
 * Secures administrative endpoints (Saree additions, deletions, updates, customer order views).
 * ==================================================================================================== */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

namespace VirasatPatola.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration configuration, ILogger<AuthController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Authenticate Admin and receive signed JWT Token
        /// </summary>
        [EnableRateLimiting("AdminLogin")]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { success = false, message = "Username and Password or PIN are required." });
            }

            var configUsername = _configuration["AdminCredentials:Username"];
            var configPassword = _configuration["AdminCredentials:Password"];
            if (string.IsNullOrWhiteSpace(configUsername) || string.IsNullOrWhiteSpace(configPassword))
            {
                _logger.LogError("Admin credentials are not configured.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new { success = false, message = "Admin login is not configured." });
            }

            var reqUser = (request.Username ?? "").Trim();
            var reqPass = request.Password.Trim();
            var suppliedHash = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(reqPass));
            var configuredHash = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(configPassword));
            bool isValid = string.Equals(reqUser, configUsername.Trim(), StringComparison.OrdinalIgnoreCase)
                && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(suppliedHash, configuredHash);

            if (!isValid)
            {
                _logger.LogWarning("Failed login attempt for user: {User} from IP: {Ip}", request.Username, HttpContext.Connection.RemoteIpAddress);
                return Unauthorized(new { success = false, message = "Invalid admin username or password/PIN." });
            }

            // Generate JWT Token
            var secretKey = _configuration["JwtSettings:SecretKey"];
            if (string.IsNullOrWhiteSpace(secretKey) || Encoding.UTF8.GetByteCount(secretKey) < 32)
            {
                _logger.LogError("JWT signing key is missing or shorter than 32 bytes.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new { success = false, message = "Admin login is not configured." });
            }
            var issuer = _configuration["JwtSettings:Issuer"] ?? "VirasatPatolaApi";
            var audience = _configuration["JwtSettings:Audience"] ?? "VirasatPatolaClient";
            var expiryHours = double.TryParse(_configuration["JwtSettings:ExpiryHours"], out var h) ? h : 24;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, configUsername),
                new Claim(ClaimTypes.Name, configUsername),
                new Claim("name", configUsername),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim("role", "Admin"),
                new Claim("Portal", "MasterLoom"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            _logger.LogInformation("Admin authenticated successfully. JWT token issued for {User}.", configUsername);

            return Ok(new LoginResponseDto
            {
                Success = true,
                Message = "Authentication successful. Access granted to Master Loom Artisan Portal.",
                Token = tokenString,
                TokenType = "Bearer",
                ExpiresAt = expiresAt,
                Role = "Admin",
                Username = configUsername
            });
        }

        /// <summary>
        /// Verify current JWT token validity
        /// </summary>
        [Authorize(Roles = "Admin")]
        [HttpGet("verify")]
        public IActionResult Verify()
        {
            var username = User.Identity?.Name ?? "Admin";
            return Ok(new
            {
                success = true,
                valid = true,
                user = username,
                role = "Admin",
                message = "Token is active and verified."
            });
        }
    }

    public class LoginRequestDto
    {
        public string? Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string TokenType { get; set; } = "Bearer";
        public DateTime ExpiresAt { get; set; }
        public string Role { get; set; } = "Admin";
        public string Username { get; set; } = string.Empty;
    }
}


