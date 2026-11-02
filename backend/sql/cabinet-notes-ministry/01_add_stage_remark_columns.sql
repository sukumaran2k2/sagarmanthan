-- Cabinet Notes (Other Ministries) now reads and writes tbl_cabinet_notes_ministry
-- instead of tbl_cabinet_notes_ministry_change. The revamped input form stores a
-- remark per stage, so add those columns here with the same definition the
-- _change table used (NVARCHAR(250) NULL). Safe to run more than once.

DECLARE @cols TABLE (name SYSNAME);
INSERT INTO @cols (name) VALUES
    ('received_ministry_remarks'),
    ('sent_for_comments_remarks'),
    ('comments_rec_remarks'),
    ('shipping_remarks'),
    ('vigilance_remarks'),
    ('ports_remarks'),
    ('iwt_remarks'),
    ('administration_remarks'),
    ('coord_I_remarks'),
    ('coord_II_remarks'),
    ('dgll_parliament_and_trw_remarks'),
    ('development_remarks'),
    ('finance_remarks'),
    ('sagarmala_remarks'),
    ('file_submitted_remarks'),
    ('reply_furnished_remarks');

DECLARE @name SYSNAME, @sql NVARCHAR(400);
DECLARE col_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @cols;
OPEN col_cursor;
FETCH NEXT FROM col_cursor INTO @name;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF COL_LENGTH('dbo.tbl_cabinet_notes_ministry', @name) IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.tbl_cabinet_notes_ministry ADD ' + QUOTENAME(@name) + N' NVARCHAR(250) NULL;';
        EXEC sp_executesql @sql;
        PRINT 'Added ' + @name;
    END
    FETCH NEXT FROM col_cursor INTO @name;
END
CLOSE col_cursor;
DEALLOCATE col_cursor;
