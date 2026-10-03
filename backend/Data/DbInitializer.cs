using Microsoft.EntityFrameworkCore;
using VirasatPatola.Api.Models;

namespace VirasatPatola.Api.Data
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(VirasatPatolaDbContext context)
        {
            // 1. Ensure database is created safely
            try
            {
                await context.Database.EnsureCreatedAsync();
            }
            catch (Exception)
            {
                // If database already exists or tables were created via scripts, continue to schema sync
            }

            // 2. If connected to SQL Server, ensure table columns and stored procedures are completely in sync
            if (context.Database.IsSqlServer())
            {
                try
                {
                    // Ensure all columns in Sarees, Orders, OrderItems, Bookings, and DeletedOrders have wide types
                    await context.Database.ExecuteSqlRawAsync(@"
                        -- 1. Sarees table columns
                        IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND type in (N'U'))
                        BEGIN
                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'ImagesJson')
                                ALTER TABLE [dbo].[Sarees] ADD [ImagesJson] NVARCHAR(MAX) NULL;

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'Image')
                                ALTER TABLE [dbo].[Sarees] ADD [Image] NVARCHAR(MAX) NULL;

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'IsOutOfStock')
                                ALTER TABLE [dbo].[Sarees] ADD [IsOutOfStock] BIT NOT NULL DEFAULT (0);

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'StockStatus')
                                ALTER TABLE [dbo].[Sarees] ADD [StockStatus] NVARCHAR(250) NOT NULL DEFAULT ('In Stock');

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'StockQuantity')
                                ALTER TABLE [dbo].[Sarees] ADD [StockQuantity] INT NOT NULL DEFAULT (50);

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'DiscountPercent')
                                ALTER TABLE [dbo].[Sarees] ADD [DiscountPercent] INT NOT NULL DEFAULT (0);

                            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'FinalPriceINR')
                                ALTER TABLE [dbo].[Sarees] ADD [FinalPriceINR] DECIMAL(18, 2) NOT NULL DEFAULT (0);

                            -- Ensure MAX length for images and wide lengths for text fields
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Image] NVARCHAR(MAX) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [ImagesJson] NVARCHAR(MAX) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Description] NVARCHAR(MAX) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Title] NVARCHAR(500) NOT NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [MotifName] NVARCHAR(500) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Fabric] NVARCHAR(500) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Badge] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Colors] NVARCHAR(500) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Certification] NVARCHAR(500) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Weave] NVARCHAR(250) NOT NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Category] NVARCHAR(100) NOT NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Motif] NVARCHAR(100) NOT NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [TimeToWeave] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Length] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Weight] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Sarees] ALTER COLUMN [StockStatus] NVARCHAR(250) NOT NULL;
                        END

                        -- 2. Orders table columns
                        IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND type in (N'U'))
                        BEGIN
                            IF COL_LENGTH('dbo.Orders', 'CheckoutIdempotencyKey') IS NULL
                                ALTER TABLE [dbo].[Orders] ADD [CheckoutIdempotencyKey] NVARCHAR(128) NULL;
                            IF COL_LENGTH('dbo.Orders', 'CheckoutIdempotencyFingerprint') IS NULL
                                ALTER TABLE [dbo].[Orders] ADD [CheckoutIdempotencyFingerprint] NVARCHAR(64) NULL;
                            IF COL_LENGTH('dbo.Orders', 'State') IS NULL
                                ALTER TABLE [dbo].[Orders] ADD [State] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Orders_State] DEFAULT ('');
                            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_CheckoutIdempotencyKey' AND object_id = OBJECT_ID(N'[dbo].[Orders]'))
                                CREATE UNIQUE NONCLUSTERED INDEX [IX_Orders_CheckoutIdempotencyKey] ON [dbo].[Orders] ([CheckoutIdempotencyKey]) WHERE [CheckoutIdempotencyKey] IS NOT NULL;
                            ALTER TABLE [dbo].[Orders] ALTER COLUMN [OrderStatus] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Orders] ALTER COLUMN [PaymentMode] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Orders] ALTER COLUMN [DeliveryAddress] NVARCHAR(1000) NULL;
                            ALTER TABLE [dbo].[Orders] ALTER COLUMN [CustomerName] NVARCHAR(200) NOT NULL;
                        END

                        -- 3. Bookings table columns
                        IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND type in (N'U'))
                        BEGIN
                            ALTER TABLE [dbo].[Bookings] ALTER COLUMN [Status] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Bookings] ALTER COLUMN [ExperienceType] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[Bookings] ALTER COLUMN [MotifPreference] NVARCHAR(250) NULL;
                        END

                        -- 4. OrderItems table columns
                        IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrderItems]') AND type in (N'U'))
                        BEGIN
                            ALTER TABLE [dbo].[OrderItems] ALTER COLUMN [SareeId] NVARCHAR(200) NOT NULL;
                            ALTER TABLE [dbo].[OrderItems] ALTER COLUMN [SareeTitle] NVARCHAR(500) NOT NULL;
                        END

                        -- 5. DeletedOrders table columns
                        IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeletedOrders]') AND type in (N'U'))
                        BEGIN
                            ALTER TABLE [dbo].[DeletedOrders] ALTER COLUMN [LastOrderStatus] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[DeletedOrders] ALTER COLUMN [PaymentMode] NVARCHAR(250) NULL;
                            ALTER TABLE [dbo].[DeletedOrders] ALTER COLUMN [DeliveryAddress] NVARCHAR(1000) NULL;
                            ALTER TABLE [dbo].[DeletedOrders] ALTER COLUMN [CustomerName] NVARCHAR(200) NOT NULL;
                        END

                        -- 6. Customers table
                        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Customers]') AND type in (N'U'))
                        BEGIN
                            CREATE TABLE [dbo].[Customers] (
                                [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                                [CustomerName] NVARCHAR(150) NOT NULL,
                                [PhoneNumber] NVARCHAR(20) NOT NULL,
                                [PasswordHash] NVARCHAR(255) NOT NULL,
                                [PasswordSalt] NVARCHAR(255) NOT NULL,
                                [GeneratedPassword] NVARCHAR(100) NULL,
                                [Email] NVARCHAR(150) NULL,
                                [DeliveryAddress] NVARCHAR(500) NULL,
                                [City] NVARCHAR(100) NULL,
                                [State] NVARCHAR(100) NULL,
                                [PostalCode] NVARCHAR(20) NULL,
                                [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
                                [LastLoginAt] DATETIME2 NULL
                            );
                            CREATE UNIQUE NONCLUSTERED INDEX [IX_Customers_PhoneNumber] ON [dbo].[Customers] ([PhoneNumber]);
                        END
                        ELSE
                        BEGIN
                            IF COL_LENGTH('Customers', 'GeneratedPassword') IS NULL
                            BEGIN
                                ALTER TABLE [dbo].[Customers] ADD [GeneratedPassword] NVARCHAR(100) NULL;
                            END
                            IF COL_LENGTH('Customers', 'LastLoginAt') IS NULL
                            BEGIN
                                ALTER TABLE [dbo].[Customers] ADD [LastLoginAt] DATETIME2 NULL;
                            END
                        END
                    ");

                    // 2. Ensure sp_GetSarees stored procedure
                    await context.Database.ExecuteSqlRawAsync(@"
                        CREATE OR ALTER PROCEDURE [dbo].[sp_GetSarees]
                            @Category NVARCHAR(50) = NULL,
                            @Motif NVARCHAR(50) = NULL,
                            @Search NVARCHAR(100) = NULL,
                            @MinPrice DECIMAL(18,2) = NULL,
                            @MaxPrice DECIMAL(18,2) = NULL
                        AS
                        BEGIN
                            SET NOCOUNT ON;

                            SELECT 
                                [Id], 
                                [Title], 
                                [DiscountPercent],
                                [FinalPriceINR],
                                [Weave], 
                                [Category], 
                                [Motif], 
                                [MotifName],
                                [BasePriceINR], 
                                [TimeToWeave], 
                                [Image], 
                                [ImagesJson],
                                [Badge], 
                                [Description],
                                [Fabric], 
                                [Length], 
                                [Weight], 
                                [Colors], 
                                [Certification],
                                [IsOutOfStock],
                                [StockStatus],
                                [StockQuantity],
                                [CreatedAt]
                            FROM [dbo].[Sarees]
                            WHERE 
                                (@Category IS NULL 
                                 OR @Category = N'all' 
                                 OR [Category] = @Category 
                                 OR (@Category IN (N'all-dupatta', N'dupatta') AND [Category] LIKE N'%dupatta%')
                                 OR (@Category IN (N'all-saree', N'saree') AND [Category] NOT LIKE N'%dupatta%'))
                                AND (@Motif IS NULL OR @Motif = N'all' OR [Motif] = @Motif)
                                AND (@MinPrice IS NULL OR [BasePriceINR] >= @MinPrice)
                                AND (@MaxPrice IS NULL OR [BasePriceINR] <= @MaxPrice)
                                AND (@Search IS NULL OR 
                                     [Title] LIKE N'%' + @Search + N'%' OR 
                                     [MotifName] LIKE N'%' + @Search + N'%' OR 
                                     [Description] LIKE N'%' + @Search + N'%')
                            ORDER BY [BasePriceINR] DESC;
                        END
                    ");

                    // 3. Ensure sp_GetSareeById stored procedure
                    await context.Database.ExecuteSqlRawAsync(@"
                        CREATE OR ALTER PROCEDURE [dbo].[sp_GetSareeById]
                            @Id NVARCHAR(50)
                        AS
                        BEGIN
                            SET NOCOUNT ON;

                            SELECT 
                                [Id], 
                                [Title], 
                                [DiscountPercent],
                                [FinalPriceINR],
                                [Weave], 
                                [Category], 
                                [Motif], 
                                [MotifName],
                                [BasePriceINR], 
                                [TimeToWeave], 
                                [Image], 
                                [ImagesJson],
                                [Badge], 
                                [Description],
                                [Fabric], 
                                [Length], 
                                [Weight], 
                                [Colors], 
                                [Certification],
                                [IsOutOfStock],
                                [StockStatus],
                                [StockQuantity],
                                [CreatedAt]
                            FROM [dbo].[Sarees]
                            WHERE [Id] = @Id;
                        END
                    ");

                    // 4. Ensure ReferencePhoto column and sp_CreateBooking stored procedure
                    await context.Database.ExecuteSqlRawAsync(@"
                        IF COL_LENGTH('Bookings', 'ReferencePhoto') IS NULL
                        BEGIN
                            ALTER TABLE [dbo].[Bookings] ADD [ReferencePhoto] NVARCHAR(MAX) NULL;
                        END
                    ");

                    await context.Database.ExecuteSqlRawAsync(@"
                        CREATE OR ALTER PROCEDURE [dbo].[sp_CreateBooking]
                            @FullName NVARCHAR(150),
                            @Phone NVARCHAR(50),
                            @Email NVARCHAR(150),
                            @ExperienceType NVARCHAR(250) = 'Virtual Video Call',
                            @PreferredDate DATE,
                            @MotifPreference NVARCHAR(250) = 'Nari Kunjar',
                            @Notes NVARCHAR(MAX) = NULL,
                            @ReferencePhoto NVARCHAR(MAX) = NULL,
                            @NewBookingId INT OUTPUT
                        AS
                        BEGIN
                            SET NOCOUNT ON;

                            INSERT INTO [dbo].[Bookings] (
                                [FullName], [Phone], [Email], [ExperienceType], 
                                [PreferredDate], [MotifPreference], [Notes], [ReferencePhoto], [Status], [CreatedAt]
                            ) VALUES (
                                @FullName, @Phone, @Email, @ExperienceType,
                                @PreferredDate, @MotifPreference, @Notes, @ReferencePhoto, N'Confirmed', SYSUTCDATETIME()
                            );

                            SET @NewBookingId = CONVERT(INT, SCOPE_IDENTITY());
                            SELECT * FROM [dbo].[Bookings] WHERE [Id] = @NewBookingId;
                        END
                    ");

                    // 5. Ensure DeliveryOtp column and sp_CreateOrder stored procedure
                    await context.Database.ExecuteSqlRawAsync(@"
                        IF COL_LENGTH('Orders', 'DeliveryOtp') IS NULL
                        BEGIN
                            ALTER TABLE [dbo].[Orders] ADD [DeliveryOtp] NVARCHAR(20) NULL;
                        END
                    ");

                    await context.Database.ExecuteSqlRawAsync(@"
                        CREATE OR ALTER PROCEDURE [dbo].[sp_CreateOrder]
                            @OrderReference NVARCHAR(100),
                            @CustomerName NVARCHAR(200),
                            @ContactPhone NVARCHAR(50),
                            @DeliveryAddress NVARCHAR(1000),
                            @City NVARCHAR(100),
                            @State NVARCHAR(100),
                            @PostalCode NVARCHAR(50),
                            @Currency NVARCHAR(20) = 'INR',
                            @TotalAmount DECIMAL(18, 2),
                            @PaymentMode NVARCHAR(250) = 'UPI / NetBanking',
                            @ItemsJson NVARCHAR(MAX),
                            @OrderConfirmationOtp NVARCHAR(20) = NULL,
                            @DeliveryOtp NVARCHAR(20) = NULL,
                            @CheckoutIdempotencyKey NVARCHAR(128) = NULL,
                            @CheckoutIdempotencyFingerprint NVARCHAR(64) = NULL,
                            @NewOrderId INT OUTPUT
                        AS
                        BEGIN
                            SET NOCOUNT ON;
                            BEGIN TRANSACTION;

                            BEGIN TRY
                                DECLARE @LockResult INT;
                                DECLARE @LockResource NVARCHAR(255) = CONCAT(N'OrderSubmit:', @CheckoutIdempotencyKey);
                                SET @NewOrderId = NULL;
                                EXEC @LockResult = sys.sp_getapplock
                                    @Resource = @LockResource,
                                    @LockMode = 'Exclusive',
                                    @LockOwner = 'Transaction',
                                    @LockTimeout = 15000;
                                IF @LockResult < 0
                                    THROW 51002, 'Could not acquire checkout idempotency lock.', 1;

                                SELECT @NewOrderId = [Id]
                                FROM [dbo].[Orders]
                                WHERE [CheckoutIdempotencyKey] = @CheckoutIdempotencyKey;

                                IF @NewOrderId IS NOT NULL
                                BEGIN
                                    IF NOT EXISTS (
                                        SELECT 1 FROM [dbo].[Orders]
                                        WHERE [Id] = @NewOrderId
                                          AND [CheckoutIdempotencyFingerprint] = @CheckoutIdempotencyFingerprint
                                    )
                                        THROW 51001, 'Checkout idempotency key was reused with different order details.', 1;

                                    COMMIT TRANSACTION;
                                    RETURN;
                                END

                                INSERT INTO [dbo].[Orders] (
                                    [OrderReference], [CustomerName], [ContactPhone], [DeliveryAddress],
                                    [City], [State], [PostalCode], [Currency], [TotalAmount], [PaymentMode],
                                    [PaymentStatus], [OrderConfirmationOtp], [DeliveryOtp],
                                    [CheckoutIdempotencyKey], [CheckoutIdempotencyFingerprint], [OrderStatus], [CreatedAt]
                                ) VALUES (
                                    @OrderReference, @CustomerName, @ContactPhone, @DeliveryAddress,
                                    @City, @State, @PostalCode, @Currency, @TotalAmount, @PaymentMode,
                                    'Pending', @OrderConfirmationOtp, @DeliveryOtp,
                                    @CheckoutIdempotencyKey, @CheckoutIdempotencyFingerprint, 'Pending', SYSUTCDATETIME()
                                );

                                SET @NewOrderId = SCOPE_IDENTITY();

                                IF @ItemsJson IS NOT NULL AND ISJSON(@ItemsJson) = 1
                                BEGIN
                                    INSERT INTO [dbo].[OrderItems] ([OrderId], [SareeId], [SareeTitle], [UnitPrice], [Quantity], [LineTotal])
                                    SELECT 
                                        @NewOrderId,
                                        JSON_VALUE(item.value, '$.sareeId'),
                                        JSON_VALUE(item.value, '$.sareeTitle'),
                                        CAST(JSON_VALUE(item.value, '$.unitPrice') AS DECIMAL(18,2)),
                                        CAST(JSON_VALUE(item.value, '$.quantity') AS INT),
                                        CAST(JSON_VALUE(item.value, '$.unitPrice') AS DECIMAL(18,2)) * CAST(JSON_VALUE(item.value, '$.quantity') AS INT)
                                    FROM OPENJSON(@ItemsJson) AS item;
                                END

                                COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                                IF @@TRANCOUNT > 0
                                    ROLLBACK TRANSACTION;
                                THROW;
                            END CATCH
                        END
                    ");
                }
                catch (Exception)
                {
                    // Fallback if direct procedure modification restricted
                }
            }

            try
            {
                if (context.Sarees.Any())
                {
                    return;
                }
            }
            catch (Exception)
            {
                // Handled gracefully
            }

            await Task.CompletedTask;
        }
    }
}
