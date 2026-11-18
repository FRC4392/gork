import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'; // this our discord crap like /commands and stuff and read messages
import { getMatch13TeamSeason, getGamblingOdds} from '../services/match13.js';
//import { getStatboticsTeamYear } from '../services/statbotics.js'; //stats  
//import { getTeam, getTeamEventStatus, getTeamEvents } from '../services/tba.js';

export const data = new SlashCommandBuilder()
  .setName('test_gamble')
  .setDescription('Gambling')
  .addStringOption((option) =>
    option
      .setName('event')
      .setDescription('TEST')
      .setRequired(true),
  ).addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Quals, finals')
      .setRequired(true)
  ).addIntegerOption((option) =>
    option
      .setName('match')
      .setDescription('what match select?')
      .setRequired(true)
);

  export async function execute(interaction) {
    const eventInput = interaction.options.getString('event');
    const typeInput = interaction.options.getString('type') ?? "Quals";
    const matchInput = interaction.options.getInteger('match');
    const set = /*interaction.options.getInteger('set') ??*/ 1;
  
    await interaction.deferReply();

try {
    // match 13 pull
    const gotGam = await getGamblingOdds(eventInput, typeInput, matchInput, set);

    console.log("Full gotGam response:", JSON.stringify(gotGam, null, 2));
    
    const teamsObj = gotGam?.teams;

    if (!teamsObj) {
      await interaction.editReply(`No team data was pulled.`);
      return;
    }

    const redGamProb = Math.round(gotGam.pred.winProb * 100);
    const blueGamProb = 100 - redGamProb;

    const blueTeams = Object.entries(teamsObj)
      .filter(([_, info]) => info.alliance === 'blue')
      .sort((a, b) => a[1].position - b[1].position)
      .map(([team]) => team);

    const redTeams = Object.entries(teamsObj)
      .filter(([_, info]) => info.alliance === 'red')
      .sort((a, b) => a[1].position - b[1].position)
      .map(([team]) => team);

    await interaction.editReply(
      `Match: ${gotGam.key}\n` +
      `Blue: ${blueTeams.join(', ')}\n` +
      `Red: ${redTeams.join(', ')}\n` +
      `Blue prob: ${blueGamProb}%\n` +
      `Red prob: ${redGamProb}%`
    );

  } catch (error) {
    console.error(error);
    await interaction.editReply(`Jacob caused an error.`);
  }
}