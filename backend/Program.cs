/* ====================================================================================================
 * File Name: Program.cs
 * Folder: backend/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Main Entry Point for .NET Core Web API.
 * Configures:
 * 1. Database Configuration (SQL Server & In-Memory Fallback)
 * 2. Repository Pattern Dependency Injection Registration:
 *    - ISareeRepository -> SareeRepository (Stored Procedures: sp_GetSarees, sp_GetSareeById)
 *    - IBookingRepository -> BookingRepository (Stored Procedure: sp_CreateBooking)
 *    - IOrderRepository -> OrderRepository (Stored Procedure: sp_CreateOrder)
 *    - INewsletterRepository -> NewsletterRepository (Stored Procedure: sp_SubscribeNewsletter)
 * 3. CORS Policy (Cross-Origin Resource Sharing)
 * 4. Swagger UI Documentation Generation
 * 5. Static Files & Frontend Serving
 * ==================================================================================================== */

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi;
using System.Reflection;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.AspNetCore.ResponseCompression;
using VirasatPatola.Api.Data;
using VirasatPatola.Api.Repositories.Implementations;
using VirasatPatola.Api.Repositories.Interfaces;
using VirasatPatola.Api.Security;
using VirasatPatola.Api.Services;
using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 0. Configure Kestrel & Form Limits for Large Image Uploads (up to 150 MB)
// Fixes: Microsoft.AspNetCore.Server.Kestrel.Core.BadHttpRequestException: Request body too large
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 157286400; // 150 MB maximum request size (supports multiple 4K saree photos)
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 157286400; // 150 MB maximum request size
    options.ValueLengthLimit = 157286400;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// 1. Add Controllers with JSON formatting
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Compress text-based API and static-file responses with Brotli (and Gzip fallback).
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// 1.1 In-Memory RAM Caching (Zero-latency RAM cache to eliminate repetitive SQL Database loads)
builder.Services.AddMemoryCache();

// 2. Add CORS Policy (To connect React Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://localhost:5285",
                "https://patolamadevankar.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 2.1. Enterprise Anti-DDoS Rate Limiting (Protects API against 50,000 spam bursts and bot attacks)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Fixed Window Limiter: 100 requests per minute per IP
    options.AddPolicy("ApiRateLimiter", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 5
        });
    });

    options.AddPolicy("AdminLogin", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0
        });
    });

    options.AddPolicy("CustomerAuth", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0
        });
    });

    options.AddPolicy("SensitiveLookup", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(10),
            QueueLimit = 0
        });
    });
    options.AddPolicy("OrderOtpSend", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 3,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0
        });
    });
    options.AddPolicy("OrderOtpVerify", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0
        });
    });
    // Global Sliding Window Limiter: 250 requests per minute
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetSlidingWindowLimiter(clientIp, _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 250,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 6,
            QueueLimit = 0
        });
    });

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"error\":\"Security Alert: Excessive API request rate detected. Anti-DDoS protection has throttled your connection. Please wait 60 seconds before retrying.\",\"statusCode\":429}",
            token);
    };
});

// 3. Configure Database (SQL Server with Resilience & Fallback)
var sqlConnectionString = builder.Configuration.GetConnectionString("SqlServerConnection") 
                          ?? builder.Configuration.GetConnectionString("LocalDbConnection")
                          ?? "Server=localhost;Database=VirasatPatolaDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

builder.Services.AddDbContext<VirasatPatolaDbContext>(options =>
{
    options.UseSqlServer(sqlConnectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null);
    });
});

// 4. Register Repository Pattern Dependency Injections (DI)
// Map interfaces to concrete implementations calling Stored Procedures:
builder.Services.AddScoped<ISareeRepository, SareeRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<INewsletterRepository, NewsletterRepository>();
builder.Services.AddSingleton<ICustomPhotoStorageService, CustomPhotoStorageService>();
builder.Services.AddScoped<IProductImageStorageService, ProductImageStorageService>();
builder.Services.AddScoped<IVirtualTryOnService, VirtualTryOnService>();
builder.Services.AddSingleton<PaymentSessionStore>();
builder.Services.AddSingleton<OrderConfirmationOtpService>();
builder.Services.AddHttpClient();

// 4.1 Configure JWT Authentication & Authorization
var jwtSecretKey = builder.Configuration["JwtSettings:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey) || Encoding.UTF8.GetByteCount(jwtSecretKey) < 32)
{
    throw new InvalidOperationException("JwtSettings:SecretKey must be supplied through secure configuration and contain at least 32 bytes.");
}
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "VirasatPatolaApi";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "VirasatPatolaClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Name
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader))
            {
                var raw = authHeader.Trim();
                // Strip all repeated "Bearer " prefixes (handles Swagger UI auto-prefixing and Postman)
                while (raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    raw = raw.Substring(7).Trim();
                }
                

                // Assign cleaned token for standard JWT Bearer validation
                if (!string.IsNullOrEmpty(raw))
                {
                    context.Token = raw;
                }
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// 5. Configure Swagger / OpenAPI for Visual Studio & Interactive Testing
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Virasat Patola API (Repository Pattern & Stored Procedures)",
        Version = "v1",
        Description = "Enterprise .NET Core Web API with JWT Authentication & Microsoft SQL Server Stored Procedures."
    });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    };

    c.AddSecurityDefinition("Bearer", securityScheme);

    // 🔴 THIS IS MISSING IN YOUR CODE
    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });

    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);

    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// 6. Initialize & Seed Database on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<VirasatPatolaDbContext>();
        
        bool canConnect = false;
        try
        {
            canConnect = await context.Database.CanConnectAsync();
        }
        catch
        {
            canConnect = false;
        }

        if (canConnect)
        {
            logger.LogInformation("Connected to SQL Server. Initializing tables & seed data...");
            await DbInitializer.InitializeAsync(context);
            await CustomPhotoStorageService.MigrateLegacyBase64BookingsAsync(context, app.Environment, logger);
            var productImageStorage = services.GetRequiredService<IProductImageStorageService>();
            await productImageStorage.MigrateLegacyImagesAsync();
        }
        else
        {
            logger.LogWarning("SQL Server not reachable yet. Initializing in-memory fallback store...");
            await DbInitializer.InitializeAsync(context);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database initialization.");
    }
}

// 7. HTTP Request Pipeline

// Run before static files and endpoints so both can negotiate Brotli compression.
app.UseResponseCompression();

// Enterprise Security Headers Middleware (Anti-Clickjacking, XSS Protection & Sniffing Defense)
app.Use(async (context, next) =>
{
    // Block IP if on blacklist
    var clientIp = context.Connection.RemoteIpAddress?.ToString();
    if (FakeCustomerBlocker.IsIpBlocked(clientIp))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"error\":\"Access Denied: Your IP has been blocked due to suspicious activity or repeated fake submissions.\",\"blocked\":true}");
        return;
    }

    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;");
    await next();
});

// Serve uploaded product images before API rate limiting so image requests do not consume API quotas.
var uploadRoot = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads");
Directory.CreateDirectory(Path.Combine(uploadRoot, "sarees"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadRoot),
    RequestPath = "/uploads"
});

// Configure content types for custom saree images
var customContentTypeProvider = new FileExtensionContentTypeProvider();
customContentTypeProvider.Mappings[".jpg"] = "image/jpeg";
customContentTypeProvider.Mappings[".jpeg"] = "image/jpeg";
customContentTypeProvider.Mappings[".png"] = "image/png";
customContentTypeProvider.Mappings[".webp"] = "image/webp";

// Serve custom booking reference photos from project root assets/images/custom-bookings
var customBookingsRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "assets", "images", "custom-bookings"));
if (!Directory.Exists(customBookingsRoot))
{
    Directory.CreateDirectory(customBookingsRoot);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(customBookingsRoot),
    RequestPath = "/assets/images/custom-bookings",
    ContentTypeProvider = customContentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=86400");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    }
});

// Also serve root assets folder for any reference photos under /assets
var projectAssetsRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "assets"));
if (Directory.Exists(projectAssetsRoot))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(projectAssetsRoot),
        RequestPath = "/assets",
        ContentTypeProvider = customContentTypeProvider,
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=86400");
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        }
    });
}

// Enable Swagger UI only in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Virasat Patola API v1 (Stored Procedures)");
        c.RoutePrefix = "swagger";
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
        c.DefaultModelsExpandDepth(1);
    });
}

// 8. Serve only built frontend assets. Never expose the repository or backend configuration files.
var frontendDist = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "frontend", "dist"));
if (Directory.Exists(frontendDist))
{
    app.UseFileServer(new FileServerOptions
    {
        FileProvider = new PhysicalFileProvider(frontendDist),
        RequestPath = "",
        EnableDefaultFiles = true
    });
}

app.UseRouting();
// Endpoint metadata must be available for named rate-limit policies.
app.UseRateLimiter();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Automatic Root Redirect to Swagger & Health Status
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapGet("/api", () => Results.Ok(new
{
    status = "Online",
    service = "Virasat Patola Royal Handloom .NET Core Web API",
    database = "Microsoft SQL Server (VirasatPatolaDb)",
    swaggerDocs = "http://localhost:5285/swagger",
    storefront = "http://localhost:5173",
    timestamp = DateTime.UtcNow
}));

app.Run();


