import fs from 'fs';
import path, { parse } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { pool } from "../../db.js";
import * as cheerio from 'cheerio';
import nodemailer from "nodemailer";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let addeventlistener = "";

const WEB_ROOT = process.env.WEB_ROOT;

const inputTypeToSQLType = {
    text: 'NVARCHAR(MAX)',
    email: 'NVARCHAR(MAX)',
    number: 'INT',
    float: 'FLOAT',
    password: 'NVARCHAR(MAX)',
    date: 'DATE',
    textarea: 'NVARCHAR(MAX)',
    tel: 'VARCHAR(15)',
    file: 'NVARCHAR(MAX)',
    checkbox: 'NVARCHAR(MAX)',
    radio: 'NVARCHAR(MAX)',
    dropdown: 'NVARCHAR(MAX)',
    state: 'NVARCHAR(MAX)',
    district: 'NVARCHAR(MAX)',
    'MP-Constituency': 'NVARCHAR(MAX)',
    'multiple-select': 'NVARCHAR(MAX)'
};

async function storeFormBuilderInputForm(req, res) {
    const conn = await pool;

    const formName = req.body.formattedFormId || 'FormBuilderInput';
    const formContent = req.body.content || null;
    const formFields = req.body.formFields;
    const mmtData = req.body.mmtData;
    const depDropdownDataset = req.body.depDropdownDataset;

    if (!formFields || formFields.length === 0) {
        return res.status(400).json({ message: "No form fields provided" });
    }

    if (!formContent) {
        console.error("Error: formContent is missing.");
        return res.status(500).json({ error: 'Form content is required.' });
    }

    // if(mmtData){
    //     console.log("mmtData", mmtData);
    //     return;
    // }

    //fields for HTML generation (Frontend & Backend)
    const formvalidationfields = formFields.map(field => ({
        ...field
    }));

    formFields.forEach((field) => {
        if (
            field.isdependantLabel &&
            Object.keys(field.isdependantLabel).length > 0 &&
            Object.values(field.isdependantLabel).every(
                (item) => item.dependants && item.dependants.length > 0
            )
        ) {
            const depinputLabel_ID = field.depinputLabel.replace(/\s+/g, '_');
            addeventlistener += `
            document.querySelectorAll(\`select#${field.inputid}\`).forEach(select => {
                select.addEventListener('change', function(event) {
                    let select = event.target;
                    let options = [];
                    let field = fieldValidation.find(f => f.inputid === select.id); 
                    let selectedValue = select.value;
    
                    if (field && field.isdependantLabel && field.isdependantLabel[selectedValue]) {
                        options = field.isdependantLabel[selectedValue].dependants.map(item => item.value);
                    } else {
                        options = ['default1', 'default2', 'default3'];
                    }
    
                    let subSelectId = "${depinputLabel_ID}"; 
                    let subSelect = document.getElementById(subSelectId);
    
                    if (subSelect) {
                        subSelect.innerHTML = '';
    
                        let defaultOption = document.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = 'Please select an option';
                        defaultOption.disabled = true;
                        defaultOption.selected = true; 
                        subSelect.appendChild(defaultOption);
                        
                        options.forEach(optionValue => {
                            let option = document.createElement('option');
                            option.value = optionValue;
                            option.textContent = optionValue;
                            subSelect.appendChild(option);
                        });
                    } else {
                        console.warn(\`Sub-select with ID \${subSelectId} not found.\`);
                    }
                });
            });`;
        }
    });

    let formatted = /^[a-zA-Z]+$/.test(formName)
        ? formName.charAt(0).toUpperCase() + formName.slice(1)
        : formName
            .replace(/[_\s]+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    
    const formHtmlString = generateFormHtml(formName, formContent, formvalidationfields, depDropdownDataset);
    const dirPath = path.join(WEB_ROOT, 'pages', 'FormBuilderInput');
    const filePath = path.join(dirPath, `${formatted}.html`);

    try {
        await fs.promises.mkdir(dirPath, { recursive: true });

        let updatedFilePath = filePath;
        if (await fs.promises.stat(filePath).catch(() => false)) {
            return res.status(500).json({
                code: 500,
                message: `The form ${formName} already exists.`,
                status: 'error'
            });
        }

        await fs.promises.writeFile(updatedFilePath, formHtmlString);

        
        const tableName = `tbl_formB_${formatted}`;

        const createTableQuery = generateCreateTableQuery(tableName, formFields, inputTypeToSQLType);
        await conn.query(createTableQuery);

        //generate AgGrid.html Frontend
        const reportFormHtmlString = generateAgGridReportHtml(formName, formvalidationfields);
        const reportDirPath = path.join(WEB_ROOT, 'pages', 'FormBuilderOutput');
        const reportAgFilePath = path.join(reportDirPath, `${formatted}Report.html`);
        await fs.promises.mkdir(reportDirPath, { recursive: true });

        // Check if file exists and generate a new name if necessary
        let updatedReportFilePath = reportAgFilePath;
        if (await fs.promises.stat(reportAgFilePath).catch(() => false)) {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
            const fileExtension = path.extname(reportAgFilePath);
            const fileNameWithoutExt = path.basename(reportAgFilePath, fileExtension);
            updatedReportFilePath = path.join(reportAgFilePath, `${fileNameWithoutExt}_${timestamp}${fileExtension}`);
        }

        // Write the HTML string to the file
        await fs.promises.writeFile(updatedReportFilePath, reportFormHtmlString);

        // Create the SQL table based on form fields Input Form Columns
        function revertFormId(formId) {
            let idWithoutExt = formId.replace(/\.html$/i, '');
            const result = idWithoutExt.split(/(?=[A-Z])/).join(' ');
            return result.charAt(0) + result.slice(1).toLowerCase();
        }

        const formattedFileName = path.basename(updatedFilePath);
        const formattedReportFileName = path.basename(updatedReportFilePath);

        const fileName = revertFormId(formattedFileName);
        const reportFileName = revertFormId(formattedReportFileName);

        const data = mmtData[0];
        // console.log("data organisation :", data.organisation);
        let organisationValue = data.organisation;
        let wingValue = data.wing;

        if (Array.isArray(organisationValue)) {
            organisationValue = organisationValue.join(',');
        }else {
            organisationValue = '';
        }

        if (Array.isArray(wingValue) && wingValue.length > 0) {
            wingValue = wingValue.join(',');
        } else {
            wingValue = '';
        }
        // console.log("organisationValue",organisationValue);
        let granted = 0;
        if (
            granted == 1 &&
            (
                (organisationValue && organisationValue.toString().trim() !== '') ||
                (wingValue && wingValue.toString().trim() !== '')
            )
        ){
            let fetchUserEmailQuery = "";
            if (organisationValue && organisationValue.trim() !== "") {
                fetchUserEmailQuery = `
                    SELECT email 
                    FROM tbl_user 
                    WHERE organisation_id IN (${organisationValue})
                `;
            } else if (wingValue && wingValue.trim() !== "") {
                fetchUserEmailQuery = `
                    SELECT email 
                    FROM tbl_user 
                    WHERE wing_id IN (${wingValue})
                `;
            } else {
                console.log("No valid organisation or wing value found.");
                return;
            }
        
            try {
                const userEmailResult = await conn.request().query(fetchUserEmailQuery);
                const userEmails = userEmailResult.recordset.map(row => row.email).join(',');
        
                const transporter = nodemailer.createTransport({
                    host: "smtp.office365.com",
                    port: 587,
                    auth: {
                        user: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                        pass: "Sagarmanthan@123",
                    },
                });
        
                // let organisationEmailValue = 'sreenivasan@ntcpwc.iitm.ac.in, pradhiksha@ntcpwc.iitm.ac.in';
                
                // console.log("organisationEmailValue",organisationEmailValue);
                // console.log("userEmails",userEmails);

                const mailOptions = {
                    from: "sagarmanthansupport@ntcpwc.iitm.ac.in",
                    to: userEmails, 
                    subject: "New Form Available on Sagarmanthan Portal – Action Required",
                    html: `<strong>Dear User</strong>,
                        <br><br>
                        A new form has been created by the Administrator on the <strong>Sagarmanthan Portal</strong>.
                        <br><br>
                        Kindly <strong>log in to the portal</strong> and check the <strong>Form Builder module</strong> to access and furnish the required data in the form.
                        <br><br>
                        <strong>Deadline: </strong> <span style="color: red; font-weight: bold;">${data.formDueDate}</span><br>
                        <strong>Portal Link: </strong> <a href="https://ntcpwcit.in/sagarmanthan/pages/FormBuilder/getForms.html">Click here to view</a>
                        <br><br>
                        Please ensure that the form is submitted within the given timeline.
                        <br><br>
                        For any assistance, feel free to mail to the support team
                        <br><br>

                        Best regards,
                        <br>
                        <strong>Sagarmanthan Support Team</strong>
                        <br><br>`,
                };
        
                await transporter.sendMail(mailOptions);
                console.log("Email sent successfully.");
            } catch (err) {
                console.error("Error:", err.message);
            }
        }

        const createMMTTableQuery = `
        INSERT INTO mmt_form_builder (
            Input_Form, Input_Form_Path, Output_Form, Output_Form_Path,
            form_Description, Last_Date_Of_Submission, organisation, wing, Active_Status, created_by
        )
        VALUES (
            @InputForm, @InputFormPath, @OutputForm, @OutputFormPath,
            @formDescription, @formDueDate, @organisation, @wing, @activeStatus, @createdBy
        );`;

        try {

            // console.log("mmt data",data);
            await conn.request()
                .input('InputForm', fileName)
                .input('InputFormPath', updatedFilePath)
                .input('OutputForm', reportFileName)
                .input('OutputFormPath', updatedReportFilePath)
                .input('formDescription', data.formDescription)  // Mapping data to SQL input params
                .input('formDueDate', data.formDueDate)
                .input('organisation', organisationValue)
                .input('wing', wingValue)
                .input('activeStatus', data.activeStatus)
                .input('createdBy', data.userID)
                .query(createMMTTableQuery);
        } catch (error) {
            res.status(500).json({ error: "An error occurred while inserting MMT data" });
        }

        
        res.status(200).json({ message: 'Form, FBTable, and FbApi created successfully, and route added.', fileName: path.basename(updatedFilePath), ReportFileName: path.basename(updatedReportFilePath) });

    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
}

function generateCreateTableQuery(tableName, formFields, inputTypeToSQLType) {
    let query = `
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}') 
        BEGIN 
            CREATE TABLE ${tableName} (id INT IDENTITY(1,1) PRIMARY KEY,
            uid CHAR(8) DEFAULT LEFT(NEWID(), 8),
            organisation NVARCHAR(255),
            filled_by INT,
            submitted_on DATETIME DEFAULT GETDATE(),
            form_response_ID NVARCHAR(255)`;
            
        formFields.forEach((field) => {
            const fieldName = field.inputLabel.replace(/\s+/g, '_').toLowerCase();
            const fieldType = field.inputType;
            const depinputLabel = field.depinputLabel
            ? field.depinputLabel.replace(/\s+/g, '_').toLowerCase()
            : field.depinputLabel;
            
            if (inputTypeToSQLType[fieldType]) {
                query += `, ${fieldName} ${inputTypeToSQLType[fieldType]}`;
            } else {
                console.warn(`Unknown input type: ${fieldType}`);
            }

            if (fieldType === 'dropdown') {
                if (
                    field.isdependantLabel &&
                    Object.keys(field.isdependantLabel).length > 0 &&
                    Object.values(field.isdependantLabel).every(
                        (item) => item.dependants && item.dependants.length > 0
                    )
                ) {
                    let isdependantid = `${depinputLabel}`;
                    if (!isdependantid) {
                        return triggerAlert(`Please select dependant option`, 'error');
                    } else {
                        query += `, ${isdependantid} VARCHAR(255)`;
                    }
                }
            }
        });

    query += '); END;';
    // console.log(query);
    return query;
}

function generateFormHtml(formName, formContent, formvalidationfields, depDropdownDataset) {
    return `
<script src="../../js/jwt-decode.js"></script>
<script src="../../session.js"></script>
<script>
    isAuthorized(63);
</script>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>${formName} Input Form</title>

    <link rel="stylesheet" href="../../vendors/mdi/css/materialdesignicons.min.css">
    <link rel="stylesheet" href="../../vendors/base/vendor.bundle.base.css">

    <link rel="stylesheet" href="../../css/style.css">

    <link rel="stylesheet" href="../../css/alert.css">
    <link rel="stylesheet" href="../../css/jquery-confirm.min.css">
    <link rel="stylesheet" href="../../css/jquery-loader.css">
    <link rel="stylesheet" href="../../css/badge.css"/>

    <!--  Multiple Select option-->
    <link rel="stylesheet" href="../../vendors/select2/select2.min.css">
    <link rel="stylesheet" href="../../vendors/select2-bootstrap-theme/select2-bootstrap.min.css">
    <!--  Multiple Select option--> 

    <!--Datatable -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/bs5/jszip-2.5.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/datatables.min.css" />
    <!--Datatable -->
    
    <style>
        /* Spinner loader */
        .glyphicon.spinning {
            animation: spin 1s infinite linear;
        }
        
        @keyframes spin {
            from { transform: scale(1) rotate(0deg); }
            to { transform: scale(1) rotate(360deg); }
        }
        
        .space-between-flex {
            display: flex;
            justify-content: space-between;
        }

        .panel-body {
            padding: 15px;
        }

        .panel {
            margin-bottom: 20px;
            background-color: #fff;
            border: 1px solid transparent;
            border-radius: 4px;
        }

        .page-header {
            color: #000;
        }

        /* Datatable - Start */
        thead {
            color: white;
        }
        
        /* Datatable Table asc & desc */ 
        table.dataTable thead>tr>th.sorting:after {
            opacity: 3.5;
            color: #FFF;
        }

        table.dataTable thead>tr>th.sorting:before {
            opacity: 3.5;
            color: #FFF;
        }

        /* Datatable Table - column Stripes*/ 
        tbody td:nth-of-type(even)
            {
            background: rgb(244 244 241 / 50%);
        }

        .table > :not(caption) > * > * {
            padding: 0.9rem 0.9rem;
            background-color: var(--bs-table-bg);
            border-bottom-width: 1px;
            box-shadow: inset 0 0 0 9999px var(--bs-table-accent-bg);
            font-size: 17px;
        }

        .filterPanel
        {
            border: 1px solid #ee0f0f;
            padding: 1rem;
        }

        /* AG GRID */
        .ag-header-row {
            background-color: #bc3d5ceb;
            font-weight: 600;
            font-size: 1rem;
            text-align: center;
        }
        .ag-header-cell .ag-header-cell-text {
            color: #ffffff;
            font-weight: bold;
            text-align: center;
        }
        .ag-header-group-text{
            color: #fff;
            font-weight: bold;
            text-align: center;
        }
        .ag-cell{
            text-align: center;
        }
        .ag-header-group-cell{
            text-align: center;
        }
        .ag-cell-value{
            text-align: center;
        }
        .ag-header-cell-label {
            justify-content: center;
        }
        .ag-icon-menu {
            color: white !important;
        }
        .headercenter{
            justify-content: center;
            text-align: center;
        }
        .ag-cell:nth-of-type(even) {
            background:  rgb(244 244 241 / 50%);
        }
        .ag-row:nth-child(odd) {
            background-color:  rgb(244 244 241 / 50%);
        }
        .cell-span {
            background-color: #c4cdf2;
        }
        .parent-header {
            text-align: center; 
            justify-content: center;
        }
    </style>

</head>

<body>
    <div id="loader"></div>
    <div class="container-scroller">
        <div class="horizontal-menu">
            <div id="header"></div>
            <div id="formBuilderMenu"></div>
        </div>
        <div class="main-panel">
            <div class="content-wrapper">
                <div class="row">
                    <div class="col-md-12 grid-margin stretch-card">
                        <div class="card">
                            <div class="card-body">							
                                <div class="row">
                                    <div class="col-lg-12">
                                        <div class="panel-body">

                                            <div id="dynamicForm" class="mb-4">
                                                ${formContent}
                                                <button type="submit" onClick="addData()" class="btn btn-success mt-3" id="submitForm">submit</button>
                                            </div>
        
                                        </div>

                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="footer">
            <div id="footer"></div>
        </footer>
    </div>

    <script src="../../vendors/base/vendor.bundle.base.js"></script>
    <script src="../../js/template.js"></script>

    <script src="../../js/alert.js"></script>
    <script src="../../js/jquery-confirm.min.js"></script>
    <script src="../../js/jquery-loader.js"></script> 

    <!--DataTable -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs5/jszip-2.5.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/b-print-2.2.3/datatables.min.js"></script>
    <!--DataTable -->

    <!--AG GRID-->
    <script>var __basePath = './';</script>
    <script src="../../js/agGrid.js"></script>

    <!-- Moment added for as on date format -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.26.0/moment.min.js"> </script>
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/momenttimezone/0.5.31/moment-timezone-with-data-2012-2022.min.js"></script> -->

    <!-- Backend Axios API -->
    <script src="https://unpkg.com/axios@1.1.2/dist/axios.min.js"></script>
    <script src="../../js/api.js"></script>
    <!-- Backend Axios API -->

    <!-- Multiple Select option -->
    <script src="../../vendors/select2/select2.min.js"></script>
    <script src="../../js/select2.js"></script>
    <!-- Multiple Select option -->

    <script>		
        let isEditForm;		
        let formId
        $(async() => {
            $("#header").load("../../header.html");
            $("#formBuilderMenu").load("../FormBuilder/formBuilderMenu.html");
            $("#footer").load("../../footer.html");
            
            if(fieldValidation){
                clearexisting(fieldValidation);
            }
            getStateDropdown();
            getDistrictDropdown();

            const depDropdownDataset = ${JSON.stringify(depDropdownDataset)};
            for(let fieldId in depDropdownDataset) {
                addDependantDropdownListeners(depDropdownDataset[fieldId]);
            }

            const urlParams = new URLSearchParams(window.location.search);
            isEditForm = urlParams.get('editForm') === 'true';
            formId = urlParams.get('id');
            userID = decoded.userId;
            if (isEditForm && formId) {
                await ActivateEditForm();
            }else{
                loader.hide();
            }
        });

        let FormRefID = null;
        document.addEventListener("DOMContentLoaded", () => {
            const h5Element = document.getElementById("FormRefID");
            if (h5Element) {
                FormRefID = h5Element.innerText;
                // console.log("H5 value on page load:", FormRefID);
                window.h5PageLoadValue = FormRefID;
            } else {
                console.log("H5 element with id 'FormRefID' not found.");
            }
        });

        async function waitForOptionsAndSelect(inputElement, valuesArray, retries = 10) {
                    
            const allOptions = Array.from(inputElement.options).map(opt => opt.textContent.trim());
            const allValues = Array.from(inputElement.options).map(opt => opt.value.trim());
            const allFound = valuesArray.every(val => allOptions.includes(val) || allValues.includes(val));
            
            if (allFound || retries === 0) {
                for (const option of inputElement.options) {
                    const val = option.value.trim();
                    const text = option.textContent.trim();
                    
                    option.selected = valuesArray.includes(val) || valuesArray.includes(text);
                }

            
                $(inputElement).trigger('change');
                console.log(\`\Selection applied for: #\${inputElement.id}\`, valuesArray);
            } else {
                
                setTimeout(() => {
                    waitForOptionsAndSelect(inputElement, valuesArray, retries - 1);
                }, 300);
            }
        }

        let alreadyChanged = false;
        const loader = $('#loader').loadingIndicator();
        async function ActivateEditForm() {
            loader.show();
            const urlParams = new URLSearchParams(window.location.search);
            const formId = urlParams.get('id');

            const pathParts = window.location.pathname.split('/');
            const currentPageWithExtension = pathParts[pathParts.length - 1];
            const currentPage = currentPageWithExtension.replace('.html', '');

            // console.log("Current Page:", currentPage);

            const response = await api.getUserEditFormData(userID, currentPage);
            loader.hide();

            if (response.status === 200) {
                const rawData = response.data;
                const data = Array.isArray(rawData) ? rawData[0] : rawData;

                // console.log("Final Data to Populate:", data);

                const form = document.querySelector('#dynamicForm');
                if (!form) {
                    console.error(" #dynamicForm not found in the DOM.");
                    return;
                }

                const ignoredFields = ['filled_by', 'id', 'organisation', 'submitted_on', 'uid'];

                for (const key in data) {
                    if (!ignoredFields.includes(key)) {
                        const value = data[key];
                        const inputElement = form.querySelector(\`\\\#\${key}\`);

                        if (inputElement) {
                            const tag = inputElement.tagName.toLowerCase();
                            const type = inputElement.type?.toLowerCase();

                            if (tag === 'input') {
                                if (['text', 'number', 'email', 'tel', 'password'].includes(type)) {
                                    inputElement.value = value;
                                } else if (type === 'file') {
                                    const smallTag = inputElement.closest('.form-group, .input-row')?.querySelector('small');

                                    const existingInfo = document.querySelector(\`\\\#\${key}_info\`);
                                    if (existingInfo) {
                                        existingInfo.remove();
                                    }

                                    if (smallTag) {
                                        
                                        const br = document.createElement('br');
                                        const infoSpan = document.createElement('span');
                                        infoSpan.id = \`\${key}_info\`; 
                                        // console.log("key",key);
                                        infoSpan.classList.add('form-text', 'text-success');
                                        infoSpan.textContent = typeof value === 'string' && value.trim() !== ''
                                            ? \`\Selected file: \${value}\`
                                            : 'No file selected';

                                        smallTag.insertAdjacentElement('afterend', br);
                                        br.insertAdjacentElement('afterend', infoSpan);
                                    }
                                }else if (type === 'date') {
                                    let dateValue = String(value).trim();
                                    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                                        const parsed = new Date(dateValue);
                                        if (!isNaN(parsed)) {
                                            const yyyy = parsed.getFullYear();
                                            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                                            const dd = String(parsed.getDate()).padStart(2, '0');
                                            dateValue = \`\${yyyy}-\${mm}-\${dd}\`;
                                        }
                                    }
                                    inputElement.value = dateValue;
                                }
                            } else if (tag === 'textarea') {
                                inputElement.value = value;
                            } else if (tag === 'select') {
                                const valuesArray = Array.isArray(value)
                                    ? value.map(v => v.trim())
                                    : String(value).split(',').map(v => v.trim());

                                if (inputElement.multiple) {
                                    // console.log(\`\Processing multi-select dropdown: #\${inputElement.id}\`);
                                    await waitForOptionsAndSelect(inputElement, valuesArray);

                                    // Ensure options are selected
                                    for (const option of inputElement.options) {
                                        const optVal = option.value.trim();
                                        const optText = option.textContent.trim();
                                        option.selected = valuesArray.includes(optVal) || valuesArray.includes(optText);
                                    }

                                    // Prevent recursive onchange triggering
                                    document.getElementById(\`\${key}\`).onchange = function () {
                                        if (!alreadyChanged) {
                                            alreadyChanged = true;
                                            console.log("Change event triggered once!");
                                        } else {
                                            console.log("This event will not trigger again.");
                                        }
                                    };
                                } else {
                                    console.log(\`\Processing single-select dropdown: #\${inputElement.id}\`);
                                    await waitForOptionsAndSelect(inputElement, [value]);

                                    setTimeout(() => {
                                        inputElement.value = value;
                                        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                                    }, 300);
                                }

                                // console.log(\`\Populated \${key}:\`, value);
                            }
                            // console.log(\`\Populated \${key}:\`, value);
                        } else {
                            const allLabels = form.querySelectorAll('label');
                            let matched = false;

                            for (const label of allLabels) {
                                const clone = label.cloneNode(true);
                                clone.querySelectorAll('span, i, b, strong').forEach(el => el.remove());

                                const cleanLabelText = clone.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
                                const normalizedKey = key.toLowerCase().replace(/_/g, ' ');

                                if (cleanLabelText.includes(normalizedKey)) {
                                    const formGroup = label.closest('.input-row, .form-group, .form-row');
                                    if (formGroup) {
                                        // Handle radio buttons
                                        const radioInputs = formGroup.querySelectorAll('input[type="radio"]');
                                        const checkboxInputs = formGroup.querySelectorAll('input[type="checkbox"]');
                                        const valueText = String(value).trim().toLowerCase();

                                        if (radioInputs.length > 0) {
                                            for (const radio of radioInputs) {
                                                const radioId = radio.id;
                                                const radioLabel = formGroup.querySelector(\`\label[for="\${radioId}"]\`);
                                                if (radioLabel) {
                                                    const labelText = radioLabel.textContent.trim().toLowerCase();
                                                    if (labelText === valueText) {
                                                        radio.checked = true;
                                                        matched = true;
                                                        // console.log(\`\Radio "\${value}" selected for group "\${radio.name}"\`);
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        // Handle checkbox group
                                        if (checkboxInputs.length > 0) {
                                            const valuesArray = Array.isArray(value)
                                                ? value.map(v => String(v).trim().toLowerCase())
                                                : String(value).split(',').map(v => v.trim().toLowerCase());

                                            for (const checkbox of checkboxInputs) {
                                                const checkboxId = checkbox.id;
                                                const checkboxLabel = formGroup.querySelector(\`\label[for="\${checkboxId}"]\`);
                                                if (checkboxLabel) {
                                                    const labelText = checkboxLabel.textContent.trim().toLowerCase();
                                                    checkbox.checked = valuesArray.includes(labelText);
                                                }
                                            }
                                            matched = true;
                                            // console.log(\`\Checkbox(es) selected for group "\${key}"\`);
                                        }
                                    }
                                    break;
                                }
                            }

                            if (!matched) {
                                console.warn(\`\No input element or matching label found for key: \${key} and value: \${value}\`);
                            }
                        }
                    }
                }
            } else {
                triggerAlert("No data available in Form", 'error');
            }
        }

        document.addEventListener('click', function (event) {
            if (event.target.matches('[id^=togglePassword_]')) {
                const togglePassword = event.target;

                const password = togglePassword.closest('.input-group').querySelector('input');

                const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
                password.setAttribute('type', type);

                if (togglePassword.classList.contains('mdi-eye')) {
                    togglePassword.classList.remove('mdi-eye');
                    togglePassword.classList.add('mdi-eye-off');
                } else {
                    togglePassword.classList.remove('mdi-eye-off');
                    togglePassword.classList.add('mdi-eye');
                }
            }
        });

    ${addeventlistener}

    
        let fieldValidation = ${JSON.stringify(formvalidationfields)}


        function clearexisting(fieldValidation) {
            // console.log(fieldValidation);
            for (let field of fieldValidation) {
                if (field.depdropdownOptions && field.depdropdownOptions.length > 0) {
                    const depinputLabel_ID = field.depinputLabel.replace(/\\s+/g, '_') ? field.depinputLabel.replace(/\\s+/g, '_') : '';

                    let subSelectId = \`\${depinputLabel_ID}\`;
                    // console.log(subSelectId, "subSelectId");

                    let subSelect = document.getElementById(subSelectId);
                    if (subSelect) {
                        
                        subSelect.innerHTML = '';
                        let defaultOption = document.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = '-- Select Main --';
                        defaultOption.disabled = true;
                        defaultOption.selected = true;

                        subSelect.appendChild(defaultOption);
                        // console.log(\`Cleared options for \${subSelectId} and added default option.\`);
                    } else {
                        console.warn(\`Dependent dropdown with ID \${subSelectId} not found.\`);
                    }
                }
            }
        }

        const organisationID = decoded.organisationId;
        userRole = decoded.roleId;
        let userID = decoded.userId;

        async function addData(){
            let dynaData = [];
            const formData = new FormData();
            const fileMapping = {};
            let hasFiles = false;

            for (let field of fieldValidation) {

                const fieldId = field.inputLabel; 
                const name = field.formId;
                const inputid = field.inputid;
                const fieldValueElement = document.getElementById(inputid);
                const fieldName = fieldId.replace(/\s+/g, '_').toLowerCase();

                const checkedValues = [];
                let fieldValue;
                let isdependantid;
                let isdependantValue;

                if (field.inputType === 'number') {
                    fieldValue = fieldValueElement ? fieldValueElement.value : null;

                    if (field.isRequired === 1 && !fieldValue) {
                        return triggerAlert(\`\${fieldId} requires a selection.\`, 'error');
                    }
                    
                    if (fieldValue < 0) {
                        return triggerAlert(\`\${fieldId} - please provide positive number.\`, 'error');
                    }
                }
                else if (field.inputType === 'checkbox') {
                    field.checkboxNames.forEach((checkboxName, index) => {
                        const checkboxElement = document.getElementById(\`\${inputid}_\${index}\`);
                        if (checkboxElement && checkboxElement.checked) {
                            checkedValues.push(checkboxName);
                        }
                    });
                    fieldValue = checkedValues.join(', '); 
                }else if (field.inputType === 'radio') {
                    const checkedRadio = document.querySelector(\`input[name="\${inputid}"]:checked\`);
                
                    if (checkedRadio) {
                        const labelElement = document.querySelector(\`label[for="\${checkedRadio.id}"]\`);
                        if (labelElement) {
                            fieldValue = labelElement.innerText; 
                        }
                    }
                
                    if (field.isRequired === 1 && !fieldValue) {
                        return triggerAlert(\`\${fieldId} requires a selection.\`, 'error');
                    } 
                }else if (field.inputType === 'email') {
                    fieldValue = fieldValueElement ? fieldValueElement.value : null;
                    const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\\.)+(?:ac\\.in|gov\\.in|com|org|edu|net|mil|biz|info|mobi|[a-zA-Z]{2,})$/;

                    if (field.isRequired === 1 && (!fieldValue || !emailRegex.test(fieldValue))) {
                        return triggerAlert(\`\${fieldId} must be a valid email address.\`, 'error');
                    }
                }else if (field.inputType === 'tel') {
                    fieldValue = fieldValueElement ? fieldValueElement.value : null;
                    const phoneRegex = /^[6-9]\\d{9}$/;
                    if (!fieldValue || !phoneRegex.test(fieldValue)) {
                        return triggerAlert(\`\${fieldId} must be a valid 10-digit phone number.\`, 'error');
                    }
                }else if (field.inputType === 'multiple-select') {
                    const selectedNames = Array.from(fieldValueElement.options)
                        .filter(option => option.selected)
                        .map(option => option.getAttribute('data-name') || option.textContent); 

                    fieldValue = selectedNames.join(', '); 
                }else if (field.inputType === 'state') {
                    const selectedNames = Array.from(fieldValueElement.options)
                        .filter(option => option.selected)
                        .map(option => option.getAttribute('data-name') || option.textContent); 

                    fieldValue = selectedNames.join(', ');
                }else if (field.inputType === 'MP-Constituency') {
                    const selectedNames = Array.from(fieldValueElement.options)
                        .filter(option => option.selected)
                        .map(option => option.getAttribute('data-name') || option.textContent); 

                    fieldValue = selectedNames.join(', ');
                }else if (field.inputType === 'district') {
                    const selectedNames = Array.from(fieldValueElement.selectedOptions)
                            .map(option => option.getAttribute('data-name') || option.textContent);
                    fieldValue = selectedNames.join(', ');
                    // console.log("Selected values:", fieldValue);
                }else if (field.inputType === 'dropdown') {
                    fieldValue = fieldValueElement ? fieldValueElement.value : null;
                    if (field.isRequired === 1 && (!fieldValue || fieldValue.trim() === '' || fieldValue.trim().toLowerCase() === 'null')) {
                        return triggerAlert(\`\${fieldId} is required.\`, 'error');
                    }

                    if(field.isdependantLabel && 
                        Object.keys(field.isdependantLabel).length > 0 && 
                        Object.values(field.isdependantLabel).every(
                            (item) => item.dependants && item.dependants.length > 0 
                        )
                    ){
                        const depinputLabel_ID = field.depinputLabel.replace(/\\s+/g, '_') ? field.depinputLabel.replace(/\\s+/g, '_') : '';
                        isdependantid = \`\${depinputLabel_ID}\`;
                        isdependantValue = $(\`#\${isdependantid}\`).val(); 
                        if (!isdependantValue && field.isRequired === 1) {
                            return triggerAlert(\`Please select \${field.depinputLabel} option\`, 'error');
                        }
                    }
                    
                }else if (field.inputType === 'file') {
                    const fileInputElement = document.getElementById(inputid); // Get the file input element by its ID
                    const uploadedFile = fileInputElement.files[0];
                    const existingFileInfoElement = document.getElementById(\`\${inputid}_info\`);

                    const fileTypeExtensionsMap = {
                        excel: ['xlsx', 'xls', 'csv'],
                        csv: ['csv'],
                        pdf: ['pdf'],
                        ppt: ['pptx', 'ppt'],
                        video: ['mp4', 'avi', 'mov'],
                        image: ['jpg', 'png', 'gif'],
                        word: ['doc', 'docx'] 
                    };

                    if (isEditForm) {
                        if (existingFileInfoElement) {
                            existingFileInfoElement.remove(); // Optionally remove the visual info before reprocessing
                        }

                        const smallText = $(fileInputElement).closest('.input-row').find('small').text().trim();

                        const fileTypeRegex = /Allowed File Type\s*:\s*([a-zA-Z, ]+)\s*and/i;
                        const fileSizeRegex = /Max File Size\s*:\s*(\d+)\s*MB/i;

                        const fileTypeMatch = smallText.match(fileTypeRegex);
                        const allowedTypes = fileTypeMatch && fileTypeMatch[1]
                            ? fileTypeMatch[1].split(',').map(type => type.trim().toLowerCase())
                            : [];

                        const mappedExtensions = allowedTypes.flatMap(type => fileTypeExtensionsMap[type] || []);
                        const fileSizeMatch = smallText.match(fileSizeRegex);
                        const maxSizeMB = fileSizeMatch && fileSizeMatch[1]
                            ? parseInt(fileSizeMatch[1], 10)
                            : null;

                        if (uploadedFile) {
                            hasFiles = true;

                            const fileName = uploadedFile.name;
                            const fileExtension = fileName.split('.').pop().toLowerCase();
                            const fileSizeInMB = uploadedFile.size / (1024 * 1024);

                            if (allowedTypes.length > 0 && !mappedExtensions.includes(fileExtension)) {
                                return triggerAlert(
                                    \`\${fieldId} accepts only the following file types: \${allowedTypes.join(", ")}\`,
                                    'error'
                                );
                            }

                            if (maxSizeMB && fileSizeInMB > maxSizeMB) {
                                return triggerAlert(
                                    \`\${fieldId} exceeds the maximum file size of \${maxSizeMB}MB. Uploaded file size: \${fileSizeInMB.toFixed(2)}MB\`,
                                    'error'
                                );
                            }

                            fieldValue = {
                                fileName: uploadedFile.name,
                                fileSize: fileSizeInMB.toFixed(2),
                                fileType: uploadedFile.type,
                                file: uploadedFile
                            };

                            formData.append("files[]", uploadedFile);
                            fileMapping[inputid] = fileName;
                        } else{
                            const fileText = existingFileInfoElement.textContent || ""; 
                            const match = fileText.match(/Selected file:\\s*(.+)$/) 

                            const extractedFileName = match ? match[1].trim() : null;
                            if (extractedFileName) {
                                fieldValue = extractedFileName;

                                // No new file uploaded
                                if (!extractedFileName && field.isRequired === 1) {
                                    return triggerAlert(\`\${fieldId} is required. Please upload a file.\`, 'error');
                                }

                                existingFileInfoElement.remove(); 
                            }
                        }
                    }  else{
                        
                        // Check if the file input element exists
                        if (fileInputElement && fileInputElement.files.length > 0) {
                            if (fileInputElement && fileInputElement.files.length > 0 ) {
                                hasFiles = true;
                            }
                            // Find the closest '.input-row' and get the 'small' tag text
                            const smallText = $(fileInputElement).closest('.input-row').find('small').text().trim();

                            // Logging the small tag text to see its content
                            // console.log("Small tag text: " + smallText);

                            // Extracting the allowed file types using regex (e.g., 'pdf')
                            const fileTypeRegex = /Allowed File Type\s*:\s*([a-zA-Z, ]+)\s*and/i;
                            const fileTypeMatch = smallText.match(fileTypeRegex);
                            const allowedTypes = fileTypeMatch && fileTypeMatch[1] 
                                ? fileTypeMatch[1].split(',').map(type => type.trim().toLowerCase()) 
                                : []; // Default to an empty array if no match is found
                            const mappedExtensions = allowedTypes.flatMap(type => fileTypeExtensionsMap[type] || []);

                            // Extracting the maximum file size using regex (e.g., '3MB')
                            const fileSizeRegex = /Max File Size\s*:\s*(\d+)\s*MB/i;
                            const fileSizeMatch = smallText.match(fileSizeRegex);
                            const maxSizeMB = fileSizeMatch && fileSizeMatch[1] 
                                ? parseInt(fileSizeMatch[1], 10) 
                                : null;

                            // Logging the results
                            // console.log("Allowed File Types: " + allowedTypes.join(", "));
                            // console.log("Max File Size: " + (maxSizeMB ? maxSizeMB + "MB" : "not specified"));

                            // console.log("uploadedFile",uploadedFile);
                            if (uploadedFile) {
                                const fileName = uploadedFile.name;
                                const fileExtension = fileName.split('.').pop().toLowerCase();
                                const fileSizeInMB = uploadedFile.size / (1024 * 1024);

                                // Validate file type
                                if (allowedTypes.length > 0 && !mappedExtensions.includes(fileExtension)) {
                                    return triggerAlert(
                                        \`\${fieldId} accepts only the following file types: \${allowedTypes.join(", ")}\`,
                                        'error'
                                    );
                                }

                                // Validate file size
                                if (maxSizeMB && fileSizeInMB > maxSizeMB) {
                                    return triggerAlert(
                                        \`\${fieldId} exceeds the maximum file size of \${maxSizeMB}MB. Uploaded file size: \${fileSizeInMB.toFixed(2)}MB\`,
                                        'error'
                                    );
                                }

                                fieldValue = {
                                    fileName: uploadedFile.name,
                                    fileSize: fileSizeInMB.toFixed(2),
                                    fileType: uploadedFile.type,
                                    file: uploadedFile, 
                                };  

                                formData.append("files[]", uploadedFile);
                                fileMapping[inputid] = fileName;

                                // console.log(fieldValue)
                                
                            } 
                        }

                        if (!uploadedFile && field.isRequired === 1) {
                            return triggerAlert(\`\${fieldId} is required. Please upload a file.\`, 'error');
                        }
                    }
                    
                }
                else {
                    fieldValue = fieldValueElement ? fieldValueElement.value : null;
                }
            
                if(field.inputType === 'file'){

                }else{
                    if (field.inputType !== 'checkbox' && field.isRequired === 1 && (!fieldValue || fieldValue.trim() === '' || fieldValue.trim().toLowerCase() === 'null')) {
                        return triggerAlert(\`\${fieldId} is required.\`, 'error');
                    } 
                    if (field.inputType === 'checkbox' && field.isRequired === 1 && checkedValues.length === 0) {
                        return triggerAlert(\`\${fieldId} requires at least one checkbox to be selected.\`, 'error');
                    } 
                }
                
                const dataItem = {
                    name: name,
                    id: fieldId,
                    inputId: inputid,
                    value: fieldValue,
                    userID : userID,
                    FormRefID : FormRefID,
                };
        
                if (isdependantid) {
                    dataItem.subId = isdependantid;
                    dataItem.subValue = isdependantValue;
                }
        
                dynaData.push(dataItem);
            }

            const data = { organisationId: organisationID, data: dynaData };

            try {
                let response;
                if (isEditForm && formId) {
                    response = await api.editFormBuilderData(data);
                }else{
                    response = await api.createFormBuilderData(data);
                }
                if (response.status == 200) {
                    triggerAlert("Data Added Successfully", 'success');
                    formData.append("uid", response.data.uid);
                    formData.append("fileMapping", JSON.stringify(fileMapping));
                    if (hasFiles) {
                        const uploadResponse = await api.uploadFormDocument(formData);

                        if (uploadResponse.status === 200) {
                            $('#submitForm').attr('disabled', 'disabled');
                            setTimeout(() => {
                                window.location.href = "../FormBuilder/getForms.html";
                            }, 1500);
                            triggerAlert("Form uploaded successfully", 'success');
                        } else {
                            triggerAlert("Error uploading form", 'error');
                        }
                    } else {
                        console.log("No files to upload. Skipping the file upload API.");
                    }
                    // console.log("Form Submitted");
                    $('#submitForm').attr('disabled', 'disabled');
                    setTimeout(() => {
                        window.location.href = "../FormBuilder/getForms.html";
                    }, 1500);
                }
            }catch(error){
                console.log("error",error);
                formData = new FormData();
                $('#submitForm').removeAttr('disabled');
                triggerAlert("please refresh the page or try again later", 'error');
            }
        }

        //  -------------------------------------------- Get Dropdown Value  ---------------------------------------------
		// State Dropdown
		async function getStateDropdown() {
            const response = await api.getDropDownData("mmt_state");
            // console.log(response);

            const rows = response.data;

            let optionValue = "";

            for (let row of rows) {
                optionValue += \`<option value="\${row.state_id}" data-name="\${row.state_name}">\${row.state_name}</option>\`;
            }

            $(".getStateValue").html(optionValue);

            $(".getStateValue").each(function () {
                const dropdown = this;

                if (dropdown.hasAttribute("onchange")) {
                    } else {
                    getDistrictDropdown();
                    console.log(\`onChangeState function is not present for dropdown with id: \${dropdown.id}. Using getDistrictDropdown to populate districts.\`);
                }
            });
        }

     	// District & MP Constituency Dropdown 
        async function onChangeState(self) {
            let states = $(self).val();
            // console.log(states);

            let selectedOptions = $(self).find(":selected");
            let selectedStates = [];

            selectedOptions.each(function () {
                selectedStates.push({
                    id: $(this).val(),              
                    name: $(this).text().trim(),     
                    dataName: $(this).data("name")  
                });
            });

            if (!states || states.length < 1) {
                $(".getDistrictValue").html("<option value='' disabled selected>--Select District--</option>");
                $(".mpConstituencyValue").html("<option value='' disabled selected>--Select MP Constituency--</option>");
                return;
            }

            const districtResponse = await api.getDropDownData("mmt_district");
            // console.log(districtResponse);
            const districtData = districtResponse.data;

            let districtOptionValue = "";

            for (let state of states) {
                for (let row of districtData) {
                    if (row.state_id == state) {
                        districtOptionValue += \`<option value="\${row.district_id}" data-name="\${row.district_name}">\${row.district_name}</option>\`;
                    }
                }
            }

            $(".getDistrictValue").html(districtOptionValue);

            const mpConstituencyResponse = await api.getDropDownData("mmt_mp_constituency");
            // console.log(mpConstituencyResponse);
            const mpConstituencyData = mpConstituencyResponse.data;

            let mpOptionValue = "";

            for (let state of states) {
                for (let row of mpConstituencyData) {
                    if (row.state_id == state) {
                        mpOptionValue += \`<option value="\${row.mpc_id}" data-name="\${row.mpc_name}">\${row.mpc_name}</option>\`;
                    }
                }
            }

            $(".mpConstituencyValue").html(mpOptionValue);
        }

        async function getDistrictDropdown(stateIds = []) {
            const response = await api.getDropDownData("mmt_district");
            const districtData = response.data;

            let optionValue = "";

            if (stateIds.length < 1) {
                for (let row of districtData) {
                    optionValue += \`<option value="\${row.district_id}">\${row.district_name}</option>\`;
                }
                
            } else {
                for (let stateId of stateIds) {
                    for (let row of districtData) {
                        if (row.state_id == stateId) {
                            optionValue += \`<option value="\${row.district_id}">\${row.district_name}</option>\`;
                        }
                    }
                }
            }

            $(".getDistrictValue").html(optionValue);
        }


        function addDependantDropdownListeners(data) {
            const { id, options } = data;
            const field = $("#"+id);

            field.off("change");
            field.on("change", function () {
                const selectedValue = $(this).val();
                const option = options.find((option) => option.value == selectedValue);
                if (!option || !option.child) return;

                const { child } = option;
                const childDropdown = $("#"+child.id);
                childDropdown.html('<option value="" disabled selected>-- Select --</option>');

                for (let childOption of child.options) {
                    childDropdown.append('<option value="' + childOption.value + '">' + childOption.value + '</option>');
                    addDependantDropdownListeners(child);
                }
            });
        }

    </script>

    </body>
</html>
    `;
}

function generateAgGridReportHtml(formName, formvalidationfields) {
    return `
<script src="../../js/jwt-decode.js"></script>
<script src="../../session.js"></script>
<script>
    isAuthorized(63);
</script>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>${formName} Report</title>

    <link rel="stylesheet" href="../../vendors/mdi/css/materialdesignicons.min.css">
    <link rel="stylesheet" href="../../vendors/base/vendor.bundle.base.css">

    <link rel="stylesheet" href="../../css/style.css">

    <link rel="stylesheet" href="../../css/alert.css">
    <link rel="stylesheet" href="../../css/jquery-confirm.min.css">
    <link rel="stylesheet" href="../../css/jquery-loader.css">
    <link rel="stylesheet" href="../../css/badge.css"/>

    <!--Datatable -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/v/bs5/jszip-2.5.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/datatables.min.css" />
    <!--Datatable -->
    
    <style>
        /* Spinner loader */
        .glyphicon.spinning {
            animation: spin 1s infinite linear;
        }
        
        @keyframes spin {
            from { transform: scale(1) rotate(0deg); }
            to { transform: scale(1) rotate(360deg); }
        }
        
        .space-between-flex {
            display: flex;
            justify-content: space-between;
        }

        .panel-body {
            padding: 15px;
        }

        .panel {
            margin-bottom: 20px;
            background-color: #fff;
            border: 1px solid transparent;
            border-radius: 4px;
        }

        .page-header {
            color: #000;
        }

        /* Datatable - Start */
        thead {
            color: white;
        }
        
        /* Datatable Table asc & desc */ 
        table.dataTable thead>tr>th.sorting:after {
            opacity: 3.5;
            color: #FFF;
        }

        table.dataTable thead>tr>th.sorting:before {
            opacity: 3.5;
            color: #FFF;
        }

        /* Datatable Table - column Stripes*/ 
        tbody td:nth-of-type(even)
            {
            background: rgb(244 244 241 / 50%);
        }

        .table > :not(caption) > * > * {
            padding: 0.9rem 0.9rem;
            background-color: var(--bs-table-bg);
            border-bottom-width: 1px;
            box-shadow: inset 0 0 0 9999px var(--bs-table-accent-bg);
            font-size: 17px;
        }

        .filterPanel
        {
            border: 1px solid #ee0f0f;
            padding: 1rem;
        }

        /* AG GRID */
        .ag-header-row {
            background-color: #bc3d5ceb;
            font-weight: 600;
            font-size: 1rem;
            text-align: center;
        }
        .ag-header-cell .ag-header-cell-text {
            color: #ffffff;
            font-weight: bold;
            text-align: center;
        }
        .ag-header-group-text{
            color: #fff;
            font-weight: bold;
            text-align: center;
        }
        .ag-cell{
            text-align: center;
        }
        .ag-header-group-cell{
            text-align: center;
        }
        .ag-cell-value{
            text-align: center;
        }
        .ag-header-cell-label {
            justify-content: center;
        }
        .ag-icon-menu {
            color: white !important;
        }
        .headercenter{
            justify-content: center;
            text-align: center;
        }
        .ag-cell:nth-of-type(even) {
            background:  rgb(244 244 241 / 50%);
        }
        .ag-row:nth-child(odd) {
            background-color:  rgb(244 244 241 / 50%);
        }
        .cell-span {
            background-color: #c4cdf2;
        }
        .parent-header {
            text-align: center; 
            justify-content: center;
        }
    </style>

</head>

<body>
    <div id="loader"></div>
    <div class="container-scroller">
        <div class="horizontal-menu">
            <div id="header"></div>
            <div id="formBuilderMenu"></div>
        </div>
        <div class="main-panel">
            <div class="content-wrapper">
                <div class="row">
                    <div class="col-md-12 grid-margin stretch-card">
                        <div class="card">
                            <div class="card-body">							
                                <div class="row">
                                    <div class="col-lg-12">
                                        <div class="panel-body">

                                            <div style="display: flex; justify-content: space-around; font-weight: bold; margin-bottom: 1rem;">
                                                <div>
                                                    <center><h2 style="color: #000; font-weight: 700;">${formName} Report</h2></center>
                                                    <h2 style="color: #000; font-weight: 700;"></h2>
                                                </div>                                              
                                            </div>
                                        
                                            <div class="col-lg-12 mb-4">
                                                <div class="row">
                                                    <div class="col-lg-6">
                                                        <button onclick="onBtExport()" class="btn btn-info float-right me-3" style="margin-bottom: 10px;">
                                                            Export to Excel
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div class="grid-wrapper">
                                                    <div id="gridDiv" style="height: 650px;width: 100%;" class="ag-theme-quartz">
                                                    </div>
                                                </div>
                                            </div>
        
                                        </div>

                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="footer">
            <div id="footer"></div>
        </footer>
    </div>

    <script src="../../vendors/base/vendor.bundle.base.js"></script>
    <script src="../../js/template.js"></script>

    <script src="../../js/alert.js"></script>
    <script src="../../js/jquery-confirm.min.js"></script>
    <script src="../../js/jquery-loader.js"></script> 

    <!--DataTable -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.36/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/v/bs5/jszip-2.5.0/dt-1.12.1/b-2.2.3/b-colvis-2.2.3/b-html5-2.2.3/b-print-2.2.3/datatables.min.js"></script>
    <!--DataTable -->

    <!--AG GRID-->
    <script>var __basePath = './';</script>
    <script src="../../js/agGrid.js"></script>

    <!-- Moment added for as on date format -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.26.0/moment.min.js"> </script>
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/momenttimezone/0.5.31/moment-timezone-with-data-2012-2022.min.js"></script> -->

    <!-- Backend Axios API -->
    <script src="https://unpkg.com/axios@1.1.2/dist/axios.min.js"></script>
    <script src="../../js/api.js"></script>
    <!-- Backend Axios API -->

    <script>
        $(async() => {
            $("#header").load("../../header.html");
            $("#formBuilderMenu").load("../FormBuilder/formBuilderMenu.html");
            $("#footer").load("../../footer.html");

            getData();
        });

        function isValidDate(date) {
            const parsedDate = Date.parse(date);
            return !isNaN(parsedDate);  // Returns true if it's a valid date
        }

        // Function to format date to 'YYYY-MM-DD' (without time)
        function formatDateToISO(date) {
            const parsedDate = new Date(date);
            return parsedDate.toISOString().split('T')[0];  // Returns only the date part
        }

        let fieldValidation = ${JSON.stringify(formvalidationfields)}
        let checkboxCSVF = [];
        for (let field of fieldValidation) {
            if (field.checkboxNames && field.checkboxNames.length > 0) {
                // console.log(field.inputLabel);
                // console.log(field.inputid.toLowerCase());
                // Convert inputid and checkboxNames to lowercase and push to the array
                checkboxCSVF.push({
                    inputid: field.inputid.toLowerCase(),
                    checkboxes: field.checkboxNames.map(name => name.toLowerCase())
                });
            }
        }

        const organisationID = decoded.organisationId;
        userRole = decoded.roleId;
        userID = decoded.userId;

        let gridApi;
        async function getData(){
            try {
                const createdFormResponse = await api.getCreatedFormData();
                const createdId = createdFormResponse?.data;
                const createdByList = [...new Set(createdId.rowData.map(row => row.created_by))];

                let formTitle = fieldValidation[0].formTitle;
                let formatted = /^[a-zA-Z]+$/.test(formTitle)
                    ? formTitle.charAt(0).toUpperCase() + formTitle.slice(1)
                    : formTitle
                        .replace(/[_\\s]+/g, ' ')
                        .trim()
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join('');
                const data = \`tbl_formB_\${formatted}\`;

                const response = await api.getFormBuilderReport(data);
                let { columnDefs, rowData,} = response.data;

                function hasComma(value) {
                    return value.indexOf(',') !== -1;
                }

                const organisationResponse = await api.getDropDownData("mmt_organisation");
                //console.log(organisationResponse);
                const organisationData = organisationResponse.data; 

                const organisationMap = new Map();
                organisationData.forEach(org => {
                    organisationMap.set(org.organisation_id, org.organisation_name);
                });

                if (rowData && rowData.length > 0) {
                    if (![2, 3, 4, 5].includes(userRole)) {
                        rowData = rowData.filter(row => parseInt(row.organisation, 10) === organisationID);
                    }else{
                        if (!createdByList.includes(userID)) {
                            rowData = rowData.filter(row => row.filled_by === userID);
                        }
                    }

                    rowData.forEach(row => {
                        if (row.organisation) {
                            const organisationId = parseInt(row.organisation, 10); 
                            row.organisation_name = organisationMap.get(organisationId) || 'Unknown';
                            row.organisation = row.organisation_name;  
                        }

                        for (let key in row) {
                            if (row.hasOwnProperty(key)) {
                                const value = row[key];
                                
                                if (key === 'organisation') {
                                    continue;
                                }

                                if (typeof value === 'string' && !hasComma(value)) {
                                    const regex = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?(Z|[+-]\\d{2}:\\d{2})?$/;
                                    if (regex.test(value)) {
                                        const date = new Date(value);
                                        if (!isNaN(date.getTime())) {
                                            row[key] = date.toISOString().split('T')[0]; 
                                        }
                                    }
                                }
                            }
                        }
                    });
                }

                let serialNumberColDef = {
                    headerName: 'S.No',
                    headerClass : "headerGroup",
                    valueGetter: function(params) {
                        // Return blank if name is 'Total', otherwise return the row number
                        return params.data.name === 'Total' ? '' : params.node.rowIndex + 1;
                    },
                    cellStyle: function(params) {
                        // Return bold style for 'Total' row
                        return params.data.name === 'Total' ? { fontWeight: 'bold' } : {};
                    },
                    maxWidth: 120, 
                    pinned: 'left',
                    resizable: false
                };

                if(columnDefs){
                    columnDefs = [serialNumberColDef, ...columnDefs];
                    
                    checkboxCSVF.forEach(checkbox => {
                        const parentColumn = columnDefs.find(colDef => colDef.field === checkbox.inputid);

                        if (parentColumn) {
                            parentColumn.headerClass = 'parent-header';
                            parentColumn.children = checkbox.checkboxes.map(name => ({
                                headerName: name.charAt(0).toUpperCase() + name.slice(1), 
                                field: name,
                                valueGetter: params => {
                                    const values = params.data[checkbox.inputid];
                                    if (values) {
                                        const splitValues = values.split(',')
                                            .map(value => value.trim().replace(/\s+/g, '').toLowerCase()); 
                                        
                                        const normalizedName = name.trim().replace(/\s+/g, '').toLowerCase(); 

                                        const match = splitValues.includes(normalizedName);
                                        
                                        if (!match) {
                                            console.log(\`Mismatch: '\${normalizedName}' not found in \${splitValues}\`);
                                        }

                                        return match ? name : null; 
                                    }
                                    return null;
                                }
                            }));
                        }
                    });

                    columnDefs.forEach((columnDef) => {
                        // console.log(columnDef);
                        if (columnDef.field) {
                            // console.log(columnDef.field);
                        } 
                        else {
                            columnDef.width = 250; 
                        }

                        if (columnDef.children) {
                            columnDef.children.forEach(childColumn=> {
                                // console.log(columnDef.children);
                            });
                        }

                        if (![2, 3, 4, 5].includes(userRole)) {
                            if (columnDef.field === 'organisation') {
                                columnDef.hide = true; 
                                columnDef.suppressColumnsToolPanel = true; 
                                columnDef.suppressFiltersToolPanel = true; 
                            }
                        }

                        if (columnDef.headerName === 'Filled_by' || columnDef.headerName === 'Submitted_on') {
                            columnDef.hide = true; 
                            columnDef.suppressColumnsToolPanel = true; 
                            columnDef.suppressFiltersToolPanel = true; 
                        }

                        if (columnDef.field === 'document_present') {
                            columnDef.hide = true; 
                            columnDef.suppressColumnsToolPanel = true; 
                            columnDef.suppressFiltersToolPanel = true; 
                        }

                        if (columnDef.field === 'uid') {
                            columnDef.hide = true; 
                            columnDef.suppressColumnsToolPanel = true; 
                            columnDef.suppressFiltersToolPanel = true; 
                        }

                        if (columnDef.field !== 'document_present' && columnDef.field) {
                            columnDef.cellRenderer = params => {
                                const documentValues = params.data['document_present'];

                                if (!documentValues) {
                                    // console.log("No document present for:", params.data);
                                    return params.value || ''; 
                                }

                                const documentFields = documentValues
                                    .split(',')
                                    .map(field => field.trim().toLowerCase());


                                if (documentFields.includes(columnDef.field.toLowerCase()) && params.value) {
                                    return \`<span style="color: blue; text-decoration: underline; cursor: pointer;" 
                                                onclick="downloadFormDocument('\${columnDef.field}', '\${params.data['uid']}')">
                                                \${params.value}
                                            </span>\`;
                                } else {
                                    return params.value || '';
                                }
                            };
                        }
                    });
                }

                const gridOptions = {
                    columnDefs: columnDefs,
                    rowData: rowData,
                    ...(Array.isArray(columnDefs) && columnDefs.length < 4 && {
                        autoSizeStrategy: {
                            type: "fitGridWidth",
                        }
                    }),
                    defaultColDef: {
                        sortable: true,
                        wrapText: true,
                        wrapHeaderText: true,
                        autoHeight: true,
                        filter: true,
                        headerClass:'ag-theme-quartz',
                        headerComponentParams: {
                            template:
                                '<div class="ag-cell-label-container" role="presentation">' +
                                '  <span ref="eMenu" class="ag-header-icon ag-header-cell-menu-button"></span>' +
                                '  <div ref="eLabel" class="ag-header-cell-label" role="presentation">' +
                                '    <span ref="eSortOrder" class="ag-header-icon ag-sort-order"></span>' +
                                '    <span ref="eSortAsc" class="ag-header-icon ag-sort-ascending-icon"></span>' +
                                '    <span ref="eSortDesc" class="ag-header-icon ag-sort-descending-icon"></span>' +
                                '    <span ref="eSortNone" class="ag-header-icon ag-sort-none-icon"></span>' +
                                '    <span ref="eText" class="ag-header-cell-text" role="columnheader" style="white-space: normal;"></span>' +
                                '    <span ref="eFilter" class="ag-header-icon ag-filter-icon"></span>' +
                                '  </div>' +
                                '</div>',
                        },
                    }, 
                    
                    statusBar: {
                        statusPanels: [
                            { statusPanel: "agTotalRowCountComponent", align: "left" },
                            {
                                statusPanel: "agAggregationComponent",
                                statusPanelParams: { aggFuncs: ["avg", "sum"] },
                            },
                        ],
                    },
                    enableRangeSelection: true,
                    sideBar: {
                        toolPanels: [
                            { id: 'columns', labelDefault: 'Columns', iconKey: 'columns', toolPanel: 'agColumnsToolPanel' },
                            { id: 'filters', labelDefault: 'Filters', iconKey: 'filter', toolPanel: 'agFiltersToolPanel' }
                        ],
                    },
                    onSortChanged: event => {
                        gridApi.redrawRows();
                    },
                    onGridReady: function(params) {
                        gridApi = params.api;
                        gridApi.addEventListener('filterChanged', function() {
                            recalculateTotalsAndAverages(gridApi);
                            modifyColumnDefs(gridApi);
                        });

                        if (!rowData || rowData.length === 0) {
                            gridApi.showNoRowsOverlay();
                        } else {
                            gridApi.hideOverlay();
                        }
                    },
                };

                const gridDiv = document.querySelector('#gridDiv');
                new agGrid.Grid(gridDiv, gridOptions);
                gridApi = gridOptions.api;

            }catch(error){
                console.log("error",error);
                triggerAlert(error.response.data.error, 'error');
                triggerAlert("try again later", 'error');
            }
            console.log("Form Submitted");
        }

        async function downloadFormDocument(field, uid) {
            // console.log('Clicked Column Field:', field);
            // console.log('Row UID:', uid);

            try {
                const response = await api.downloadFormDocument(uid, field);
                const fileName = response.headers['content-disposition'].split('filename="')[1].split('"')[0];
                const blob = response.data; 
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.download = fileName; 
                downloadLink.click(); 
            } catch (error) {
                triggerAlert("Error downloading document:", error, 'error');
                console.error('Error downloading document:', error);
            }
        }

        function onBtExport() {
            var currentDateWithHour = moment().format('DD-MM-YYYY HH:mm:ss');

            const params = {
                fileName: \`${formName}_\${currentDateWithHour}.xlsx\`,
                processCellCallback: function(params) {
                    if (typeof params.value === 'string') {
                        // Replace multiple spaces with a single space and trim leading/trailing spaces
                        return params.value.replace(/\s+/g, ' ').trim();
                    }
                    return params.value;
                }
            };

            gridApi.exportDataAsExcel(params);
        }

    </script>

    </body>
</html>
    `;
}

async function modifyFormBuilderInputForm(req, res) {
    const conn = await pool;

    const formName = req.body.formattedFormId || 'FormBuilderInput';
    const prevValue = req.body.prevValue;
    const formFields = req.body.formFields;
    const removedFieldsList = req.body.removedFieldsList;
    const newContent = req.body.content;
    const mmtVal = req.body.mmtVal;
    const depDropdownDataset = req.body.depDropdownDataset;

    // console.log("formName", formName);
    // console.log("prevValue", prevValue);
    // console.log("formFields", formFields);
    // console.log("removedFieldsList", removedFieldsList);
    // console.log("depDropdownDataset", depDropdownDataset);
    
    // console.log("mmtVal", mmtVal);

    if (!mmtVal) {
        return res.status(400).json({
            message: "Please make any changes"
        });
    }

    try {
        const tableName = `tbl_formB_${formName
            .replace(/[_\s]+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')}`;
          
        if  ((Array.isArray(mmtVal.mmtOrganisation) && mmtVal.mmtOrganisation.length > 0) ||
             (Array.isArray(mmtVal.mmtWing) && mmtVal.mmtWing.length > 0) || 
             mmtVal
            ) 
        {
            const organisationString = mmtVal.mmtOrganisation ? mmtVal.mmtOrganisation.join(',') : '';
            const wingString = mmtVal.mmtWing ? mmtVal.mmtWing.join(',') : '';

            const tableQuery = `
                UPDATE mmt_form_builder
                SET 
                    form_Description = @mmtDescription,
                    Last_Date_Of_Submission = @mmtDueDate,
                    organisation = @mmtOrganisation,
                    wing = @mmtWing
                WHERE TRIM(Input_Form) = TRIM(@mmtTitle);
            `;

            const tableResult = await conn.request()
                .input('mmtTitle', mmtVal.mmtTitle)
                .input('mmtDescription', mmtVal.mmtDescription)
                .input('mmtDueDate', mmtVal.mmtDueDate)
                .input('mmtOrganisation', organisationString)
                .input('mmtWing', wingString)
                .query(tableQuery);

            console.log(`
                UPDATE mmt_form_builder
                SET 
                    form_Description = '${mmtVal.mmtDescription}',
                    Last_Date_Of_Submission = '${mmtVal.mmtDueDate}',
                    organisation = '${organisationString}',
                    wing = '${wingString}'
                WHERE TRIM(Input_Form) = TRIM('${mmtVal.mmtTitle}');
            `);

            console.log("mmt_form_builder table data:", tableResult.recordset);
        } else {
            console.log("Skipping table update as mmtOrganisation is not a valid array or is empty.");
        }

        const schemaQuery = `
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName;
        `;

        const schemaResult = await conn.request()
            .input('tableName', tableName)
            .query(schemaQuery);

        const tableSchema = schemaResult.recordset.map(col => col.COLUMN_NAME.toLowerCase());

        for (const field of prevValue) {
            if (!field.labelid) continue;

            const fieldName = (field.newChanges?.labelid || field.labelid)
                .replace(/\s+/g, '_')
                .toLowerCase();
            const oldFieldName = field.labelid.replace(/\s+/g, '_').toLowerCase();

            if (field.newChanges?.labelid && tableSchema.includes(oldFieldName)) {
                if (tableSchema.includes(fieldName)) {
                    console.warn(`The new column name '${fieldName}' already exists. Skipping rename.`);
                } else {
                    const renameQuery = `
                        EXEC sp_rename '${tableName}.${oldFieldName}', '${fieldName}', 'COLUMN';
                    `;
                    await conn.query(renameQuery);
                }
            } else if (!tableSchema.includes(fieldName)) {
                
                if (!tableSchema.includes(fieldName.toLowerCase())) {
                    const addQuery = `
                        ALTER TABLE ${tableName}
                        ADD [${fieldName}] NVARCHAR(MAX) NULL;
                    `;
                    await conn.query(addQuery);
                    // console.log(`Added new column: ${fieldName}`);
                    tableSchema.push(fieldName.toLowerCase()); 
                } else {
                    console.warn(`Column '${fieldName}' already exists. Skipping addition.`);
                }
            }
        }

        // Update both 
        const inputFilePath = path.join(WEB_ROOT, 'pages', 'FormBuilderInput', `${formName}.html`);
        const outputFilePath = path.join(WEB_ROOT, 'pages', 'FormBuilderOutput', `${formName}Report.html`);

        await updateFieldValidation(inputFilePath, prevValue, newContent, tableName, formFields, removedFieldsList, false, depDropdownDataset);
        await updateFieldValidation(outputFilePath, prevValue, newContent, tableName, formFields, removedFieldsList, true, depDropdownDataset);

        return res.status(200).json({
            message: "Update successful",
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            message: "Error updating content",
            error: error.message,
        });
    }
}

async function updateFieldValidation(filePath, prevValue, newContent, tableName, formFields, removedFieldsList, onetimes, depDropdownDataset) {
    try {
        const conn = await pool;

        // Read file once
        const fileData = await fs.promises.readFile(filePath, 'utf8');
        const $ = cheerio.load(fileData);

        // Update dynamic form content
        const dynamicFormDiv = $('#dynamicForm');
        if (dynamicFormDiv.length) {
            dynamicFormDiv.empty();
            // dynamicFormDiv.append(newContent);
            dynamicFormDiv.replaceWith(newContent);
        }

        // Show submit form
        const submitFormElement = $('#submitForm');
        if (submitFormElement.length) {
            submitFormElement.css('display', 'block');
        }

        // Find script containing both variables
        let targetScript = null;
        
        $('script').each((_, script) => {
            const content = $(script).html();
            // Look for a script that contains both variables or at least fieldValidation
            if (content.includes('let fieldValidation')) {
                targetScript = script;
            }
        });

        if (!targetScript) {
            console.error("No script containing fieldValidation found.");
            return;
        }

        // Get the full script content
        let scriptContent = $(targetScript).html();
        
        // Process fieldValidation
        let updatedScriptContent = scriptContent;
        let parsedFieldValidation = null;
        
        // Extract and process fieldValidation
        const fieldValidationMatch = updatedScriptContent.match(/let fieldValidation.*\n/);
        if (fieldValidationMatch) {
            const fieldValidationRaw = fieldValidationMatch[0];
            
            try {
                const arrayString = fieldValidationRaw
                    .replace(/^let fieldValidation\s*=\s*\[/, '[')
                    .replace(/\];$/, ']')
                    .trim();

                let parsedArray = eval(arrayString);
                parsedFieldValidation = parsedArray; 
                console.log("prevValue",prevValue);
                console.log("parsedFieldValidation",parsedFieldValidation);
                // Normalize label function from original code
                const normalizeLabel = (label) => {
                    if (!label || typeof label !== "string") return "";  
                    return label.trim().toLowerCase().replace(/[_\s]+/g, " "); 
                };

                // Filter and process fields as in original code
                const filteredFields = await Promise.all(
                    parsedArray.map(async (field) => {
                        let matchingPrevValue = prevValue.find(
                            (pv) => pv.labelid.toLowerCase() === field.inputid.toLowerCase()
                        );
                
                        if (field.inputType === 'dropdown' && field.depinputLabel) {
                            if (!Array.isArray(prevValue) || prevValue.length === 0) {
                                return true; // Keep the field
                            }
                        
                            const dependentRemoved = prevValue.some(pv => {
                                if (!pv.labelid) {
                                    return false;
                                }

                                const prevLabel = normalizeLabel(pv.labelid);
                                const depLabel = normalizeLabel(field.depinputLabel);

                                console.log(`result:`, { prevLabel, depLabel, isRemoved: pv.isRemoved });

                                return prevLabel === depLabel && pv.isRemoved;
                            });

                            if (dependentRemoved) {
                                return null; 
                            }
                        }                            
                
                        if (matchingPrevValue?.isRemoved) {
                            const dropDeletedColumn = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${field.inputid}'`;
                
                            try {
                                const result = await conn.query(dropDeletedColumn);
                                if (result.recordset.length > 0) {
                                    const dropSql = `ALTER TABLE ${tableName} DROP COLUMN ${field.inputid}`;
                                    await conn.query(dropSql);
                                } else {
                                    console.warn(`Column ${field.inputid} does not exist, skipping DROP COLUMN.`);
                                }
                            } catch (error) {
                                console.error(`Error checking/dropping column ${field.inputid}:`, error.message);
                            }
                
                            return null; 
                        }
                
                        return field; 
                    })
                );
                
                parsedArray = filteredFields.filter(field => field !== null);                    

                await Promise.all(
                    prevValue
                        .filter((pv) => pv.isRemoved) 
                        .map(async (pv) => {
                            const checkColumnQuery = `
                                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                                WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${pv.labelid}'
                            `;
                            
                            try {
                                const result = await conn.query(checkColumnQuery);
                                
                                if (result.recordset.length > 0) {
                                    const dropColumnQuery = `ALTER TABLE ${tableName} DROP COLUMN ${pv.labelid}`;
                                    await conn.query(dropColumnQuery);
                                } else {
                                    console.log(` Column ${pv.labelid} does not exist in schema, skipping drop.`);
                                }
                            } catch (error) {
                                console.error(` Error dropping column ${pv.labelid}:`, error.message);
                            }
                        })
                );                    

                for (const field of parsedArray) {
                    let matchingPrevValue = null;

                    if (field.inputType === 'dropdown') {
                        matchingPrevValue = prevValue.find(
                            (pv) => pv.labelid.toLowerCase() === field.inputid.toLowerCase()
                        );
    
                        if (!matchingPrevValue && field.depinputLabel) {
                            matchingPrevValue = prevValue.find(
                                (pv) => pv.labelid.toLowerCase() === field.depinputLabel.toLowerCase()
                            );
    
                            if (matchingPrevValue) {
                                const newChanges = matchingPrevValue.newChanges || {};
                                const oldDepInputLabel = field.depinputLabel;
                                field.depinputLabel = newChanges.label || matchingPrevValue.label || field.depinputLabel;
        
                                if (oldDepInputLabel !== field.depinputLabel) {
                                    updateSubSelectIdInScript(oldDepInputLabel, newChanges.labelid);
                                }
                                continue; 
                            }
                        } else {
                            if (matchingPrevValue) {
                                const newChanges = matchingPrevValue.newChanges || {};
                                const oldId = field.inputid;
                                const newId = newChanges.labelid || matchingPrevValue.labelid || field.inputid;
                        
                                field.inputLabel = newChanges.label || matchingPrevValue.label || field.inputLabel;
                                field.inputid = newId;
                                field.isRequired = newChanges.isRequired === 'yes' ? 1 : 0;
                        
                                updateEventListenersInScript(oldId, newId);
                            } else {
                                console.warn(`No matching prevValue found for inputid: ${field.inputid}`);
                            }
                        }
                    } else {
                        matchingPrevValue = prevValue.find(
                            (pv) => pv.labelid.toLowerCase() === field.inputid.toLowerCase()
                        );
                    }

                    if (matchingPrevValue) {
                        const newChanges = matchingPrevValue.newChanges || {};
                        field.inputLabel = newChanges.label || matchingPrevValue.label || field.inputLabel;
                        field.inputid = newChanges.labelid || matchingPrevValue.labelid || field.inputid;
                        field.isRequired = newChanges.isRequired === 'yes' ? 1 : 0;

                        if(field.inputType == "checkbox") {
                            field.checkboxNames = newChanges.checkboxOptions;
                        }
                        
                    } else {
                        console.warn(`No matching prevValue found for inputid: ${field.inputid}`);
                    }
                }

                // Process database operations asynchronously
                addNewFormFields(parsedArray, formFields, tableName, conn, inputTypeToSQLType, removedFieldsList, onetimes)
                    .then(() => {
                        // Success handling
                    })
                    .catch((error) => {
                        console.error("Error executing addNewFormFields:", error.message);
                    });

                // Update fieldValidation in script
                const updatedFieldValidation = `let fieldValidation = ${JSON.stringify(parsedArray)};`;
                console.log("fieldValidationMatch:", updatedFieldValidation);
                updatedScriptContent = updatedScriptContent.replace(fieldValidationMatch[0], `${updatedFieldValidation}\n \n`);
                // console.log("Updated fieldValidationScript:", fieldValidationScript);
            } catch (parseError) {
                console.error("Error parsing fieldValidation array:", parseError.message);
            }
        } else {
            console.log("fieldValidation variable not found in the expected format.");
        }

        // Process depDropdownDataset in the same script content
        const depDatasetMatch = updatedScriptContent.match(/const depDropdownDataset\s*=\s*(\{.*?\});/s);
        if (depDatasetMatch) {
            try {
                // If user provided new depDropdownDataset, use it
                if (depDropdownDataset) {
                    console.log("depDropdownDataset", depDropdownDataset);
                    const updatedDepDropdownString = `const depDropdownDataset = ${JSON.stringify(depDropdownDataset)};`;
                    updatedScriptContent = updatedScriptContent.replace(depDatasetMatch[0], updatedDepDropdownString);
                    console.log("Updated depDropdownDataset with provided data");
                } else {
                    // For testing/example - in real code, you'd use the actual input
                    // Only use this if no specific dataset was provided
                    const updatedDepDropdown = {
                        sample_drops: {
                            label: "new parent 1",
                            id: "dummy_parent_1",
                            options: [
                                {
                                    value: "sample 1 parent",
                                    child: {
                                        label: "sample 2",
                                        id: "dummy_child_1",
                                        options: [{ value: "sample 1 child " }]
                                    }
                                },
                                {
                                    value: "sample 2 parent",
                                    child: {
                                        label: "sample 2",
                                        id: "dummy_child_2",
                                        options: [{ value: "sample 2 child" }]
                                    }
                                }
                            ]
                        }
                    };

                    const updatedDepDropdownString = `const depDropdownDataset = ${JSON.stringify(updatedDepDropdown)};`;
                    updatedScriptContent = updatedScriptContent.replace(depDatasetMatch[0], updatedDepDropdownString);
                    console.log("Updated depDropdownDataset with default data");
                }
            } catch (error) {
                console.error("Error updating depDropdownDataset:", error.message);
            }
        } else {
            console.log("No depDropdownDataset found in script content");
        }

        // Helper functions for updating IDs in script content
        function updateSubSelectIdInScript(oldId, newId) {
            const subSelectIdRegex = new RegExp(`let subSelectId\\s*=\\s*['"]${oldId}['"]`, 'g');
            const updated = updatedScriptContent.replace(subSelectIdRegex, `let subSelectId = "${newId}"`);

            if (updated !== updatedScriptContent) {
                updatedScriptContent = updated;
            } else {
                console.warn(`No subSelectId definition found for "${oldId}"`);
            }
        }

        function updateEventListenersInScript(oldId, newId) {
            const eventListenerRegex = new RegExp(`(document\\.getElementById\\(['"]${oldId}['"]\\)\\.addEventListener\\s*\\(.*?\\))|([#\\.]${oldId}\\b)`, 'g');

            const updated = updatedScriptContent.replace(eventListenerRegex, (match) => {
                if (match.includes(oldId)) {
                    return match.replace(oldId, newId);
                }
                return match;
            });

            if (updated !== updatedScriptContent) {
                updatedScriptContent = updated;
            } else {
                console.warn(`No event listeners found for "${oldId}".`);
            }
        }

        // Update the script content
        $(targetScript).html(updatedScriptContent);

        // Write the updated HTML file
        await fs.promises.writeFile(filePath, $.html(), 'utf8');
        console.log(`Successfully updated ${filePath}`);
        
    } catch (error) {
        console.error(`Error updating file at ${filePath}:`, error);
    }
}


/**
 * @param {Array} parsedArray - The `fieldValidation` array.
 * @param {Array} formFields - The form fields to add.
 * @param {string} tableName - The name of the database table.
 * @param {object} conn 
 * @param {object} inputTypeToSQLType 
 * @returns {Array} - The updated `fieldValidation` array.
 */

async function addNewFormFields(parsedArray, formFields, tableName, conn, inputTypeToSQLType, removedFieldsList, onetimes) {
    // console.log("removedFieldsList", removedFieldsList);
    if (formFields && formFields.length > 0) {
        for (const field of formFields) {
            const existingField = parsedArray.find((existing) => existing.inputid === field.inputid);

            if (!existingField) {
                parsedArray.push({
                    inputLabel: field.inputLabel,
                    inputid: field.inputid,
                    inputType: field.inputType,
                    isRequired: field.isRequired,
                    radioOptions: field.radioOptions,
                    checkboxNames: field.checkboxNames,
                    dropdownOptions: field.dropdownOptions,
                    depinputLabel: field.depinputLabel,
                    isdependantLabel: field.isdependantLabel,
                    depdropdownOptions: field.depdropdownOptions,
                });

                // Add new column
                const fieldName = field.inputid.replace(/\s+/g, '_').toLowerCase();
                const fieldType = field.inputType;
                const sqlDataType = inputTypeToSQLType[fieldType];

                if (sqlDataType) {
                    const alterTableQuery = `
                        ALTER TABLE ${tableName}
                        ADD [${fieldName}] ${sqlDataType} NULL;
                    `;

                    try {
                        if(onetimes){   
                            await conn.query(alterTableQuery);
                            // console.log(`Successfully added column: ${fieldName} (${sqlDataType}) to table: ${tableName}`);
                        }
                    } catch (error) {
                        console.error(`Error adding column ${fieldName} (${sqlDataType}) to table ${tableName}:`, error.message);
                    }

                    // Handle dependant dropdowns
                    if (
                        fieldType === 'dropdown' &&
                        field.isdependantLabel &&
                        Object.keys(field.isdependantLabel).length > 0 &&
                        Object.values(field.isdependantLabel).every(
                            (item) => item.dependants && item.dependants.length > 0
                        )
                    ) {
                        const depinputLabel = field.depinputLabel.replace(/\s+/g, '_').toLowerCase();
                        const dependantColumnType = inputTypeToSQLType['dropdown'];

                        if (depinputLabel) {
                            const dependantColumnQuery = `
                                ALTER TABLE ${tableName}
                                ADD [${depinputLabel}] ${dependantColumnType} NULL;
                            `;

                            try {
                                if(onetimes){
                                    await conn.query(dependantColumnQuery);
                                    //console.log(`Successfully added dependant column: ${depinputLabel} (${dependantColumnType}) to table: ${tableName}`);
                                }
                            } catch (error) {
                                console.error(`Error adding dependant column ${depinputLabel} (${dependantColumnType}) to table ${tableName}:`, error.message);
                            }
                        } else {
                            console.warn("Dependant input label is missing, skipping dependant column creation.");
                        }
                    }
                } else {
                    console.warn(`Unknown input type: ${fieldType}. Skipping column creation for ${fieldName}.`);
                }
            }
        }
    }

    if (removedFieldsList && removedFieldsList.length > 0) {
        // Deduplicate removedFieldsList based on 'inputid'
        console.log("removedFieldsList to remove ",removedFieldsList)
        const uniqueRemovedFields = Array.from(
            new Map(removedFieldsList.map((field) => [field.inputid.toLowerCase(), field])).values()
        );  
        console.log("uniqueRemovedFields", uniqueRemovedFields);
    
        for (const removedField of uniqueRemovedFields) {
            const normalizedInputId = removedField.inputid.trim().toLowerCase(); // Normalize inputid for comparison
            console.log(`Checking for field removal: ${normalizedInputId}`);
    
            // Find field in parsedArray
            const fieldIndex = parsedArray.findIndex(
                (field) => field.inputid.trim().toLowerCase() === normalizedInputId
            );
    
            // Remove the field from parsedArray if it exists
            if (fieldIndex !== -1) {
                console.log(`Removing field from parsedArray: ${removedField.inputid}`);
                parsedArray.splice(fieldIndex, 1); // Remove the field from parsedArray
            } else {
                console.warn(`Field ${removedField.inputid} not found in parsedArray. Skipping parsedArray removal.`);
            }
    
            // Perform database operations only if onetimes = true
            if (onetimes && fieldIndex !== -1) {
                const fieldName = removedField.inputid.replace(/\s+/g, '_').toLowerCase(); // Normalize field name
                const checkColumnQuery = `
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${fieldName}';
                `;
    
                try {
                    const result = await conn.query(checkColumnQuery);
                    if (result.recordset.length > 0) {
                        const dropColumnQuery = `
                            ALTER TABLE ${tableName} 
                            DROP COLUMN [${fieldName}];
                        `;
                        await conn.query(dropColumnQuery);
                        console.log(`Successfully removed column: ${fieldName} from table: ${tableName}`);
                    } else {
                        console.warn(`Column ${fieldName} not found in table ${tableName}. Skipping database removal.`);
                    }
                } catch (error) {
                    console.error(`Error removing column ${fieldName} from table ${tableName}:`, error.message);
                }
            } else if (!onetimes) {
                console.log(`Skipping database execution for field: ${removedField.inputid} since onetimes is false.`);
            }
        }
    
        // Update fieldValidation script
        const updatedFieldValidation = `let fieldValidation = ${JSON.stringify(parsedArray)};`;
        fieldValidationScript = fieldValidationScript.replace(fieldValidationMatch[0], `${updatedFieldValidation}\n\n`);
        // console.log("Updated fieldValidationScript:", fieldValidationScript);
    
        // Write updated script back to file
        $('script').each((i, script) => {
            if ($(script).html().includes('let fieldValidation')) {
                $(script).html(fieldValidationScript);
            }
        });
        await fs.promises.writeFile(filePath, $.html(), 'utf8');
        console.log("Updated script written successfully to file:", filePath);
    
        console.log("Final parsedArray after processing removedFieldsList:", JSON.stringify(parsedArray, null, 2));
    }

    return parsedArray;
}


async function getCreatedFormData(req, res) {
    const conn = await pool;
    try {

        const updateQuery = `
            UPDATE mmt_form_builder
            SET Active_Status = 
                CASE 
                    WHEN Last_Date_Of_Submission = CAST(GETDATE() AS DATE) THEN 1
                    WHEN Last_Date_Of_Submission < CAST(GETDATE() AS DATE) THEN 0
                    ELSE Active_Status
                END;
        `;

        await conn.query(updateQuery);

        const query = `
            SELECT 
                id AS [ID], 
                Input_Form AS [Input Form], 
                Output_Form AS [Output Form], 
                Input_Form_Path, 
                Output_Form_Path,
                form_Description AS [Form Description], 
                CONVERT(VARCHAR, Last_Date_Of_Submission, 103) AS [Last Date of Submission],
                organisation AS [Organisation],
                wing AS [Wing],
                filled_by,
                created_by,
                Active_Status AS [Active Status]
            FROM mmt_form_builder;
        `;

        const result = await conn.query(query);
        // console.log(result);
        const rowData = result.recordset;

        // if (rowData.length === 0) {
        //     return res.status(404).json({ error: 'No data available for this selection' });
        // }

        let columnDefs;

        if (rowData.length !== 0) {
            columnDefs = Object.keys(rowData[0]).map(key => ({
                headerName: key.charAt(0).toUpperCase() + key.slice(1),
                field: key,
            }));
        }

        res.json({ columnDefs, rowData });

    } catch (error) {

    }
}

export default { storeFormBuilderInputForm, modifyFormBuilderInputForm, getCreatedFormData };
