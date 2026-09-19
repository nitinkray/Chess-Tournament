import pool from "./server.js";

import
    {delay,t_names,exec,tournament_registration,player_registration,
    round_registration,player_object,byes,colour,rating,
    matches,update_ratings,end_round,end_tournament
    } 
from "./tournament.js";

import {t_names} from "./seed.js";

let round_no = 1;

const random = (white, black, players) => {
    const w_r = players[white].rating;
    const b_r = players[black].rating;

    const e = 1 / (1 + 10 ** ((b_r - w_r) / 400));

    const whiteWin = e ;
    const r = Math.random();

    if (r < whiteWin) return 1;

    return 0;                                     
};

const sortids = (players,playerIds)=>{
    playerIds.sort((a, b) => players[b].rating - players[a].rating);
};

const recursion = async (connection,playerIds,t_id,players,ranks,bracket='Main') => {
    
    let n = playerIds.length;
    if (n===1) {
        ranks.push(playerIds[0]);
        return round_no;
    }

    const round_id = await round_registration(connection,t_id,round_no++,bracket);

    const pow = Math.ceil(Math.log2(n));
    const b = 2**pow - n;
    playerIds.push(...Array(b).fill('bye'));
    n = 2**pow;

    const winners=[],losers=[];

    for(let j=0;j<(n/2);j++){
        let left = playerIds[j],right = playerIds[n-j-1];
        let b = await byes(connection,round_id,left,right,players);
        
        if (b===false){
            const [white,black] = colour(players,left,right);
            const [winner,loser] = await matches(connection,round_id,white,black,players,random);
            winners.push(winner);
            losers.push(loser);
            await delay(700);
        }
        else{
            winners.push(b);
        }
    }
    
    await delay(1000);

    await end_round(connection,round_id);
    
    await recursion(connection,losers,t_id,players,ranks,'Consolation');
    await recursion(connection,winners,t_id,players,ranks);
};

const standings = async (connection,players,t_id,ranks)=>{
    let n = ranks.length;

    for(let i in ranks){
        await exec(
            connection,
            `INSERT INTO standings(tournament_id,player_id,matches,wins,draws,losses,byes,rating,\`rank\`) VALUES 
            (?,?,?,?,?,?,?,?,?);`,
            [t_id,ranks[i],players[ranks[i]].matches,players[ranks[i]].wins,players[ranks[i]].draws,players[ranks[i]].losses,players[ranks[i]].byes,players[ranks[i]].rating,n-i],
            "Failed to insert standings record"
        );
    }

    let standings = await exec(
        connection,
        `SELECT tournament_id,player_id,matches,wins,draws,losses,byes,rating,\`rank\`
        FROM standings WHERE tournament_id = ?
        ORDER BY \`rank\` ASC;`,
        [t_id],
        "Failed to retrieve standings\n"
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
        "Rating": row.rating
        }))
    );
};

export const knockout = async ()=>{
    const playerIds = [];

    const connection = await pool.getConnection();

    try{
        await connection.beginTransaction();
        let t_id = await tournament_registration(connection,playerIds,t_names(),'Knockout');
        const players = await player_object(connection,playerIds);
        sortids(players,playerIds);
        const ranks = [];
        console.log("\n\nTournament has begun!");
        await delay(1000);
        await recursion(connection,playerIds,t_id,players,ranks);
        await end_tournament(connection,t_id);
        await update_ratings(connection,players);
        await standings(connection,players,t_id,ranks);
        await connection.commit();
    } catch(err) {
        console.error(err.message ,"\nTransaction rolled back due to the above error. ");
        await connection.rollback();
    } finally {
        connection.release();
    }
};
