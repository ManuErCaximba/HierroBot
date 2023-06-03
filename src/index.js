require('dotenv').config();

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Client, IntentsBitField } = require('discord.js');
const { Info, DateTuple } = require('./model');
const schedule = require('node-schedule');

const keepAlive = require('./server');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
    ],
});

let supabase;

// Bot Interactions

client.on('ready', async (c) => {
    console.log(`${c.user.tag} is online.`);
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    schedule.scheduleJob('0 0 10 * * *', assignBrontosaurios);
    schedule.scheduleJob('0 0 10 1 * *', assignForaneos);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const member = oldState.member || newState.member;
        let { data: info, error } = await supabase.from('Info').select('*').eq('id', Number(member.id));

        if (!member) return;
    
        if (!newState.channel && oldState.channel) {
            saveInfoStored(info, member);
            updateLastChecked(info, member)
        } else if (!oldState.channel && newState.channel) {
            updateLastChecked(info, member)
        }
   } catch (e) {
       await logChannel.send(e.stack);
   }
    
});

keepAlive();
client.login(process.env.TOKEN);

// Functions

async function updateLastChecked(info, member) {
    if (info.length === 0) {
        await supabase.from('Info').insert([
            {
                id: Number(member.id),
                displayName: member.displayName,
                lastChecked: new Date()
            },]);
    } else {
        await supabase.from('Info')
            .update({ lastChecked: new Date() })
            .eq('id', Number(member.id));
    }
}

async function saveInfoStored(info) {
    try {
        const infoToSave = generateDateTuples(info);
        infoToSave.forEach(async (elem) => {
            await supabase.from('DateTuple').insert([
                {
                    id: elem.id,
                    memberId: elem.memberId,
                    date: elem.date,
                    millisec: elem.millisec
                },]);
        });
    } catch (e) {
        console.log(e.stack);
    }
}

function generateDateTuples(info) {
    try {
        const infoToSave = []
        let lastChecked = new Date(info[0].lastChecked);
        lastChecked.setDate(lastChecked.getDate() - 1);
        const now = new Date();
        const todayDate = now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate();
        if (now.getDate() !== lastChecked.getDate()) {
            let atZero = new Date();
            atZero.setHours(0, 0, 0, 0);
            const todayTime = now - atZero;
            const yesterdayTime = atZero - lastChecked;
            const yesterdayDate = lastChecked.getFullYear() + "/" + (lastChecked.getMonth() + 1) + "/" + lastChecked.getDate();
            infoToSave.push(new DateTuple(crypto.randomUUID(), info[0].id, yesterdayDate, yesterdayTime));
            infoToSave.push(new DateTuple(crypto.randomUUID(), info[0].id, todayDate, todayTime));
        } else {
            const todayTime = now - lastChecked;
            infoToSave.push(new DateTuple(crypto.randomUUID(), info[0].id, todayDate, todayTime));
        }
        return infoToSave;
    } catch (e) {
        console.log(e.stack);
    }
}

async function assignBrontosaurios() {
    let { data: userBDIds, error } = await supabase.from('Info').select('id');
    const rthGuild = await client.guilds.cache.get(process.env.STG_SERVER_ID);
    const userGuildIds = Array.from((await rthGuild.members.fetch())
        .filter(m => m._roles.includes('996053691704545362'))
        .map(m => Number(m.id))
        .values());
    const members = Array.from((await rthGuild.members.fetch()).values());
    const userIds = userBDIds.filter(value => userGuildIds.includes(value.id));
    const brontosaurio = await rthGuild.roles.fetch('1013023706609635398')
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - process.env.DAYS_CHECKED);
    userIds.forEach(async elem => {
        const member = await members.filter(m => m.id == elem.id)[0]
        const b = member.displayName;
        const a = monthAgo.getTime();
        let { data: millisecs, error } = await supabase.from('DateTuple').select('millisec').eq('memberId', elem.id).gte('date', (monthAgo.toISOString()).toLocaleString('es-ES'));
        let total = 0;
        millisecs.forEach(elem => {
            total += elem.millisec > 36000000 ? 36000000 : elem.millisec;
        });
        const hours = total / 3600000;
        if (hours >= process.env.BRONTOSAURIO_MIN) {
            member.roles.add(brontosaurio);
            // console.log(member.displayName + ": " + hours + " (Poner bronto)");
        } else {
            member.roles.remove(brontosaurio);
            // console.log(member.displayName + ": " + hours + " (Quitar bronto)")
        }
    });
}

async function assignForaneos() {
    const rthGuild = await client.guilds.cache.get(process.env.STG_SERVER_ID);
    const userGuildIds = Array.from((await rthGuild.members.fetch())
        .filter(m => m._roles.includes('996053691704545362'))
        .map(m => Number(m.id))
        .values());
    const members = Array.from((await rthGuild.members.fetch()).values());
    const foraneo = await rthGuild.roles.fetch('1025751725778415638')
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - process.env.DAYS_CHECKED);
    for (var id of userGuildIds) {
        let { data: userBDIds, error } = await supabase.from('Info').select('id').eq('id', id);
        const member = await members.filter(m => m.id == id)[0]
        if (userBDIds.length === 0) {
            const joinedAtMs = new Date().getTime() - member.joinedAt.getTime();
            if (joinedAtMs > (86400000 * process.env.DAYS_CHECKED)) {
                member.roles.add(foraneo);
                // console.log(member.displayName + ": " + 0 + " (Poner foraneo)")
            }
        } else {
            let { data: millisecs, error } = await supabase.from('DateTuple').select('millisec').eq('memberId', id).gte('date', (monthAgo.toISOString()).toLocaleString('es-ES'));
            let total = 0;
            millisecs.forEach(elem => {
                total += elem.millisec;
            });
            const hours = total / 3600000;
            if (hours <= process.env.FORANEO_MIN) {
                const joinedAtMs = new Date().getTime() - member.joinedAt.getTime();
                if (joinedAtMs > (86400000 * process.env.DAYS_CHECKED)) {
                    member.roles.add(foraneo);
                    // console.log(member.displayName + ": " + 0 + " (Poner foraneo)")
                }
            }
        }
    }
}
