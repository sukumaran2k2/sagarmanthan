import { pool } from "../../db.js";
import sql from "mssql";
import { getDataScope } from "../../middleware/dataScope.js";

export async function convertIntoVacantPost(request,postCode,newDateOfVacancy) {
    // const conn = await pool;
    // const request = conn.request();
    let newPostCode = postCode;
    let revisedNewDateOfVacancy = newDateOfVacancy;

    request.input("revisedNewDateOfVacancy", revisedNewDateOfVacancy);
    request.input("newPostCode", newPostCode);

    await request.query(`UPDATE ps
                        SET
                          process_initiated_date = a.A_process_initiated_date,
                          notification_adv_issued_date = a.A_notification_adv_issued_date,
                          renotification_adv_issued_date = a.A_renotification_adv_issued_date,
                          number_of_eligible_application = a.A_number_of_eligible_application,
                          exam_conducted_date = a.A_exam_conducted_date,
                          interview_conducted_date = a.A_interview_conducted_date,
                          selection_process_completed_date = a.A_selection_process_completed_date,
                          result_declared_date = a.A_result_declared_date,
                          appointment_letter_issued_date = a.A_appointment_letter_issued_date,
                          vigilance_clr_received_date = a.A_vigilance_clr_received_date,
                          dpc_conducted_date = a.A_dpc_conducted_date,
                          approval_by_ca_date = a.A_approval_by_ca_date,
                          promotion_order_issued_date = a.A_promotion_order_issued_date,
                          application_received_date = a.A_application_received_date,
                          review_application_by_comm = NULLIF(a.A_review_application_by_comm, ''), -- the anticipated column is NOT NULL varchar and holds '' for "no date"; '' into a date column would be 1900-01-01
                          approval_received_date = a.A_approval_received_date,
                          order_issued_date = a.A_order_issued_date,
                          is_recruitment_through_ipa = a.A_is_recruitment_through_ipa,
                          method_of_appointment = ps.expected_anticipated_vacancy,
                          vacancy_type = ps.expected_anticipated_vacancy
                        FROM tbl_hr_post_strength ps
                        LEFT JOIN tbl_hr_anticipated_vacancies_details a ON ps.post_code = a.post_code
                        WHERE ps.post_code = @newPostCode`);

    await request.query(`UPDATE tbl_hr_post_strength
                        SET vacant_or_filled = 'vacant',
                        is_new = 0,
                        employee_id = NULL,
                        emp_master_id = NULL,
                        date_of_arise_in_vacancy = @revisedNewDateOfVacancy,
                        expected_anticipated_vacancy = NULL,
                        employee_joined_date = NULL,
                        created_date = GETDATE(),
                        updated_date = NULL,
                        updated_by = NULL,
                        discharge_reason = NULL,
                        revival_process_initiated = NULL,
                        revival_remarks = NULL,
                        revival_date = NULL,
                        revival_stage_id = NULL,
                        revival_submission_date = NULL,
                        revive_proposal_sent_to_doe_date = NULL,
                        revive_approval_date_from_doe = NULL,
                        revive_rejection_date_from_doe = NULL,
                        revive_remarks_from_doe = NULL,
                        revive_proposal_rejected_by_doe_date = NULL,
                        order_of_revival_issued_date = NULL,
                        revoke_reason = NULL,
                        revival_doc_name = NULL
                        WHERE post_code = @newPostCode`);

    await request.query(`DELETE FROM tbl_hr_anticipated_vacancies_details WHERE post_code = @newPostCode`);
};

export async function getNewEmployeeIDofOrg(organisationID) {
    const conn = await pool;
    const request = conn.request();

    request.input("organisationID", organisationID);

    try {
        const lastEmployeeIDResult = await request.query(`with getEmployeeID as(
                SELECT cast(LEFT( employee_id,CHARINDEX('EMP',employee_id)-1) as int) as org_value,employee_id,
                cast(SUBSTRING(employee_id, CHARINDEX('EMP', employee_id) + 3, LEN(employee_id)) AS int) as emp_value
            FROM tbl_employee_transaction_details et
            LEFT JOIN tbl_employee_master m ON et.emp_master_id = m.emp_master_id
            where et.employee_id != '0')
            select top 1  emp_value, employee_id from getEmployeeID where org_value = @organisationID order by emp_value desc`);

            let newEmployeeID;
            if (lastEmployeeIDResult.recordset.length > 0) {
                const getLastEmployeeOfDeputedOrg = lastEmployeeIDResult.recordset[0].employee_id;
                const prefix = getLastEmployeeOfDeputedOrg.slice(0, getLastEmployeeOfDeputedOrg.indexOf('EMP') + 3);
                const lastNumber = parseInt(getLastEmployeeOfDeputedOrg.slice(getLastEmployeeOfDeputedOrg.indexOf('EMP') + 3), 10);
                const newNumber = (lastNumber + 1).toString();
                newEmployeeID = `${prefix}${newNumber}`;
            } else {
                const organisationId = organisationID.toString().padStart(2, '0');
                newEmployeeID = `${organisationId}EMP1`;
            }

            request.input("newEmployeeID", newEmployeeID);
            const checkResult = await request.query(`
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM tbl_employee_transaction_details WHERE employee_id = @newEmployeeID
                ) THEN 1 ELSE 0 END AS isExists
            `);

            const isEmployeeIDExists = checkResult.recordset[0].isExists;

            if (isEmployeeIDExists) {
                throw new Error("Generated Employee ID already exists in the system");
            }

            return newEmployeeID;
    } catch (error) {
        console.error("Error fetching last employee ID:", error);
        throw error;
    }
};

export async function checkAadharNumberExistence(req,res) {
    const aadharNumber = req.params.aadharNumber;
    
    try {
        const conn = await pool;
        const request = conn.request();
        request.input("aadharNumber", aadharNumber);
        
        const result = await request.query(`SELECT CASE WHEN EXISTS (SELECT 1 FROM tbl_employee_master WHERE emp_aadhar_number = @aadharNumber) THEN 1 ELSE 0 END AS isExists`);
        res.json({ exists: result.recordset[0].isExists });
    } catch(error) {
        console.error("Error occurred while checking the aadhar number existence", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export async function checkReferenceNumberExistence(req,res) {
    const refNo = req.params.refNo;
    const orgID = req.params.orgID;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("refNo", refNo);
        request.input("orgID", orgID);
        
        const result = await request.query(`SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM tbl_employee_transaction_details t
                LEFT JOIN tbl_employee_master m ON t.emp_master_id = m.emp_master_id
                WHERE m.emp_curr_org_id = @orgID
                AND t.emp_reference_id = @refNo
            ) THEN 1 ELSE 0 END AS isExists`);
        res.json({ exists: result.recordset[0].isExists });
    } catch(error) {
        console.error("Error occurred while checking the reference number existence", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Roll back a transaction without throwing when it already finished
 * (mssql aborts some transactions itself on error, and rolling those back throws).
 */
export async function safeRollback(transaction) {
    if (!transaction) return;
    try {
        await transaction.rollback();
    } catch {
        // already committed, aborted or never begun
    }
}

/** Error carrying an HTTP status, for early exits inside withTransaction. */
export function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

/**
 * Run `work(request, transaction)` inside one transaction. The request passed in is bound
 * to the transaction (create more with `new sql.Request(transaction)` when a loop needs
 * fresh parameters), so every query in `work` commits or rolls back together.
 * Throw httpError(...) from `work` to abort with a specific status.
 */
export async function withTransaction(pool, work) {
    const conn = await pool;
    const transaction = new sql.Transaction(conn);
    try {
        await transaction.begin();
        const result = await work(new sql.Request(transaction), transaction);
        await transaction.commit();
        return result;
    } catch (err) {
        await safeRollback(transaction);
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Server-side paginated lists (HR Administration, Vacancy Management, Abolished Posts)
// ---------------------------------------------------------------------------

/** page >= 1, limit 1..100 (default 10), search trimmed to 100 characters. */
export function readListQuery(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
    const search = String(query.search || "").trim().slice(0, 100);
    return { page, limit, offset: (page - 1) * limit, search };
}

/** Search text for LIKE, with %, _ and [ matched literally. */
export function likePattern(search) {
    return `%${String(search).replace(/[%_[\]]/g, "[$&]")}%`;
}

/**
 * Organisation a list is read for, from the login: organisation users always get their own;
 * ministry (wide) users may pass ?organisationId (null = every organisation); anyone else
 * gets { ok: false } (403).
 */
export function resolveListOrganisation(req) {
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    if (isOrganisation) {
        return Number.isFinite(organisationId) && organisationId > 0 ? { ok: true, organisationId } : { ok: false };
    }
    if (isWide) {
        const requested = Number.parseInt(req.query?.organisationId, 10);
        return { ok: true, organisationId: requested > 0 ? requested : null };
    }
    return { ok: false };
}

/**
 * Organisation for a report route that takes :organisationID (0 = every organisation):
 * organisation users are pinned to their own, ministry users keep what they asked for.
 * Returns null when the user may not read any organisation.
 */
export function resolveReportOrganisation(req, requested) {
    const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
    if (isOrganisation) return Number.isFinite(organisationId) && organisationId > 0 ? organisationId : null;
    if (isWide) {
        const n = Number.parseInt(requested, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
    }
    return null;
}

/**
 * Runs a page query that also returns COUNT(*) OVER() AS total_count, so one query gives the
 * rows and the total. Only a page past the end (no rows) needs the separate count, which runs
 * then and only then. `countQuery` resolves to the count row (it may carry extra counts).
 */
export async function runPagedQuery(dataRequest, dataSql, countQuery, page) {
    const { recordset } = await dataRequest.query(dataSql);
    const first = recordset[0];
    const countRow = first ?? (page > 1 ? await countQuery() : null);
    const rows = recordset.map(({ total_count: _total, ...row }) => row);
    return { rows, total: Number(countRow?.total_count ?? countRow?.total) || 0, countRow: countRow || {} };
}

/** { total, page, limit, totalPages }; totalPages is 0 when there are no rows. */
export function buildPagination(total, page, limit) {
    return { total, page, limit, totalPages: total ? Math.ceil(total / limit) : 0 };
}

export default {
    checkAadharNumberExistence,
    checkReferenceNumberExistence
};

/**
 * Route middleware for endpoints that take the organisation in the URL: organisation users are
 * pinned to their own organisation (whatever the URL says); ministry users keep what they asked for.
 */
export function pinOwnOrganisation(paramName = "organisationID") {
    return (req, res, next) => {
        const { isWide, isOrganisation, organisationId } = getDataScope(req.user);
        if (isOrganisation) {
            if (!(Number.isFinite(organisationId) && organisationId > 0)) {
                return res.status(403).json({ message: "Your account is not linked to an organisation." });
            }
            req.params[paramName] = String(organisationId);
        } else if (!isWide) {
            return res.status(403).json({ message: "You may not view this data." });
        }
        return next();
    };
}
