import { randomInt } from "node:crypto";

/**
 * Generated credentials for accounts EXPLR staff hand out on paper: camp
 * student logins and admin-created instructor passphrases. Everything here
 * uses the CSPRNG (`crypto.randomInt`), never `Math.random`, and the word
 * lists are large enough that a printed-card format stays guessing-resistant
 * together with Supabase's sign-in throttle.
 */

/** Pick one element with a cryptographically secure index. */
export const pickRandom = <T>(arr: readonly T[]): T => arr[randomInt(arr.length)]!;

/** `n` random decimal digits, as a string (leading zeros allowed). */
export function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(randomInt(10));
  return s;
}

/** Short suffix without ambiguous characters (no 0/o/1/l): read off a printed sheet. */
export function randomSuffix(len = 4): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[randomInt(chars.length)];
  return s;
}

// 48 x 48 words x 90 numbers = about 207,000 camp passwords. Kid-readable,
// no near-homophones, nothing that looks like another word when printed.
export const CAMP_ADJECTIVES = [
  "brave",
  "bright",
  "calm",
  "clever",
  "cosmic",
  "eager",
  "fair",
  "gentle",
  "happy",
  "jolly",
  "keen",
  "kind",
  "lucky",
  "merry",
  "noble",
  "proud",
  "quick",
  "smart",
  "sunny",
  "swift",
  "warm",
  "wise",
  "bold",
  "busy",
  "cool",
  "cozy",
  "fancy",
  "fresh",
  "funny",
  "giant",
  "golden",
  "handy",
  "lively",
  "mighty",
  "misty",
  "neat",
  "nifty",
  "peppy",
  "plucky",
  "rapid",
  "rosy",
  "shiny",
  "silly",
  "snappy",
  "sparky",
  "spry",
  "tidy",
  "zesty",
] as const;

export const CAMP_ANIMALS = [
  "otter",
  "falcon",
  "panda",
  "tiger",
  "robin",
  "lynx",
  "moose",
  "heron",
  "koala",
  "gecko",
  "raven",
  "puma",
  "bison",
  "crane",
  "finch",
  "shark",
  "wolf",
  "hawk",
  "seal",
  "fox",
  "badger",
  "beaver",
  "camel",
  "cobra",
  "dolphin",
  "eagle",
  "ferret",
  "gopher",
  "ibis",
  "jaguar",
  "kitten",
  "lemur",
  "llama",
  "magpie",
  "newt",
  "ocelot",
  "osprey",
  "parrot",
  "pelican",
  "quail",
  "rabbit",
  "salmon",
  "sparrow",
  "toucan",
  "turtle",
  "walrus",
  "yak",
  "zebra",
] as const;

/** A simple, readable password kids can type from a card: "brave-otter-47". */
export function makeCampPassword(): string {
  return `${pickRandom(CAMP_ADJECTIVES)}-${pickRandom(CAMP_ANIMALS)}-${randomInt(10, 100)}`;
}

// 40 words: three of them plus a 3-digit number is about 57 million passphrases.
export const STAFF_WORDS = [
  "river",
  "maple",
  "comet",
  "harbor",
  "willow",
  "summit",
  "pine",
  "delta",
  "aspen",
  "cedar",
  "meadow",
  "canyon",
  "glacier",
  "prairie",
  "orchard",
  "lagoon",
  "ember",
  "granite",
  "juniper",
  "marble",
  "nectar",
  "quartz",
  "saffron",
  "timber",
  "tundra",
  "velvet",
  "walnut",
  "zephyr",
  "beacon",
  "compass",
  "anchor",
  "lantern",
  "mosaic",
  "pebble",
  "ripple",
  "saddle",
  "thistle",
  "trellis",
  "violet",
  "wander",
] as const;

/** Admin-created instructor passphrase: "river-maple-comet-482". */
export function makeStaffPassword(): string {
  const w = () => pickRandom(STAFF_WORDS);
  return `${w()}-${w()}-${w()}-${randomInt(100, 1000)}`;
}
