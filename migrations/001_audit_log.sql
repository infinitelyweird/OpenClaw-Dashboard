IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLog')
BEGIN
    CREATE TABLE AuditLog (
        AuditID INT IDENTITY(1,1) PRIMARY KEY,
        Action NVARCHAR(100) NOT NULL,
        UserID INT NULL,
        IPAddress NVARCHAR(45) NULL,
        UserAgent NVARCHAR(500) NULL,
        Details NVARCHAR(MAX) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AuditLog_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE SET NULL
    );
    CREATE INDEX IX_AuditLog_Action ON AuditLog(Action);
    CREATE INDEX IX_AuditLog_UserID ON AuditLog(UserID);
    CREATE INDEX IX_AuditLog_CreatedAt ON AuditLog(CreatedAt);
END
