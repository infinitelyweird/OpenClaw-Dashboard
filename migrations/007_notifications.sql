-- Notifications table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
CREATE TABLE Notifications (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    UserId      INT NOT NULL REFERENCES Users(UserID),
    Type        NVARCHAR(50)  NOT NULL DEFAULT 'info',       -- info, warning, error, success, task, admin, system
    Title       NVARCHAR(200) NOT NULL,
    Message     NVARCHAR(MAX) NULL,
    Link        NVARCHAR(500) NULL,                          -- optional page link e.g. 'tasks.html?id=42'
    IsRead      BIT NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Index for fast per-user unread lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notifications_UserId_IsRead')
CREATE INDEX IX_Notifications_UserId_IsRead ON Notifications(UserId, IsRead) INCLUDE (CreatedAt);
