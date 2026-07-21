import { pool } from "../../db.js";

async function createSocialMedia(req, res) {
    //console.log("it is working createsocial media");
    const data = req.body;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", data.financialYear);
    request.input("month", data.month);
    request.input("organisation", data.organisation);

    request.input("BroadcastChecked", data.BroadcastChecked);
    request.input("BroadcastNational", data.BroadcastNational);
    request.input("BroadcastRegional", data.BroadcastRegional);
    request.input("BroadcastOverall", data.BroadcastOverall);

    request.input("PrintMediaChecked", data.PrintMediaChecked);
    request.input("PrintMediaNational", data.PrintMediaNational);
    request.input("PrintMediaRegional", data.PrintMediaRegional);
    request.input("PrintMediaOverall", data.PrintMediaOverall);

    request.input("OnlineChecked", data.OnlineChecked);
    request.input("OnlineEnglish", data.OnlineEnglish);
    request.input("OnlineVernacular", data.OnlineVernacular);
    request.input("OnlineOverall", data.OnlineOverall);

    request.input("SocialMediaChecked", data.SocialMediaChecked);
    request.input("TwitterPosts", data.TwitterPosts);
    request.input("TwitterImpression", data.TwitterImpression);
    // request.input("TwitterReach", data.TwitterReach); twitter_reach, @TwitterReach,
    request.input("TwitterEngagement", data.TwitterEngagement);

    request.input("InstagramPosts", data.InstagramPosts);
    request.input("InstagramImpression", data.InstagramImpression);
    // request.input("InstagramReach", data.InstagramReach); instagram_reach, @InstagramReach,
    request.input("InstagramEngagement", data.InstagramEngagement);

    request.input("FacebookPosts", data.FacebookPosts);
    request.input("FacebookImpression", data.FacebookImpression);
    // request.input("FacebookReach", data.FacebookReach); facebook_reach, @FacebookReach,
    request.input("FacebookEngagement", data.FacebookEngagement);

    request.input("LinkedInPosts", data.LinkedInPosts);
    request.input("LinkedInImpression", data.LinkedInImpression);
    // request.input("LinkedInReach", data.LinkedInReach); linkedIn_reach,  @LinkedInReach, 
    request.input("LinkedInEngagement", data.LinkedInEngagement);

    request.input("youTubePosts", data.youTubePosts);
    request.input("youTubeImpression", data.youTubeImpression);
    // request.input("youTubeReach", data.youTubeReach); youTube_reach, @youTubeReach,
    request.input("youTubeEngagement", data.youTubeEngagement);

    const checkResult = await request.query(`
        SELECT COUNT(*) AS count
        FROM tbl_social_media
        WHERE organisation_id = @Organisation
        AND financial_year = @financialYear
        AND month = @month;
    `);
    // console.log("checkresut", checkResult);

    if (checkResult.recordset[0].count > 0) {
        return res.sendStatus(302);
    }

    try {
        const result = await request.query(`
        INSERT INTO tbl_social_media (financial_year, month, organisation_id,
            broadcast_checked, broadcast_national, broadcast_regional, broadcast_overall,
            print_media_checked, print_media_national, print_media_regional, print_media_overall,
            online_checked, online_english, online_vernacular, online_overall,
            social_media_checked, twitter_posts, twitter_impression, twitter_engagement,
            instagram_posts, instagram_impression, instagram_engagement,
            facebook_posts, facebook_impression, facebook_engagement,
            linkedIn_posts, linkedIn_impression, linkedIn_engagement,
            youTube_posts, youTube_impression, youTube_engagement
        )
        VALUES (@financialYear, @month, @organisation, @BroadcastChecked, @BroadcastNational,
            @BroadcastRegional, @BroadcastOverall,
            @PrintMediaChecked, @PrintMediaNational, @PrintMediaRegional, @PrintMediaOverall,
            @OnlineChecked, @OnlineEnglish, @OnlineVernacular, @OnlineOverall,
            @SocialMediaChecked, @TwitterPosts, @TwitterImpression, @TwitterEngagement,
            @InstagramPosts, @InstagramImpression, @InstagramEngagement,
            @FacebookPosts, @FacebookImpression, @FacebookEngagement,
            @LinkedInPosts, @LinkedInImpression, @LinkedInEngagement,
            @youTubePosts, @youTubeImpression, @youTubeEngagement
        )
    `);

        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getSocialMediaData (req, res) 
{
    const conn = await pool;

    try {
        const result = await conn.query(`SELECT * from tbl_social_media ORDER BY financial_year DESC;`);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};
async function getMonthlySocialParameter(req, res) {
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;

    request.input("userID", userID);

    try {
        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id } = userResult.recordset[0];

        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {

            query = `
                SELECT *
                FROM tbl_social_media
                ORDER BY
                    financial_year DESC,
                    CASE month
                        WHEN 'January' THEN 1
                        WHEN 'February' THEN 2
                        WHEN 'March' THEN 3
                        WHEN 'April' THEN 4
                        WHEN 'May' THEN 5
                        WHEN 'June' THEN 6
                        WHEN 'July' THEN 7
                        WHEN 'August' THEN 8
                        WHEN 'September' THEN 9
                        WHEN 'October' THEN 10
                        WHEN 'November' THEN 11
                        WHEN 'December' THEN 12
                    END DESC;
            `;

        } else {

            const orgResult = await request.query(`
                SELECT organisation_id
                FROM tbl_user
                WHERE user_id = @userID
            `);

            const organisationID = orgResult.recordset[0].organisation_id;

            request.input("organisationID", organisationID);

            query = `
                SELECT *
                FROM tbl_social_media
                WHERE organisation_id = @organisationID
                ORDER BY
                    financial_year DESC,
                    CASE month
                        WHEN 'January' THEN 1
                        WHEN 'February' THEN 2
                        WHEN 'March' THEN 3
                        WHEN 'April' THEN 4
                        WHEN 'May' THEN 5
                        WHEN 'June' THEN 6
                        WHEN 'July' THEN 7
                        WHEN 'August' THEN 8
                        WHEN 'September' THEN 9
                        WHEN 'October' THEN 10
                        WHEN 'November' THEN 11
                        WHEN 'December' THEN 12
                    END DESC;
            `;
        }

        const result = await request.query(query);

        console.log(result.recordset);
        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


const platformSuffixMapping = {
    broadcast: ["_national", "_regional", "_overall"],
    online: ["_english", "_vernacular", "_overall"],
    print_media:["_national", "_regional", "_overall"],
    social_media: {
        engagement: '_engagement',
        impression: '_impression',
        posts: '_posts',
        reach: '_reach'
    }
};

async function getQuarterlySocialParameter (req, res) 
{
    const platform = req.params.platform;
    const userID = req.params.userID;
    console.log(userID);
    console.log(platform);

    const socialMediaChannels = ['facebook', 'instagram', 'linkedIn', 'twitter', 'youTube'];
    const suffixes = platformSuffixMapping[platform];
    // console.log(suffixes);

    if (!suffixes) {
        return res.status(500).json({ error: "Invalid platform" });
    }

    const conn = await pool;
    // console.log("Quaterly funciton worked");

    try {

        const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id } = userResult.recordset[0];


        //console.log("user result",userResult);

        let columns = '';

        if (platform === 'social_media') {
            columns = socialMediaChannels.reduce((acc, socialMediaChannel) => {
                const channelColumns = Object.keys(suffixes)
                    .map(suffixKey => `SUM(${socialMediaChannel}${suffixes[suffixKey]}) AS ${socialMediaChannel}_${suffixKey}`)
                    .join(', ');
                return `${acc}, ${channelColumns}`;
            }, '').substring(2);
        } else {
            columns = suffixes
                .map(suffix => `SUM(CASE WHEN ${platform}${suffix} IS NOT NULL THEN ${platform}${suffix} ELSE 0 END) AS total${suffix}`)
                .join(", ");
        }

        const whereCondition = socialMediaChannels.map(socialMediaChannel => {
            if (platform === 'social_media') {
                const conditions = Object.keys(suffixes).map(suffixKey => {
                    return `${socialMediaChannel}${suffixes[suffixKey]} IS NOT NULL`;
                });
                return conditions.join(' AND ');
            } else {
                return suffixes.map(suffix => `${platform}${suffix} IS NOT NULL`).join(' AND ');
            }
        }).join(' AND ');

        const uniqueConditions = [...new Set(whereCondition.split(' AND '))].join(' AND ');

        //console.log(platform);

        // console.log("SQL Query:", `
        //     SELECT
        //         financial_year,
        //         CASE
        //             WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
        //             WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
        //             WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
        //             WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        //         END AS quarter_number
        //         ${columns ? ',' + columns : ''}
        //     FROM tbl_social_media
        //     WHERE ${uniqueConditions}
        //     GROUP BY
        //         financial_year,
        //         CASE
        //             WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
        //             WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
        //             WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
        //             WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        //         END
        //         ${platform === 'social_media' ? ',' + socialMediaChannels.map(channel => Object.keys(suffixes).map(suffixKey => `${channel}${suffixes[suffixKey]}`).join(', ')) : ''}
        //     ORDER BY financial_year DESC, quarter_number;
        // `);

        
        let query;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            query = `
                SELECT
                financial_year,
                organisation_id,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number
                
                ${columns ? ',' + columns : ''}
            FROM tbl_social_media
            WHERE ${uniqueConditions}
            GROUP BY
                organisation_id,
                financial_year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END
                
            ORDER BY financial_year DESC, quarter_number;
            `;
        }else{
            const orgResult = await conn.query(
                `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
            );
            const organisationID = orgResult.recordset[0].organisation_id;
            console.log('org id', organisationID);
    
            const usersResult = await conn.query(
                `SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`
            );

            const userIDs = usersResult.recordset.map((user) => user.user_id);
        
            query = `
                SELECT
                    financial_year,
                    organisation_id,
                    CASE
                        WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                        WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                        WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                        WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                    END AS quarter_number
                    
                    ${columns ? ',' + columns : ''}
                FROM tbl_social_media
                WHERE organisation_id = ${organisationID}
                GROUP BY
                    organisation_id,
                    financial_year,
                    CASE
                        WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                        WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                        WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                        WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                    END
                    
                ORDER BY financial_year DESC, quarter_number;
            `;
        }
        // const result = await conn.query(`
        //     SELECT
        //         financial_year,
        //         organisation_id,
        //         CASE
        //             WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
        //             WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
        //             WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
        //             WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        //         END AS quarter_number
                
        //         ${columns ? ',' + columns : ''}
        //     FROM tbl_social_media
        //     WHERE ${uniqueConditions}
        //     GROUP BY
        //         organisation_id,
        //         financial_year,
        //         CASE
        //             WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
        //             WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
        //             WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
        //             WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
        //         END
                
        //     ORDER BY financial_year DESC, quarter_number;
        // `);

        //${platform === 'social_media' ? ',' + socialMediaChannels.map(channel => Object.keys(suffixes).map(suffixKey => `${channel}${suffixes[suffixKey]}`).join(', ')) : ''}

        // console.log(result);
        //console.log("-------------------------------------------------------------------");
        // console.log('query',query);
        const result = await conn.query(query);
        // console.log(result);
        res.json(result.recordset);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getAnnuallySocialMediaData(req, res) {

    console.log("Annually worked");
    const userID = req.params.userID;
    console.log("userID",userID);

    const conn = await pool;
    const platform = req.params.platform;
    const socialMediaChannels = ['facebook', 'instagram', 'linkedIn', 'twitter', 'youTube'];
    const suffixes = platformSuffixMapping[platform];

    if (!suffixes) {
        return res.status(500).json({ error: "Invalid platform" });
    }

    try {

        const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id } = userResult.recordset[0];

        let columns = '';

        if (platform === 'social_media') {
            columns = socialMediaChannels.reduce((acc, socialMediaChannel) => {
                const channelColumns = Object.keys(suffixes)
                    .map(suffixKey => `SUM(${socialMediaChannel}${suffixes[suffixKey]}) AS ${socialMediaChannel}_${suffixKey}`)
                    .join(', ');
                return `${acc}, ${channelColumns}`;
            }, '').substring(2);
        } else {
            columns = suffixes
                .map(suffix => `SUM(CASE WHEN ${platform}${suffix} IS NOT NULL THEN ${platform}${suffix} ELSE 0 END) AS total${suffix}`)
                .join(", ");
        }

        //console.log(columns);
        let platformColumns = '';

        if (platform === 'social_media') {
            platformColumns = socialMediaChannels.map(channel => Object.keys(suffixes).map(suffixKey => `${channel}${suffixes[suffixKey]}`).join(', ')).join(', ');
        }

        let query;

        if(role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8){
            query = `
            SELECT
                organisation_id,
                financial_year,
                ${columns}
            FROM
                tbl_social_media
            GROUP BY
                organisation_id,
                financial_year
                
            ORDER BY
                financial_year DESC;
            `;
        }
        else{
            const orgResult = await conn.query(
                `SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`
            );
            const organisationID = orgResult.recordset[0].organisation_id;
            console.log('org id', organisationID);
    
            const usersResult = await conn.query(
                `SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`
            );

            const userIDs = usersResult.recordset.map((user) => user.user_id);
            query = `SELECT
                    organisation_id,
                    financial_year,
                    ${columns}
                FROM
                    tbl_social_media
                WHERE organisation_id = ${organisationID}
                GROUP BY
                    organisation_id,
                    financial_year
                ORDER BY
                    financial_year DESC;`;
        
        }

        //console.log("Generated SQL Query:", query);
        const result = await conn.query(query);
        console.log(result);
        res.json(result.recordset);


    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyOnlineReport(req,res){
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    console.log('userID',userID);
    const currentMonth = req.params.currentMonth;
    console.log('currentMonth',currentMonth);
    const currentFinYear = req.params.currentFinYear;
    console.log('currentFinYear',currentFinYear);

    request.input("userID", userID);    
    request.input("currentFinYear", currentFinYear);
    request.input("currentMonth", currentMonth);
    
    try {

        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id } = userResult.recordset[0];

        let query;
        let whereCondition = "online_checked = 1";

        if (currentFinYear !== 'ALL') {
            whereCondition += ` AND financial_year = '${currentFinYear}'`;
        }

        if (currentMonth !== 'ALL') {
            whereCondition += ` AND month = '${currentMonth}'`;
        }

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {

            query = `
                select 
                    ROW_NUMBER() OVER (ORDER BY  mmt_organisation.organisation_id) AS [S No],
                    mmt_organisation.organisation_name As [Organisation Name],
                    tbl_social_media.organisation_id As [Organisation],
                    month As [Month],
                    financial_year As [Financial Year],
                    online_english AS [Online English], 
                    online_vernacular AS [Online Vernacular], 
                    online_overall AS [Online Overall] 
                from  tbl_social_media 
                    inner join mmt_organisation on tbl_social_media.organisation_id = mmt_organisation.organisation_id
                where ${whereCondition}  
                ORDER BY  mmt_organisation.organisation_id;
            `;

            console.log('query', query);
        
        } else {
            const orgResult = await request.query(
            `SELECT organisation_id FROM tbl_user WHERE user_id = @userID`
            );
            const organisationID = orgResult.recordset[0].organisation_id;

            request.input("organisationID", organisationID);
    
            const usersResult = await request.query(
            `SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`
            );
            const userIDs = usersResult.recordset.map((user) => user.user_id);

            query = `
            select 
                ROW_NUMBER() OVER (ORDER BY  mmt_organisation.organisation_id) AS [S No],
                mmt_organisation.organisation_name As [Organisation Name],
                tbl_social_media.organisation_id As [Organisation],
                month As [Month],
                financial_year As [Financial Year],
                online_english AS [Online English], 
                online_vernacular AS [Online Vernacular], 
                online_overall AS [Online Overall] 
            from  tbl_social_media 
                inner join mmt_organisation on tbl_social_media.organisation_id = mmt_organisation.organisation_id
                where organisation_id = @organisationID AND ${whereCondition}  
                ORDER BY  mmt_organisation.organisation_id;
            `;

            console.log('query', query);

        }

        const result = await request.query(query);
        // console.log(result);
        // res.json(result.recordset);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));
        
        res.json({ columnDefs, rowData });
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlySocialReport(req,res){
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    console.log('userID',userID);
    const currentMonth = req.params.currentMonth;
    console.log('currentMonth',currentMonth);
    const currentFinYear = req.params.currentFinYear;
    console.log('currentFinYear',currentFinYear);
    
        request.input("userID", userID);    
        request.input("currentFinYear", currentFinYear);
        request.input("currentMonth", currentMonth);
        // request.input("");
    try {

        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id } = userResult.recordset[0];

        let query;
        let whereCondition = "social_media_checked = 1";

        if (currentFinYear !== 'ALL') {
            whereCondition += ` AND financial_year = '${currentFinYear}'`;
        }

        if (currentMonth !== 'ALL') {
            whereCondition += ` AND month = '${currentMonth}'`;
        }

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {

            query = `
            select 
                ROW_NUMBER() OVER (ORDER BY  mmt_organisation.organisation_id) AS [S No],
                mmt_organisation.organisation_name As [Organisation Name],
                tbl_social_media.organisation_id As [Organisation],
                month As [Month],
                financial_year As [Financial Year],
                twitter_posts AS [Twitter Posts], 
                twitter_impression AS [Twitter Impression], 
                twitter_engagement AS [Twitter Engagement],
                instagram_posts AS [Instagram Posts], 
                instagram_impression AS [Instagram Impression], 
                instagram_engagement AS [Instagram Engagement],
                facebook_posts AS [Facebook Posts], 
                facebook_impression AS [Facebook Impression], 
                facebook_engagement AS [Facebook Engagement],
                linkedIn_posts AS [LinkedIn Posts], 
                linkedIn_impression AS [LinkedIn Impression], 
                linkedIn_engagement AS [LinkedIn Engagement],
                youTube_posts AS [Youtube Posts], 
                youTube_impression AS [Youtube Impression], 
                youTube_engagement AS [Youtube Engagement]
            from  tbl_social_media 
                inner join mmt_organisation on tbl_social_media.organisation_id = mmt_organisation.organisation_id
                where ${whereCondition}  
            ORDER BY  mmt_organisation.organisation_id;
            `;

            console.log('query', query);
        
        } else {
            const orgResult = await request.query(
            `SELECT organisation_id FROM tbl_user WHERE user_id = @userID`
            );
            const organisationID = orgResult.recordset[0].organisation_id;

             request.input("organisationID", organisationID);
    
            const usersResult = await request.query(
            `SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`
            );
            const userIDs = usersResult.recordset.map((user) => user.user_id);

            query = `
            select 
                ROW_NUMBER() OVER (ORDER BY  mmt_organisation.organisation_id) AS [S No],
                mmt_organisation.organisation_name As [Organisation Name],
                tbl_social_media.organisation_id As [Organisation],
                month As [Month],
                financial_year As [Financial Year],
                twitter_posts AS [Twitter Posts], 
                twitter_impression AS [Twitter Impression], 
                twitter_engagement AS [Twitter Engagement],
                instagram_posts AS [Instagram Posts], 
                instagram_impression AS [Instagram Impression], 
                instagram_engagement AS [Instagram Engagement],
                facebook_posts AS [Facebook Posts], 
                facebook_impression AS [Facebook Impression], 
                facebook_engagement AS [Facebook Engagement],
                linkedIn_posts AS [LinkedIn Posts], 
                linkedIn_impression AS [LinkedIn Impression], 
                linkedIn_engagement AS [LinkedIn Engagement],
                youTube_posts AS [Youtube Posts], 
                youTube_impression AS [Youtube Impression], 
                youTube_engagement AS [Youtube Engagement]
            from  tbl_social_media 
                inner join mmt_organisation on tbl_social_media.organisation_id = mmt_organisation.organisation_id
            where organisation_id = @organisationID AND ${whereCondition}  
                ORDER BY  mmt_organisation.organisation_id;
            `;

            console.log('query', query);

        }

        const result = await request.query(query);
        // console.log(result);
        // res.json(result.recordset);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Organisation Name",
                field: "Organisation Name",
                
            },
            {
                headerName: "Organisation",
                field: "Organisation",
            },
            {
                headerName: "Month",
                field: "Month",
            },
            {
                headerName: "Financial Year",
                field: "Financial Year",
            },
            {
                headerName: "Twitter",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Posts",
                        field: "Twitter Posts"
                    },
                    {
                        headerName: "Impression",
                        field: "Twitter Impression"
                    },
                    {
                        headerName: "Engagement",
                        field: "Twitter Engagement"
                    },
                ]
            },
            {
                headerName: "Instagram",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Posts",
                        field: "Instagram Posts"
                    },
                    {
                        headerName: "Impression",
                        field: "Instagram Impression"
                    },
                    {
                        headerName: "Engagement",
                        field: "Instagram Engagement"
                    },
                ]
            },
            {
                headerName: "Facebook",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Posts",
                        field: "Facebook Posts"
                    },
                    {
                        headerName: "Impression",
                        field: "Facebook Impression"
                    },
                    {
                        headerName: "Engagement",
                        field: "Facebook Engagement"
                    },
                ]
            },{
                headerName: "LinkedIn",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Posts",
                        field: "LinkedIn Posts"
                    },
                    {
                        headerName: "Impression",
                        field: "LinkedIn Impression"
                    },
                    {
                        headerName: "Engagement",
                        field: "LinkedIn Engagement"
                    },
                ]
            },{
                headerName: "Youtube",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Posts",
                        field: "Youtube Posts"
                    },
                    {
                        headerName: "Impression",
                        field: "Youtube Impression"
                    },
                    {
                        headerName: "Engagement",
                        field: "Youtube Engagement"
                    },
                ]
            }
        ];

        res.json({ columnDefs, rowData });

    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getMonthlyBroadPrintReport(req,res){
    const conn = await pool;
    const request = conn.request();
    const userID = req.params.userID;
    console.log('userID',userID);
    const platform = req.params.platform;
    console.log('platform',platform);
    const currentMonth = req.params.currentMonth;
    console.log('currentMonth',currentMonth);
    const currentFinYear = req.params.currentFinYear;
    console.log('currentFinYear',currentFinYear);
    
        request.input("userID", userID);    
    try {

        const userResult = await request.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = @userID
        `);

        const { role_id } = userResult.recordset[0];

        let query;
        let whereCondition = `${platform}_checked = 1`;

        if (currentFinYear !== 'ALL') {
            whereCondition += ` AND financial_year = '${currentFinYear}'`;
        }

        if (currentMonth !== 'ALL') {
            whereCondition += ` AND month = '${currentMonth}'`;
        }

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {

            if (platform === "broadcast") {
                query = `
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY mmt_organisation.organisation_id) AS [S No],
                        mmt_organisation.organisation_name AS [Organisation Name],
                        tbl_social_media.organisation_id AS [Organisation],
                        month AS [Month],
                        financial_year AS [Financial Year],
                        broadcast_national AS [National], 
                        broadcast_regional AS [Regional], 
                        broadcast_overall AS [Overall] 
                    FROM tbl_social_media 
                    INNER JOIN mmt_organisation ON tbl_social_media.organisation_id = mmt_organisation.organisation_id
                    WHERE ${whereCondition}  
                    ORDER BY mmt_organisation.organisation_id;
                `;
            } else if (platform === "print_media") {
                query = `
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY mmt_organisation.organisation_id) AS [S No],
                        mmt_organisation.organisation_name AS [Organisation Name],
                        tbl_social_media.organisation_id AS [Organisation],
                        month AS [Month],
                        financial_year AS [Financial Year],
                        print_media_national AS [National], 
                        print_media_regional AS [Regional], 
                        print_media_overall AS [Overall] 
                    FROM tbl_social_media 
                    INNER JOIN mmt_organisation ON tbl_social_media.organisation_id = mmt_organisation.organisation_id
                    WHERE ${whereCondition}  
                    ORDER BY mmt_organisation.organisation_id;
                `;
            }

            console.log('query', query);
        
        } else {
            const orgResult = await request.query(
            `SELECT organisation_id FROM tbl_user WHERE user_id = @userID`
            );
            const organisationID = orgResu
            lt.recordset[0].organisation_id;

            request.input("organisationID", organisationID);
    
            const usersResult = await request.query(
            `SELECT user_id FROM tbl_user WHERE organisation_id = @organisationID`
            );
            const userIDs = usersResult.recordset.map((user) => user.user_id);

            if (platform === "broadcast") {
                request.input("organisationID", organisationID);
                query = `
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY mmt_organisation.organisation_id) AS [S No],
                        mmt_organisation.organisation_name AS [Organisation Name],
                        tbl_social_media.organisation_id AS [Organisation],
                        month AS [Month],
                        financial_year AS [Financial Year],
                        broadcast_national AS [National], 
                        broadcast_regional AS [Regional], 
                        broadcast_overall AS [Overall] 
                    FROM tbl_social_media 
                    INNER JOIN mmt_organisation ON tbl_social_media.organisation_id = mmt_organisation.organisation_id
                    WHERE organisation_id = @organisationID AND ${whereCondition}  
                    ORDER BY mmt_organisation.organisation_id;
                `;
            } else if (platform === "print_media") {
                query = `
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY mmt_organisation.organisation_id) AS [S No],
                        mmt_organisation.organisation_name AS [Organisation Name],
                        tbl_social_media.organisation_id AS [Organisation],
                        month AS [Month],
                        financial_year AS [Financial Year],
                        print_media_national AS [National], 
                        print_media_regional AS [Regional], 
                        print_media_overall AS [Overall] 
                    FROM tbl_social_media 
                    INNER JOIN mmt_organisation ON tbl_social_media.organisation_id = mmt_organisation.organisation_id
                    WHERE organisation_id = @organisationID AND ${whereCondition}  
                    ORDER BY mmt_organisation.organisation_id;
                `;
            }

            console.log('query', query);
        
        }

        const result = await request.query(query);
        const rowData = result.recordset;  
    
        if (rowData.length === 0) {
            return res.json(result.recordset);
        }
        
        const columnDefs = Object.keys(rowData[0]).map(key => ({
            headerName: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize the first letter
            field: key,
        }));
        
        res.json({ columnDefs, rowData });
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

  async function getUpdateBroadcastmediadata(req, res) 
    {

        const mediaOutreachId = req.params.mediaOutreachId;
        const conn = await pool;
        const request = conn.request();
        request.input("mediaOutreachId", mediaOutreachId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_social_media
                    WHERE media_outreach_id  = @mediaOutreachId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        }
      async function updateBroadcastmediadata(req,res){

        const data = req.body;
        const type = req.body.type;
        const updateBroadcastNational = req.body.updateBroadcastNational;
        const updateBroadcastRegional = req.body.updateBroadcastRegional;
        const updateBroadcastOverall = req.body.updateBroadcastOverall;
        const updateprintMediaRegional = req.body.updateprintMediaRegional;
        const updateprintMediaNational   = req.body.updateprintMediaNational  ;
        const updateprintMediaOverall = req.body.updateprintMediaOverall;
        const updateEnglishdata = req.body.updateEnglishdata;
        const updateVernacular   = req.body.updateVernacular  ;
        const updateonlineOverall = req.body.updateonlineOverall;

        const updateTwitterPosts = req.body.updateTwitterPosts;
        const updateTwitterImpression = req.body.updateTwitterImpression;
        const updateTwitterEngagement = req.body.updateTwitterEngagement;
        const updateInstagramPosts = req.body.updateInstagramPosts;
        const updateInstagramImpression   = req.body.updateInstagramImpression  ;
        const updateInstagramEngagement = req.body.updateInstagramEngagement;
        const updateFacebookPosts = req.body.updateFacebookPosts;
        const updateFacebookImpression   = req.body.updateFacebookImpression  ;
        const updateFacebookEngagement = req.body.updateFacebookEngagement;
        const updateLinkedInPosts = req.body.updateLinkedInPosts;
        const updateLinkedInImpression   = req.body.updateLinkedInImpression  ;
        const updateLinkedInEngagement = req.body.updateLinkedInEngagement;
        const updateyoutubePosts = req.body.updateyoutubePosts;
        const updateyoutubeImpression   = req.body.updateyoutubeImpression  ;
        const updateyoutubeEngagement = req.body.updateyoutubeEngagement;


        const mediaOutreachIdOrg  = req.body.mediaOutreachIdOrg ;
        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        
 
        request.input('updateBroadcastNational',updateBroadcastNational);
        request.input('updateBroadcastRegional',updateBroadcastRegional);
        request.input('updateBroadcastOverall',updateBroadcastOverall);
        request.input('updateprintMediaRegional',updateprintMediaRegional);
        request.input('updateprintMediaNational',updateprintMediaNational);
        request.input('updateprintMediaOverall',updateprintMediaOverall);
        request.input('updateEnglishdata',updateEnglishdata);
        request.input('updateVernacular',updateVernacular);
        request.input('updateonlineOverall',updateonlineOverall);

        request.input('updateTwitterPosts',updateTwitterPosts);
        request.input('updateTwitterImpression',updateTwitterImpression);
        request.input('updateTwitterEngagement',updateTwitterEngagement);

        request.input('updateInstagramPosts',updateInstagramPosts);
        request.input('updateInstagramImpression',updateInstagramImpression);
        request.input('updateInstagramEngagement',updateInstagramEngagement);

        request.input('updateFacebookPosts',updateFacebookPosts);
        request.input('updateFacebookImpression',updateFacebookImpression);
        request.input('updateFacebookEngagement',updateFacebookEngagement);

        request.input('updateLinkedInPosts',updateLinkedInPosts);
        request.input('updateLinkedInImpression',updateLinkedInImpression);
        request.input('updateLinkedInEngagement',updateLinkedInEngagement);

        request.input('updateyoutubePosts',updateyoutubePosts);
        request.input('updateyoutubeImpression',updateyoutubeImpression);
        request.input('updateyoutubeEngagement',updateyoutubeEngagement);

        request.input("userID", userID);
        request.input("mediaOutreachIdOrg", mediaOutreachIdOrg);

        try {
            if (type === "broadcast"){
            const result = await request.query(`UPDATE tbl_social_media SET broadcast_national = @updateBroadcastNational,broadcast_regional  = @updateBroadcastRegional,broadcast_overall = @updateBroadcastOverall,updated_by = @userID,updated_date = getDate() WHERE media_outreach_id  = @mediaOutreachIdOrg`);
            return res.sendStatus(200);
        }else if (type === "print"){
            const result = await request.query(`UPDATE tbl_social_media SET print_media_national = @updateprintMediaNational,print_media_regional  = @updateprintMediaRegional,print_media_overall = @updateprintMediaOverall,updated_by = @userID,updated_date = getDate() WHERE media_outreach_id  = @mediaOutreachIdOrg`);
            return res.sendStatus(200);
        }
        else if (type === "online"){
            const result = await request.query(`UPDATE tbl_social_media SET online_english = @updateEnglishdata,online_vernacular  = @updateVernacular,online_overall = @updateonlineOverall,updated_by = @userID,updated_date = getDate() WHERE media_outreach_id  = @mediaOutreachIdOrg`);
            return res.sendStatus(200);
        }
        else if  (type === "social"){
            const result = await request.query(`UPDATE tbl_social_media SET twitter_posts = @updateTwitterPosts,twitter_impression  = @updateTwitterImpression,twitter_engagement = @updateTwitterEngagement,instagram_posts = @updateInstagramPosts,instagram_impression = @updateInstagramImpression,instagram_engagement = @updateInstagramEngagement,facebook_posts = @updateFacebookPosts,facebook_impression = @updateFacebookImpression,facebook_engagement = @updateFacebookEngagement,linkedIn_posts = @updateLinkedInPosts,linkedIn_impression = @updateLinkedInImpression,linkedIn_engagement = @updateLinkedInEngagement,youTube_posts = @updateyoutubePosts,youTube_impression = @updateyoutubeImpression,youTube_engagement = @updateyoutubeEngagement,updated_by = @userID,updated_date = getDate() WHERE media_outreach_id  = @mediaOutreachIdOrg`);
            return res.sendStatus(200);
        }
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }



export default { createSocialMedia, getMonthlySocialParameter, getQuarterlySocialParameter, getAnnuallySocialMediaData, 
    getSocialMediaData, getMonthlyOnlineReport, getMonthlySocialReport, getMonthlyBroadPrintReport, getUpdateBroadcastmediadata, updateBroadcastmediadata };