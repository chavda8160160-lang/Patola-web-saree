USE [VirasatPatolaDb];
GO

-- 1. Reset any heavy uncompressed Base64 images (> 200KB) to clean lightweight default assets
UPDATE [dbo].[Sarees]
SET 
    [Image] = '/assets/images/saree_nari_kunjar.jpg',
    [ImagesJson] = '["/assets/images/saree_nari_kunjar.jpg","/assets/images/patola_pallu.jpg","/assets/images/patola_macro.jpg","/assets/images/patola_drape.jpg"]'
WHERE 
    DATALENGTH([ImagesJson]) > 200000 
    OR DATALENGTH([Image]) > 200000
    OR [Image] LIKE 'data:image%';

GO

-- 2. Verify all image sizes
SELECT [Id], [Title], DATALENGTH([Image])/1024 AS ImageKB, DATALENGTH([ImagesJson])/1024 AS ImagesJsonKB 
FROM [dbo].[Sarees];
GO
