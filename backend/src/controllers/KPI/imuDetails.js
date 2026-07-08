import { pool } from "../../db.js";

async function createStudentEnrollment(req,res) {
    const {studentId,financialYear,noOfStdCapacity,noOfStdEnrolled,studentsAdmission,studentsonRoll,studentsFinalyear,studentsPassed,noOfStdPlaced,percentagePlacement,userID} = req.body;

    if (!financialYear || !noOfStdCapacity || !noOfStdEnrolled ||!studentsAdmission || !studentsonRoll || !studentsFinalyear || !studentsPassed || !noOfStdPlaced || !percentagePlacement || !userID) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const conn = await pool;
    const existingRequest = conn.request();

    const checkStudentId = `SELECT * FROM tbl_imu_k_5_1 WHERE financial_year = @financialYear`
    existingRequest.input("financialYear",financialYear);

    try{
        const checkResult = await existingRequest.query(checkStudentId);

        if(checkResult.recordset.length!=0){
                const updateQuery= `
                UPDATE tbl_imu_k_5_1 SET
                no_of_seats = @noOfStdCapacity,
                no_of_students_enrolled = @noOfStdEnrolled,
                percentage_of_student_admission = @studentsAdmission,
                no_of_students_on_roll = @studentsonRoll,
                no_of_final_year_students = @studentsFinalyear,
                no_of_students_passedout = @studentsPassed,
                no_of_students_placed = @noOfStdPlaced,
                placement_percentage = @percentagePlacement,
                updated_date = GETDATE(),
               updated_by = @userID
               WHERE financial_year = @financialYear
                `;
                await existingRequest
                .input("noOfStdCapacity",noOfStdCapacity)
                .input("noOfStdEnrolled",noOfStdEnrolled)
                .input("studentsAdmission",studentsAdmission)
                .input("studentsonRoll",studentsonRoll)
                .input("studentsFinalyear",studentsFinalyear)
                .input("studentsPassed",studentsPassed)
                .input("noOfStdPlaced",noOfStdPlaced)
                .input("percentagePlacement",percentagePlacement)
                .input("userID", userID)
                .query(updateQuery);
                res.status(201).json({ message: "Updated successfully" });
        }else{
        const insertQuery = `
            INSERT INTO tbl_imu_k_5_1(financial_year,no_of_seats,no_of_students_enrolled,percentage_of_student_admission,no_of_students_on_roll,no_of_final_year_students,no_of_students_passedout,no_of_students_placed,placement_percentage,created_by,created_date)
            OUTPUT INSERTED.student_id
            VALUES(
            @financialYear,@noOfStdCapacity,@noOfStdEnrolled,@studentsAdmission,@studentsonRoll,@studentsFinalyear,@studentsPassed,@noOfStdPlaced,@percentagePlacement,@userID,GETDATE()
            );
        `;
        const insertRequest = conn.request();
        insertRequest.input("financialYear",financialYear);
        insertRequest.input("noOfStdCapacity",noOfStdCapacity);
        insertRequest.input("noOfStdEnrolled",noOfStdEnrolled);
        insertRequest.input("studentsAdmission",studentsAdmission);
        insertRequest.input("studentsonRoll",studentsonRoll);
        insertRequest.input("studentsFinalyear",studentsFinalyear);
        insertRequest.input("studentsPassed",studentsPassed);
        insertRequest.input("noOfStdPlaced",noOfStdPlaced);
        insertRequest.input("percentagePlacement",percentagePlacement);
        insertRequest.input("userID", userID);

        const result = await insertRequest.query(insertQuery)
        return res.status(201).json({ studentId: result.recordset[0].student_id});

        }
    } catch (error) {
         console.log("error",error)
         return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getStudentEnrollment(req,res) {
    try {
        const conn = await pool; 
        const request = conn.request();

        const getQuery = `SELECT * FROM tbl_imu_k_5_1
        ORDER BY financial_year DESC`

        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getStudentEnrollmentByID(req,res) {
    try {
        const studentId = req.params.studentId;
        const conn = await pool; 
        const request = conn.request();

        request.input("studentId",studentId);

        const getQuery = `SELECT student_id,financial_year,no_of_seats,no_of_students_enrolled,percentage_of_student_admission,no_of_students_on_roll,no_of_final_year_students,no_of_students_passedout,no_of_students_placed,placement_percentage FROM tbl_imu_k_5_1 WHERE student_id = @studentId`;

        const result = await request.query(getQuery);

        res.json(result.recordset);
    

    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function createimunewCourseUpgradation(req, res) {
    const { courseId, financialYear, noOfCourseOffered, noOfCourseUpgraded, userID } = req.body;

    const conn = await pool;
    const existingRequest = conn.request();

    try {
        // Check if the courseId already exists in the table
        const checkCourseId = `SELECT * FROM tbl_imu_k_5_2 WHERE financial_year = @financialYear`;
        existingRequest.input("financialYear", financialYear);

        const checkResult = await existingRequest.query(checkCourseId);

        if (checkResult.recordset.length !== 0) {
            // Course exists, so update it
            const updateQuery = `
                UPDATE tbl_imu_k_5_2 SET
                    no_of_courses_offered = @noOfCourseOffered,
                    no_of_courses_upgraded = @noOfCourseUpgraded,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE financial_year = @financialYear
            `;
            await existingRequest
                .input("noOfCourseOffered", noOfCourseOffered)
                .input("noOfCourseUpgraded", noOfCourseUpgraded)
                .input("userID", userID)
                .query(updateQuery);

            return res.status(201).json({ message: "Updated successfully" });
        } else {
            // Course doesn't exist, so insert new course record
            const insertQuery = `
                INSERT INTO tbl_imu_k_5_2(financial_year, no_of_courses_offered, no_of_courses_upgraded, created_by, created_date)
                OUTPUT INSERTED.course_id
                VALUES(@financialYear, @noOfCourseOffered, @noOfCourseUpgraded, @userID, GETDATE());
            `;
            const insertRequest = conn.request();
            insertRequest.input("financialYear", financialYear);
            insertRequest.input("noOfCourseOffered", noOfCourseOffered);
            insertRequest.input("noOfCourseUpgraded", noOfCourseUpgraded);
            insertRequest.input("userID", userID);

            const result = await insertRequest.query(insertQuery);
            return res.status(201).json({ courseId: result.recordset[0].course_id });
        }
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getimuNewCourseUpgradation(req,res) {
    try {
        const conn = await pool; 
        const request = conn.request();

        const getQuery = `SELECT * FROM tbl_imu_k_5_2
        ORDER BY financial_year DESC`

        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getimuNewCourseUpgradationByID(req,res) {
    try {
        const courseId = req.params.courseId;
        const conn = await pool; 
        const request = conn.request();

        request.input("courseId",courseId);

        const getQuery = `SELECT course_id,financial_year,no_of_courses_offered,no_of_courses_upgraded FROM tbl_imu_k_5_2 WHERE course_id = @courseId
        `;

        const result = await request.query(getQuery);

        res.json(result.recordset);

    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function createimuFacilities(req,res) {

        const {facilitiesId,financialYear,noOfClassrooms,noOfLabs,noOfSimulators,noOfWorkshops,noOfLibrarybooks,noOfEbooks,noOfEjournals,noOfEdatabases,noOfacadamicSoftware,totalEresources,userID} = req.body;

        const conn = await pool;
        const existingRequest = conn.request();

        try{
            const checkFacilitiesId = `SELECT * FROM tbl_imu_k_5_3 WHERE financial_year = @financialYear`;
            existingRequest.input("financialYear", financialYear);

            const checkResult = await existingRequest.query(checkFacilitiesId);

            if (checkResult.recordset.length !== 0) {
                const updateQuery = `
                UPDATE tbl_imu_k_5_3 SET
                    no_of_classrooms = @noOfClassrooms,
                    no_of_labs = @noOfLabs,
                    no_of_simulators = @noOfSimulators,
                    no_of_workshops = @noOfWorkshops,
                    no_of_library_books = @noOfLibrarybooks,
                    no_of_e_books = @noOfEbooks,
                    no_of_e_journals = @noOfEjournals,
                    no_of_e_database = @noOfEdatabases,
                    no_of_acadamic_software = @noOfacadamicSoftware,
                    total_e_resources = @totalEresources,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE financial_year = @financialYear
            `;
            await existingRequest
                .input("noOfClassrooms", noOfClassrooms)
                .input("noOfLabs", noOfLabs)
                .input("noOfSimulators", noOfSimulators)
                .input("noOfWorkshops", noOfWorkshops)
                .input("noOfLibrarybooks", noOfLibrarybooks)
                .input("noOfEbooks", noOfEbooks)
                .input("noOfEjournals", noOfEjournals)
                .input("noOfEdatabases", noOfEdatabases)
                .input("noOfacadamicSoftware", noOfacadamicSoftware)
                .input("totalEresources", totalEresources)
            
                .input("userID", userID)
                .query(updateQuery);

            return res.status(201).json({ message: "Updated successfully" });

            }else{
            const insertQuery = `
                INSERT INTO tbl_imu_k_5_3(financial_year, no_of_classrooms, no_of_labs,no_of_simulators,no_of_workshops,no_of_library_books,no_of_e_books,no_of_e_journals,no_of_e_database,no_of_acadamic_software,total_e_resources, created_by, created_date)
                OUTPUT INSERTED.facilities_id
                VALUES(@financialYear, @noOfClassrooms, @noOfLabs,@noOfSimulators,@noOfWorkshops,@noOfLibrarybooks,@noOfEbooks, @noOfEjournals,@noOfEdatabases,@noOfacadamicSoftware,@totalEresources, @userID, GETDATE());
            `;
            const insertRequest = conn.request();
            insertRequest.input("financialYear", financialYear);
            insertRequest.input("noOfClassrooms", noOfClassrooms);
            insertRequest.input("noOfLabs", noOfLabs);
            insertRequest.input("noOfSimulators", noOfSimulators);
            insertRequest.input("noOfWorkshops", noOfWorkshops);
            insertRequest.input("noOfLibrarybooks", noOfLibrarybooks);
            insertRequest.input("noOfEbooks", noOfEbooks);
            insertRequest.input("noOfEjournals", noOfEjournals);
            insertRequest.input("noOfEdatabases", noOfEdatabases);
             insertRequest.input("noOfacadamicSoftware", noOfacadamicSoftware);
              insertRequest.input("totalEresources", totalEresources);
            insertRequest.input("userID", userID);

            const result = await insertRequest.query(insertQuery);
            return res.status(201).json({ courseId: result.recordset[0].course_id });
        }
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getimuFacilities(req,res) {
    try {
        const conn = await pool; 
        const request = conn.request();

        const getQuery = `SELECT * FROM tbl_imu_k_5_3 
        ORDER BY financial_year DESC`

        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

// async function getimuFacilitiesByID(req,res) {
//     try {
//         const facilitiesId = req.params.facilitiesId;
//         const conn = await pool; 
//         const request = conn.request();

//         request.input("facilitiesId",facilitiesId);

//         const getQuery = `SELECT facilities_id,financial_year,no_of_classrooms,no_of_lab_simulator,no_of_database FROM tbl_imu_k_5_3 WHERE facilities_id = @facilitiesId`;

//         const result = await request.query(getQuery);

//         res.json(result.recordset);

//     } catch (error) {
//         console.log("error",error)
//         return res.status(500).json({ message: 'Internal Server Error'});
//     }
// }

    async function getimuFacilitiesByID(req,res) 
    {

        const facilitiesId = req.params.facilitiesId;
        const conn = await pool;
        const request = conn.request();
        request.input("facilitiesId", facilitiesId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_imu_k_5_3
                    WHERE  facilities_id = @facilitiesId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        }
async function createimuPartnership(req,res) {

        const {partnershipId,financialYear,academicMoUsDomestic,academicMoUsInternational,industryMoUsDomestic,industryMoUsInternational,userID} = req.body
     
        const conn = await pool;
        const existingRequest = conn.request();

        const checkPartnerId = `SELECT * FROM tbl_imu_k_5_4 WHERE financial_year = @financialYear`
        existingRequest.input("financialYear",financialYear);

        try{
        const checkResult = await existingRequest.query(checkPartnerId);
        if (checkResult.recordset.length !== 0) {
            const updateQuery = `
            UPDATE tbl_imu_k_5_4 SET
            academic_domestic = @academicMoUsDomestic,
            academic_international = @academicMoUsInternational,
            industry_domestic = @industryMoUsDomestic,
            industry_international = @industryMoUsInternational,
            updated_date = GETDATE(),
            updated_by = @userID
        WHERE financial_year = @financialYear
        `;
        await existingRequest
                .input("academicMoUsDomestic",academicMoUsDomestic)
                .input("academicMoUsInternational",academicMoUsInternational)
                .input("industryMoUsDomestic",industryMoUsDomestic)
                .input("industryMoUsInternational",industryMoUsInternational)
                .input("userID", userID)
                .query(updateQuery);
                res.status(201).json({ message: "Updated successfully" });
        }else{
            const insertQuery = `
        INSERT INTO tbl_imu_k_5_4(financial_year, academic_domestic, academic_international,industry_domestic,industry_international, created_by, created_date)
        OUTPUT INSERTED.partnership_id
        VALUES(@financialYear, @academicMoUsDomestic, @academicMoUsInternational,@industryMoUsDomestic,@industryMoUsInternational, @userID, GETDATE());
    `;
    const insertRequest = conn.request();
    insertRequest.input("financialYear", financialYear);
    insertRequest.input("academicMoUsDomestic", academicMoUsDomestic);
    insertRequest.input("academicMoUsInternational", academicMoUsInternational);
    insertRequest.input("industryMoUsDomestic", industryMoUsDomestic);
    insertRequest.input("industryMoUsInternational", industryMoUsInternational);
    insertRequest.input("userID", userID);

    const result = await insertRequest.query(insertQuery);
    return res.status(201).json({ courseId: result.recordset[0].partnership_id });
    }
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getimuPartnership(req,res) {
    try {
        const conn = await pool; 
        const request = conn.request();

        const getQuery = `SELECT * FROM tbl_imu_k_5_4
        ORDER BY financial_year DESC`

        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getimuPartnershipByID(req,res) {
    try {
        const partnershipId = req.params.partnershipId;
        const conn = await pool; 
        const request = conn.request();

        request.input("partnershipId",partnershipId);

        const getQuery = `SELECT * FROM tbl_imu_k_5_4 WHERE partnership_id = @partnershipId`;

        const result = await request.query(getQuery);

        res.json(result.recordset);

    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function createImuResearch(req,res) {

    const {researchId,financialYear,domesticJournals,internationalJournals,phdAwarded,patentsFiled,startupsFunded,researchAwarded,userID} = req.body
     
    const conn = await pool;
    const existingRequest = conn.request();

    try{
    const checkResearchId = `SELECT * FROM tbl_imu_k_5_5 WHERE financial_year = @financialYear`;
    existingRequest.input("financialYear", financialYear);

    const checkResult = await existingRequest.query(checkResearchId);
    if (checkResult.recordset.length !== 0) {
        const updateQuery = `
        UPDATE tbl_imu_k_5_5 SET
            domestic_journals = @domesticJournals,
            international_journals = @internationalJournals,
            phd_awarded = @phdAwarded,
            patents_filed = @patentsFiled,
            startups_funded = @startupsFunded,
            research_ms_awarded = @researchAwarded,
            updated_date = GETDATE(),
            updated_by = @userID
        WHERE financial_year = @financialYear
    `;
    await existingRequest
        .input("domesticJournals", domesticJournals)
        .input("internationalJournals", internationalJournals)
        .input("phdAwarded", phdAwarded)
        .input("patentsFiled", patentsFiled)
        .input("startupsFunded", startupsFunded)
        .input("researchAwarded", researchAwarded)
        .input("userID", userID)
        .query(updateQuery);

    return res.status(201).json({ message: "Updated successfully" });

    }else{
    const insertQuery = `
    INSERT INTO tbl_imu_k_5_5(financial_year, domestic_journals, international_journals,phd_awarded,patents_filed,startups_funded,research_ms_awarded, created_by, created_date)
    OUTPUT INSERTED.research_id
    VALUES(@financialYear, @domesticJournals, @internationalJournals,@phdAwarded,@patentsFiled,@startupsFunded,@researchAwarded,@userID, GETDATE());
    `;
    const insertRequest = conn.request();
    insertRequest.input("financialYear", financialYear);
    insertRequest.input("domesticJournals", domesticJournals);
    insertRequest.input("internationalJournals", internationalJournals);
    insertRequest.input("phdAwarded", phdAwarded);
    insertRequest.input("patentsFiled", patentsFiled);
    insertRequest.input("startupsFunded", startupsFunded);
    insertRequest.input("researchAwarded", researchAwarded);
    insertRequest.input("userID", userID);

    const result = await insertRequest.query(insertQuery);
    return res.status(201).json({ researchId: result.recordset[0].research_id });
    }
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getImuResearch(req,res) {
    try {
        const conn = await pool; 
        const request = conn.request();

        const getQuery = `SELECT * FROM tbl_imu_k_5_5
        ORDER BY financial_year DESC`

        const result = await request.query(getQuery);

        res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getImuResearchByID(req,res) {
    try {
        const researchId = req.params.researchId;
        const conn = await pool; 
        const request = conn.request();

        request.input("researchId",researchId);

        const getQuery = `SELECT * FROM tbl_imu_k_5_5 WHERE research_id = @researchId`;

        const result = await request.query(getQuery);

        res.json(result.recordset);

    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getStudentEnrollmentYear(req,res) {
    try {
   
    const { financialYear } = req.query;
  
    const conn = await pool;
    const request = conn.request();
    request.input("financialYear", financialYear)
    
    let checkYear;
   
        checkYear = `SELECT  * FROM tbl_imu_k_5_1 WHERE financial_year = @financialYear`;
        const result = await request.query(checkYear);
        
        return res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

async function getimuNewCourseUpgradationYear(req,res) {
    try {
        const { financialYear } = req.query;
      
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear)
        
        let checkYear;
            checkYear = `SELECT  * FROM tbl_imu_k_5_2 WHERE financial_year = @financialYear`;
            const result = await request.query(checkYear);
            
            return res.json(result.recordset);
        } catch (error) {
            console.log("error",error)
            return res.status(500).json({ message: 'Internal Server Error'});
        }
}

async function getimuFacilitiesYear(req,res) {
    try {
        const { financialYear } = req.query;
      
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear)
        
        let checkYear;
            checkYear = `SELECT  * FROM tbl_imu_k_5_3 WHERE financial_year = @financialYear`;
            const result = await request.query(checkYear);
            
            return res.json(result.recordset);
        } catch (error) {
            console.log("error",error)
            return res.status(500).json({ message: 'Internal Server Error'});
        }
}

async function getimuPartnershipYear(req,res) {
    try {
        const { financialYear } = req.query;
      
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear)
        
        let checkYear;
            checkYear = `SELECT  * FROM tbl_imu_k_5_4 WHERE financial_year = @financialYear`;
            const result = await request.query(checkYear);
            
            return res.json(result.recordset);
        } catch (error) {
            console.log("error",error)
            return res.status(500).json({ message: 'Internal Server Error'});
        }
}

async function getimuResearchYear(req,res) {
    try {
        const { financialYear } = req.query;
      
        const conn = await pool;
        const request = conn.request();
        request.input("financialYear", financialYear)
        
        let checkYear;
            checkYear = `SELECT  * FROM tbl_imu_k_5_5 WHERE financial_year = @financialYear`;
            const result = await request.query(checkYear);
            
            return res.json(result.recordset);
        } catch (error) {
            console.log("error",error)
            return res.status(500).json({ message: 'Internal Server Error'});
        }
}

// async function createimuFinalYearpassPercentage(req,res) {
//     const {programme,Batch,appeared,passed,passPercentage,userID} = req.body;

//     if (!programme || !Batch || !appeared ||!passed || !passPercentage || !userID) {
//         return res.status(400).json({ message: "All fields are required" });
//     }

//         const conn = await pool;

//         try {
//             const request = conn.request();

//             // If no duplicate, proceed with insert
//             request.input("programme", programme);
//             request.input("Batch", Batch);
//             request.input("appeared", appeared);
//             request.input("passed", passed);
//              request.input("passPercentage", passPercentage);
//             request.input("userID", userID);

//             const insertResult = await request.query(`
//                 INSERT INTO tbl_imu_k_5_1_1 (programme, batch, appeared, passed,pass_percentage, created_by)
//                 OUTPUT INSERTED.id
//                 VALUES (@programme, @Batch, @appeared, @passed,@passPercentage,@userID)
//             `);

//             res.status(201).json({ insertedYPId: insertResult.recordset[0].id });

//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ error: "Internal server error" });
//         }
//     }
   async function createimuFinalYearpassPercentage(req, res) {
    const { programme, Batch, appeared, passed, passPercentage, userID } = req.body;

    if (!programme || !Batch || !appeared || !passed || !passPercentage || !userID) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const conn = await pool;

        // check if batch exists
        const checkReq = conn.request();
        checkReq.input("Batch", Batch);
        checkReq.input("programme", programme);
        const existing = await checkReq.query(`
      SELECT id 
      FROM tbl_imu_k_5_1_1 
      WHERE batch = @Batch AND programme = @programme
    `);

        if (existing.recordset.length > 0) {
            // Update if exists
            const id = existing.recordset[0].id;

            const updateReq = conn.request();
            updateReq.input("id", id);
            updateReq.input("programme", programme);
            updateReq.input("Batch", Batch);
            updateReq.input("appeared", appeared);
            updateReq.input("passed", passed);
            updateReq.input("passPercentage", passPercentage);
            updateReq.input("userID", userID);

            await updateReq.query(`
                UPDATE tbl_imu_k_5_1_1
                SET programme = @programme,
                    batch = @Batch,
                    appeared = @appeared,
                    passed = @passed,
                    pass_percentage = @passPercentage,
                    updated_date = GETDATE(),
                    updated_by = @userID
                WHERE id = @id
            `);

            return res.status(200).json({ id, message: "Record updated successfully" });
        } else {
            // Insert if not exists
            const insertReq = conn.request();
            insertReq.input("programme", programme);
            insertReq.input("Batch", Batch);
            insertReq.input("appeared", appeared);
            insertReq.input("passed", passed);
            insertReq.input("passPercentage", passPercentage);
            insertReq.input("userID", userID);

            const insertResult = await insertReq.query(`
                INSERT INTO tbl_imu_k_5_1_1 (programme, batch, appeared, passed, pass_percentage, created_by)
                OUTPUT INSERTED.id
                VALUES (@programme, @Batch, @appeared, @passed, @passPercentage, @userID)
            `);

            return res.status(201).json({ id: insertResult.recordset[0].id, message: "Record inserted successfully" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

    async function getStudentfinalYearPercentage(req, res) {

        const conn = await pool;
        const request = conn.request();

        const result = await request.query(`
            SELECT * FROM tbl_imu_k_5_1_1 ORDER BY batch DESC;
        `);

        res.json(result.recordset);
    } 
 async function getUpdateFinalyearPercentagedata(req, res) 
    {

        const studentId = req.params.studentId;
        const conn = await pool;
        const request = conn.request();
        request.input("studentId", studentId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_imu_k_5_1_1
                    WHERE id  = @studentId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        }

    async function checkProgramalreadyExists(req,res) {
    try {
   
    const { programme,Batch } = req.query;
  
    const conn = await pool;
    const request = conn.request();
    request.input("programme", programme)
    request.input("Batch", Batch)
    
    let checkYear;
   
        checkYear = `SELECT  * FROM tbl_imu_k_5_1_1 WHERE programme = @programme AND batch = @bATCH`;
        const result = await request.query(checkYear);
        
        return res.json(result.recordset);
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({ message: 'Internal Server Error'});
    }
}

export default {createStudentEnrollment,getStudentEnrollment,getStudentEnrollmentByID,createimunewCourseUpgradation,getimuNewCourseUpgradation,getimuNewCourseUpgradationByID,createimuFacilities,getimuFacilities,getimuFacilitiesByID,
    createimuPartnership,getimuPartnership,getimuPartnershipByID,createImuResearch,getImuResearch,getImuResearchByID,getStudentEnrollmentYear,getimuNewCourseUpgradationYear,getimuFacilitiesYear,getimuPartnershipYear,getimuResearchYear,createimuFinalYearpassPercentage,getStudentfinalYearPercentage,getUpdateFinalyearPercentagedata,checkProgramalreadyExists}