import { z } from "zod";

/**
 * Zod checks whether it may compile validators by calling Function(""). The Content Security
 * Policy forbids eval, so that probe is blocked and reported as a violation. Jitless mode skips
 * the probe and the compiler; validation results are the same.
 *
 * Imported for its side effect by the client providers (every page) and the form schemas.
 */
z.config({ jitless: true });
