-- Improves storefront infinite-scroll ordering and category/motif filtering.
-- Safe to run more than once. This script only adds an index; it does not edit product data.

IF DB_ID(N'VirasatPatolaDb') IS NULL
    THROW 51019, 'Database VirasatPatolaDb does not exist.', 1;
GO

USE [VirasatPatolaDb];
GO

IF OBJECT_ID(N'[dbo].[Sarees]', N'U') IS NULL
    THROW 51020, 'Table [dbo].[Sarees] does not exist. Create the application schema first.', 1;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'IX_Sarees_CatalogScroll'
      AND [object_id] = OBJECT_ID(N'[dbo].[Sarees]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Sarees_CatalogScroll]
        ON [dbo].[Sarees] ([BasePriceINR] DESC, [Id] ASC)
        INCLUDE ([Category], [Motif]);
END;
GO
