import { pool } from "../../db.js";

async function getUniqueRIDNumber(req,res){

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`SELECT TOP 1 review_item_code FROM tbl_review_items ORDER BY id DESC`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log("error",err)
        return res.status(500).json({message: 'Internal Server Error'})
    }
}

async function getUniqueIssueNumber(req,res) {
    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
            SELECT TOP 1 issue_no 
            FROM tbl_review_items_issue 
            ORDER BY CAST(SUBSTRING(issue_no, 4, LEN(issue_no)) AS INT) DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log("error", err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

async function generateNextIssueNo() {
    const conn = await pool;
    const request = conn.request();

    const result = await request.query(`
        SELECT TOP 1 issue_no
        FROM tbl_review_items_issue
        WHERE issue_no LIKE 'RII%' AND ISNUMERIC(SUBSTRING(issue_no, 4, LEN(issue_no))) = 1
        ORDER BY CAST(SUBSTRING(issue_no, 4, LEN(issue_no)) AS INT) DESC
    `);

    const lastIssueNo = result.recordset[0]?.issue_no || "RII00";
    const lastNumber = parseInt(lastIssueNo.replace("RII", ""), 10);
    const nextNumber = lastNumber + 1;

    return {
        prefix: "RII",
        currentCounter: nextNumber // Start from next available number
    };
}

async function addIssueReviewItem(req, res) {
    const { reviewItemCode, issueReviewItem } = req.body;

    if (!reviewItemCode || !Array.isArray(issueReviewItem)) {
        return res.status(400).json({ error: "Invalid issue review item data" });
    }

    const conn = await pool;
    const request = conn.request();

    try {
        request.input("reviewItemCode", reviewItemCode);

        const checkQuery = `
            SELECT 1 
            FROM tbl_review_items_issue 
            WHERE review_item_code = @reviewItemCode
        `;
        const existing = await request.query(checkQuery);

        if (existing.recordset.length > 0) {
            await request.query(`
                DELETE FROM tbl_review_items_issue 
                WHERE review_item_code = @reviewItemCode
            `);
        }

        const { prefix, currentCounter } = await generateNextIssueNo();
        let issueCounter = currentCounter;
        for (const detailData of issueReviewItem) {
            issueCounter++;

            const issuesNo = `${prefix}${issueCounter
                .toString()
                .padStart(2, "0")}`;

            const insertRequest = conn.request();
            insertRequest.input("reviewItemCode", reviewItemCode);
            insertRequest.input("issuesNo", issuesNo);
            insertRequest.input("issueTitle", detailData.issueTitle);
            insertRequest.input("actionToBeTaken", detailData.actionToBeTaken);
            insertRequest.input("byWhom", detailData.byWhom);
            insertRequest.input("byWhen", detailData.byWhen);
            insertRequest.input("refMeeting", detailData.refMeeting);
            insertRequest.input("refMeetingDate", detailData.refMeetingDate);
            insertRequest.input("statusOfIssue", detailData.statusOfIssue);

            await insertRequest.query(`
                INSERT INTO tbl_review_items_issue (
            review_item_code,issue_no,issue_title,action_to_be_taken,by_whom,by_when,ref_meeting_name,ref_meeting_date,status_of_issue
                ) VALUES (
                    @reviewItemCode,@issuesNo,@issueTitle,@actionToBeTaken,@byWhom,@byWhen,@refMeeting,@refMeetingDate,@statusOfIssue
                )
            `);
        }

        return res.status(201).json({
            message: "Issue Review Items saved successfully"
        });

    } catch (err) {
        console.error("Error processing issue review items:", err);
        return res.status(500).json({
            message: "Failed to save Issue Review Items"
        });
    }
}


async function addReviewItems(req,res) {
    const {reviewItemTitle, reviewItemCode, broadArea,riDescription,primaryWing,otherWing,primaryOrg,otherOrg,otherMinistries,
        state,country,overAllStatus,remarks,remarksMinistry,organisationID ,userID }= req.body;

    const conn = await pool;
    const request = conn.request();

    const otherWingStr = otherWing.join(',');
    const otherOrgStr = otherOrg.join(',');
    const otherMinistriesStr = otherMinistries.join(',');

    const checkreviewItemCode = `SELECT * FROM tbl_review_items WHERE review_item_code = @reviewItemCode`;
    request.input("reviewItemCode", reviewItemCode);

     try {
        const checkResult = await request.query(checkreviewItemCode); 

        if(checkResult.recordset.length!=0){
          const updateQuery=`
               UPDATE tbl_review_items SET
               review_title = @reviewItemTitle,
               broad_subject = @broadArea,
               ri_description =@riDescription,
               primary_coord_wing = @primaryWing,
               other_wings_involved = @otherWing,
               primary_coord_org = @primaryOrg,
               other_org = @otherOrg,
               other_ministries = @otherMinistries,
               state = @state,
               country = @country,
               overall_status = @overAllStatus,
               remarks = @remarks,
               remarks_ministry = @remarksMinistry,
               organisation_id = @organisationID,
               updated_date = GETDATE(),
               updated_by = @userID
               WHERE review_item_code= @reviewItemCode
                `;
            await 
            request.input("reviewItemTitle", reviewItemTitle);
            request.input("broadArea", broadArea);
            request.input("riDescription", riDescription);
            request.input("primaryWing", primaryWing);
            request.input("otherWing", otherWingStr);
            request.input("primaryOrg", primaryOrg);
            request.input("otherOrg", otherOrgStr);
            request.input("otherMinistries", otherMinistriesStr);
            request.input("state", state);
            request.input("country", country);
            request.input("overAllStatus", overAllStatus);
            request.input("remarks", remarks);
            request.input("remarksMinistry", remarksMinistry);
            request.input("organisationID", organisationID);
            request.input("userID", userID);
            request.query(updateQuery);

            res.status(201).json({ message: "Case updated successfully" });
        }else{
            const insertQuery = `
                INSERT INTO tbl_review_items (
                    review_item_code,  review_title, 
                    broad_subject, ri_description, primary_coord_wing, other_wings_involved, 
                    primary_coord_org, other_org, other_ministries, state, country, 
                    overall_status,remarks,remarks_ministry, organisation_id,created_by,created_date
                ) OUTPUT INSERTED.id
                VALUES (
                    @reviewItemCode, @reviewItemTitle, @broadArea, @riDescription, @primaryWing, 
                    @otherWing, @primaryOrg, @otherOrg, @otherMinistries, 
                    @state, @country, @overAllStatus, @remarks, @remarksMinistry, 
                    @organisationID,@userID, GETDATE()
                );
            `;
            request.input("reviewItemTitle", reviewItemTitle);
            request.input("broadArea", broadArea);
            request.input("riDescription", riDescription);
            request.input("primaryWing", primaryWing);
            request.input("otherWing", otherWingStr);
            request.input("primaryOrg", primaryOrg);
            request.input("otherOrg", otherOrgStr);
            request.input("otherMinistries", otherMinistriesStr);
            request.input("state", state);
            request.input("country", country);
            request.input("overAllStatus", overAllStatus);
            request.input("remarks", remarks);
            request.input("remarksMinistry", remarksMinistry);
            request.input("organisationID", organisationID);
            request.input("userID", userID);

            const result = await request.query(insertQuery);

            res.status(201).json({result});
            
        }

     } catch (error) {
        console.log("error",error)
        res.status(500).send({ message: "Failed to add Issue Review Item"});
     }
}

async function getReviewItemData(req,res) {
    try {

    const conn = await pool;
    const request = conn.request();
    const query = `
       SELECT 
        ri.review_item_code as review_item_code,
        ri.review_title as review_title, 
        nv.navic_name as broad_subject,
        mw.wing_name as primary_coord_wing,
        mia.ia_name as primary_coord_org,
        ri.updated_date AS updated_date,
        COUNT(rii.review_item_code) AS Total
    FROM tbl_review_items ri
    LEFT JOIN tbl_review_items_issue rii ON ri.review_item_code = rii.review_item_code
	LEFT JOIN mmt_navic_vibhas nv ON ri.broad_subject = nv.id
	LEFT JOIN mmt_implementing_agency mia ON ri.primary_coord_org = mia.ia_id
	LEFT JOIN mmt_wings mw ON ri.primary_coord_wing = mw.wing_id
    GROUP BY 
        ri.review_item_code,
        ri.review_title, 
        nv.navic_name,
        mw.wing_name ,
        mia.ia_name ,
        ri.updated_date
    `;
    
    const result = await request.query(query);
    res.json(result.recordset);


    
    }catch (err) {
        console.log(err);
        return res.status(500).json({error: "failed toload data" });
    }
}

async function getReviewItemTotal(req,res) {
    try {

    const reviewItemCode = req.params.reviewItemCode;

    const conn = await pool;
    const request = conn.request();

    request.input("reviewItemCode",reviewItemCode);

    const query = `
    SELECT 
        rii.review_item_code as review_item_code,
        rii.issue_no as issue_no,
        rii.issue_title as issue_title, 
        rii.action_to_be_taken as action_to_be_taken,
        rii.by_whom as by_whoms,
        ia.ia_name as by_whom,
        --rii.by_when as by_when,
        CASE 
        WHEN rii.by_when = '1900-01-01' THEN ''
            ELSE CONVERT(varchar(10), rii.by_when, 120)
        END AS by_when,
        rii.ref_meeting_name as ref_meeting_name,
        --rii.ref_meeting_date as ref_meeting_date,
        CASE 
        WHEN rii.ref_meeting_date = '1900-01-01' THEN ''
            ELSE CONVERT(varchar(10), rii.ref_meeting_date, 120)
        END AS ref_meeting_date,
        rii.status_of_issue as status_of_issue
    FROM tbl_review_items_issue rii
    LEFT JOIN mmt_implementing_agency ia ON rii.by_whom = ia.ia_id
    WHERE review_item_code = @reviewItemCode 
    GROUP BY 
        rii.issue_no,
		rii.review_item_code,
        rii.issue_title, 
        rii.action_to_be_taken,
        ia.ia_name,
        rii.by_whom,
        rii.by_when,
        rii.ref_meeting_name,
        rii.ref_meeting_date,
        rii.status_of_issue 
    `;
    
    const result = await request.query(query);
    res.json(result.recordset);
 
    
    }catch (err) {
        console.log(err);
        return res.status(500).json({error: "failed toload data" });
    }
}
      
async function getReviewItemCodeDataByID(req,res) {
    try {
        
    const reviewItemCode = req.params.reviewItemCode;

    const conn = await pool;
    const request = conn.request();

    request.input("reviewItemCode",reviewItemCode);

    const query = `
    SELECT * FROM tbl_review_items WHERE review_item_code = @reviewItemCode 
    `;
    
    const result = await request.query(query);
    res.json(result.recordset);
    
    }catch (err) {
        console.log(err);
        return res.status(500).json({error: "failed toload data" });
    }
}
export default {addIssueReviewItem,addReviewItems,getUniqueRIDNumber,getUniqueIssueNumber,getReviewItemData,getReviewItemTotal,getReviewItemCodeDataByID}