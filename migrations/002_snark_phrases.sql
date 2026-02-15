IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SnarkPhrases')
BEGIN
    CREATE TABLE SnarkPhrases (
        PhraseID INT IDENTITY(1,1) PRIMARY KEY,
        Phrase NVARCHAR(300) NOT NULL,
        Category NVARCHAR(50) NOT NULL DEFAULT 'login_fail'
    );
    CREATE INDEX IX_SnarkPhrases_Category ON SnarkPhrases(Category);
END
