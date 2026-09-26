// Waits for MySQL to accept connections before the simulator starts.
// Uses only the mysql2 dependency already in the image (no mysql client binary needed).
import "dotenv/config";
import mysql from "mysql2/promise";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= 60; attempt++) {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT ?? 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 5000
        });
        await conn.ping();
        console.log("[wait-for-db] Database is ready.");
        process.exit(0);
    } catch (err) {
        // Not ready yet — retry (first MySQL init can take 20–40 s)
        await sleep(1000);
    } finally {
        if (conn) {
            try { conn.end(); } catch { /* ignore */ }
        }
    }
}

console.error("[wait-for-db] Database not reachable after 60 seconds.");
process.exit(1);
