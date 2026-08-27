// Roles that may see non-public content and mutate it. Single-sourced so the
// list can't drift between problem and test-case controllers.
export const PRIVILEGED_ROLES = ['moderator', 'admin'];

// Structural, not `express.Request`: this only ever needs the role, so unit tests
// can pass a plain `{ user: { role } }` and any Request satisfies it too.
type MaybeAuthed = { user?: { role?: string } };

export const isPrivileged = (req: MaybeAuthed): boolean =>
  !!req.user?.role && PRIVILEGED_ROLES.includes(req.user.role);
