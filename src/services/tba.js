const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';

async function tbaRequest(path) {
  const response = await fetch(`${TBA_BASE_URL}${path}`, {
    headers: {
      'X-TBA-Auth-Key': process.env.TBA_AUTH_KEY,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `TBA request to ${path} failed with status ${response.status}`,
    );
  }

  return response.json();
}

export async function getTeam(teamNumber) {
  return tbaRequest(`/team/frc${teamNumber}`);
}

export async function getTeamEvents(teamNumber, year) {
  const events = await tbaRequest(
    `/team/frc${teamNumber}/events/${year}/simple`,
  );

  return events ?? [];
}

export function getTeamEventStatus(teamNumber, eventKey) {
  return tbaRequest(`/team/frc${teamNumber}/event/${eventKey}/status`);
}
