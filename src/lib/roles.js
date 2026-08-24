// Roles that may see non-public content and mutate it. Single-sourced so the
// list can't drift between problem and test-case controllers.
const PRIVILEGED_ROLES = ['moderator', 'admin'];
const isPrivileged = (req) => !!req.user && PRIVILEGED_ROLES.includes(req.user.role);

module.exports = { PRIVILEGED_ROLES, isPrivileged };
