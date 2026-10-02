-- ====================================================================================================
-- VIRASAT PATOLA - SQL SERVER DATABASE UPDATE SCRIPT
-- FEATURE: DELETED ORDERS ARCHIVE & AUDIT TABLE (Read-Only History)
-- Compatible with: SQL Server 2016+, 2019, 2022, Azure SQL, LocalDB
-- How to run: Open in SSMS (SQL Server Management Studio) or Azure Data Studio and click Execute (F5)
-- ====================================================================================================

USE VirasatPatolaDb;
GO

PRINT '>>> [1/3] Checking and creating [dbo].[DeletedOrders] table...';

-- 1. Create [dbo].[DeletedOrders] Table
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

    PRINT '>>> Created Table [dbo].[DeletedOrders] successfully.';
END
ELSE
BEGIN
    PRINT '>>> Table [dbo].[DeletedOrders] already exists.';
END
GO

PRINT '>>> [2/3] Checking and creating indexes for fast searching and pagination...';

-- 2. Create Non-Clustered Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DeletedOrders_OrderReference' AND object_id = OBJECT_ID(N'[dbo].[DeletedOrders]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DeletedOrders_OrderReference] ON [dbo].[DeletedOrders] ([OrderReference]);
    PRINT '>>> Created index [IX_DeletedOrders_OrderReference].';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_DeletedOrders_DeletedAt' AND object_id = OBJECT_ID(N'[dbo].[DeletedOrders]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DeletedOrders_DeletedAt] ON [dbo].[DeletedOrders] ([DeletedAt] DESC);
    PRINT '>>> Created index [IX_DeletedOrders_DeletedAt].';
END
GO

PRINT '>>> [3/3] Creating Stored Procedures for Deleted Orders...';

-- 3. Stored Procedure: sp_GetDeletedOrders
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
PRINT '>>> Created Stored Procedure [dbo].[sp_GetDeletedOrders].';

-- 4. Stored Procedure: sp_ArchiveDeletedOrder
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
PRINT '>>> Created Stored Procedure [dbo].[sp_ArchiveDeletedOrder].';

PRINT '====================================================================================';
PRINT '🎉 VIRASAT PATOLA: DELETED ORDERS SQL SERVER UPDATE COMPLETED SUCCESSFULLY!';
PRINT '====================================================================================';
GO
