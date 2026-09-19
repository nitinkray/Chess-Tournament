import pool from "./server.js";
import { RoundRobin,DoubleRoundRobin } from "./RoundRobin.js";
import { knockout } from "./knockout.js";
import { scheveningen } from "./scheveningen.js";
import { input_t,close_input } from "./input.js";

async function main(){
    let tournament;

    try{
        tournament = await input_t();
    } catch(err) {
        console.error(err);
        close_input();
        return;
    }

    if (tournament==='Round Robin'){
        await RoundRobin();
    }
    else if (tournament==='Double Round Robin'){
        await DoubleRoundRobin();
    }
    else if (tournament==='Knockout'){
        await knockout();
    }
    else {
        await scheveningen();
    }

    close_input();
    pool.end();
}

main();