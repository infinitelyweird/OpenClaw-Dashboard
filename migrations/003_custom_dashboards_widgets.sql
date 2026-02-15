-- Migration 003: Custom Dashboards & Widget System
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Dashboards')
BEGIN
    CREATE TABLE Dashboards (
        DashboardID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Icon NVARCHAR(50) NULL DEFAULT N'📊',
        CreatedBy INT NOT NULL REFERENCES Users(UserID),
        IsDefault BIT NOT NULL DEFAULT 0,
        IsShared BIT NOT NULL DEFAULT 0,
        LayoutJSON NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Dashboards_CreatedBy ON Dashboards(CreatedBy);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WidgetTemplates')
BEGIN
    CREATE TABLE WidgetTemplates (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Category NVARCHAR(50) NOT NULL,
        Type NVARCHAR(50) NOT NULL,
        Icon NVARCHAR(50) NULL,
        DefaultConfig NVARCHAR(MAX) NULL,
        DataSource NVARCHAR(500) NULL,
        IsSystem BIT NOT NULL DEFAULT 0,
        CreatedBy INT NULL REFERENCES Users(UserID),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_WidgetTemplates_Category ON WidgetTemplates(Category);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WidgetInstances')
BEGIN
    CREATE TABLE WidgetInstances (
        InstanceID INT IDENTITY(1,1) PRIMARY KEY,
        DashboardID INT NOT NULL REFERENCES Dashboards(DashboardID) ON DELETE CASCADE,
        TemplateID INT NOT NULL REFERENCES WidgetTemplates(TemplateID),
        Title NVARCHAR(100) NULL,
        ConfigJSON NVARCHAR(MAX) NULL,
        PositionX INT NOT NULL DEFAULT 0,
        PositionY INT NOT NULL DEFAULT 0,
        Width INT NOT NULL DEFAULT 1,
        Height INT NOT NULL DEFAULT 1,
        RefreshInterval INT NULL DEFAULT 60,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_WidgetInstances_DashboardID ON WidgetInstances(DashboardID);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WidgetVariables')
BEGIN
    CREATE TABLE WidgetVariables (
        VariableID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        DisplayName NVARCHAR(100) NOT NULL,
        Value NVARCHAR(MAX) NOT NULL,
        Type NVARCHAR(30) NOT NULL DEFAULT 'text',
        Category NVARCHAR(50) NULL,
        Description NVARCHAR(300) NULL,
        CreatedBy INT NOT NULL REFERENCES Users(UserID),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_WidgetVariables_Name UNIQUE (Name)
    );
    CREATE INDEX IX_WidgetVariables_Category ON WidgetVariables(Category);
END;
