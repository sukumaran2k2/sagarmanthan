import { pool } from "../../db.js";

async function generateUniquePostRequestID(basePostRequestID) {
    const conn = await pool;

    let postRequestID;
    let counter = 1;

    do {
        postRequestID = `${basePostRequestID}${counter}`;
        const result = await conn.query(`SELECT TOP(1) 1 FROM tbl_post_request WHERE post_request_id = '${postRequestID}'`);
        if (result.recordset.length === 0) {
            break;
        }
        counter++;
    } while (true);

    return postRequestID;
}

async function getPostRequestData(req, res) {
    const postRequestId = req.params.postRequestId;

    const conn = await pool;
    const request = conn.request();

    request.input("postRequestId", postRequestId);

    try {
        const result = await request.query(`SELECT * FROM tbl_post_request WHERE post_request_id = @postRequestId`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function getOrgName(req, res) {
    const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const result = await request.query(`SELECT organisation_name FROM mmt_organisation where organisation_id=@organisationID;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

};

async function updatePostRequestApprovalDetail(req,res){
    const postRequestId = req.body.postRequestId;
    let dateOfApproval =  req.body.dateOfApproval;
    const processInitiated = req.body.processInitiated;
    const decisionByCA = req.body.decisionByCA;
    const remarks = req.body.remarks;
    const approvalStageID = req.body.approvalStageID;
    const submissionDate = req.body.submissionDate;


    const conn = await pool;
    const request = conn.request();

    request.input("postRequestId", postRequestId);
    request.input("dateOfApproval", dateOfApproval);
    request.input("processInitiated", processInitiated);
    request.input("decisionByCA", decisionByCA);
    request.input("remarks", remarks);
    request.input("approvalStageID", approvalStageID);
    request.input("submissionDate",submissionDate);

    if (!dateOfApproval || dateOfApproval.trim() === "") {
        dateOfApproval = null;
    }
    
    try {
        const result = await request.query(`UPDATE tbl_post_request
        SET process_initiated = @processInitiated, approval_of_ca_at_organisation_level = @decisionByCA, remarks = @remarks, approval_date = @dateOfApproval,approval_stage_id = @approvalStageID, submitted_on = @submissionDate WHERE post_request_id = @postRequestId;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

}


async function updatePostApprovalDetails(req, res) {
    const proposalSentToDOE = req.body.proposalSentToDOE;
    let proposalSentToDOEDate = req.body.proposalSentToDOEDate;
    const resReceivedDOE = req.body.resReceivedDOE;
    let approvalDateFromDOE = req.body.approvalDateFromDOE;
    let rejectionDateFromDOE = req.body.rejectionDateFromDOE;
    let remarksFromDOE = req.body.remarksFromDOE;
    const propRejected = req.body.propRejected;
    let propRejectedDate = req.body.propRejectedDate;
    const  orderCreatePost = req.body. orderCreatePost;
    let orderCreatePostDate = req.body.orderCreatePostDate;
    const  stageID = req.body. stageID;
    const  postStatus = req.body. postStatus;
    const postRequestId = req.body.postRequestId;

    if (proposalSentToDOEDate == "") {
        proposalSentToDOEDate = null;
    }
    if (rejectionDateFromDOE == "") {
        rejectionDateFromDOE = null;
    }
    if(approvalDateFromDOE == ""){
        approvalDateFromDOE = null;
    }
    if (propRejectedDate == "") {
        propRejectedDate = null;
    }
    if (orderCreatePostDate == "") {
        orderCreatePostDate = null;
    }
    

    const conn = await pool;
    const request = conn.request();
    request.input("proposalSentToDOE", proposalSentToDOE);
    request.input("proposalSentToDOEDate", proposalSentToDOEDate);
    request.input("resReceivedDOE", resReceivedDOE);
    request.input("approvalDateFromDOE", approvalDateFromDOE);
    request.input("rejectionDateFromDOE", rejectionDateFromDOE);
    request.input("remarksFromDOE", remarksFromDOE);
    request.input("propRejected", propRejected);
    request.input("propRejectedDate", propRejectedDate);
    request.input("orderCreatePost", orderCreatePost);
    request.input("orderCreatePostDate", orderCreatePostDate);
    request.input("stageID", stageID);
    request.input("postStatus", postStatus);
    request.input("postRequestId", postRequestId);
  

    try {

        const result = await request.query(`UPDATE tbl_post_request SET proposal_sent_to_doe = @proposalSentToDOE, proposal_sent_to_doe_date = @proposalSentToDOEDate,
        response_recieved_from_doe = @resReceivedDOE, approval_date_from_doe = @approvalDateFromDOE ,rejection_date_from_doe = @rejectionDateFromDOE, remarks_from_doe = @remarksFromDOE, proposal_rejected_by_doe = @propRejected,
        proposal_rejected_by_doe_date = @propRejectedDate, order_for_creation_of_post_issued = @orderCreatePost, status = @postStatus, order_for_creation_of_post_issued_date = @orderCreatePostDate,
        approval_stage_id = @stageID WHERE post_request_id = @postRequestId;`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function approvePostRequest(req, res)
{
    const postRequestId = req.body.postRequestId;
 console.log(postRequestId);

    const conn = await pool;
    const request = conn.request();
    request.input("postRequestId", postRequestId);

    try {

        const result = await request.query(`UPDATE tbl_post_request SET status = 0 WHERE post_request_id = @postRequestId;`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function rejectApproveRequest(req, res)
{
    const postRequestId = req.body.postRequestId;

    const conn = await pool;
    const request = conn.request();
    request.input("postRequestId", postRequestId);

    try {

        const result = await request.query(`UPDATE tbl_post_request SET reject_status = 0 WHERE post_request_id = @postRequestId;`);

        res.sendStatus(201);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getUserName(req, res)
{
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();

    request.input("userID", userID);

    try {
        const result = await request.query(`SELECT name FROM tbl_user where user_id = @userID;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }

}


export default { getPostRequestData, getOrgName, updatePostApprovalDetails, approvePostRequest, rejectApproveRequest, getUserName, updatePostRequestApprovalDetail };
