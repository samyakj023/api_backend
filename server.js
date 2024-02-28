require('dotenv').config()


const express = require('express');
const app = express();

const mysql = require('mysql2');

app.use(express.json());
// Set middleware of CORS 
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "http://127.0.0.1:5500"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,CONNECT,TRACE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Private-Network", true);
  //  Firefox caps this at 24 hours (86400 seconds). Chromium (starting in v76) caps at 2 hours (7200 seconds). The default value is 5 seconds.
  res.setHeader("Access-Control-Max-Age", 7200);

  next();
});
// Connecting to the database
const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DB_NAME,
    port:process.env.DATA_PORT,
    Promise: require('bluebird') // Specify Promise library for mysql2
});
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Database connected successfully!');
      
    }
});


// API to print last week's country codes
app.get('/api/lastweek/countrycodes', async (req, res) => {
    try {
        const lastWeekCountryCodesResult = await pool.promise().query(`
            SELECT DISTINCT Country
            FROM leaderboard 
            WHERE YEARWEEK(TimeStamp, 1) = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 1) 
        `);
        if (lastWeekCountryCodesResult[0].length === 0) {
            console.log("No country codes found for last week");
        } else {
            const lastWeekCountryCodes = lastWeekCountryCodesResult[0].map(row => row.Country);
         //   console.log("Country codes from last week:", lastWeekCountryCodes);
            res.status(200).json(lastWeekCountryCodes);
        }
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: err });
    }
});

// API to print distinct UIDs
app.get('/api/alluids', async (req, res) => {
    try {
        const allUserIdsResult = await pool.promise().query(`
            SELECT  DISTINCT UID
            FROM leaderboard
        `);
        
        const allUserIds = allUserIdsResult[0].map(row => row.UID);
       // console.log("All User IDs:", allUserIds); // Log all distinct user IDs
        res.status(200).json(allUserIds);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: err });
    }
});

app.get('/api/currentweek', async (req, res) => {
    try {
     //   console.log("samyak jain")
        const data = await pool.promise().query("SELECT UID, Name, Score, Country, TimeStamp FROM leaderboard WHERE YEARWEEK(TimeStamp, 1) = YEARWEEK(CURDATE(), 1) ORDER BY Score DESC LIMIT 200 " );
     //   console.log("Data:", data[0]);
        res.send(data[0])
        /** in output
        The "T" separates the date portion from the time portion of the timestamp.
The "Z" indicates that the time is in UTC (Coordinated Universal Time) timezone. 
         */
    } catch (err) {
        res.status(500).json({ message: err })
    }
});

app.get('/api/lastweek/:country', async (req, res) => {
    try {
        const { country } = req.params; // Retrieve the country parameter from the request
        const data = await pool.promise().query(`
            SELECT UID, Name, Score, Country, TimeStamp
            FROM leaderboard 
            WHERE Country = ? 
                AND YEARWEEK(TimeStamp, 1) = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 1) 
            ORDER BY Score DESC 
            LIMIT 200
        `, [country]);
        res.status(200).json(data[0]);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: err });
    }
});


app.get('/api/userrank/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // Retrieve the user ID from the URL path parameters
        // Ensure userId is not empty
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        
        // Fetch user rank query
        const userRankResult = await pool.promise().query(`
            SELECT COUNT(*) AS \`rank\`
            FROM leaderboard
            WHERE Score > (SELECT MAX(Score) FROM leaderboard WHERE UID = ?)
        `, [userId]);

        if (userRankResult[0].length === 0) {
            // If no rows are returned, it means the user ID is not found
            res.status(404).json({ message: "User not found" });
        } else {
            const userRank = userRankResult[0][0].rank + 1; // Add 1 to rank to start from 1 instead of 0
            res.status(200).json({ userId: userId, rank: userRank });
        }
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});





app.listen(process.env.PORT, () => {
    console.log("server listening on port " + process.env.PORT)
});
