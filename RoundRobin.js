import pool from "./server.js";

import {input_ids} from "./input.js";

import{
    delay,t_names,exec,tournament_registration,player_registration,update_ratings,
    end_round,end_tournament,sonneborn_berger,round_registration,
    player_object,byes,colour,rating,shuffle,matches,random
    } 
from "./tournament.js";

const rotate = (playerIds)=>{
    let n = playerIds.length;
    for(let i=n-2;i>0;i--){
        [playerIds[i],playerIds[i+1]] = [playerIds[i+1],playerIds[i]];
    }
}

const standings = async (connection,players,t_id)=>{
    for(let id in players){
        await exec(
            connection,
            `INSERT INTO standings(tournament_id,player_id,matches,wins,draws,losses,byes,points,rating,SB) VALUES 
            (?,?,?,?,?,?,?,?,?,?);`,
            [t_id,id,players[id].matches,players[id].wins,players[id].draws,players[id].losses,players[id].byes,players[id].points,players[id].rating,players[id].sum],
            "Failed to insert standings record"
        );
    }

    await exec(
        connection,
        `UPDATE standings s
        JOIN (
            SELECT tournament_id, player_id,
            DENSE_RANK() OVER (
                ORDER BY points DESC, SB DESC
            ) AS r
            FROM standings
            WHERE tournament_id = ?
        ) ranked
        ON s.tournament_id = ranked.tournament_id
        AND s.player_id = ranked.player_id
        SET s.\`rank\` = ranked.r
        WHERE s.tournament_id = ?;`,
        [t_id, t_id],
        "Failed to update standings ranks"
    );
    
    const standings = await exec(
        connection,
        `SELECT *
        FROM standings
        WHERE tournament_id = ?
        ORDER BY \`rank\`;`,
        [t_id],
        "Failed to display standings"
    );

    console.log("\n\nResults: ");
    console.table(
    standings.map(row => ({
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

const Robin = async (connection,playerIds,t_id,rounds)=>{

    const players = await player_object(connection,playerIds);

    console.log("\n\nTournament has begun!");

    shuffle(playerIds);

    const n = playerIds.length;

    for(let i=1;i<=rounds;i++){
        
        const round_id = await round_registration(connection,t_id,i,'Main');

        for(let j=0;j<(n/2);j++){
            let left = playerIds[j],right = playerIds[n-j-1];
            
            let b = await byes(connection,round_id,left,right,players);

            if (b===false){
                const [white,black] = colour(players,left,right);
                await matches(connection,round_id,white,black,players,random);
                await delay(700);
            }
        }
        
        await delay(1000);

        await end_round(connection,round_id);

        rotate(playerIds);
    }
    
    await end_tournament(connection,t_id);

    await update_ratings(connection,players);
    
    sonneborn_berger(players);

    await standings(connection,players,t_id);
};

export const RoundRobin = async ()=>{
    const playerIds = [];

    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        let t_id = await tournament_registration(connection,playerIds,t_names(),'Round Robin');
        if (playerIds.length%2!==0){
            playerIds.push('bye');
        }
        await delay(1000);
        await Robin(connection,playerIds,t_id,playerIds.length-1);
        await connection.commit();
    } catch(err) {
        console.error(err);
        console.error("\nTransaction rolled back due to the above error. ");
        await connection.rollback();
    } finally {
        connection.release();
    }
    // await pool.end();
};

export const DoubleRoundRobin = async ()=>{
    const playerIds = [];

    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        let t_id = await tournament_registration(connection,playerIds,t_names(),'Double Round Robin');
        if (playerIds.length%2!==0){
            playerIds.push('bye');
        }
        let l = playerIds.length;
        await delay(1000);
        await Robin(connection,playerIds,t_id,2*(l-1));
        await connection.commit();
    } catch(err) {
        console.error(err.message ,"\nTransaction rolled back due to the above error. ");
        await connection.rollback();
    } finally {
        connection.release();
    }
    // await pool.end();
};

// RoundRobin();
// DoubleRoundRobin();