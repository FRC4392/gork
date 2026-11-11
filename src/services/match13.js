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
