IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
BEGIN
    CREATE TABLE Projects (
        ProjectID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(1000) NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'Active', -- Active, On Hold, Completed, Archived
        Priority NVARCHAR(20) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Critical
        StartDate DATE NULL,
        TargetDate DATE NULL,
        Progress INT NOT NULL DEFAULT 0, -- 0-100
        TeamLead INT NULL REFERENCES Users(UserID),
        CreatedBy INT NOT NULL REFERENCES Users(UserID),
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Projects_Status ON Projects(Status);
    CREATE INDEX IX_Projects_CreatedBy ON Projects(CreatedBy);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectMembers')
BEGIN
    CREATE TABLE ProjectMembers (
        ProjectID INT NOT NULL REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        UserID INT NOT NULL REFERENCES Users(UserID),
        Role NVARCHAR(50) NOT NULL DEFAULT 'Member', -- Lead, Member, Viewer
        JoinedAt DATETIME NOT NULL DEFAULT GETDATE(),
        PRIMARY KEY (ProjectID, UserID)
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectMilestones')
BEGIN
    CREATE TABLE ProjectMilestones (
        MilestoneID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL REFERENCES Projects(ProjectID) ON DELETE CASCADE,
        Name NVARCHAR(100) NOT NULL,
        DueDate DATE NULL,
        IsCompleted BIT NOT NULL DEFAULT 0,
        CompletedAt DATETIME NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_Milestones_ProjectID ON ProjectMilestones(ProjectID);
END
