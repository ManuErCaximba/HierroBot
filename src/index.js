require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Client, IntentsBitField, GatewayIntentBits, Events, Collection } = require('discord.js');
const schedule = require('node-schedule');

const keepAlive = require('./server');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
    ],
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

let supabase;

// Bot Interactions

client.on('ready', async (c) => {
    console.log(`${c.user.tag} is online.`);
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    schedule.scheduleJob('0 0 10 * * *', assignBrontosaurios);
    schedule.scheduleJob('0 0 10 1 * *', assignForaneos);
    //await assignBrontosaurios();
    //await assignForaneos();
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const member = oldState.member || newState.member;
        let { data: info, error } = await supabase.from('Info').select('*').eq('memberId', member.id);

        if (!member) return;
    
        if (!newState.channel && oldState.channel) {
            const createdAt = await info[0].lastChecked;
            // saveInfoStored(info, member);
            insertEntry(createdAt, member)
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

// Bot slash commands

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    if (!interaction.isCommand()) return;

	if (interaction.commandName === 'change') {
        const subcommandName = interaction.options.getSubcommand();
		if (!(subcommandName === 'name' || subcommandName === 'color')) {
			await interaction.followUp({ content: 'Hubo un error ejecutando el comando', ephemeral: true });
		}
	} else if (interaction.commandName !== 'ping') {
        await interaction.followUp({ content: 'Hubo un error ejecutando el comando', ephemeral: true });
    }

	try {
		await client.commands.get(interaction.commandName).execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'Hubo un error ejecutando el comando', ephemeral: true });
		} else {
			await interaction.reply({ content: error, ephemeral: true });
		}
	}
});

// Functions

async function insertEntry(createdAt, member) {
    let { data: entry, error } = await supabase.from('Entry').insert([
        {
            id: crypto.randomUUID(),
            memberId: member.id,
            createdAt: new Date(Date.parse(createdAt)),
            finishedAt: new Date()
        },]);
    if (error) {
        console.log(error);
    }
}

async function updateLastChecked(info, member) {
    const lastChecked = new Date();
    if (info.length === 0) {
        await supabase.from('Info').insert([
            {
                memberId: member.id,
                displayName: member.displayName,
                lastChecked: lastChecked
            },]);
    } else {
        await supabase.from('Info')
            .update({ displayName: member.displayName, lastChecked: lastChecked })
            .eq('memberId', member.id);
    }
}

async function assignBrontosaurios() {
    const rthGuild = await client.guilds.cache.get(process.env.STG_SERVER_ID);
    const members = Array.from((await rthGuild.members.fetch())
        .filter(m => m._roles.includes('996053691704545362'))
        .values());
    const brontosaurio = await rthGuild.roles.fetch('1013023706609635398')
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - process.env.DAYS_CHECKED);
    members.forEach(async member => {
        let { data: entries, error } = await supabase.from('Entry').select('*').eq('memberId', member.id);
        let total = 0;
        let totalMonth = 0;
        entries.forEach(elem => {
            const createdAt = Date.parse(elem.createdAt);
            const finishedAt = Date.parse(elem.finishedAt);
            total += (finishedAt - createdAt) > 36000000 ? 36000000 : (finishedAt - createdAt);
            if (createdAt > monthAgo.getTime()) {
                totalMonth += (finishedAt - createdAt) > 36000000 ? 36000000 : (finishedAt - createdAt);
            }
        });
        const hours = total / 3600000;
        const hoursMonth = totalMonth / 3600000;
        if (hours >= process.env.BRONTOSAURIO_MIN && hoursMonth >= process.env.BRONTOSAURIO_MONTH_MIN) {
            member.roles.add(brontosaurio);
            //console.log(member.displayName + ": " + hours + "/" + hoursMonth + " (Poner bronto)");
        } else {
            member.roles.remove(brontosaurio);
            //console.log(member.displayName + ": " + hours + "/" + hoursMonth + " (Quitar bronto)")
        }
    });
}

async function assignForaneos() {
    const rthGuild = await client.guilds.cache.get(process.env.STG_SERVER_ID);
    const members = Array.from((await rthGuild.members.fetch())
        .filter(m => m._roles.includes('996053691704545362'))
        .values());
    const foraneo = await rthGuild.roles.fetch('1025751725778415638')
    members.forEach(async member => {
        let { data: entries, error } = await supabase.from('Entry').select('*').eq('memberId', member.id);
        if (entries.length === 0) {
            const joinedAtMs = new Date().getTime() - member.joinedAt.getTime();
            if (joinedAtMs > (86400000 * process.env.DAYS_CHECKED)) {
                member.roles.add(foraneo);
                //console.log(member.displayName + ": " + 0 + " (Poner foraneo)")
            }
        } else {
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - process.env.DAYS_CHECKED);
            let totalMonth = 0;
            entries.forEach(elem => {
                const createdAt = Date.parse(elem.createdAt);
                const finishedAt = Date.parse(elem.finishedAt);
                if (createdAt > monthAgo.getTime()) {
                    totalMonth += (finishedAt - createdAt) > 36000000 ? 36000000 : (finishedAt - createdAt);
                }
            });
            const hours = totalMonth / 3600000;
            if (hours <= process.env.FORANEO_MIN) {
                const joinedAtMs = new Date().getTime() - member.joinedAt.getTime();
                if (joinedAtMs > (86400000 * process.env.DAYS_CHECKED)) {
                    member.roles.add(foraneo);
                    //console.log(member.displayName + ": " + hours + " (Poner foraneo)")
                }
            }
        }
    })
}
