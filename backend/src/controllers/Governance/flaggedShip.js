import multer from "multer";
import fs from "fs";
import { pool } from "../../db.js";

const uploadDestination = "./fileuploads/Official_Foreign_Visit";

if (!fs.existsSync(uploadDestination)) {
  fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "./fileuploads/Official_Foreign_Visit");
  },
  filename: (req, file, callback) => {
    const uniqueFileName = generateUniqueFileName(file.originalname);
    req.uniqueFileName = uniqueFileName;
    callback(null, uniqueFileName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function getFSData(req, res) {
  const conn = await pool;

  try {
    const result = await conn.query(`
            SELECT 
                tbl_flagged_ship.id,mmt_ministry.ministry_name,mmt_organisation.organisation_name AS agency_name,
                import_item,quantity,mmt_country.country,flagged_ship,total_amount,updated_date
            FROM 
                tbl_flagged_ship
            LEFT JOIN
              mmt_organisation ON mmt_organisation.organisation_id = tbl_flagged_ship.agency_id
            LEFT JOIN 
                mmt_country ON mmt_country.id = tbl_flagged_ship.country
            LEFT JOIN
                mmt_ministry ON mmt_ministry.ministry_id = tbl_flagged_ship.ministry_id;
        `);
    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function getUpdateFSData(req, res) {
  const ID = req.params.ID;
  const conn = await pool;
  const request = conn.request();

  try {
    request.input("ID", ID);
    const result = await request.query(`
            SELECT * FROM tbl_flagged_ship WHERE id = @ID;
        `);

    res.json(result.recordset);
    console.log("edit-sun", result);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function addFlaggedShip(req, res) {
  const {
    ministry,
    agencyName,
    importItem,
    quantity,
    country,
    caseCIFCF,
    ImportFoB,
    detailsSame,
    flaggedShipType,
    approvedSubsidy,
    disbursedSubsidy,
    participatedTender,
    FFSFlagedOffer,
    totalCost,
    date,
    userID,
    agency,
    financialYear,
  } = req.body;

  const conn = await pool;
  const request = conn.request();

  request.input("ministry", ministry);
  request.input("agencyName", agencyName);
  request.input("importItem", importItem);
  request.input("quantity", quantity);
  request.input("country", country);
  request.input("caseCIFCF", caseCIFCF);
  request.input("ImportFoB", ImportFoB);
  request.input("detailsSame", detailsSame);
  request.input("flaggedShipType", flaggedShipType);
  request.input("approvedSubsidy", approvedSubsidy);
  request.input("disbursedSubsidy", disbursedSubsidy);
  request.input("participatedTender", participatedTender);
  request.input("FFSFlagedOffer", FFSFlagedOffer);
  request.input("totalCost", totalCost);
  // request.input("date", date);
  request.input("userID", userID);
  request.input("agency", agency);
  request.input("financialYear", financialYear);

  try {
    const result = await request.query(`
            INSERT INTO tbl_flagged_ship (
                ministry_id,agency_name,import_item,quantity,country,case_of_cif,
                for_basis,details_for_basis,flagged_ship,subsidy_approved,subsidy_disbursed,
                ifs_tender_process,difference_ifv,total_amount,created_by, created_date,agency_id,financial_year
            )
            VALUES (
                @ministry,@agencyName,@importItem,@quantity,@country,@caseCIFCF,@ImportFoB,@detailsSame,@flaggedShipType,
                @approvedSubsidy,@disbursedSubsidy,@participatedTender,@FFSFlagedOffer,@totalCost,@userID, GETDATE(),@agency,@financialYear
            )
        `);

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

async function editFlaggedShip(req, res) {
  const {
    ministry,
    agencyName,
    importItem,
    quantity,
    country,
    caseCIFCF,
    ImportFoB,
    detailsSame,
    flaggedShipType,
    approvedSubsidy,
    disbursedSubsidy,
    participatedTender,
    FFSFlagedOffer,
    date,
    totalCost,
    userID,
    ID,
    financialYear,
    agency,
  } = req.body;

  const conn = await pool;
  const request = conn.request();

  request.input("ministry", ministry);
  request.input("agencyName", agencyName);
  request.input("importItem", importItem);
  request.input("quantity", quantity);
  request.input("country", country);
  request.input("caseCIFCF", caseCIFCF);
  request.input("ImportFoB", ImportFoB);
  request.input("detailsSame", detailsSame);
  request.input("flaggedShipType", flaggedShipType);
  request.input("approvedSubsidy", approvedSubsidy);
  request.input("disbursedSubsidy", disbursedSubsidy);
  request.input("participatedTender", participatedTender);
  request.input("FFSFlagedOffer", FFSFlagedOffer);
  request.input("totalCost", totalCost);
  request.input("date", date);
  request.input("userID", userID);
  request.input("ID", ID);
  request.input("agency", agency);
  request.input("financialYear", financialYear);

  try {
    const result = await request.query(`
            UPDATE tbl_flagged_ship
                SET
                    ministry_id = @ministry,
                    agency_name = @agencyName,
                    import_item = @importItem,
                    quantity = @quantity,
                    country = @country,
                    case_of_cif = @caseCIFCF,
                    for_basis = @ImportFoB,
                    details_for_basis = @detailsSame,
                    flagged_ship = @flaggedShipType,
                    subsidy_approved = @approvedSubsidy,
                    subsidy_disbursed = @disbursedSubsidy,
                    ifs_tender_process = @participatedTender,
                    difference_ifv = @FFSFlagedOffer,
                    total_amount = @totalCost,
                    date = @date,
                    updated_by = @userID,
                    updated_date = GETDATE(),
                     agency_id = @agency,
                      financial_year = @financialYear
                WHERE
                    id = @ID ;
        `);

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}


async function getPFSReport(req, res) {
  const conn = await pool;
  const request = conn.request();

  const { ministry, country } = req.body;

  request.input("ministry", ministry);
  request.input("country", country);

  try {
    let whereClause = [];
    if (ministry !== 0)
      whereClause.push("tbl_flagged_ship.ministry_id = @ministry");
    if (country !== 0) whereClause.push("tbl_flagged_ship.country = @country");

    let whereCatgeoryCondition =
      whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

    const result = await request.query(`SELECT
                mmt_ministry.ministry_name AS Ministry,
                mmt_organisation.organisation_name AS Agency,
                tbl_flagged_ship.import_item AS [Import Item],
                tbl_flagged_ship.quantity AS Quantity,
                mmt_country.country AS Country,
                tbl_flagged_ship.details_for_basis AS [Details For Basis],
                tbl_flagged_ship.flagged_ship AS[Flagged Ship],
                tbl_flagged_ship.subsidy_approved AS [Subsidy Approved],
                tbl_flagged_ship.subsidy_disbursed AS [Subsidy Disbursed],
                tbl_flagged_ship.total_amount AS [Total Amount]
            FROM 
                tbl_flagged_ship
            LEFT JOIN
              mmt_organisation ON mmt_organisation.organisation_id = tbl_flagged_ship.agency_id
            LEFT JOIN 
                mmt_ministry 
                ON mmt_ministry.ministry_id = tbl_flagged_ship.ministry_id
            LEFT JOIN 
                mmt_country 
                ON mmt_country.id = tbl_flagged_ship.country
            ${whereCatgeoryCondition} ;`);

    const rowData = result.recordset;

    if (rowData.length === 0) {
      return res
        .status(404)
        .json({ error: "No data available for this selection" });
    }

    const columnDefs = Object.keys(rowData[0]).map((key) => ({
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
      field: key,
    }));

    res.json({ columnDefs, rowData });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

const flaggedShipTab = {
  addFlaggedShip,
  getFSData,
  getUpdateFSData,
  editFlaggedShip,
  getPFSReport,
};

export default flaggedShipTab;
