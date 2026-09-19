import pool from "./server.js";

import {input_ids} from "./input.js";

import{
    delay,t_names,exec,update_ratings,end_round,end_tournament,sonneborn_berger,
    round_registration,player_object,colour,rating,shuffle,matches,player_registration,random
    } 
from "./tournament.js";

import {t_names} from "./seed.js";

const rotate = (playerIds)=>{
    let n = playerIds.length;
    for(let i=n-2;i>=0;i--){
        [playerIds[i],playerIds[i+1]] = [playerIds[i+1],playerIds[i]];
    }
};

const team_registration = async (connection,t_a,t_b,t_id)=>{
    const name_a = t_names();
    let name_b = t_names();

    while(name_b === name_a){
        name_b = t_names();
    }
    
    const r_a = await exec(
        connection,
        `INSERT INTO teams(tournament_id,name) VALUES(?,?)`,
        [t_id,name_a],
        "Failed to register team A"
    );
    const a_id = r_a.insertId;

    const r_b = await exec(
        connection,
        `INSERT INTO teams(tournament_id,name) VALUES (?,?)`,
        [t_id,name_b],
        "Failed to register team B"
    );
    const b_id = r_b.insertId;
    
    for(let id of t_a){
        await exec(
            connection,
            `INSERT INTO team_players(team_id,player_id) VALUES (?,?)`,
            [a_id,id],
            "Failed to register team A players"
        );
    }

    for(let id of t_b){
        await exec(
            connection,
            `INSERT INTO team_players(team_id,player_id) VALUES (?,?)`,
            [b_id,id],
            "Failed to register team B players"
        );
    }
};

const tournament_registration = async (connection,t_a,t_b,t_name,t_type)=>{

    const a_ids = await input_ids(connection,"Enter player IDs for team A (comma-separated): ");
    const b_ids = await input_ids(connection,"Enter player IDs for team B (comma-separated): ");

    if(a_ids.length!==b_ids.length){
        throw new Error("Both teams should have same no. of players!");
    }

    if (new Set([...a_ids,...b_ids]).size !== a_ids.length + b_ids.length){
        throw new Error("Both teams should not contain common player(s)");
    }

    t_a.push(...a_ids);
    t_b.push(...b_ids);

    const rows = await exec(
        connection,
        "INSERT INTO tournaments(name,type) VALUES (?,?);",
        [t_name,t_type],
        "Failed to register the tournament"
    );

    const t_id = rows.insertId;
    
    await player_registration(connection,[...t_a, ...t_b],t_id);
    await team_registration(connection,t_a,t_b,t_id);

    return t_id;
};

const standings = async (connection,players,t_id,t_a,t_b)=>{
    for(let id in players){
        await exec(
            connection,
            `INSERT INTO standings(tournament_id,player_id,matches,wins,draws,losses,byes,points,rating,SB) VALUES 
            (?,?,?,?,?,?,?,?,?,?);`,
            [t_id,id,players[id].matches,players[id].wins,players[id].draws,players[id].losses,players[id].byes,players[id].points,players[id].rating,players[id].sum],
            "Failed to insert standings record"
        );
    }

    const placeholders = t_a.map(() => '?').join(',');

    await exec(
        connection,
        `UPDATE standings s
        JOIN (
            SELECT tournament_id, player_id,
            DENSE_RANK() OVER (
                ORDER BY points DESC, SB DESC
            ) AS r
            FROM standings
            WHERE tournament_id = ? AND player_id IN (${placeholders})
        ) ranked
        ON s.tournament_id = ranked.tournament_id
        AND s.player_id = ranked.player_id
        SET s.\`rank\` = ranked.r
        WHERE s.tournament_id = ?;`,
        [t_id,...t_a,t_id],
        "Failed to update team A's standings"
    );
    
    await exec(
        connection,
        `UPDATE standings s
        JOIN (
            SELECT tournament_id, player_id,
            DENSE_RANK() OVER (
                ORDER BY points DESC, SB DESC
            ) AS r
            FROM standings
            WHERE tournament_id = ? AND player_id IN (${placeholders})
        ) ranked
        ON s.tournament_id = ranked.tournament_id
        AND s.player_id = ranked.player_id
        SET s.\`rank\` = ranked.r
        WHERE s.tournament_id = ?;`,
        [t_id,...t_b,t_id],
        "Failed to update team B's standings"
    );
    
    const a_standings = await exec(
        connection,
        `SELECT *
        FROM standings
        WHERE tournament_id = ?
        AND player_id IN (${placeholders})
        ORDER BY \`rank\`;`,
        [t_id,...t_a],
        "Failed to display A's standings"
    );

    const b_standings = await exec(
        connection,
        `SELECT *
        FROM standings
        WHERE tournament_id = ?
        AND player_id IN (${placeholders})
        ORDER BY \`rank\`;`,
        [t_id,...t_b],
        "Failed to display standings"
    );

    const a_points = t_a.reduce(
        (sum,id) => sum + players[id].points, 0
    );

    const b_points = t_b.reduce(
        (sum,id) => sum + players[id].points, 0
    );

    console.log(`\n\nTeam A: ${a_points} points`);
    console.log(`Team B: ${b_points} points`);

    if(a_points > b_points){
        console.log("Team A wins!");
    }
    else if(b_points > a_points){
        console.log("Team B wins!");
    }
    else{
        console.log("The tournament is drawn!");
    }

    console.log("\n\nResults of Team A: ");
    console.table(
    a_standings.map(row => ({
        "Tournament ID": row.tournament_id,
        "Rank": row.rank,
        "Player ID": row.player_id,
        "Matches": row.matches,
        "Wins": row.wins,
        "Losses": row.losses,
        "Draws": row.draws,
        "Byes": row.byes,
        "Points": row.points,
        "S-B": row.SB,
        "Rating": row.rating
        }))
    );

    console.log("\n\nResults of Team B: ");
    console.table(
    b_standings.map(row => ({
        "Tournament ID": row.tournament_id,
        "Rank": row.rank,
        "Player ID": row.player_id,
        "Matches": row.matches,
        "Wins": row.wins,
        "Losses": row.losses,
        "Draws": row.draws,
        "Byes": row.byes,
        "Points": row.points,
        "S-B": row.SB,
        "Rating": row.rating
        }))
    );
};

const pairing = async (connection,t_a,t_b,t_id)=>{
    const players = await player_object(connection,[...t_a,...t_b]);

    console.log("\n\nTournament has begun!");

    shuffle(t_b);

    const n = t_a.length;
    
    for(let i=0;i<n;i++){
        const round_id = await round_registration(connection,t_id,i+1,'Main');
        for(let j=0;j<n;j++){
            let left = t_a[j],right = t_b[j];
            const [white,black] = colour(players,left,right);
            await matches(connection,round_id,white,black,players,random);
            await delay(700);
        }
        
        await delay(1000);

        await end_round(connection,round_id);

        rotate(t_b);
    }
    await end_tournament(connection,t_id);

    await update_ratings(connection,players);
    
    sonneborn_berger(players);

    await standings(connection,players,t_id,t_a,t_b);
};

export const scheveningen = async ()=>{
    const t_a = [];
    const t_b = [];

    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        let t_id = await tournament_registration(connection,t_a,t_b,t_names(),'Scheveningen');
        await delay(1000);
        await pairing(connection,t_a,t_b,t_id);
        await connection.commit();
    } catch(err) {
        // console.error(errMsg);
        console.error(err);
        console.error("\nTransaction rolled back due to the above error. ");
        await connection.rollback();
    } finally {
        connection.release();
    }
    // await pool.end();
};

// scheveningen();