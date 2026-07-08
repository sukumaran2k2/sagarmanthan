import { pool } from "../../db.js";
import sql from "mssql";

async function submitCourseMasterData(req, res) {
    const {
      courseCategory,
      courseDiscipline,
      courseName,
      courseId,        
      courseDuration,
      courseType,
      approvedIntakeCapacity,
      status,
      statusUpdatedDate,
      affiliation,
      universityName,
      mtiId,          
      userId,
      batches = []       
    } = req.body;
  
    const conn = await pool;
    const tx = new sql.Transaction(conn);
  
    try {
      await tx.begin();
  
      const courseReq = new sql.Request(tx);
      courseReq.input("courseCategory", courseCategory);
      courseReq.input("courseDiscipline", courseDiscipline);
      courseReq.input("courseName", courseName);
      courseReq.input("courseId", courseId);
      courseReq.input("courseDuration", courseDuration);
      courseReq.input("courseType", courseType);
      courseReq.input("approvedIntakeCapacity", approvedIntakeCapacity);
      courseReq.input("status", status);
      courseReq.input("statusUpdatedDate", statusUpdatedDate || null);
      courseReq.input("affiliation", affiliation);
      courseReq.input("deemedUniversityName", affiliation === "Deemed" ? universityName : null);
      courseReq.input("mtiId", mtiId);
      courseReq.input("createdBy", userId);
  
      const insertCourseSql = `
        DECLARE @New TABLE(id INT);
        INSERT INTO mmt_mti_course
        (course_category, course_discipline, course_name, course_id, course_duration, course_type,
         approved_intake_capacity, status, status_updated_date, affiliation, deemed_university_name,
         mti_id, created_by, created_date)
        OUTPUT INSERTED.id INTO @New
        VALUES
        (@courseCategory, @courseDiscipline, @courseName, @courseId, @courseDuration, @courseType,
         @approvedIntakeCapacity, @status, @statusUpdatedDate, @affiliation, @deemedUniversityName,
         @mtiId, @createdBy, GETDATE());
        SELECT id FROM @New;
      `;
  
      const courseResult = await courseReq.query(insertCourseSql);
      if (!courseResult.recordset || courseResult.recordset.length === 0) {
        await tx.rollback();
        return res.status(400).send("Error adding course data.");
      }
      const newCoursePkId = courseResult.recordset[0].id;
  
      if (Array.isArray(batches) && batches.length > 0) {
        if (!mtiId || !courseId) {
          await tx.rollback();
          return res.status(400).send("mti_id and course_id are required to save batch rows.");
        }
  
        for (const b of batches) {
          if (!b.start_year || !b.end_year) {
            await tx.rollback();
            return res.status(400).send("Each batch requires start_year and end_year.");
          }
          if (b.end_year < b.start_year) {
            await tx.rollback();
            return res.status(400).send("Batch end_year cannot be less than start_year.");
          }
          if ((b.completed_course_count || 0) > (b.admission_count || 0)) {
            await tx.rollback();
            return res.status(400).send("completed_course_count cannot exceed admission_count.");
          }
          if ((b.enrolled_for_placement_count || 0) > (b.completed_course_count || 0)) {
            await tx.rollback();
            return res.status(400).send("enrolled_for_placement_count cannot exceed completed_course_count.");
          }
          if ((b.placed_count || 0) > (b.enrolled_for_placement_count || 0)) {
            await tx.rollback();
            return res.status(400).send("placed_count cannot exceed enrolled_for_placement_count.");
          }
  
          const batchReq = new sql.Request(tx);
          batchReq.input("mtiId", mtiId);                        
          batchReq.input("courseIdBusiness", courseId);         
          batchReq.input("startYear", b.start_year);
          batchReq.input("endYear", b.end_year);
          batchReq.input("admissionCount", b.admission_count || 0);
          batchReq.input("completedCount", b.completed_course_count || 0);
          batchReq.input("enrolledCount", b.enrolled_for_placement_count || 0);
          batchReq.input("placedCount", b.placed_count || 0);
          batchReq.input("createdBy", userId);
  
          await batchReq.query(`
            INSERT INTO tbl_mti_course_batch
            (mti_id, course_id, start_year, end_year, admission_count, completed_course_count,
             enrolled_for_placement_count, placed_count, created_by, created_date)
            VALUES
            (@mtiId, @courseIdBusiness, @startYear, @endYear, @admissionCount, @completedCount,
             @enrolledCount, @placedCount, @createdBy, GETDATE());
          `);
        }
      }
  
      await tx.commit();
      
      return res.status(201).json({
        message: "Course and batches added successfully.",
        coursePkId: newCoursePkId,
        courseId: courseId,
        mtiId: mtiId
      });
    } catch (error) {
      console.error("Error submitting course data:", error);
      try { await tx.rollback(); } catch (e) { /* ignore */ }
      return res.sendStatus(500);
    }
  }
  
async function getCourseMasterData(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT 
                c.id, c.course_category, c.course_discipline, c.course_name, c.course_id, c.mti_id,
                c.course_duration, c.course_type, c.approved_intake_capacity, c.status, c.status_updated_date, c.affiliation, 
                c.deemed_university_name, m.mti_name, m.mti_number
            FROM 
                mmt_mti_course c
            INNER JOIN 
                mmt_mti m ON c.mti_id = m.mti_id
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching course data:", error);
        res.status(500).send("Error fetching course data.");
    }
}

async function getCourseMasterDataById(req, res) {
    const { id } = req.params;

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("id", id);
        // Fetch course
        const courseResult = await request.query(`
            SELECT * 
            FROM mmt_mti_course 
            WHERE id = @id
        `);

        if (courseResult.recordset.length === 0) {
            return res.status(404).send("No course found with the provided ID.");
        }

        const course = courseResult.recordset[0];

        // Fetch batches for this course
        const batchResult = await conn.request()
            .input("courseId", course.course_id)
            .query(`
                SELECT * 
                FROM tbl_mti_course_batch 
                WHERE course_id = @courseId
            `);

        // Combine course info with its batches
        const response = {
            ...course,
            batches: batchResult.recordset || []
        };

        res.status(200).json(response);

    } catch (error) {
        console.error("Error fetching course data by ID:", error);
        res.status(500).send("Error fetching course data.");
    }
}
async function updateCourseMasterData(req, res) {
    const {
        id, courseCategory, courseDiscipline, courseName, courseId, courseDuration, courseType, approvedIntakeCapacity,
        status, statusUpdatedDate, affiliation, deemedUniversityName, mtiId, userId, batches = []
    } = req.body;

    const conn = await pool;
    const tx = new sql.Transaction(conn);

    try {
        await tx.begin();

        // Update course
        const courseReq = new sql.Request(tx);
        courseReq.input("id", id);
        courseReq.input("courseCategory", courseCategory);
        courseReq.input("courseDiscipline", courseDiscipline);
        courseReq.input("courseName", courseName);
        courseReq.input("courseId", courseId);
        courseReq.input("courseDuration", courseDuration);
        courseReq.input("courseType", courseType);
        courseReq.input("approvedIntakeCapacity", approvedIntakeCapacity);
        courseReq.input("status", status);
        courseReq.input("statusUpdatedDate", statusUpdatedDate || null);
        courseReq.input("affiliation", affiliation);
        courseReq.input("deemedUniversityName", deemedUniversityName || null);
        courseReq.input("mtiId", mtiId);
        courseReq.input("userId", userId);

        const updateCourseQuery = `
            UPDATE mmt_mti_course
            SET 
                course_category = @courseCategory, 
                course_discipline = @courseDiscipline, 
                course_name = @courseName, 
                course_id = @courseId, 
                course_duration = @courseDuration, 
                course_type = @courseType, 
                approved_intake_capacity = @approvedIntakeCapacity, 
                status = @status, 
                status_updated_date = @statusUpdatedDate, 
                affiliation = @affiliation, 
                deemed_university_name = @deemedUniversityName, 
                mti_id = @mtiId, 
                updated_by = @userId, 
                updated_date = GETDATE()
            WHERE id = @id
        `;

        await courseReq.query(updateCourseQuery);

        // Update or insert batches
        if (Array.isArray(batches) && batches.length > 0) {
            for (const b of batches) {
                const batchReq = new sql.Request(tx);
                batchReq.input("mtiId", mtiId);
                batchReq.input("courseIdBusiness", courseId);
                batchReq.input("startYear", b.start_year);
                batchReq.input("endYear", b.end_year);
                batchReq.input("admissionCount", b.admission_count || 0);
                batchReq.input("completedCount", b.completed_course_count || 0);
                batchReq.input("enrolledCount", b.enrolled_for_placement_count || 0);
                batchReq.input("placedCount", b.placed_count || 0);
                batchReq.input("createdBy", userId);

                // Check if batch exists for this course and start/end year
                const checkBatch = await batchReq.query(`
                    SELECT id FROM tbl_mti_course_batch
                    WHERE course_id = @courseIdBusiness AND mti_id = @mtiId
                        AND start_year = @startYear AND end_year = @endYear
                `);

                if (checkBatch.recordset.length > 0) {
                    // Update existing batch
                    batchReq.input("batchId", checkBatch.recordset[0].id);
                    await batchReq.query(`
                        UPDATE tbl_mti_course_batch
                        SET 
                            admission_count = @admissionCount,
                            completed_course_count = @completedCount,
                            enrolled_for_placement_count = @enrolledCount,
                            placed_count = @placedCount,
                            updated_by = @createdBy,
                            updated_date = GETDATE()
                        WHERE id = @batchId
                    `);
                } else {
                    // Insert new batch
                    await batchReq.query(`
                        INSERT INTO tbl_mti_course_batch
                        (mti_id, course_id, start_year, end_year, admission_count, completed_course_count,
                         enrolled_for_placement_count, placed_count, created_by, created_date)
                        VALUES
                        (@mtiId, @courseIdBusiness, @startYear, @endYear, @admissionCount, @completedCount,
                         @enrolledCount, @placedCount, @createdBy, GETDATE())
                    `);
                }
            }
        }

        await tx.commit();
        res.status(200).send("Course and batch data updated successfully.");
    } catch (error) {
        console.error("Error updating course and batch data:", error);
        try { await tx.rollback(); } catch (e) {}
        res.status(500).send("Error updating course and batch data.");
    }
}


async function getCourseTypeData(req, res) {
    try {
        const conn = await pool; // Ensure pool is initialized
        const request = conn.request();
        const mtiId = parseInt(req.params.mtiId); // Ensure mtiId is an integer
        const courseId = parseInt(req.params.courseId); // Ensure courseId is an integer

        request.input("mtiId", mtiId);
        request.input("courseId", courseId);

        const getQuery = `
            SELECT 
                c.course_type
            FROM 
                mmt_mti_course c
            WHERE 
                c.mti_id = @mtiId AND c.course_id = @courseId
        `;
        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error while fetching course type data:", err);
        res.sendStatus(500);
    }
}


const courseMasterTab = {
    submitCourseMasterData, getCourseMasterData, getCourseMasterDataById, updateCourseMasterData,
    getCourseTypeData
};
export default courseMasterTab;
