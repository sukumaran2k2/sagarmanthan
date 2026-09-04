import { pool } from "../../db.js";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import sql from "mssql";

async function findEofficeFileRecord(conn, id) {
  // id comes straight from a URL route param (/file-pendancy/download/:id
  // etc.) with no prior validation, so it must never be string-interpolated
  // into SQL -- previously every query below built its WHERE clause with
  // raw template-literal interpolation of `id`, letting anyone hitting the
  // download endpoint inject arbitrary SQL through the URL.
  const request = conn.request();
  request.input('id', sql.Int, id);

  let res = await request.query(`SELECT File_name, 'File_Pendancy' as folder, 'tbl_file_pendancy' as detailTable FROM tbl_eoffice_file_pendancy_file WHERE id = @id`);
  if (res.recordset && res.recordset.length > 0) return res.recordset[0];

  res = await request.query(`SELECT File_name, 'Receipt_Pendancy' as folder, 'tbl_receipt_pendency' as detailTable FROM tbl_eoffice_receipt_pendency_file WHERE id = @id`);
  if (res.recordset && res.recordset.length > 0) return res.recordset[0];

  res = await request.query(`SELECT File_name, 'File_Disposal' as folder, 'tbl_file_disposal' as detailTable FROM tbl_eoffice_file_disposal_file WHERE id = @id`);
  if (res.recordset && res.recordset.length > 0) return res.recordset[0];

  res = await request.query(`SELECT file_name AS File_name, 'pendency' as folder, 'pendencydata' as detailTable FROM tbl_pendency WHERE id = @id`);
  if (res.recordset && res.recordset.length > 0) return res.recordset[0];

  res = await request.query(`SELECT file_name AS File_name, 'disposal' as folder, 'filedata' as detailTable FROM tbl_disposal WHERE id = @id`);
  if (res.recordset && res.recordset.length > 0) return res.recordset[0];

  return null;
}

async function handleEofficeDownload(req, res) {
  try {
    const id = req.params.id;

    // Reject non-numeric ids up front with a clean 400 rather than letting
    // an invalid value reach sql.Int binding, which would throw and fall
    // through to the generic 500 handler below.
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).send({ message: "Invalid id" });
    }

    const conn = await pool;

    const record = await findEofficeFileRecord(conn, id);
    if (!record) {
      return res.status(404).send({ message: "Record not found" });
    }

    const fileName = record.File_name;
    const possiblePaths = [
      path.join(process.cwd(), "fileuploads/E-Office/File_Pendancy", fileName),
      path.join(process.cwd(), "fileuploads/E-Office/Receipt_Pendancy", fileName),
      path.join(process.cwd(), "fileuploads/E-Office/File_Disposal", fileName),
      path.join(process.cwd(), "fileuploads/pendency", fileName),
      path.join(process.cwd(), "fileuploads/disposal", fileName),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Content-Length", fs.statSync(filePath).size);
        const fileStream = fs.createReadStream(filePath);
        return fileStream.pipe(res);
      }
    }

    // detailTable is always one of a fixed set of literal strings assigned
    // by findEofficeFileRecord above (never derived from user input), so
    // string-interpolating it here is safe -- SQL Server can't parameterize
    // identifiers/table names anyway, only values. Only `id` needs binding.
    const detailTable = record.detailTable || 'tbl_file_pendancy';
    let rows = [];
    try {
      const dataRequest = conn.request();
      dataRequest.input('id', sql.Int, id);
      const dataResult = await dataRequest.query(`SELECT * FROM ${detailTable} WHERE File_ID = @id OR file_id = @id`);
      rows = dataResult.recordset || [];
    } catch (dbErr) {
      console.warn("Detail table query notice:", dbErr.message);
    }

    const worksheet = xlsx.utils.json_to_sheet(
      rows.length > 0 ? rows : [{ Note: "No detail data stored for this file" }],
    );
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "E-Office Data");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName || "eoffice_file.xlsx"}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.send(buffer);
  } catch (err) {
    console.error("E-Office Download error:", err.message);
    res.status(500).send("Internal Server Error");
  }
}

async function downloadFilePendancy(req, res) {
  return handleEofficeDownload(req, res);
}

async function downloadReceiptPendency(req, res) {
  return handleEofficeDownload(req, res);
}

async function downloadFileDisposal(req, res) {
  return handleEofficeDownload(req, res);
}

// Static sample template downloads, one per KPI type -- these are fixed
// reference files (not a DB-backed record lookup like the functions
// above), matching Attendance's downloadSampleDocument pattern. Each
// KPI's template has genuinely different required columns (confirmed
// from the requiredHeaders checks in the 3 KPI upload controllers), so a
// single combined template isn't used here.
function sendSampleDocument(fileName, res) {
  const samplePath = path.join(process.cwd(), "eoffice_document", fileName);
  if (!fs.existsSync(samplePath)) {
    console.error(`Sample document not found: ${samplePath}`);
    return res.status(404).send({ message: "Sample document not found" });
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Content-Length", fs.statSync(samplePath).size);
  const fileStream = fs.createReadStream(samplePath);
  fileStream.pipe(res);
}

async function downloadFilePendancySample(req, res) {
  try {
    sendSampleDocument("File_Pendency_Sample.xlsx", res);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
}

async function downloadReceiptPendencySample(req, res) {
  try {
    sendSampleDocument("Receipt_Pendency_Sample.xlsx", res);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
}

async function downloadFileDisposalSample(req, res) {
  try {
    sendSampleDocument("File_Disposal_Sample.xlsx", res);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
}

async function deleteFilePendency(req, res) {
  try {
    const id = req.params.id;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const conn = await pool;
    const request = conn.request();
    request.input('id', sql.Int, id);
    await request.query(`DELETE FROM tbl_file_pendancy WHERE File_ID = @id`);
    await request.query(`DELETE FROM tbl_eoffice_file_pendancy_file WHERE id = @id`);
    res.json({ message: "File and related records deleted successfully" });
  } catch (err) {
    console.error("deleteFilePendency error:", err.message);
    res.status(500).send("Internal Server Error");
  }
}

async function deleteReceiptPendency(req, res) {
  try {
    const id = req.params.id;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const conn = await pool;
    const request = conn.request();
    request.input('id', sql.Int, id);
    await request.query(`DELETE FROM tbl_receipt_pendency WHERE File_ID = @id`);
    await request.query(`DELETE FROM tbl_eoffice_receipt_pendency_file WHERE id = @id`);
    res.json({ message: "File and related records deleted successfully" });
  } catch (err) {
    console.error("deleteReceiptPendency error:", err.message);
    res.status(500).send("Internal Server Error");
  }
}

async function deleteFileDisposal(req, res) {
  try {
    const id = req.params.id;
    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const conn = await pool;
    const request = conn.request();
    request.input('id', sql.Int, id);
    await request.query(`DELETE FROM tbl_file_disposal WHERE File_ID = @id`);
    await request.query(`DELETE FROM tbl_eoffice_file_disposal_file WHERE id = @id`);
    res.json({ message: "File and related records deleted successfully" });
  } catch (err) {
    console.error("deleteFileDisposal error:", err.message);
    res.status(500).send("Internal Server Error");
  }
}
async function getFilePendenceReport(req, res) {
    try {
        const year = req.params.Year;
        const month = req.params.Month;
        const week = req.params.Week;   

        const conn = await pool;
        const request = conn.request();

        request.input("year", year); 
        request.input("month", month);
        request.input("week", week); 

        const result = await request.query(` SELECT
          fp.Emp_Id as [Emp ID],
          emp.Emp_Name AS [Emp Name],
          emp.Designation AS Designation,
          org.wing_name AS [Wing],
          org.division_name AS [Division],
          fp.[>30days] AS [Greater than 30 days],
          fp.[16-30Days] AS [16-30 Days],
          fp.[7-15Days ] AS [7-15 Days],
          fp.[4-6Days] AS [4-6 Days],
          fp.[0-3Days] AS [0-3 Days],
          fp.[Total Pendency],
          fp.Year,
          fp.Month,
          CASE
            WHEN fp.week = 1 THEN 'Week 1'
            WHEN fp.week = 2 THEN 'Week 2'
            WHEN fp.week = 3 THEN 'Week 3'
            WHEN fp.week = 4 THEN 'Week 4'
            WHEN fp.week = 5 THEN 'Week 5'
            ELSE 'Unknown Week'
          END AS Week
          FROM tbl_file_pendancy fp
          LEFT JOIN mmt_employee_info emp ON fp.Emp_Id = emp.Emp_Id
          LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
          WHERE
            fp.Year = @year AND fp.Month = @month AND fp.week = @week
          ORDER BY org.wing_name, org.division_name;
        `); 
             
        const rowData = result.recordset;  

        if (!rowData || rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
        }

        const columnDefs = Object.keys(rowData[0]).map(key => ({
          headerName: key.charAt(0).toUpperCase() + key.slice(1), 
          field: key,
        }));
      
        res.json({ columnDefs, rowData });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
}

async function getReceiptPendenceReport(req, res) {
  try {
      const year = req.params.Year;
      const month = req.params.Month; 
      const week = req.params.Week; 

      const conn = await pool;
      const request = conn.request();

      request.input("year", year); 
      request.input("month", month);
      request.input("week", week); 

      const result = await request.query(` SELECT
        rp.Emp_Id as [Emp ID],
        emp.Emp_Name AS [Emp Name],
        emp.Designation AS Designation,
        org.wing_name AS [Wing],
        org.division_name AS [Division],
        rp.[>30days] AS [Greater Than 30 days],
        rp.[16-30Days] AS [16-30 Days],
        rp.[7-15Days ] AS [7-15 Days],
        rp.[4-6Days] AS [4-6 Days],
        rp.[0-3Days] AS [0-3 Days],
        rp.[Total Pendency],
        rp.Year,
        rp.Month,
        CASE
          WHEN rp.week = 1 THEN 'Week 1'
          WHEN rp.week = 2 THEN 'Week 2'
          WHEN rp.week = 3 THEN 'Week 3'
          WHEN rp.week = 4 THEN 'Week 4'
          WHEN rp.week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
        FROM tbl_receipt_pendency rp
        LEFT JOIN mmt_employee_info emp ON rp.Emp_Id = emp.Emp_Id
        LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
        WHERE
          rp.Year = @year AND rp.Month = @month AND rp.week = @week
        ORDER BY org.wing_name, org.division_name;
      `);
      
      const rowData = result.recordset;  
      if (!rowData || rowData.length === 0) {
          return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
      }

      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));
    
      res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFileDisposalReport(req, res) {
  try {
      const year = req.params.Year;
      const month = req.params.Month; 
      const week = req.params.Week; 

      const conn = await pool;
      const request = conn.request();

      request.input("month", month);
      request.input("year", year);
      request.input("week", week); 

      const result = await request.query(` SELECT
        fd.[Emp Id],
        emp.Emp_Name AS [Emp Name],
        emp.Designation AS Designation,
        org.wing_name AS [Wing],
        org.division_name AS [Division],
        emp.level AS Level,
        fd.[Count of Transactions],
        fd.[Counts of Files],
        fd.[Average Response Time],
        fd.[Average Response Time] AS [Average Response Days],
        fd.Year,
        fd.Month,
        CASE
          WHEN fd.week = 1 THEN 'Week 1'
          WHEN fd.week = 2 THEN 'Week 2'
          WHEN fd.week = 3 THEN 'Week 3'
          WHEN fd.week = 4 THEN 'Week 4'
          WHEN fd.week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
        FROM tbl_file_disposal fd
        LEFT JOIN mmt_employee_info emp ON fd.[Emp Id] = emp.Emp_Id
        LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
        WHERE
          fd.Year = @year AND fd.Month = @month AND fd.week = @week
        ORDER BY org.wing_name, org.division_name;
      `);
      
      const rowData = result.recordset;  

      if (!rowData || rowData.length === 0) {
          return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
      }

      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));
    
      res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFilePendenceCheck(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT Top 1 Month, Year, week as Week
        FROM tbl_file_pendancy
        ORDER BY ID DESC;  
      `);

      res.json(result.recordset);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getReceiptPendenceCheck(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT Top 1 Month, Year, week as Week
        FROM tbl_receipt_pendency
        ORDER BY ID DESC;
      `);

      res.json(result.recordset);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getFileDisposalCheck(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT Top 1 Month, Year, week as Week
        FROM tbl_file_disposal
        ORDER BY ID DESC;
      `);

      res.json(result.recordset);
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getFilePendencyHistory(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT
          id,
          File_name AS [File Name],
          (SELECT TOP 1 name FROM tbl_user WHERE id = tbl_eoffice_file_pendancy_file.uploaded_by) AS [Uploaded By],
          CONVERT(varchar, date_of_upload, 106) AS [Date of Upload]
        FROM tbl_eoffice_file_pendancy_file
        ORDER BY id DESC;
      `);

      const rowData = result.recordset;
      const columnDefs = rowData.length > 0 ? Object.keys(rowData[0]).map(key => ({
        headerName: key,
        field: key
      })) : [];

      res.json({ columnDefs, rowData });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getReceiptPendencyHistory(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT
          id,
          File_name AS [File Name],
          (SELECT TOP 1 name FROM tbl_user WHERE id = tbl_eoffice_receipt_pendency_file.uploaded_by) AS [Uploaded By],
          CONVERT(varchar, date_of_upload, 106) AS [Date of Upload]
        FROM tbl_eoffice_receipt_pendency_file
        ORDER BY id DESC;
      `);

      const rowData = result.recordset;
      const columnDefs = rowData.length > 0 ? Object.keys(rowData[0]).map(key => ({
        headerName: key,
        field: key
      })) : [];

      res.json({ columnDefs, rowData });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getFileDisposalHistory(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      const result = await request.query(`
        SELECT
          id,
          File_name AS [File Name],
          (SELECT TOP 1 name FROM tbl_user WHERE id = tbl_eoffice_file_disposal_file.uploaded_by) AS [Uploaded By],
          CONVERT(varchar, date_of_upload, 106) AS [Date of Upload]
        FROM tbl_eoffice_file_disposal_file
        ORDER BY id DESC;
      `);

      const rowData = result.recordset;
      const columnDefs = rowData.length > 0 ? Object.keys(rowData[0]).map(key => ({
        headerName: key,
        field: key
      })) : [];

      res.json({ columnDefs, rowData });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
  }
}

async function getFilePendenceAll(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      let query = `SELECT
          fp.Emp_Id AS [Emp ID],
          emp.Emp_Name AS [EMP Name],
          emp.Designation AS Designation,
          org.wing_name AS [Wing],
          org.division_name AS [Division],
          fp.[>30days] AS [Greater than 30 days],
          fp.[16-30Days] AS [16-30 Days],
          fp.[7-15Days ] AS [7-15 Days],
          fp.[4-6Days] AS [4-6 Days],
          fp.[0-3Days] AS [0-3 Days],
          fp.[Total Pendency],
          fp.Year,
          fp.Month,
          CASE
            WHEN fp.week = 1 THEN 'Week 1'
            WHEN fp.week = 2 THEN 'Week 2'
            WHEN fp.week = 3 THEN 'Week 3'
            WHEN fp.week = 4 THEN 'Week 4'
            WHEN fp.week = 5 THEN 'Week 5'
            ELSE 'Unknown Week'
          END AS WeekName
        FROM tbl_file_pendancy fp
        LEFT JOIN mmt_employee_info emp ON fp.Emp_Id = emp.Emp_Id
        LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
        ORDER BY fp.ID DESC`;

      if (req.query.limit) {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = (page - 1) * limit;
        request.input("offset", offset);
        request.input("limit", limit);
        query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`;
      }

      const result = await request.query(query);

      const rowData = result.recordset;

      if (!rowData || rowData.length === 0) {
          return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
      }

      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));

      res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getReceiptPendenceAll(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      let query = `SELECT
          rp.Emp_Id AS [Emp ID],
          emp.Emp_Name AS [EMP Name],
          emp.Designation AS Designation,
          org.wing_name AS [Wing],
          org.division_name AS [Division],
          rp.[>30days] AS [Greater than 30 days],
          rp.[16-30Days] AS [16-30 Days],
          rp.[7-15Days ] AS [7-15 Days],
          rp.[4-6Days] AS [4-6 Days],
          rp.[0-3Days] AS [0-3 Days],
          rp.[Total Pendency],
          rp.Year,
          rp.Month,
          CASE
            WHEN rp.week = 1 THEN 'Week 1'
            WHEN rp.week = 2 THEN 'Week 2'
            WHEN rp.week = 3 THEN 'Week 3'
            WHEN rp.week = 4 THEN 'Week 4'
            WHEN rp.week = 5 THEN 'Week 5'
            ELSE 'Unknown Week'
          END AS WeekName
        FROM tbl_receipt_pendency rp
        LEFT JOIN mmt_employee_info emp ON rp.Emp_Id = emp.Emp_Id
        LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
        ORDER BY rp.ID DESC`;

      if (req.query.limit) {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = (page - 1) * limit;
        request.input("offset", offset);
        request.input("limit", limit);
        query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`;
      }

      const result = await request.query(query);

      const rowData = result.recordset;

      if (!rowData || rowData.length === 0) {
          return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
      }

      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));

      res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFileDisposalAll(req, res) {
  try {
      const conn = await pool;
      const request = conn.request();

      let query = ` SELECT
        fd.[Emp Id],
        emp.Emp_Name AS [EMP Name],
        emp.Designation AS Designation,
        org.wing_name AS [Wing],
        org.division_name AS [Division],
        fd.[Count of Transactions],
        fd.[Counts of Files],
        fd.[Average Response Time],
        fd.[Average Response Time] AS [Average Response Days],
        fd.Year,
        fd.Month,
        CASE
          WHEN fd.week = 1 THEN 'Week 1'
          WHEN fd.week = 2 THEN 'Week 2'
          WHEN fd.week = 3 THEN 'Week 3'
          WHEN fd.week = 4 THEN 'Week 4'
          WHEN fd.week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS Week
        FROM tbl_file_disposal fd
        LEFT JOIN mmt_employee_info emp ON fd.[Emp Id] = emp.Emp_Id
        LEFT JOIN mmt_organization_info org ON emp.organization_id = org.organization_id
        ORDER BY fd.ID DESC`;

      if (req.query.limit) {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = (page - 1) * limit;
        request.input("offset", offset);
        request.input("limit", limit);
        query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;`;
      }

      const result = await request.query(query);

      const rowData = result.recordset;

      if (!rowData || rowData.length === 0) {
          return res.json({ columnDefs: [], rowData: [], message: 'No records found' });
      }

      const columnDefs = Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1), 
        field: key,
      }));

      res.json({ columnDefs, rowData });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getReceiptPendancyChart(req, res) {
  try {
    const { Month, Year } = req.params;
    
    const conn = await pool;
    const request = conn.request();

    request.input("month", Month);
    request.input("year", Year);

    let query = `
      SELECT
        SUM([Total Pendency]) AS [Total Pendency],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_receipt_pendency
      WHERE tbl_receipt_pendency.Year = @year AND tbl_receipt_pendency.Month = @month
      GROUP BY 
        [Year], [Month], 
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END
      ORDER BY 
        [Year], [Week];`;

    const results = await request.query(query);

    res.json(results.recordset);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFilePendancyChart(req, res) {
  try {
    const { Month, Year } = req.params;
    
    const conn = await pool;
    const request = conn.request();

    request.input("month", Month);
    request.input("year", Year);

    let query = `
      SELECT
        SUM([Total Pendency]) AS [Total Pendency],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_file_pendancy
      WHERE tbl_file_pendancy.Year = @year AND tbl_file_pendancy.Month = @month
      GROUP BY 
        [Year], [Month], 
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END
      ORDER BY 
        [Year], [Week];`;

    const results = await request.query(query);

    res.json(results.recordset);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

async function getFileDisposalChart(req, res) {
  try {
    const { Month, Year } = req.params;
    
    const conn = await pool;
    const request = conn.request();

    request.input("month", Month);
    request.input("year", Year);

    let query = `
      SELECT
        SUM(CAST([Count of Transactions] AS INT)) AS [Count of Transactions],
        SUM(CAST([Counts of Files] AS INT)) AS [Counts of Files],
        [Year],
        [Month],
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END AS [Week]
      FROM tbl_file_disposal
      WHERE tbl_file_disposal.Year = @year AND tbl_file_disposal.Month = @month
      GROUP BY 
        [Year], [Month], 
        CASE
          WHEN week = 1 THEN 'Week 1'
          WHEN week = 2 THEN 'Week 2'
          WHEN week = 3 THEN 'Week 3'
          WHEN week = 4 THEN 'Week 4'
          WHEN week = 5 THEN 'Week 5'
          ELSE 'Unknown Week'
        END
      ORDER BY 
        [Year], [Week];`;

    const results = await request.query(query);

    res.json(results.recordset);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
}

export default {
  getFilePendenceReport, getReceiptPendenceReport, getFileDisposalReport,
  getFilePendenceCheck, getReceiptPendenceCheck, getFileDisposalCheck,
  getFilePendenceAll, getReceiptPendenceAll, getFileDisposalAll,
  getFilePendencyHistory, getReceiptPendencyHistory, getFileDisposalHistory,
  getFilePendancyChart, getReceiptPendancyChart, getFileDisposalChart,
  downloadFilePendancy, downloadReceiptPendency, downloadFileDisposal,
  downloadFilePendancySample, downloadReceiptPendencySample, downloadFileDisposalSample,
  deleteFilePendency, deleteReceiptPendency, deleteFileDisposal
};