// ─────────────────────────────────────────────────────────────────────────────
// palette.js — the film's colour system. Story-driven, related palettes.
// RULE: SKY BLUE (#5FB8E6) = the outside world / other people / HELP. Use it
// sparingly and on purpose (sky slit, parents, friends, the note, rescuers).
// RULE: SIGNAL RED (#D2301E) = danger, pain, blood, the mistake.
// Everything else lives in warm earth tones. Never pure #000 or pure #fff.
// ─────────────────────────────────────────────────────────────────────────────
export const C = {
  // neutrals (warm-tinted)
  night: '#120D0B',
  ink: '#1B1512',
  umber: '#3A1C13',
  paper: '#F1E8D8',
  bone: '#E9DFCC',
  dust: '#CDB89A',
  // desert
  sand: '#E3C9A0',
  ochre: '#D89A4E',
  terracotta: '#C4552D',
  rust: '#9E3D22',
  oxide: '#5A2416',
  varnish: '#2B1A14',
  // story accents
  sky: '#5FB8E6',      // HELP / outside world
  skyPale: '#A9D6EE',
  red: '#D2301E',      // DANGER / pain
  ember: '#FF7A2F',
  gold: '#F2B64C',     // light, hope
  peach: '#F6D9B8',
  // shadow world (trapped / night)
  slate: '#2E3A48',
  shadowBlue: '#3E5566',
  coldTeal: '#5F8C93',
  frost: '#C9D6DA',
  // delirium
  violet: '#5B3A6E',
  magenta: '#B0457A',
  sick: '#C9A23A',
  // vision (the only lush green in the film)
  leaf: '#5E8C4A',
  meadow: '#9DBE6A',
  // Aaron
  mustard: '#D9A521',
  olive: '#6B6A3A',
};

/** Named colour states — pick the state that matches the story beat. */
export const PAL = {
  day:      { bg: C.paper, fg: C.ink, a: C.terracotta, b: C.ochre, c: C.sand, accent: C.sky },
  canyon:   { bg: '#E7B98A', fg: C.umber, a: C.terracotta, b: C.rust, c: C.oxide, accent: C.gold },
  office:   { bg: '#D7DCD3', fg: '#22302B', a: '#8FA39A', b: '#5E6F69', c: '#B8C2B6', accent: C.mustard },
  danger:   { bg: C.night, fg: C.paper, a: C.red, b: C.ember, c: C.oxide, accent: C.red },
  shadow:   { bg: C.slate, fg: C.frost, a: C.shadowBlue, b: C.coldTeal, c: '#1E2630', accent: C.gold },
  night:    { bg: '#151B24', fg: C.frost, a: '#25303D', b: C.shadowBlue, c: '#0E1218', accent: C.skyPale },
  delirium: { bg: '#24152B', fg: C.peach, a: C.violet, b: C.magenta, c: C.sick, accent: C.gold },
  vision:   { bg: '#F7E3BF', fg: '#3B2A1A', a: C.gold, b: C.leaf, c: C.meadow, accent: C.peach },
  xray:     { bg: '#140E0C', fg: C.bone, a: '#E9DFCC', b: '#8C7B6A', c: '#3A2A22', accent: C.red },
  bleach:   { bg: '#F4E7CF', fg: C.umber, a: '#EAD2A8', b: C.ochre, c: C.terracotta, accent: C.sky },
  rescue:   { bg: '#DCEBF2', fg: C.ink, a: C.sky, b: '#2F6F94', c: C.paper, accent: C.ember },
  winter:   { bg: '#E8EEF0', fg: '#1F2A33', a: '#9FB6C2', b: '#5D7686', c: '#FFFFFF', accent: C.ember },
};

/** Sandstone colour ramps for procedural rock (dark → light). */
export const ROCK = {
  navajo: ['#5A2416', '#8A3A1F', '#B4542C', '#CF7A45', '#E4A66E', '#F0C995'],
  shade: ['#1E1513', '#36231D', '#4E3026', '#6A4232', '#865843', '#A27358'],
  cold: ['#161C24', '#232C37', '#33404D', '#475766', '#627383', '#8394A2'],
  bleached: ['#9C6B45', '#C08A5C', '#D9A877', '#E8C597', '#F3DDB7', '#FBF0DA'],
};
