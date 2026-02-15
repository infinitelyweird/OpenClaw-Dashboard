IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ForcePasswordChange')
BEGIN
    ALTER TABLE Users ADD ForcePasswordChange BIT NOT NULL DEFAULT 0;
END
