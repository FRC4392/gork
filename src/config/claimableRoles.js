const ROLE_DEFINITIONS = [
    {
        key: 'game-night',
        label: 'game night role',
        environmentVariable: 'GAME_NIGHT_ROLE_ID',
    },
    {
        key: 'lego-league-mentor',
        label: 'lego league mentor',
        environmentVariable: 'LEGO_LEAGUE_MENTOR_ROLE_ID',
    },
    {
        key: 'cad',
        label: 'cad',
        environmentVariable: 'CAD_ROLE_ID',
    },
    {
        key: 'programming',
        label: 'programming',
        environmentVariable: 'PROGRAMMING_ROLE_ID',
    },
];

export function getClaimableRoles() {
    const roles = ROLE_DEFINITIONS.map((definition) => ({
        key: definition.key,
        label: definition.label,
        roleId: process.env[definition.environmentVariable],
        environmentVariable: definition.environmentVariable,
    }));

    const missingRoles = roles.filter((role) => !role.roleId);

    if (missingRoles.length > 0) {
        const missingNames = missingRoles
            .map((role) => role.environmentVariable)
            .join(', ');

        throw new Error(`Missing role configuration: ${missingNames}`);
    }

    return roles;
}

export function findClaimableRole(key) {
    return getClaimableRoles().find((role) => role.key == key);
}
