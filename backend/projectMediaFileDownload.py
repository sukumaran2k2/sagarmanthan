from dotenv import load_dotenv
import uuid
import os
import shutil
import pyodbc
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

load_dotenv()

# Now sending the zip file via email
def send_email(zip_file_path, receiver_email, unique_id):
    sender_email = f"{os.getenv('SENDER_EMAIL')}"
    password = f"{os.getenv('SENDER_PASSWORD')}"

    # Create the email subject and body
    subject = "Project Media Files"
    body = f"""
        Dear User,<br><br>
        Your request for Media files download has been processed successfully. You can download the requested data attached with this email.<br><br>
        
        <b>Important Note:</b> You are allowed to download the files only once per request. If you wish to download the files again, please create a new request through the portal.<br><br>

        Thank you for using this service!<br><br>

        <b>This is a system-generated email. Please don't revert back.</b><br><br>

        <a href="{os.getenv("BASE_URL")}/project-media-files-download/{unique_id}" download="MediaFiles.zip" >Click here to Download</a><br><br>
        Regards,<br>
        Sagarmanthan Team
    """
    # Create a multipart message and set headers
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = receiver_email
    msg['Subject'] = subject

    # Attach the email body as MIMEText
    msg.attach(MIMEText(body, 'html'))

    # Attach the zip file
    # with open(zip_file_path, 'rb') as attachment:
    #     part = MIMEBase('application', 'octet-stream')
    #     part.set_payload(attachment.read())
    #     encoders.encode_base64(part)
    #     part.add_header('Content-Disposition', f"attachment; filename={os.path.basename(zip_file_path)}")
    #     msg.attach(part)

    # Connect to the SMTP server and send the email
    try:
        # Use port 587 for Office365/Outlook and start TLS
        with smtplib.SMTP('smtp.office365.com', 587) as server:
            server.starttls()  # Secure the connection using TLS
            server.login(sender_email, password)
            server.sendmail(sender_email, receiver_email, msg.as_string())
            print("Email sent successfully!")
        
            # After email is sent, update the status in tbl_project_folder_download_log
            cursor.execute('''UPDATE tbl_project_folder_download_log SET mail_sent_datetime = CURRENT_TIMESTAMP, status = 1 WHERE log_id = ?;''', (log_id))
            conn.commit()
    except Exception as e:
        print(f"Error sending email: {e}")


# Database connection
conn = pyodbc.connect("Driver={SQL Server};"
                      f"Server={os.getenv('DB_HOST')};"
                      f"User_Name={os.getenv('DB_USER')};"
                      f"Password={os.getenv('DB_PASSWORD')};"
                      f"Database={os.getenv('DB_NAME')};"
                      "Trusted_Connection=yes;")
cursor = conn.cursor()

# Fetch the rows where status = 0 from tbl_project_folder_download_log
cursor.execute('''SELECT log_id, user_id, email_id, status FROM tbl_project_folder_download_log WHERE status = 0;''')

log_rows = cursor.fetchall()  # Fetch all rows at once
if not log_rows:
    print("No rows found with status 0. Exiting.")
else:
    # Loop through each log entry with status = 0
    for log_row in log_rows:
        log_id = log_row.log_id
        user_id = log_row.user_id
        receiver_email = log_row.email_id

        print(f"User Id: {user_id}")
        print(f"Email Id: {receiver_email}")


        # First, check the role_id of the user
        cursor.execute('''SELECT role_id, email, name FROM tbl_user WHERE user_id = ?;''', (user_id,))
        user_table_row = cursor.fetchone()
        if user_table_row:
            role_id = user_table_row.role_id
            # receiver_email = user_table_row.email
            # receiver_name = user_table_row.name

        else:
            print(f"No role found for user_id {user_id}. Skipping log_id {log_id}.")
            continue

        # print(f"Receiver Name: {receiver_name}")

        if role_id == 2 or role_id == 3 or role_id == 4 or role_id == 5 or role_id == 8:
            # Execute the query to fetch project and sub-project details
            cursor.execute('''SELECT tbl_project.project_id, tbl_sub_project.sub_project_id, project_name, sub_project_name, 
                                tbl_project.on_sub_project_available, document_type, document_name, clearance_document
                                FROM tbl_project 
                                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                                LEFT JOIN tbl_project_document 
                                    ON tbl_project.project_id = tbl_project_document.project_id
                                    OR tbl_sub_project.sub_project_id = tbl_project_document.sub_project_id
                                LEFT JOIN tbl_project_clearances 
                                    ON tbl_project.project_id = tbl_project_clearances.project_id
                                    OR tbl_sub_project.sub_project_id = tbl_project_clearances.sub_project_id
                                WHERE ((tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1) OR 
                                        (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1));''')

            # Loop through the fetched project and sub-project details
            for second_row in cursor:
                # Determine the project or sub-project folder ID
                project_folder = second_row.project_id if second_row.on_sub_project_available == 0 else second_row.sub_project_id

                # Create the main project folder
                base_folder_path = f"fileuploads/Project_Media_Files/{project_folder}"
                os.makedirs(base_folder_path, exist_ok=True)

                # Create the Basic Information, Clearance, and Under Tendering subfolders inside the project folder
                basic_information_folder = f"{base_folder_path}/Basic Information"
                clearance_folder = f"{base_folder_path}/Clearance"
                ut_folder = f"{base_folder_path}/Under Tendering"

                os.makedirs(basic_information_folder, exist_ok=True)
                os.makedirs(clearance_folder, exist_ok=True)
                os.makedirs(ut_folder, exist_ok=True)

                # print(f"Created folder structure for project/sub-project: {project_folder}")
                # print(f"Basic Information folder: {basic_information_folder}")
                # print(f"Clearance folder: {clearance_folder}")
                # print(f"Under Tendering folder: {ut_folder}")

                # Process the basic information document
                basic_info_document_name = second_row.document_name
                if basic_info_document_name:
                    document_type = second_row.document_type
                    # Determine the file path based on whether it's a main project or sub-project
                    if second_row.on_sub_project_available == 0:
                        file_path = f"fileuploads/Project_Documents/{document_type}/mainProject/{basic_info_document_name}"
                    else:
                        file_path = f"fileuploads/Project_Documents/{document_type}/subProject/{basic_info_document_name}"

                    # Check if the source file exists
                    if os.path.exists(file_path):
                        # Copy the basic info file to the Basic Information subfolder
                        dst = f'{basic_information_folder}/{basic_info_document_name}'
                        shutil.copyfile(file_path, dst)
                        # print(f"Copied basic information file to: {dst}")
                #     else:
                #         print(f"Basic information file not found: {file_path}")
                # else:
                #     print(f"No basic information document for project/sub-project: {project_folder}")

                # Process the clearance document
                clearance_doc_name = second_row.clearance_document
                if clearance_doc_name:
                    # Define the path for clearance documents
                    clearance_file_path = f"fileuploads/Clearance_Document/{clearance_doc_name}"

                    # Check if the source file exists
                    if os.path.exists(clearance_file_path):
                        # Copy the clearance file to the clearance subfolder
                        clea_dst = f'{clearance_folder}/{clearance_doc_name}'
                        shutil.copyfile(clearance_file_path, clea_dst)
                        # print(f"Copied clearance file to: {clea_dst}")
                #     else:
                #         print(f"Clearance file not found: {clearance_file_path}")
                # else:
                #     print(f"No clearance document for project/sub-project: {project_folder}")

                # Folder based document (under tendering files)
                accept_folder = [
                    "Technical_Sactioned_Obtained", "Tender_Document_Approved", "Tender_Notice_Issued",
                    "Technical_Evaluation_Completed", "Financial_Evaluation_Completed", "Work_Awarded", "Contract_Agreement_Signed"
                ]

                ut_file_name = f"{second_row.project_id}.pdf" if second_row.on_sub_project_available == 0 else f"{second_row.sub_project_id}.pdf"

                # Loop through the folders in the accept_folder list and only process the ones that have files
                for folder in accept_folder:
                    # Create the full path for the source file
                    ut_file_path = f"fileuploads/Project_Documents/{folder}/{ut_file_name}"

                    # Check if the source file exists before proceeding with folder creation and file copying
                    if os.path.exists(ut_file_path):
                        # Copy the file directly to the Under Tendering folder, naming it after the folder
                        ut_dst = f'{ut_folder}/{folder}.pdf'  # Use the folder name as the file name
                        shutil.copyfile(ut_file_path, ut_dst)
                        # print(f"Copied under tendering file to: {ut_dst}")
                    # else:
                    #     print(f"Under tendering file not found for folder {folder}: {ut_file_path}")


            # After all folders are created and files copied, zip the Project_Media_Files folder
            # Create a unique identifier for the zip folder
            unique_id = str(uuid.uuid4())

            # Generate the unique zip folder name
            zip_name = f"fileuploads/project-media-files-download/{unique_id}"
            shutil.make_archive(zip_name, 'zip', 'fileuploads/Project_Media_Files')

            print(f"Zipped the folder to: {zip_name}.zip")

            # Before sending the email, print out the receiver_email value to make sure it's valid.
            print(f"Receiver Email: {receiver_email}")

            # Now proceed with the email sending function.
            send_email(f"{zip_name}.zip", receiver_email, unique_id)
            print(f"unique_id : {unique_id}")
           
        else:
             # For other role_id values, fetch the organisation_id
            cursor.execute('''SELECT organisation_id FROM tbl_user WHERE user_id = ?;''', (user_id,))
            org_result = cursor.fetchone()
            if org_result:
                organisation_id = org_result.organisation_id
            else:
                print(f"No organisation found for user_id {user_id}. Skipping log_id {log_id}.")
                continue

            # Execute the query to fetch project and sub-project details
            cursor.execute(f'''SELECT tbl_project.project_id, tbl_sub_project.sub_project_id, project_name, sub_project_name, 
                                tbl_project.on_sub_project_available, document_type, document_name, clearance_document
                                FROM tbl_project 
                                LEFT JOIN tbl_sub_project ON tbl_sub_project.project_id = tbl_project.project_id
                                LEFT JOIN tbl_project_document 
                                    ON tbl_project.project_id = tbl_project_document.project_id
                                    OR tbl_sub_project.sub_project_id = tbl_project_document.sub_project_id
                                LEFT JOIN tbl_project_clearances 
                                    ON tbl_project.project_id = tbl_project_clearances.project_id
                                    OR tbl_sub_project.sub_project_id = tbl_project_clearances.sub_project_id
                                WHERE ((tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1) OR 
                                    (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1))
                                    AND ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = {organisation_id}
                                    ''')

            # Loop through the fetched project and sub-project details
            for second_row in cursor:
                # Determine the project or sub-project folder ID
                project_folder = second_row.project_id if second_row.on_sub_project_available == 0 else second_row.sub_project_id

                # Create the main project folder
                base_folder_path = f"fileuploads/Project_Media_Files/{project_folder}"
                os.makedirs(base_folder_path, exist_ok=True)

                # Create the Basic Information, clearance, and Under Tendering subfolders inside the project folder
                basic_information_folder = f"{base_folder_path}/Basic Information"
                clearance_folder = f"{base_folder_path}/Clearance"
                ut_folder = f"{base_folder_path}/Under Tendering"

                os.makedirs(basic_information_folder, exist_ok=True)
                os.makedirs(clearance_folder, exist_ok=True)
                os.makedirs(ut_folder, exist_ok=True)

                # Process the basic information document
                basic_info_document_name = second_row.document_name
                if basic_info_document_name:
                    document_type = second_row.document_type
                    # Determine the file path based on whether it's a main project or sub-project
                    if second_row.on_sub_project_available == 0:
                        file_path = f"fileuploads/Project_Documents/{document_type}/mainProject/{basic_info_document_name}"
                    else:
                        file_path = f"fileuploads/Project_Documents/{document_type}/subProject/{basic_info_document_name}"

                    # Check if the source file exists
                    if os.path.exists(file_path):
                        # Copy the basic info file to the Basic Information subfolder
                        dst = f'{basic_information_folder}/{basic_info_document_name}'
                        shutil.copyfile(file_path, dst)
                #         print(f"Copied basic information file to: {dst}")
                #     else:
                #         print(f"Basic information file not found: {file_path}")
                # else:
                #     print(f"No basic information document for project/sub-project: {project_folder}")

                # Process the clearance document
                clearance_doc_name = second_row.clearance_document
                if clearance_doc_name:
                    # Define the path for clearance documents
                    clearance_file_path = f"fileuploads/Clearance_Document/{clearance_doc_name}"

                    # Check if the source file exists
                    if os.path.exists(clearance_file_path):
                        # Copy the clearance file to the clearance subfolder
                        clea_dst = f'{clearance_folder}/{clearance_doc_name}'
                        shutil.copyfile(clearance_file_path, clea_dst)
                #         print(f"Copied clearance file to: {clea_dst}")
                #     else:
                #         print(f"Clearance file not found: {clearance_file_path}")
                # else:
                #     print(f"No clearance document for project/sub-project: {project_folder}")

                # Folder based document (under tendering files)
                accept_folder = [
                    "Technical_Sactioned_Obtained", "Tender_Document_Approved", "Tender_Notice_Issued",
                    "Technical_Evaluation_Completed", "Financial_Evaluation_Completed", "Work_Awarded", "Contract_Agreement_Signed"
                ]

                ut_file_name = f"{second_row.project_id}.pdf" if second_row.on_sub_project_available == 0 else f"{second_row.sub_project_id}.pdf"

                # Loop through the folders in the accept_folder list and only process the ones that have files
                for folder in accept_folder:
                    # Create the full path for the source file
                    ut_file_path = f"fileuploads/Project_Documents/{folder}/{ut_file_name}"

                    # Check if the source file exists before proceeding with folder creation and file copying
                    if os.path.exists(ut_file_path):
                        # Copy the file directly to the Under Tendering folder, naming it after the folder
                        ut_dst = f'{ut_folder}/{folder}.pdf'  # Use the folder name as the file name
                        shutil.copyfile(ut_file_path, ut_dst)
                    #     print(f"Copied under tendering file to: {ut_dst}")
                    # else:
                    #     print(f"Under tendering file not found for folder {folder}: {ut_file_path}")

            
            
            # Create a unique identifier for the zip folder
            unique_id = str(uuid.uuid4())

            # Generate the unique zip folder name
            zip_name = f"fileuploads/project-media-files-download/{unique_id}"
            shutil.make_archive(zip_name, 'zip', 'fileuploads/Project_Media_Files')

            print(f"Zipped the folder to: {zip_name}.zip")

            # Before sending the email, print out the receiver_email value to make sure it's valid.
            print(f"Receiver Email: {receiver_email}")

            # Now proceed with the email sending function.
            send_email(f"{zip_name}.zip", receiver_email, unique_id)

        # os.remove('fileuploads/Project_Media_Files.zip')
        shutil.rmtree('fileuploads/Project_Media_Files')

# Close the cursor and connection
cursor.close()
conn.close()