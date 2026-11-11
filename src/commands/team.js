import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getMatch13TeamSeason } from '../services/match13.js';
import { getStatboticsTeamYear } from '../services/statbotics.js';
import { getTeam, getTeamEventStatus, getTeamEvents } from '../services/tba.js';

export const data = new SlashCommandBuilder()
  .setName('team')
  .setDescription('Get information about an FRC team')
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('FRC team number')
      .setMinValue(1)
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('year')
      .setDescription('FRC season year')
      .setMinValue(1992)
      .setRequired(false),
  );

function findRelevantEvents(events) {
  const today = new Date().toISOString().slice(0, 10);

  const eventsWithDates = events.filter(
    (event) => event.start_date && event.end_date,
  );

  const nextEvent =
    eventsWithDates
      .filter((event) => event.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;

  const previousEvent =
    eventsWithDates
      .filter((event) => event.end_date < today)
      .sort((a, b) => b.end_date.localeCompare(a.end_date))[0] ?? null;

  return {
    nextEvent,
    previousEvent,
  };
}

function formatEventLocation(event) {
  return [event.city, event.state_prov, event.country]
    .filter(Boolean)
    .join(', ');
}

function formatEvent(event) {
  if (event == null) {
    return 'None Found';
  }

  const lines = [
    `[${event.name}](https://www.thebluealliance.com/event/${event.key})`,
    `${event.start_date} through ${event.end_date}`,
  ];

  const location = formatEventLocation(event);

  if (location) {
    lines.push(location);
  }

  return lines.join('\n');
}

function formatPreviousResult(event, status) {
  if (event === null) {
    return 'None found';
  }

  const lines = [
    `[${event.name}](https://www.thebluealliance.com/event/${event.key})`,
    `${event.start_date} through ${event.end_date}`,
  ];

  const ranking = status?.qual?.ranking;
  const record = ranking?.record;

  if (ranking?.rank !== undefined) {
    const totalTeams = status.qual.num_teams;

    lines.push(`Qualification rank: #${ranking.rank} of ${totalTeams}`);
  }

  if (record) {
    lines.push(
      `Qualification record: ${record.wins}-${record.losses}-${record.ties}`,
    );
  }

  if (status?.alliance?.name) {
    lines.push(`Alliance: ${status.alliance.name}`);
  }

  if (!ranking && !status?.alliance) {
    lines.push('Results not available');
  }

  return lines.join('\n');
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Not available';
  }

  return value.toFixed(2);
}

export async function execute(interaction) {
  const teamNumber = interaction.options.getInteger('number') ?? 4392;
  const year =
    interaction.options.getInteger('year') ?? new Date().getFullYear();

  await interaction.deferReply();

  const [[team, events], [match13Result, statboticsResult]] = await Promise.all(
    [
      Promise.all([getTeam(teamNumber), getTeamEvents(teamNumber, year)]),
      Promise.allSettled([
        getMatch13TeamSeason(teamNumber, year),
        getStatboticsTeamYear(teamNumber, year),
      ]),
    ],
  );

  if (team == null) {
    await interaction.editReply(`I couldn't find FRC Team ${teamNumber}`);
    return;
  }

  if (match13Result.status === 'rejected') {
    console.error('Match13 lookup failed:', match13Result.reason);
  }

  if (statboticsResult.status === 'rejected') {
    console.error('Statbotics lookup failed:', statboticsResult.reason);
  }

  const match13 =
    match13Result.status === 'fulfilled' ? match13Result.value : null;

  const statbotics =
    statboticsResult.status === 'fulfilled' ? statboticsResult.value : null;

  const xp = match13?.xp ?? null;

  const epa = statbotics?.epa?.total_points ?? match13?.epa ?? null;

  const { nextEvent, previousEvent } = findRelevantEvents(events);

  let previousStatus = null;

  if (previousEvent !== null) {
    previousStatus = await getTeamEventStatus(teamNumber, previousEvent.key);
  }

  const location = [team.city, team.state_prov, team.country]
    .filter(Boolean)
    .join(', ');

  const embed = new EmbedBuilder()
    .setColor(0x0066b3)
    .setTitle(`${team.nickname ?? team.name} - Team ${team.team_number}`)
    .setURL(`https://www.thebluealliance.com/team/${team.team_number}`)
    .setDescription(team.name)
    .addFields(
      {
        name: 'Location',
        value: location || 'Not Available',
        inline: true,
      },
      {
        name: 'Rookie year',
        value: String(team.rookie_year ?? 'Not available'),
        inline: true,
      },
      {
        name: 'Website',
        value: team.website || 'Not available',
        inline: false,
      },
      {
        name: `${year} analytics`,
        value: [
          `xP: ${formatNumber(xp)}`,
          `EPA: ${formatNumber(epa)}`,
          match13 ? `Match13 season rank: #${match13.rank}` : null,
          match13
            ? `Match13 percentile: ${formatNumber(match13.percentile)}`
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
        inline: false,
      },
      {
        name: `Next event in ${year}`,
        value: formatEvent(nextEvent),
        inline: false,
      },
      {
        name: `Previous event in ${year}`,
        value: formatPreviousResult(previousEvent, previousStatus),
        inline: false,
      },
    )
    .setFooter({
      text: 'Powered by The Blue Alliance • Analytics by Match13 and Statbotics',
    });

  await interaction.editReply({
    embeds: [embed],
  });
}
