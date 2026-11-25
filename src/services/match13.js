const MATCH13_BASE_URL = 'https://actions.match13.com';

export async function getMatch13TeamSeason(teamNumber, year) {
  const response = await fetch(
    `${MATCH13_BASE_URL}/v1/teams/${teamNumber}/years/${year}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MATCH13_API_KEY}`,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Match13 request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getPredictionsOdds(eventKey, type, number, set = 1) {
  const t = type.toLowerCase();
  let suffix;

  if (t === 'quals' || t === 'qual') {
    suffix = `qm${number}`;
  } else if (t === 'semis' || t === 'semifinals' || t === 'semi') {
    suffix = `sf${set}m${number}`;
  } else if (t === 'finals' || t === 'final') {
    suffix = `f1m${number}`;
  } else {
    throw new Error(`Invalid match type: "${type}"`);
  }

  const matchID = `${eventKey.toLowerCase().trim()}_${suffix}`;

  const response = await fetch(
      `${MATCH13_BASE_URL}/v1/matches/${matchID}`,    {
    method: 'GET',
      headers: {
          'Authorization': `Bearer ${process.env.MATCH13_API_KEY}`,
          'Content-Type': 'application/json',
        },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Match13 request failed with status ${response.status}`);
  }

  return response.json();
  
}
