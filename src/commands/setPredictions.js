import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'; // this our discord crap like /commands and stuff and read messages
import { getMatch13TeamSeason, getPredictionsOdds} from '../services/match13.js';
//import { getStatboticsTeamYear } from '../services/statbotics.js'; //stats  
//import { getTeam, getTeamEventStatus, getTeamEvents } from '../services/tba.js';

export const data = new SlashCommandBuilder()
  .setName('test_prediction')
  .setDescription('prediction')
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
    const gotPre = await getPredictionsOdds(eventInput, typeInput, matchInput, set);

    console.log("Full gotPre response:", JSON.stringify(gotPre, null, 2));
    
    const teamsObj = gotPre?.teams;

    if (!teamsObj) {
      await interaction.editReply(`No team data was pulled.`);
      return;
    }

    const redPreProb = Math.round(gotPre.pred.winProb * 100);
    const bluePreProb = 100 - redPreProb;

    const blueTeams = Object.entries(teamsObj)
      .filter(([_, info]) => info.alliance === 'blue')
      .sort((a, b) => a[1].position - b[1].position)
      .map(([team]) => team);

    const redTeams = Object.entries(teamsObj)
      .filter(([_, info]) => info.alliance === 'red')
      .sort((a, b) => a[1].position - b[1].position)
      .map(([team]) => team);

    await interaction.editReply(
      `Match: ${gotPre.key}\n` +
      `Blue: ${blueTeams.join(', ')}\n` +
      `Red: ${redTeams.join(', ')}\n` +
      `Blue prob: ${bluePreProb}%\n` +
      `Red prob: ${redPreProb}%`
    );

  } catch (error) {
    console.error(error);
    await interaction.editReply(`Jacob caused an error.`);
  }
}
