import { FileData } from '../types';

const SHORT_TITLE_TOKEN_THRESHOLD = 3;
const SHORT_TITLE_MATCH_THRESHOLD = 0.6;
const DEFAULT_MATCH_THRESHOLD = 0.7;
const MIN_CONTAINMENT_LENGTH = 6;

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
      .replace(/[^a-z0-9]+/g, ' '),
  );

const tokenize = (input: string): string[] => {
  const normalized = normalizeTrackName(input);

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

export const isTrackMatch = (trackTitle: string, fileName: string): boolean => {
  const titleTokens = uniqueTokens(trackTitle);
  const fileTokens = uniqueTokens(fileName);

  if (titleTokens.length === 0 || fileTokens.length === 0) {
    return false;
  }

  if (!haveSameNumericTokens(getNumericTokens(titleTokens), getNumericTokens(fileTokens))) {
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

export const isTrackDownloaded = (files: FileData[], title: string): boolean =>
  files.some(({ name }) => isTrackMatch(title, name));
