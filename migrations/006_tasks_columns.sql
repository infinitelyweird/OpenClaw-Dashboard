-- Add missing columns to Tasks table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'CreatedBy')
BEGIN
    ALTER TABLE Tasks ADD CreatedBy INT NULL REFERENCES Users(UserID);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'AssignedTo')
BEGIN
    ALTER TABLE Tasks ADD AssignedTo INT NULL REFERENCES Users(UserID);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tasks') AND name = 'UpdatedAt')
BEGIN
    ALTER TABLE Tasks ADD UpdatedAt DATETIME2 NULL;
END
