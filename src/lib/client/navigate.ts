/**
 * Full page load of an internal path. Used after the session changes (sign in, sign out, two
 * factor setup) so the server layout reads the new cookies; client navigation would reuse the
 * cached layout with the old session.
 */
export function reloadTo(path: string): void {
  window.location.assign(new URL(path, window.location.origin).toString());
}
