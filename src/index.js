require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { Info, DateTuple } = require('./model');
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

const users = new Map();
let infoStored;
let dataChannel;
let logChannel;
let msgPromise;

// Bot Interactions

client.on('ready', async (c) => {
    dataChannel = client.channels.cache.get('1094541717006454805');
    logChannel = client.channels.cache.get('1096893907230523402');
    console.log(`${c.user.tag} is online.`);
    infoStored = await fetchInfoStored();
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = oldState.member || newState.member;
    if (!member) return;

    if (!newState.channel && oldState.channel) {
        let data = await fetchData(member);
        if (data.length === 0) return;
        saveInfoStored(data, member);
    } else if (!oldState.channel && newState.channel) {
        const now = new Date();
        const startTime = now.getTime();
        const startDate = now.getDate() + "-" + (now.getMonth() + 1) + "-" + now.getFullYear();
        users.set(member.id, new DateTuple(startDate, startTime));
    }
});

//keepAlive();
client.login(process.env.TOKEN);

// Functions

async function fetchInfoStored() {
    const msg = await dataChannel.messages.fetch({ limit: 1 });
    try {
        return JSON.parse(msg.entries().next().value[1].content);
    } catch (e) {
        return [];
    }
}

async function saveInfoStored(data, member) {
    try {
        const info = new Info(member.id, member.displayName);
        if (infoStored.length === 0) {
            info.data = data
            infoStored = [info];
            msgPromise = await dataChannel.send(JSON.stringify(infoStored));
        } else {
            let elemIndex = await findElementIndex(infoStored, info.id);
            if (elemIndex === undefined || elemIndex === null) {
                info.data = data
                infoStored.push(info);
            } else {
                const memberInfoStored = infoStored[elemIndex];
                const dataUpdated = await updateData(memberInfoStored, data);
                const isUpdated = JSON.stringify(dataUpdated) === JSON.stringify(data) ? false : true;
                await updateDataEntries(memberInfoStored);
                if (isUpdated) {
                    memberInfoStored.data.pop();
                }
                dataUpdated.forEach((elem) => {
                    memberInfoStored.data.push(elem);
                });
                infoStored.splice(elemIndex, 1, memberInfoStored);
            }
            msgPromise.edit(JSON.stringify(infoStored));
        }
    } catch (e) {
        await logChannel.send(e);
    }
}

function updateDataEntries(memberInfoStored) {
    const dataStored = [...memberInfoStored.data];
    memberInfoStored.data.every((elem) => {
        const dateSplitted = elem.date.split("-");
        const elemDate = new Date(dateSplitted[2], dateSplitted[1], dateSplitted[0]);
        const lastDayCounted = new Date();
        lastDayCounted.setDate(lastDayCounted - process.env.DAYS_CHECKED);
        if (elemDate >= lastDayCounted) {
            dataStored.shift();
        } else {
            return false;
        }
        return true;
    });
    memberInfoStored.data = dataStored;
}

function updateData(memberInfoStored, data) {
    const dataStored = memberInfoStored.data;
    const lastDayStored = dataStored[dataStored.length - 1].date;
    if (data[0].date === lastDayStored) {
        let lastDayTimeUpdated = dataStored[dataStored.length - 1].time;
        lastDayTimeUpdated += data[0].time;
        if (data.length === 1) {
            return [new DateTuple(lastDayStored, lastDayTimeUpdated)];
        } else {
            return [new DateTuple(lastDayStored, lastDayTimeUpdated), new DateTuple(data[1].date, data[1].time)];
        }
    } else {
        return data;
    }
}

async function fetchData(member) {
    try {
        const startTime = users.get(member.id).time;
        const startDate = users.get(member.id).date;
        if (!startTime) return [];
    
        const now = new Date();
        const endDate = now.getDate() + "-" + (now.getMonth() + 1) + "-" + now.getFullYear();
        if (startDate === endDate) {
            const totalTime = now.getTime() - startTime;
            return [new DateTuple(startDate, totalTime)];
        } else {
            const atZeroTime = now;
            atZeroTime.setHours(0, 0, 0, 0);
            const todayTime = now.getTime() - atZeroTime;
            const yesterdayTime = atZeroTime - startTime;
            return [new DateTuple(startDate, yesterdayTime), new DateTuple(endDate, todayTime)];
        }
    } catch (e) {
        await logChannel.send(e);
    }
}

function findElementIndex(arr, id) {
    let elemIndex;
    arr.every((elem, index) => {
        if (elem.id == id) {
            elemIndex = index;
            return false;
        }
        return true;
    });
    return elemIndex;
}
