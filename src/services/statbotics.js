const STATBOTICS_BASE_URL = 'https://api.statbotics.io/v3';

export async function getStatboticsTeamYear(teamNumber, year) {
    const response = await fetch(
        `${STATBOTICS_BASE_URL}/team_year/${teamNumber}/${year}`
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            `Statbotics request failed with status ${response.status}`
        );
    }

    return response.json();
}
