import type { FileData } from '../store';

const SHORT_TITLE_TOKEN_THRESHOLD = 3;
const SHORT_TITLE_MATCH_THRESHOLD = 0.6;
const DEFAULT_MATCH_THRESHOLD = 0.7;
const MIN_CONTAINMENT_LENGTH = 6;
const MIN_AUTHOR_LENGTH = 3;

/**
 * Tokens that are commonly sprinkled into cloud track titles but do not
 * identify a specific song. Stripping them lets a messy cloud title like
 * "Artist - Track (Extended Mix) [Free Download]" still match the tidy
 * local filename "Artist - Track".
 */
const TRACK_NOISE_TOKENS = new Set([
  'and',
  'audio',
  'bootleg',
  'bpm',
  'cut',
  'demo',
  'dl',
  'download',
  'edit',
  'extended',
  'flac',
  'free',
  'hd',
  'hq',
  'instrumental',
  'intro',
  'live',
  'lyric',
  'lyrics',
  'mix',
  'mp3',
  'music',
  'official',
  'original',
  'outro',
  'premiere',
  'prod',
  'produced',
  'radio',
  'reboot',
  'recording',
  'remaster',
  'remastered',
  'remix',
  'rework',
  'rip',
  'sd',
  'session',
  'version',
  'video',
  'vip',
  'visualizer',
  'wav',
]);

/**
 * All common Unicode apostrophe / prime variants. They are removed (not
 * replaced with a space) so contractions like "don't" stay one token
 * regardless of which quote character the source uses.
 */
const APOSTROPHES = /[\u0027\u0060\u00B4\u02B9\u02BB\u02BC\u2018\u2019\u201B\u2032]/g;

const FEATURING_MARKER = /\b(?:feat|featuring|ft)\.?\b/g;

const NUMERIC_TOKEN = /^\d+$/;

/** Leading track-number tokens in filenames like "01 Artist - Track". */
const LEADING_TRACK_NUMBER = /^\d{1,2}$/;

const BRACKETED_SEGMENT = /\(([^()]*)\)|\[([^[\]]*)\]/g;

/** Separates the author from the track name, as in "Author - Track Name". */
const AUTHOR_SEPARATOR = /\s+[-\u2013\u2014]\s+/;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const normalizeTrackName = (input: string): string =>
  collapseWhitespace(
    input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(APOSTROPHES, '')
      .replace(FEATURING_MARKER, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' '),
  );

const isNoiseToken = (token: string): boolean => NUMERIC_TOKEN.test(token) || TRACK_NOISE_TOKENS.has(token);

/**
 * Drops bracketed segments made only of numbers and noise words, such as "(2019 Remaster)", "[128 BPM]"
 * or the "(1)" a browser appends to a duplicate download. "(Part 2)" stays, so sequels still differ.
 */
const stripNoiseBrackets = (input: string): string =>
  input.replace(BRACKETED_SEGMENT, (segment, round?: string, square?: string) => {
    const inner = normalizeTrackName(round ?? square ?? '');

    return !inner || inner.split(' ').every(isNoiseToken) ? ' ' : segment;
  });

const tokenize = (input: string): string[] => {
  const normalized = normalizeTrackName(stripNoiseBrackets(input));

  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(' ');

  while (tokens.length > 0 && LEADING_TRACK_NUMBER.test(tokens[0]!)) {
    tokens.shift();
  }

  return tokens.filter((token) => !TRACK_NOISE_TOKENS.has(token));
};

const uniqueTokens = (input: string): string[] => Array.from(new Set(tokenize(input)));

type TokenizedTrackName = {
  name: string;
  numericTokens: string[];
  tokens: string[];
};

const tokenizeTrackName = (name: string): TokenizedTrackName => {
  const tokens = uniqueTokens(name);

  return {
    name,
    numericTokens: getNumericTokens(tokens),
    tokens,
  };
};

const getNumericTokens = (tokens: string[]): string[] => tokens.filter((token) => NUMERIC_TOKEN.test(token));

const haveSameNumericTokens = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);

  return left.every((token) => rightSet.has(token));
};

const jaccardSimilarity = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);

  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  const union = leftSet.size + rightSet.size - intersection;

  return union === 0 ? 0 : intersection / union;
};

/**
 * Treats the match as positive when the shorter, meaningful token run is
 * fully contained within the longer one. Guards against lifting up very
 * short common words (e.g. "Home" being contained in "Homebound") and
 * against unique numeric tokens bleeding in (e.g. "Track" vs "Track 2").
 */
const isContained = (leftTokens: string[], rightTokens: string[]): boolean => {
  if (!leftTokens.length || !rightTokens.length) {
    return false;
  }

  const [shorter, longer] =
    leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens];

  const shorterPhrase = shorter.join(' ');
  const longerPhrase = longer.join(' ');

  const hasMeaningfulLength = shorter.length >= 2 || shorterPhrase.length >= MIN_CONTAINMENT_LENGTH;

  if (!hasMeaningfulLength) {
    return false;
  }

  const shorterSet = new Set(shorter);
  const extraTokens = longer.filter((token) => !shorterSet.has(token));

  if (extraTokens.some((token) => NUMERIC_TOKEN.test(token))) {
    return false;
  }

  const longerSet = new Set(longer);
  const hasTokenSubset = shorter.every((token) => longerSet.has(token));
  const hasExactPhrase = ` ${longerPhrase} `.includes(` ${shorterPhrase} `);

  return hasExactPhrase || hasTokenSubset;
};

const isTokenizedTrackMatch = (track: TokenizedTrackName, file: TokenizedTrackName): boolean => {
  const titleTokens = track.tokens;
  const fileTokens = file.tokens;

  if (titleTokens.length === 0 || fileTokens.length === 0) {
    return false;
  }

  if (!haveSameNumericTokens(track.numericTokens, file.numericTokens)) {
    return false;
  }

  const threshold =
    Math.min(titleTokens.length, fileTokens.length) < SHORT_TITLE_TOKEN_THRESHOLD
      ? SHORT_TITLE_MATCH_THRESHOLD
      : DEFAULT_MATCH_THRESHOLD;

  if (jaccardSimilarity(titleTokens, fileTokens) >= threshold) {
    return true;
  }

  return isContained(titleTokens, fileTokens);
};

export const isTrackMatch = (trackTitle: string, fileName: string): boolean =>
  isTokenizedTrackMatch(tokenizeTrackName(trackTitle), tokenizeTrackName(fileName));

const splitAuthor = (name: string): { author: string; title: string } | null => {
  const match = AUTHOR_SEPARATOR.exec(name);

  return match ? { author: name.slice(0, match.index), title: name.slice(match.index + match[0].length) } : null;
};

/**
 * Loose author comparison: a shared word ("Alok & Kiiara" vs "Alok") or one name written inside the other
 * ("alokmusic" vs "Alok"), so an uploader handle still matches the author typed into a filename.
 */
const isSameAuthor = (left: string[], right: string[]): boolean => {
  const rightSet = new Set(right);

  if (left.some((token) => token.length >= MIN_AUTHOR_LENGTH && rightSet.has(token))) {
    return true;
  }

  const [shorter, longer] = [left.join(''), right.join('')].sort((a, b) => a.length - b.length);

  return shorter!.length >= MIN_AUTHOR_LENGTH && longer!.includes(shorter!);
};

const indexFilesByToken = <T>(files: T[], getTokens: (file: T) => string[]): Map<string, T[]> => {
  const index = new Map<string, T[]>();

  for (const file of files) {
    for (const token of getTokens(file)) {
      const bucket = index.get(token);

      if (bucket) {
        bucket.push(file);
      } else {
        index.set(token, [file]);
      }
    }
  }

  return index;
};

/** How many of the (unique) tokens each indexed file shares with `tokens`; files sharing none are absent. */
const countSharedTokens = <T>(tokens: string[], index: Map<string, T[]>): Map<T, number> => {
  const counts = new Map<T, number>();

  for (const token of tokens) {
    for (const file of index.get(token) ?? []) {
      counts.set(file, (counts.get(file) ?? 0) + 1);
    }
  }

  return counts;
};

/**
 * Cheap necessary condition for `isTokenizedTrackMatch`: it needs either the shorter side fully contained
 * or a Jaccard score above the lowest threshold, so most candidates are skipped without the full comparison.
 */
const canTokensMatch = (shared: number, left: number, right: number): boolean =>
  shared === Math.min(left, right) || shared / (left + right - shared) >= SHORT_TITLE_MATCH_THRESHOLD;

export const createDownloadedTrackMatcher = (files: FileData[]) => {
  const fileIndex = files.map(({ name }) => {
    const parts = splitAuthor(name);

    return {
      full: tokenizeTrackName(name),
      author: parts ? uniqueTokens(parts.author) : [],
      title: parts ? tokenizeTrackName(parts.title) : null,
    };
  });

  const filesByFullToken = indexFilesByToken(fileIndex, (file) => file.full.tokens);
  const filesByTitleToken = indexFilesByToken(fileIndex, (file) => file.title?.tokens ?? []);

  return (artist: string, title: string): boolean => {
    const full = tokenizeTrackName(`${artist} - ${title}`);
    // Cloud titles often carry the real author themselves: "Author - Track" uploaded by a label or channel.
    const titleParts = splitAuthor(title);
    const authors = titleParts ? [uniqueTokens(artist), uniqueTokens(titleParts.author)] : [uniqueTokens(artist)];
    const trackName = tokenizeTrackName(titleParts?.title ?? title);

    for (const [file, shared] of countSharedTokens(full.tokens, filesByFullToken)) {
      if (
        canTokensMatch(shared, full.tokens.length, file.full.tokens.length) &&
        isTokenizedTrackMatch(full, file.full)
      ) {
        return true;
      }
    }

    for (const [file, shared] of countSharedTokens(trackName.tokens, filesByTitleToken)) {
      if (
        canTokensMatch(shared, trackName.tokens.length, file.title!.tokens.length) &&
        isTokenizedTrackMatch(trackName, file.title!) &&
        authors.some((author) => isSameAuthor(author, file.author))
      ) {
        return true;
      }
    }

    return false;
  };
};
