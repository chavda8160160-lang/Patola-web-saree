-- ====================================================================================================
-- VIRASAT PATOLA - COMPLETE SQL SERVER DATABASE SCHEMA, STORED PROCEDURES & SEED SCRIPT
-- Compatible with: Microsoft SQL Server 2016+, 2019, 2022, Azure SQL, LocalDB
-- To run: Open in SQL Server Management Studio (SSMS) or Azure Data Studio and Execute (F5)
-- ====================================================================================================

-- 1. Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'VirasatPatolaDb')
BEGIN
    CREATE DATABASE VirasatPatolaDb;
END
GO

USE VirasatPatolaDb;
GO

-- ====================================================================================================
-- 2. Sarees & Dupattas Catalog Table
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Sarees] (
        [Id] NVARCHAR(50) NOT NULL PRIMARY KEY,
        [Title] NVARCHAR(200) NOT NULL,
        [Weave] NVARCHAR(100) NOT NULL DEFAULT ('Double Ikat Handloom'),
        [Category] NVARCHAR(50) NOT NULL DEFAULT ('double-ikat'),
        [Motif] NVARCHAR(50) NOT NULL DEFAULT ('nari-kunjar'),
        [MotifName] NVARCHAR(150) NULL,
        [BasePriceINR] DECIMAL(18, 2) NOT NULL,
        [DiscountPercent] INT NOT NULL DEFAULT (0),
        [FinalPriceINR] DECIMAL(18, 2) NOT NULL DEFAULT (0),
        [TimeToWeave] NVARCHAR(100) NULL,
        [Image] NVARCHAR(MAX) NULL,
        [ImagesJson] NVARCHAR(MAX) NULL,
        [Badge] NVARCHAR(100) NULL,
        [Description] NVARCHAR(MAX) NULL,
        [Fabric] NVARCHAR(200) NULL,
        [Length] NVARCHAR(100) NULL,
        [Weight] NVARCHAR(100) NULL,
        [Colors] NVARCHAR(200) NULL,
        [Certification] NVARCHAR(150) NULL,
        [IsOutOfStock] BIT NOT NULL DEFAULT (0),
        [StockStatus] NVARCHAR(100) NOT NULL DEFAULT ('In Stock'),
        [StockQuantity] INT NOT NULL DEFAULT (50),
        [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
    );

    CREATE NONCLUSTERED INDEX [IX_Sarees_Category] ON [dbo].[Sarees] ([Category]);
    CREATE NONCLUSTERED INDEX [IX_Sarees_Motif] ON [dbo].[Sarees] ([Motif]);
END
ELSE
BEGIN
    -- Ensure all newer columns exist if table was created previously
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'Image')
        ALTER TABLE [dbo].[Sarees] ADD [Image] NVARCHAR(MAX) NULL;
    ELSE
        ALTER TABLE [dbo].[Sarees] ALTER COLUMN [Image] NVARCHAR(MAX) NULL;

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'ImagesJson')
        ALTER TABLE [dbo].[Sarees] ADD [ImagesJson] NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'IsOutOfStock')
        ALTER TABLE [dbo].[Sarees] ADD [IsOutOfStock] BIT NOT NULL DEFAULT (0);

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'StockStatus')
        ALTER TABLE [dbo].[Sarees] ADD [StockStatus] NVARCHAR(100) NOT NULL DEFAULT ('In Stock');

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'StockQuantity')
        ALTER TABLE [dbo].[Sarees] ADD [StockQuantity] INT NOT NULL DEFAULT (50);

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'DiscountPercent')
        ALTER TABLE [dbo].[Sarees] ADD [DiscountPercent] INT NOT NULL DEFAULT (0);

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sarees]') AND name = 'FinalPriceINR')
        ALTER TABLE [dbo].[Sarees] ADD [FinalPriceINR] DECIMAL(18, 2) NOT NULL DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'IX_Sarees_CatalogScroll'
      AND [object_id] = OBJECT_ID(N'[dbo].[Sarees]')
)
    CREATE NONCLUSTERED INDEX [IX_Sarees_CatalogScroll]
        ON [dbo].[Sarees] ([BasePriceINR] DESC, [Id] ASC)
        INCLUDE ([Category], [Motif]);
GO

-- ====================================================================================================
-- 3. Bookings Table (Private Consultations & Studio Loom Visits)
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Bookings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Bookings] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [FullName] NVARCHAR(150) NOT NULL,
        [Phone] NVARCHAR(50) NOT NULL,
        [Email] NVARCHAR(150) NOT NULL,
        [ExperienceType] NVARCHAR(250) NOT NULL DEFAULT ('Virtual Video Call'),
        [PreferredDate] DATE NOT NULL,
        [MotifPreference] NVARCHAR(250) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(250) NOT NULL DEFAULT ('Confirmed'),
        [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
    );
END
GO

-- ====================================================================================================
-- 4. Orders Table (Heirloom Customer Orders & Checkout)
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Orders] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [OrderReference] NVARCHAR(100) NOT NULL,
        [CustomerName] NVARCHAR(200) NOT NULL,
        [ContactPhone] NVARCHAR(50) NOT NULL,
        [DeliveryAddress] NVARCHAR(1000) NOT NULL,
        [City] NVARCHAR(100) NOT NULL,
        [State] NVARCHAR(100) NOT NULL DEFAULT (''),
        [PostalCode] NVARCHAR(50) NOT NULL,
        [Currency] NVARCHAR(20) NOT NULL DEFAULT ('INR'),
        [TotalAmount] DECIMAL(18, 2) NOT NULL,
        [PaymentMode] NVARCHAR(250) NOT NULL DEFAULT ('UPI / NetBanking'),
        [OrderStatus] NVARCHAR(250) NOT NULL DEFAULT ('Confirmed'),
        [DeliveryOtp] NVARCHAR(20) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [TransactionId] NVARCHAR(100) NULL,
        [CheckoutIdempotencyKey] NVARCHAR(128) NULL,
        [CheckoutIdempotencyFingerprint] NVARCHAR(64) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_Orders_OrderReference] ON [dbo].[Orders] ([OrderReference]);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'DeliveryOtp')
        ALTER TABLE [dbo].[Orders] ADD [DeliveryOtp] NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'OrderConfirmationOtp')
        ALTER TABLE [dbo].[Orders] ADD [OrderConfirmationOtp] NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'PaymentStatus')
        ALTER TABLE [dbo].[Orders] ADD [PaymentStatus] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Orders_PaymentStatus] DEFAULT ('Pending');
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'TransactionId')
        ALTER TABLE [dbo].[Orders] ADD [TransactionId] NVARCHAR(200) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'Notes')
        ALTER TABLE [dbo].[Orders] ADD [Notes] NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'CheckoutIdempotencyKey')
        ALTER TABLE [dbo].[Orders] ADD [CheckoutIdempotencyKey] NVARCHAR(128) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'CheckoutIdempotencyFingerprint')
        ALTER TABLE [dbo].[Orders] ADD [CheckoutIdempotencyFingerprint] NVARCHAR(64) NULL;
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'State')
        ALTER TABLE [dbo].[Orders] ADD [State] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Orders_State] DEFAULT ('');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_CheckoutIdempotencyKey' AND object_id = OBJECT_ID(N'[dbo].[Orders]'))
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Orders_CheckoutIdempotencyKey] ON [dbo].[Orders] ([CheckoutIdempotencyKey]) WHERE [CheckoutIdempotencyKey] IS NOT NULL;
GO

-- ====================================================================================================
-- 5. OrderItems Table (Saree & Dupatta Line Items)
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrderItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[OrderItems] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [OrderId] INT NOT NULL,
        [SareeId] NVARCHAR(200) NOT NULL,
        [SareeTitle] NVARCHAR(500) NOT NULL,
        [UnitPrice] DECIMAL(18, 2) NOT NULL,
        [Quantity] INT NOT NULL DEFAULT (1),
        [LineTotal] DECIMAL(18, 2) NOT NULL,
        CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders] ([Id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_OrderItems_OrderId] ON [dbo].[OrderItems] ([OrderId]);
END
GO

-- ====================================================================================================
-- 6. Subscribers Table (Royal Gazette Newsletter)
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Subscribers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Subscribers] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Email] NVARCHAR(150) NOT NULL,
        [SubscribedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME())
    );

    CREATE UNIQUE NONCLUSTERED INDEX [IX_Subscribers_Email] ON [dbo].[Subscribers] ([Email]);
END
GO

-- ====================================================================================================
-- 7. DeletedOrders Table (Audit History & Permanent Archive)
-- ====================================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DeletedOrders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DeletedOrders] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [OrderReference] NVARCHAR(50) NOT NULL,
        [CustomerName] NVARCHAR(150) NOT NULL,
        [ContactPhone] NVARCHAR(50) NOT NULL,
        [Email] NVARCHAR(150) NULL,
        [DeliveryAddress] NVARCHAR(500) NULL,
        [City] NVARCHAR(100) NULL,
        [PostalCode] NVARCHAR(30) NULL,
        [State] NVARCHAR(100) NULL,
        [Currency] NVARCHAR(10) NOT NULL DEFAULT ('INR'),
        [TotalAmount] DECIMAL(18, 2) NOT NULL,
        [PaymentMode] NVARCHAR(50) NOT NULL DEFAULT ('UPI / NetBanking'),
        [LastOrderStatus] NVARCHAR(100) NOT NULL DEFAULT ('Confirmed'),
        [OriginalCreatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [DeletedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [DeletedBy] NVARCHAR(100) NOT NULL DEFAULT ('Store Admin / Manager'),
        [ItemsJson] NVARCHAR(MAX) NOT NULL DEFAULT ('[]')
    );

    CREATE NONCLUSTERED INDEX [IX_DeletedOrders_OrderReference] ON [dbo].[DeletedOrders] ([OrderReference]);
    CREATE NONCLUSTERED INDEX [IX_DeletedOrders_DeletedAt] ON [dbo].[DeletedOrders] ([DeletedAt] DESC);
END
GO

-- ====================================================================================================
-- 8. STORED PROCEDURES (SPs) FOR ALL DATABASE OPERATIONS
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- SP 1: sp_GetSarees (Fetch catalog for Sarees & Dupattas with dynamic filtering & search)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetSarees]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetSarees];
GO

CREATE PROCEDURE [dbo].[sp_GetSarees]
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
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 2: sp_GetSareeById (Fetch single saree or dupatta details by ID)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetSareeById]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetSareeById];
GO

CREATE PROCEDURE [dbo].[sp_GetSareeById]
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
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 3: sp_CreateBooking (Save private consultation booking and return new ID)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CreateBooking]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CreateBooking];
GO

CREATE PROCEDURE [dbo].[sp_CreateBooking]
    @FullName NVARCHAR(150),
    @Phone NVARCHAR(50),
    @Email NVARCHAR(150),
    @ExperienceType NVARCHAR(100) = 'Virtual Video Call',
    @PreferredDate DATE,
    @MotifPreference NVARCHAR(100) = 'Nari Kunjar',
    @Notes NVARCHAR(MAX) = NULL,
    @NewBookingId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO [dbo].[Bookings] (
        [FullName], [Phone], [Email], [ExperienceType], 
        [PreferredDate], [MotifPreference], [Notes], [Status], [CreatedAt]
    ) VALUES (
        @FullName, @Phone, @Email, @ExperienceType,
        @PreferredDate, @MotifPreference, @Notes, N'Confirmed', SYSUTCDATETIME()
    );

    SET @NewBookingId = CONVERT(INT, SCOPE_IDENTITY());

    -- Return the newly created record
    SELECT * FROM [dbo].[Bookings] WHERE [Id] = @NewBookingId;
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 4: sp_CreateOrder (Process order & line items in transaction, return OrderRef)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CreateOrder]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_CreateOrder];
GO

CREATE PROCEDURE [dbo].[sp_CreateOrder]
    @OrderReference NVARCHAR(100),
    @CustomerName NVARCHAR(200),
    @ContactPhone NVARCHAR(50),
    @DeliveryAddress NVARCHAR(1000),
    @City NVARCHAR(100),
    @State NVARCHAR(100),
    @PostalCode NVARCHAR(50),
    @Currency NVARCHAR(20) = 'INR',
    @TotalAmount DECIMAL(18,2),
    @PaymentMode NVARCHAR(250) = 'UPI / NetBanking',
    @ItemsJson NVARCHAR(MAX),
    @OrderConfirmationOtp NVARCHAR(20),
    @DeliveryOtp NVARCHAR(20) = NULL,
    @CheckoutIdempotencyKey NVARCHAR(128),
    @CheckoutIdempotencyFingerprint NVARCHAR(64),
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
                THROW 51001, 'Checkout idempotency key reused with different order details.', 1;

            COMMIT TRANSACTION;
            RETURN;
        END

        -- Insert Order Header with Pending statuses
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

        -- Insert Line Items from JSON array
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

        -- Return the created order
        SELECT * FROM [dbo].[Orders] WHERE [Id] = @NewOrderId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 4.1: sp_UpdatePaymentStatus (Update PaymentStatus = 'Paid' & TransactionId)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdatePaymentStatus]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpdatePaymentStatus];
GO

CREATE PROCEDURE [dbo].[sp_UpdatePaymentStatus]
(
    @OrderId INT,
    @PaymentStatus NVARCHAR(50),
    @TransactionId NVARCHAR(200)
)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM [dbo].[Orders] WHERE [Id] = @OrderId)
        BEGIN
            THROW 51001, 'Order not found.', 1;
        END

        UPDATE [dbo].[Orders]
        SET
            [PaymentStatus] = @PaymentStatus,
            [TransactionId] = @TransactionId
        WHERE [Id] = @OrderId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 4.2: sp_VerifyOrderConfirmationOtp (Verify Customer OTP -> OrderStatus = 'Confirmed')
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_VerifyOrderConfirmationOtp]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_VerifyOrderConfirmationOtp];
GO

CREATE PROCEDURE [dbo].[sp_VerifyOrderConfirmationOtp]
(
    @OrderId INT,
    @OrderConfirmationOtp NVARCHAR(20)
)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @SavedOtp NVARCHAR(20);
        DECLARE @PaymentStatus NVARCHAR(50);

        SELECT
            @SavedOtp = [OrderConfirmationOtp],
            @PaymentStatus = [PaymentStatus]
        FROM [dbo].[Orders]
        WHERE [Id] = @OrderId;

        IF @SavedOtp IS NULL
        BEGIN
            THROW 51001, 'Order not found or OTP already used.', 1;
        END

        IF @PaymentStatus <> 'Paid'
        BEGIN
            THROW 51002, 'Payment is not completed.', 1;
        END

        IF @SavedOtp <> @OrderConfirmationOtp
        BEGIN
            THROW 51003, 'Invalid OTP.', 1;
        END

        UPDATE [dbo].[Orders]
        SET
            [OrderStatus] = 'Confirmed',
            [OrderConfirmationOtp] = NULL
        WHERE [Id] = @OrderId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 4.3: sp_VerifyDeliveryOtp (Verify Delivery OTP -> OrderStatus = 'Delivered')
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_VerifyDeliveryOtp]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_VerifyDeliveryOtp];
GO

CREATE PROCEDURE [dbo].[sp_VerifyDeliveryOtp]
(
    @OrderId INT,
    @DeliveryOtp NVARCHAR(20)
)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @SavedOtp NVARCHAR(20);
        DECLARE @OrderStatus NVARCHAR(50);

        SELECT
            @SavedOtp = [DeliveryOtp],
            @OrderStatus = [OrderStatus]
        FROM [dbo].[Orders]
        WHERE [Id] = @OrderId;

        IF @SavedOtp IS NULL
        BEGIN
            THROW 51001, 'Order not found or Delivery OTP already used.', 1;
        END

        IF @OrderStatus <> 'Shipped'
        BEGIN
            THROW 51002, 'Order is not ready for delivery.', 1;
        END

        IF @SavedOtp <> @DeliveryOtp
        BEGIN
            THROW 51003, 'Invalid Delivery OTP.', 1;
        END

        UPDATE [dbo].[Orders]
        SET
            [OrderStatus] = 'Delivered',
            [DeliveryOtp] = NULL
        WHERE [Id] = @OrderId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 5: sp_SubscribeNewsletter (Subscribe email with duplicate detection)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_SubscribeNewsletter]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_SubscribeNewsletter];
GO

CREATE PROCEDURE [dbo].[sp_SubscribeNewsletter]
    @Email NVARCHAR(150),
    @IsNewSubscription BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM [dbo].[Subscribers] WHERE [Email] = @Email)
    BEGIN
        SET @IsNewSubscription = 0;
    END
    ELSE
    BEGIN
        INSERT INTO [dbo].[Subscribers] ([Email], [SubscribedAt])
        VALUES (@Email, SYSUTCDATETIME());

        SET @IsNewSubscription = 1;
    END
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 6: sp_GetDeletedOrders (Retrieve all archived deleted orders - Read Only)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetDeletedOrders]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetDeletedOrders];
GO

CREATE PROCEDURE [dbo].[sp_GetDeletedOrders]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        [Id],
        [OrderReference],
        [CustomerName],
        [ContactPhone],
        [Email],
        [DeliveryAddress],
        [City],
        [PostalCode],
        [State],
        [Currency],
        [TotalAmount],
        [PaymentMode],
        [LastOrderStatus],
        [OriginalCreatedAt],
        [DeletedAt],
        [DeletedBy],
        [ItemsJson]
    FROM [dbo].[DeletedOrders]
    ORDER BY [DeletedAt] DESC;
END
GO

-- ----------------------------------------------------------------------------------------------------
-- SP 7: sp_ArchiveDeletedOrder (Archive an order before removal)
-- ----------------------------------------------------------------------------------------------------
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_ArchiveDeletedOrder]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_ArchiveDeletedOrder];
GO

CREATE PROCEDURE [dbo].[sp_ArchiveDeletedOrder]
    @OrderReference NVARCHAR(50),
    @DeletedBy NVARCHAR(100) = 'Store Admin / Manager'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    BEGIN TRY
        DECLARE @TargetOrderId INT;
        SELECT @TargetOrderId = [Id] FROM [dbo].[Orders] WHERE LOWER([OrderReference]) = LOWER(@OrderReference);

        IF @TargetOrderId IS NOT NULL
        BEGIN
            -- Convert line items to JSON
            DECLARE @ItemsJson NVARCHAR(MAX);
            SELECT @ItemsJson = (
                SELECT 
                    [SareeId] AS [sareeId],
                    [SareeTitle] AS [sareeTitle],
                    [UnitPrice] AS [unitPrice],
                    [Quantity] AS [quantity],
                    [LineTotal] AS [lineTotal]
                FROM [dbo].[OrderItems]
                WHERE [OrderId] = @TargetOrderId
                FOR JSON PATH
            );

            IF @ItemsJson IS NULL SET @ItemsJson = '[]';

            -- Insert into DeletedOrders table
            INSERT INTO [dbo].[DeletedOrders] (
                [OrderReference], [CustomerName], [ContactPhone], [Email],
                [DeliveryAddress], [City], [PostalCode], [State],
                [Currency], [TotalAmount], [PaymentMode], [LastOrderStatus],
                [OriginalCreatedAt], [DeletedAt], [DeletedBy], [ItemsJson]
            )
            SELECT 
                [OrderReference], [CustomerName], [ContactPhone], NULL,
                [DeliveryAddress], [City], [PostalCode], NULL,
                [Currency], [TotalAmount], [PaymentMode], [OrderStatus],
                [CreatedAt], SYSUTCDATETIME(), @DeletedBy, @ItemsJson
            FROM [dbo].[Orders]
            WHERE [Id] = @TargetOrderId;

            -- Remove items and order from active tables
            DELETE FROM [dbo].[OrderItems] WHERE [OrderId] = @TargetOrderId;
            DELETE FROM [dbo].[Orders] WHERE [Id] = @TargetOrderId;
        END

        COMMIT TRANSACTION;
        PRINT '>>> Order ' + @OrderReference + ' archived to DeletedOrders successfully.';
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ====================================================================================================
-- 9. SEED INITIAL SAREES & DUPATTAS CATALOG
-- ====================================================================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-01')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-01',
        N'Imperial Crimson Nari Kunjar Double Ikat',
        N'Double Ikat Handloom',
        'double-ikat',
        'nari-kunjar',
        N'Nari Kunjar (Elephant & Dancing Lady)',
        185000.00,
        0,
        185000.00,
        N'9 Months Handcrafted',
        N'assets/images/saree_nari_kunjar.jpg',
        N'Masterpiece Double Ikat',
        N'An immortal handwoven treasure featuring the revered Nari Kunjar motif. Each silk thread is resist-dyed before mounting on the traditional rosewood loom, rendering identical color radiance and geometric precision on both sides.',
        N'100% Pure Mulberry Silk & Natural Dyes',
        N'6.30 Meters (Includes Matching Blouse Piece)',
        N'Approx. 850 grams',
        N'Deep Crimson, Saffron Ochre, Emerald & Obsidian',
        N'Silk Mark Certified Handloom',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-02')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-02',
        N'Imperial Ruby Ratanchowk Heritage Silk',
        N'Double Ikat Handloom',
        'royal-heirloom',
        'ratanchowk',
        N'Ratanchowk Bhat (Sacred Jewel Square)',
        215000.00,
        0,
        215000.00,
        N'11 Months Handcrafted',
        N'assets/images/saree_ratanchowk.jpg',
        N'Royal Heirloom Edition',
        N'The geometric Ratanchowk Bhat symbolizes eternal prosperity and Vedic cosmic harmony. Symmetrical diamond jewel matrices woven with pure gold zari highlights and naturally fermented indigo and madder root dyes.',
        N'Pure 8-Ply Mulberry Handloom Silk',
        N'6.35 Meters with Embroidered Blouse Length',
        N'Approx. 890 grams',
        N'Madder Ruby, Antique Mustard & Midnight Black',
        N'Silk Mark & Handloom Heritage Certified',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-03')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-03',
        N'Vedic Emerald Chhabdi Bhat Silk Saree',
        N'Double Ikat Handloom',
        'bridal',
        'chhabdi',
        N'Chhabdi Bhat (Floral Auspicious Basket)',
        195000.00,
        0,
        195000.00,
        N'10 Months Handcrafted',
        N'assets/images/saree_emerald_chhabdi.jpg',
        N'Bridal Trousseau Choice',
        N'The auspicious Chhabdi Bhat depicts traditional floral offerings inside celestial baskets, crafted to bless new beginnings. Designed specifically for royal weddings and milestone celebrations.',
        N'High-Lustre Pure Gujarat Silk',
        N'6.30 Meters with Contrast Pallu & Blouse',
        N'Approx. 860 grams',
        N'Emerald Green, Vermilion Red & Burnished Gold',
        N'Silk Mark Certified Handloom',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-04')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-04',
        N'Midnight Peacock Blue Navratna Patola',
        N'Single Ikat Handloom',
        'single-ikat',
        'pan-bhat',
        N'Navratna Pan Bhat (Sacred Betel Leaf & Nine Gems)',
        98000.00,
        0,
        98000.00,
        N'4 Months Handcrafted',
        N'assets/images/saree_royal_blue.jpg',
        N'Artisan Single Ikat',
        N'A contemporary luxury drape combining traditional Gujarat Ikat precision with wearable grace. Features sacred Pan motifs symbolizing longevity, framed by majestic gold zari borders.',
        N'Pure Handwoven Mulberry Silk',
        N'6.25 Meters with Running Blouse Piece',
        N'Approx. 750 grams',
        N'Peacock Indigo Blue, Sunset Coral & Gold Zari',
        N'Silk Mark Certified Handloom',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-05')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-05',
        N'Sovereign Shikargah Forest Royal Double Ikat',
        N'Double Ikat Handloom',
        'royal-heirloom',
        'nari-kunjar',
        N'Shikargah & Royal Wildlife Motifs',
        245000.00,
        0,
        245000.00,
        N'12 Months Handcrafted',
        N'assets/images/saree_nari_kunjar.jpg',
        N'Museum Collector Piece',
        N'A rare celebration of historical royal hunting reserves, featuring hand-tied representations of lions, elephants, horses, and dancing peacocks across a vibrant crimson silk canvas.',
        N'Pure Silk & Real Silver Tested Zari',
        N'6.40 Meters with Grand Pallu',
        N'Approx. 920 grams',
        N'Royal Crimson, Forest Moss Green, Gold',
        N'Silk Mark & Authenticity Master Seal',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'patola-06')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'patola-06',
        N'Auspicious Floral Vohra Gaji Bridal Patola',
        N'Double Ikat Handloom',
        'bridal',
        'chhabdi',
        N'Chhabdi Bhat with Lotus Borders',
        175000.00,
        0,
        175000.00,
        N'8 Months Handcrafted',
        N'assets/images/saree_emerald_chhabdi.jpg',
        N'Signature Bridal Drape',
        N'Intricately arranged floral medallions floating on rich jewel-toned silk. Celebrated across generations for its soft hand-feel and perpetual color radiance that never dulls with age.',
        N'Pure Handloom Silk with Soft Heritage Wash',
        N'6.30 Meters with Matching Blouse Piece',
        N'Approx. 830 grams',
        N'Vermilion Red, Antique Gold, Deep Emerald',
        N'Silk Mark Certified Handloom',
        0,
        N'In Stock',
        50
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[Sarees] WHERE [Id] = 'dupatta-1789732171958')
BEGIN
    INSERT INTO [dbo].[Sarees] (
        [Id], [Title], [Weave], [Category], [Motif], [MotifName], [BasePriceINR], [DiscountPercent], [FinalPriceINR],
        [TimeToWeave], [Image], [Badge], [Description], [Fabric], [Length], [Weight], [Colors], [Certification],
        [IsOutOfStock], [StockStatus], [StockQuantity]
    ) VALUES 
    (
        'dupatta-1789732171958',
        N'new',
        N'Double Ikat Handloom Dupatta',
        'double-dupatta',
        'ratanchowk',
        N'Nari Kunjar (Elephant & Dancing Maiden)',
        5000.00,
        5,
        4750.00,
        N'3 to 5 Months Handcrafted',
        N'/assets/images/saree_nari_kunjar.jpg',
        N'Double Ikat Dupatta',
        N'new best selling deign',
        N'100% Pure Mulberry Silk & Natural Dyes',
        N'3.00 Meters',
        N'Approx. 350 grams',
        N'',
        N'Silk Mark Certified Handloom',
        0,
        N'In Stock',
        5
    );
END
GO

PRINT '====================================================================================';
PRINT '🎉 VIRASAT PATOLA: COMPLETE SQL SCHEMA, STORED PROCEDURES & SEED SYNCED!';
PRINT '====================================================================================';
GO
