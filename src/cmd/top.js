const Discord = require('discord.js');
const cs = require('../services/common.service');
const scrape = require('../services/pubg.service');
const sql = require('../services/sql.service');

exports.run = async (bot, msg, params) => {
    let amount = 10;
    if(params[0] && !isNaN(params[0])) {
        amount = +params[0];
    }
    let serverDefaults = await sql.getServerDefaults(msg.guild.id);
    let season = cs.getParamValue('season=', params, serverDefaults.default_season);
    let region = cs.getParamValue('region=', params, serverDefaults.default_region);
    let mode = cs.getParamValue('mode=', params, serverDefaults.default_mode);
    let squadSize = +cs.getParamValue('squadSize=', params, serverDefaults.default_squadsize);
    let squadSizeString = '';

    switch(squadSize) {
        case 1:
            squadSizeString = 'Solo';
            break;
        case 2:
            squadSizeString = 'Duo';
            break;
        case 4:
            squadSizeString = 'Squad';
            break;
    }
    
    msg.channel.send('Aggregating top ' + amount + ' ... give me a second');
    msg.channel.send('Grabbing individual player data')
        .then(async (msg) => {
            let registeredPlayers = await sql.getRegisteredPlayersForServer(msg.guild.id);
            if(registeredPlayers.length === 0) {
                msg.channel.send('No users registered yes. Use `pubg-addUser <username>`');
                return;
            }
            
            let playersInfo = new Array();
            for(let i = 0; i < registeredPlayers.length; i++) {
                let player = registeredPlayers[i];
                msg.edit('(' + (i+1)  + '/' + registeredPlayers.length + '): Getting data for ' + player.username);
                let id = await scrape.getCharacterID(player.username);
                let characterInfo = await scrape.getPUBGCharacterData(id, player.username, season, region, squadSize, mode);
                playersInfo.push(characterInfo);
            }

            // Sorting Array based off of ranking (higher ranking is ranking)
            playersInfo.sort(function(a, b){ return b.ranking - a.ranking; });

            let topPlayers = playersInfo.slice(0, amount);

            let embed = new Discord.RichEmbed()
                .setTitle('Top ' + amount + ' local players -- ' + squadSizeString + ' ' + mode.toUpperCase())
                .setDescription('Season:\t' + season + '\nRegion:\t' + region.toUpperCase())
                .setColor(0x00AE86)
                .setFooter('Data retrieved from https://pubg.op.gg/')
                .setTimestamp();

            let names = '';
            let ranks = '';
            let topPercents = '';

            // Construct top strings
            for (var i = 0; i < topPlayers.length; i++) {
                var character = topPlayers[i];
                names += character.nickname + '\n';
                ranks += character.ranking + '\n';
                topPercents += character.topPercent + '\n';
            }

            embed.addField('Name', names, true)
                .addField('Rank', ranks, true)
                .addField('Top %', topPercents, true);
            msg.edit({ embed });
        });
};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: [],
    permLevel: 0
};

exports.help = {
    name: 'top',
    description: 'Gets the top "x" players registered in the server',
    usage: '<prefix>top [Number-Of-Users] [season=(2018-01 | 2018-02 | 2018-03)] [region=(na | as | kr/jp | kakao | sa | eu | oc | sea)] [squadSize=(1 | 2 | 4)] [mode=(fpp | tpp)]',
    examples: [
        '!pubg-top',
        '!pubg-top season=2018-03',
        '!pubg-top season=2018-03 region=na',
        '!pubg-top season=2018-03 region=na squadSize=4',
        '!pubg-top season=2018-03 region=na squadSize=4 mode=tpp',
        '!pubg-top 5',
        '!pubg-top 5 season=2018-03',
        '!pubg-top 5 season=2018-03 region=na', 
        '!pubg-top 5 season=2018-03 region=na squadSize=4', 
        '!pubg-top 5 season=2018-03 region=na squadSize=4 mode=tpp',
        
    ]
};