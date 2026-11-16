/* ===================== helpers ===================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseYmd = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, (m||1)-1, d||1); };
const fmtDate = (s, o = {month:'short', day:'numeric'}) => parseYmd(s).toLocaleDateString(undefined, o);
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? n : null; };
const fmtW = w => w == null ? '' : String(Math.round(w * 10) / 10);
const fmtNum = d => d == null ? '' : String(Math.round(d * 100) / 100);
const fmtVol = v => v >= 10000 ? (v/1000).toFixed(v >= 100000 ? 0 : 1) + 'k' : Math.round(v).toLocaleString();
const e1rm = (w, r) => (!w || !r || r <= 0) ? 0 : (r === 1 ? w : w * (1 + r / 30));
const clone = o => JSON.parse(JSON.stringify(o));
const DAY = 864e5;
const byDateAsc = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.startedAt || 0) - (b.startedAt || 0);
const V = x => `<span class="val">${x}</span>`;   // wrap any number/value in white
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const maxBy = (arr, f) => arr.reduce((m, x) => (f(x) || 0) > (f(m) || 0) ? x : m, arr[0]);

/* durations are stored in seconds */
function fmtDur(sec) { if (sec == null) return ''; const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`; }
const fmtHold = sec => sec == null ? '' : (Math.round(sec) < 60 ? Math.round(sec) + 's' : fmtDur(sec));
function parseDur(str, unit) {
  str = String(str || '').trim(); if (!str) return null;
  if (str.includes(':')) { const secs = str.split(':').reduce((a, p) => a * 60 + (parseFloat(p) || 0), 0); return Math.round(secs); }
  const n = num(str); return n == null ? null : Math.round(n * (unit === 'min' ? 60 : 1));
}

/* ===================== how each kind of exercise is logged =====================
   wr = weight × reps · h = hold (optional weight + seconds) · t = time only
   c  = cardio (distance/calories/floors + time) · y = carry or sled (weight × meters) */
const UNIT = {mi: {h: 'mi', paceDiv: 1, pace: '/mi'}, m: {h: 'm', paceDiv: 500, pace: '/500m'}, cal: {h: 'cal'}, fl: {h: 'floors'}};
function cols(kind, unit) {
  switch (kind) {
    case 'h': return [['w', 'lbs'], ['t', 'sec']];
    case 't': return [null, ['t', 'time']];
    case 'y': return [['w', 'lbs'], ['d', 'meters']];
    case 'c': return [['d', (UNIT[unit] || UNIT.mi).h], ['t', 'time']];
    default: return [['w', 'lbs'], ['r', 'reps']];
  }
}
function valid(kind, s) {
  if (!s) return false;
  switch (kind) { case 'h': case 't': return s.t > 0; case 'c': return s.d > 0 || s.t > 0; case 'y': return s.d > 0 || s.w > 0; default: return s.r > 0; }
}
function cleanSet(kind, unit, s) { const o = {}; for (const c of cols(kind, unit)) if (c) o[c[0]] = s[c[0]] ?? (c[0] === 'w' ? 0 : null); return o; }
function fmtSet(s, kind, unit) {
  if (!s) return '—';
  switch (kind) {
    case 'h': return (s.w ? fmtW(s.w) + ' lbs · ' : '') + fmtHold(s.t);
    case 't': return fmtDur(s.t);
    case 'c': return [s.d ? fmtNum(s.d) + ' ' + (UNIT[unit] || UNIT.mi).h : null, s.t ? fmtDur(s.t) : null].filter(Boolean).join(' · ');
    case 'y': return [s.w ? fmtW(s.w) + ' lbs' : null, s.d ? fmtNum(s.d) + ' m' : null].filter(Boolean).join(' × ');
    default: return (s.w ? fmtW(s.w) : 'BW') + '×' + s.r;
  }
}
const KIND_LABEL = {wr: 'Weight × reps', h: 'Timed hold', t: 'Time only', c: 'Cardio', y: 'Carry / sled'};

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h2M19 12h2M7 7v10M17 7v10M10 9v6M14 9v6M10 12h4"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M5 15l4-4 4 3 6-7"/></svg>',
  splits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const PAGES = [['home','Home'],['log','Log workout'],['history','History'],['progress','Progress'],['splits','My splits'],['account','Account']];

/* ===================== exercise library =====================
   "Name" logs weight × reps. Suffixes: |h hold, |t time only, |y carry/sled, |c:mi |c:m |c:cal |c:fl cardio */
const LIB_RAW = {
  'Chest': ['Bench Press','Incline Bench Press','Decline Bench Press','Paused Bench Press','Spoto Press','Floor Press','Pin Press','Dumbbell Bench Press','Incline Dumbbell Press','Decline Dumbbell Press','Neutral-Grip Dumbbell Press','Dumbbell Floor Press','Smith Machine Bench Press','Smith Machine Incline Press','Machine Chest Press','Incline Machine Press','Decline Machine Press','Hammer Strength Chest Press','Hammer Strength Incline Press','Cable Chest Press','Cable Fly','Low-to-High Cable Fly','High-to-Low Cable Fly','Single-Arm Cable Fly','Cable Crossover','Dumbbell Fly','Incline Dumbbell Fly','Pec Deck','Svend Press','Dumbbell Pullover','Dips','Weighted Dips','Push-Up','Weighted Push-Up','Deficit Push-Up','Incline Push-Up','Decline Push-Up','Archer Push-Up','Clap Push-Up','Band Chest Press'],
  'Back': ['Deadlift','Sumo Deadlift','Trap Bar Deadlift','Deficit Deadlift','Paused Deadlift','Snatch-Grip Deadlift','Rack Pull','Barbell Row','Pendlay Row','Yates Row','Seal Row','T-Bar Row','Chest-Supported T-Bar Row','Chest-Supported Row','Dumbbell Row','Kroc Row','Meadows Row','Landmine Row','Smith Machine Row','Seated Cable Row','Wide-Grip Cable Row','Single-Arm Cable Row','Machine Row','Hammer Strength Row','Hammer Strength High Row','Hammer Strength Low Row','Inverted Row','Pull-Up','Weighted Pull-Up','Chin-Up','Weighted Chin-Up','Neutral-Grip Pull-Up','Assisted Pull-Up','Lat Pulldown','Wide-Grip Lat Pulldown','Close-Grip Lat Pulldown','Neutral-Grip Lat Pulldown','Reverse-Grip Lat Pulldown','Single-Arm Lat Pulldown','Machine Pulldown','Straight-Arm Pulldown','Cable Pullover','Face Pull','Band Pull-Apart'],
  'Lower Back': ['Back Extension','Weighted Back Extension','45° Back Extension','Reverse Hyperextension','Good Morning','Seated Good Morning','Jefferson Curl','Superman Hold|h','Bird Dog'],
  'Shoulders': ['Overhead Press','Seated Barbell Press','Push Press','Behind-the-Neck Press','Z Press','Dumbbell Shoulder Press','Seated Dumbbell Press','Arnold Press','Single-Arm Dumbbell Press','Machine Shoulder Press','Smith Machine Shoulder Press','Landmine Press','Kettlebell Press','Pike Push-Up','Handstand Push-Up','Handstand Hold|h','Lateral Raise','Seated Lateral Raise','Cable Lateral Raise','Machine Lateral Raise','Lean-Away Lateral Raise','Y-Raise','Front Raise','Plate Front Raise','Cable Front Raise','Rear Delt Fly','Reverse Pec Deck','Cable Rear Delt Fly','Upright Row','Cable Upright Row','Cuban Press','Cable External Rotation','Cable Internal Rotation','Bus Driver'],
  'Traps': ['Shrug','Dumbbell Shrug','Trap Bar Shrug','Cable Shrug','Smith Machine Shrug','Behind-the-Back Shrug','Snatch-Grip High Pull'],
  'Biceps': ['Barbell Curl','EZ-Bar Curl','Dumbbell Curl','Alternating Dumbbell Curl','Hammer Curl','Cross-Body Hammer Curl','Rope Hammer Curl','Preacher Curl','Dumbbell Preacher Curl','Machine Preacher Curl','Cable Curl','Bayesian Cable Curl','High Cable Curl','Incline Dumbbell Curl','Concentration Curl','Spider Curl','Drag Curl','Zottman Curl','21s','Machine Bicep Curl','Band Curl'],
  'Triceps': ['Tricep Pushdown','Rope Pushdown','V-Bar Pushdown','Single-Arm Cable Pushdown','Reverse-Grip Pushdown','Overhead Tricep Extension','Cable Overhead Extension','Dumbbell Overhead Extension','Skull Crusher','Dumbbell Skull Crusher','JM Press','Close-Grip Bench Press','Tate Press','Tricep Dips','Bench Dips','Tricep Kickback','Cable Kickback','Machine Tricep Extension','Diamond Push-Up'],
  'Forearms & Grip': ['Wrist Curl','Reverse Wrist Curl','Behind-the-Back Wrist Curl','Reverse Curl','Wrist Roller','Hand Gripper','Plate Pinch|h','Dead Hang|h','Towel Hang|h'],
  'Quads': ['Back Squat','Front Squat','High-Bar Squat','Low-Bar Squat','Paused Squat','Box Squat','Safety Bar Squat','Zercher Squat','Goblet Squat','Dumbbell Squat','Smith Machine Squat','Hack Squat','Reverse Hack Squat','Pendulum Squat','Belt Squat','V-Squat','Leg Press','Single-Leg Leg Press','Leg Extension','Single-Leg Leg Extension','Sissy Squat','Bulgarian Split Squat','Split Squat','Walking Lunge','Reverse Lunge','Forward Lunge','Lateral Lunge','Step-Up','Pistol Squat','Bodyweight Squat','Jump Squat','Spanish Squat','Wall Sit|h'],
  'Hamstrings': ['Romanian Deadlift','Dumbbell Romanian Deadlift','Single-Leg Romanian Deadlift','Stiff-Leg Deadlift','Leg Curl','Lying Leg Curl','Seated Leg Curl','Standing Leg Curl','Nordic Curl','Glute-Ham Raise','Stability Ball Leg Curl','Cable Pull-Through','Good Morning','Kettlebell Swing'],
  'Glutes & Hips': ['Hip Thrust','Smith Machine Hip Thrust','Machine Hip Thrust','Single-Leg Hip Thrust','B-Stance Hip Thrust','Glute Bridge','Single-Leg Glute Bridge','Frog Pump','Cable Glute Kickback','Glute Kickback Machine','Hip Abduction Machine','Hip Adduction Machine','Cable Hip Abduction','Banded Lateral Walk','Curtsy Lunge','Fire Hydrant','Sumo Deadlift','Copenhagen Plank|h'],
  'Calves': ['Standing Calf Raise','Seated Calf Raise','Leg Press Calf Raise','Smith Machine Calf Raise','Single-Leg Calf Raise','Donkey Calf Raise','Tibialis Raise'],
  'Core & Abs': ['Plank|h','Side Plank|h','Weighted Plank|h','Hollow Hold|h','L-Sit|h','Hanging Leg Raise','Hanging Knee Raise','Toes-to-Bar',"Captain's Chair Leg Raise",'Lying Leg Raise','Cable Crunch','Machine Crunch','Crunch','Decline Crunch','Sit-Up','Weighted Decline Sit-Up','GHD Sit-Up','Ab Wheel','Russian Twist','Cable Woodchopper','Pallof Press','Dead Bug','Bicycle Crunch','Mountain Climber','V-Up','Dragon Flag','Landmine Rotation','Stir the Pot','Suitcase Carry|y'],
  'Olympic & Power': ['Power Clean','Hang Clean','Squat Clean','Clean and Jerk','Power Snatch','Hang Snatch','Squat Snatch','Push Jerk','Split Jerk','Clean Pull','Snatch Pull','High Pull','Thruster','Box Jump','Broad Jump','Depth Jump','Medicine Ball Slam','Med Ball Chest Pass','Med Ball Rotational Throw'],
  'Kettlebell': ['Kettlebell Swing','Single-Arm Kettlebell Swing','Kettlebell Clean','Kettlebell Snatch','Kettlebell Press','Kettlebell Clean and Press','Kettlebell Goblet Squat','Kettlebell Deadlift','Kettlebell Row','Turkish Get-Up','Kettlebell Halo','Kettlebell Windmill'],
  'Carries & Strongman': ["Farmer's Carry|y",'Suitcase Carry|y','Overhead Carry|y','Front Rack Carry|y','Sandbag Carry|y','Yoke Carry|y','Sled Push|y','Sled Pull|y','Sled Drag|y','Log Press','Axle Press','Atlas Stone','Sandbag Over Shoulder','Tire Flip','Keg Toss'],
  'HYROX': ['Running|c:mi','SkiErg|c:m','Sled Push|y','Sled Pull|y','Burpee Broad Jump|c:m','Rowing Machine|c:m',"Farmer's Carry|y",'Sandbag Lunges|y','Wall Balls'],
  'Cardio': ['Running|c:mi','Treadmill Run|c:mi','Incline Treadmill Walk|c:mi','Walking|c:mi','Sprints|c:m','Hiking|c:mi','Cycling|c:mi','Stationary Bike|c:mi','Spin Class|t','Assault Bike|c:cal','Echo Bike|c:cal','Rowing Machine|c:m','SkiErg|c:m','Elliptical|c:mi','StairMaster|c:fl','Stair Climb|c:fl','Swimming|c:m','Jump Rope|t','Battle Ropes|t','Boxing / Heavy Bag|t','Shadow Boxing|t','Burpees','Jumping Jacks'],
  'Sports & Classes': ['HIIT Class|t','CrossFit WOD|t','Yoga|t','Pilates|t','Basketball|t','Soccer|t','Tennis|t','Pickleball|t','Rock Climbing|t','Martial Arts|t','Snowboarding|t','Skiing|t'],
  'Mobility & Recovery': ['Stretching|t','Foam Rolling|t','Hip Mobility|t','Shoulder Mobility|t','Sauna|t','Cold Plunge|t'],
};
/* shorthand people type in the gym */
const ALIAS = {db: ['dumbbell'], dbs: ['dumbbell'], bb: ['barbell', 'bench press', 'squat', 'deadlift', 'row', 'curl'], kb: ['kettlebell'], ohp: ['overhead press'], rdl: ['romanian deadlift'], sldl: ['stiff leg'], ez: ['ez bar'], bw: ['bodyweight', 'push up', 'pull up'], smith: ['smith machine'], hs: ['hammer strength'], ghr: ['glute ham'], bss: ['bulgarian split squat'], lat: ['lat', 'pulldown'], tri: ['tricep', 'skull', 'pushdown', 'dips'], bi: ['curl'], abs: ['core', 'crunch', 'plank'], calf: ['calf', 'calves'], cardio: ['cardio'], row: ['row'], run: ['run', 'treadmill', 'sprint'], bike: ['bike', 'cycling', 'spin'], pullup: ['pull up'], pushup: ['push up'], chinup: ['chin up']};
const LIB = {};    // group -> [{name, kind, unit}]
const INFO = {};   // name -> {group, kind, unit}
for (const g in LIB_RAW) {
  LIB[g] = LIB_RAW[g].map(raw => {
    const [name, code] = raw.split('|');
    let kind = 'wr', unit;
    if (code === 'h' || code === 't' || code === 'y') kind = code;
    else if (code && code.startsWith('c:')) { kind = 'c'; unit = code.slice(2); }
    if (!INFO[name]) INFO[name] = {group: g, kind, unit};
    return {name, group: g, kind, unit};
  });
}
const EXERCISE_COUNT = Object.keys(INFO).length;

/* ===================== state ===================== */
const DEFAULT_DAYS = [
  {id: 'push', name: 'Push', sub: 'Chest · Shoulders · Triceps'},
  {id: 'pull', name: 'Pull', sub: 'Back · Biceps'},
  {id: 'legs', name: 'Legs', sub: 'Quads · Hamstrings · Glutes · Calves'},
];
const TEMPLATES = [
  {id: 'blank', name: 'Blank', days: ['Day 1']},
  {id: 'ul', name: 'Upper / Lower', days: ['Upper', 'Lower']},
  {id: 'ul4', name: 'Upper / Lower ×2', days: ['Upper A', 'Lower A', 'Upper B', 'Lower B']},
  {id: 'bro', name: 'Bro split', days: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs']},
  {id: 'arnold', name: 'Arnold split', days: ['Chest & Back', 'Shoulders & Arms', 'Legs']},
  {id: 'full', name: 'Full body', days: ['Full Body A', 'Full Body B', 'Full Body C']},
  {id: 'ppl', name: 'Push / Pull / Legs', days: ['Push', 'Pull', 'Legs']},
];
const S = {
  db: null, mode: 'connecting',
  workouts: [], routines: [], settings: {},
  routinesReady: false, settingsReady: false, initDone: false,
  active: null, tab: 'home', menuOpen: false,
  picker: null, editR: null, splitEdit: null, splitDraftName: '', newSplit: null, addDayName: '',
  expanded: new Set(), confirm: null,
  progEx: null, range: '6M', metric: null,
  pendingRender: false, _d: null,
  user: null, loaded: false, authView: 'signin', authMsg: '', authErr: false, authBusy: false, authEmail: '', importText: '',
};
const custom = () => S.settings.custom || [];
const programs = () => (S.settings.programs && S.settings.programs.length) ? S.settings.programs : [{id: 'ppl', name: 'Push / Pull / Legs'}];
const activeProgram = () => { const ps = programs(); return ps.find(p => p.id === S.settings.activeProgram) || ps[0]; };
function daysOf(pid) {
  const real = S.routines.filter(r => (r.program || 'ppl') === pid);
  if (pid === 'ppl' && !(S.settings.programs && S.settings.programs.length)) {
    for (const [i, d] of DEFAULT_DAYS.entries()) if (!real.some(r => r.id === d.id)) real.push({...d, order: i + 1, program: 'ppl', exercises: [], virtual: true});
  }
  return real.sort((a, b) => (a.order || 0) - (b.order || 0));
}
const dayById = id => { for (const p of programs()) { const d = daysOf(p.id).find(x => x.id === id); if (d) return d; } return null; };
function exInfo(name) {
  if (INFO[name]) return INFO[name];
  const c = custom().find(x => x.name === name);
  return c ? {group: 'My exercises', kind: c.kind || 'wr', unit: c.unit} : {group: 'My exercises', kind: 'wr'};
}
function allExercises() {
  const out = [];
  for (const g in LIB) for (const e of LIB[g]) out.push(e);
  for (const c of custom()) if (!INFO[c.name]) out.push({name: c.name, group: 'My exercises', kind: c.kind || 'wr', unit: c.unit});
  return out;
}
const groupNames = () => (custom().length ? ['My exercises'] : []).concat(Object.keys(LIB));

/* ===================== derived stats ===================== */
function sessionOf(w, ex) {
  const kind = ex.kind || 'wr', unit = ex.unit || (kind === 'c' ? 'mi' : undefined);
  const sets = (ex.sets || []).filter(s => valid(kind, s));
  if (!sets.length) return null;
  const o = {date: w.date, wid: w.id, name: ex.name, sets, kind, unit};
  if (kind === 'wr') {
    let topE = 0, eSet = null, topSet = sets[0];
    for (const s of sets) {
      const e = e1rm(s.w || 0, s.r); if (e > topE) { topE = e; eSet = s; }
      const sw = s.w || 0, tw = topSet.w || 0; if (sw > tw || (sw === tw && s.r > topSet.r)) topSet = s;
    }
    Object.assign(o, {e1rm: topE, eSet, topW: topSet.w || 0, topSet, vol: sum(sets, s => (s.w || 0) * s.r), bestR: Math.max(...sets.map(s => s.r)), totR: sum(sets, s => s.r)});
  } else if (kind === 'h' || kind === 't') {
    const b = maxBy(sets, s => s.t); Object.assign(o, {bestT: b.t || 0, best: b, totT: sum(sets, s => s.t), topW: Math.max(0, ...sets.map(s => s.w || 0))});
  } else if (kind === 'c') {
    const totD = sum(sets, s => s.d), totT = sum(sets, s => s.t), div = (UNIT[unit] || {}).paceDiv;
    Object.assign(o, {totD, totT, maxD: Math.max(0, ...sets.map(s => s.d || 0)), maxT: Math.max(0, ...sets.map(s => s.t || 0)), best: maxBy(sets, s => s.d || s.t / 1e6), pace: (div && totD > 0 && totT > 0) ? totT / (totD / div) : null});
  } else if (kind === 'y') {
    const b = sets.reduce((m, s) => ((s.w || 0) > (m.w || 0) || ((s.w || 0) === (m.w || 0) && (s.d || 0) > (m.d || 0))) ? s : m, sets[0]);
    Object.assign(o, {topW: b.w || 0, maxD: Math.max(0, ...sets.map(s => s.d || 0)), best: b});
  }
  return o;
}
function prCheck(s, b) {
  const u = (UNIT[s.unit] || UNIT.mi).h;
  switch (s.kind) {
    case 'wr':
      if (s.e1rm > 0 && s.e1rm > b.e + 0.05) return {label: 'e1RM', txt: Math.round(s.e1rm) + ' lbs', set: s.eSet};
      if (s.topW > 0 && s.topW > b.w) return {label: 'Heaviest', txt: fmtW(s.topW) + ' lbs', set: s.topSet};
      if (s.e1rm === 0 && s.bestR > b.r) return {label: 'Reps', txt: s.bestR + ' reps', set: s.topSet};
      return null;
    case 'h': case 't':
      return s.bestT > b.t ? {label: 'Longest', txt: fmtHold(s.bestT), set: s.best} : null;
    case 'c':
      if (s.totD > 0 && s.totD > b.d) return {label: 'Distance', txt: fmtNum(s.totD) + ' ' + u, set: s.best};
      if (s.pace && b.pace && s.pace < b.pace - 0.5) return {label: 'Pace', txt: fmtDur(s.pace) + UNIT[s.unit].pace, set: s.best};
      if (!s.totD && s.totT > b.t) return {label: 'Time', txt: fmtDur(s.totT), set: s.best};
      return null;
    case 'y':
      if (s.topW > 0 && s.topW > b.w) return {label: 'Heaviest', txt: fmtW(s.topW) + ' lbs', set: s.best};
      if (s.maxD > 0 && s.maxD > b.d) return {label: 'Distance', txt: fmtNum(s.maxD) + ' m', set: s.best};
      return null;
  }
  return null;
}
function foldBest(b, s) {
  b.e = Math.max(b.e, s.e1rm || 0); b.w = Math.max(b.w, s.topW || 0); b.r = Math.max(b.r, s.bestR || 0);
  b.t = Math.max(b.t, s.kind === 'c' ? (s.totD ? 0 : s.totT) : (s.bestT || 0));
  b.d = Math.max(b.d, s.kind === 'c' ? s.totD : (s.maxD || 0));
  if (s.pace) b.pace = b.pace ? Math.min(b.pace, s.pace) : s.pace;
}
function derive() {
  if (S._d) return S._d;
  const asc = [...S.workouts].sort(byDateAsc);
  const hist = {}, prs = {}, best = {};
  for (const w of asc) {
    const list = [];
    for (const ex of (w.exercises || [])) {
      const s = sessionOf(w, ex); if (!s) continue;
      (hist[ex.name] = hist[ex.name] || []).push(s);
      const b = best[ex.name];
      if (b) { const p = prCheck(s, b); if (p) list.push({...p, ex: ex.name, kind: s.kind, unit: s.unit}); foldBest(b, s); }
      else { best[ex.name] = {e: 0, w: 0, r: 0, t: 0, d: 0, pace: null}; foldBest(best[ex.name], s); }
    }
    if (list.length) prs[w.id] = list;
  }
  return (S._d = {asc, hist, prs, best});
}
function bestFor(name, excludeId) {
  const b = {e: 0, w: 0, t: 0, d: 0};
  for (const s of (derive().hist[name] || [])) if (s.wid !== excludeId) for (const x of s.sets) {
    b.e = Math.max(b.e, e1rm(x.w || 0, x.r || 0)); b.w = Math.max(b.w, x.w || 0); b.t = Math.max(b.t, x.t || 0); b.d = Math.max(b.d, x.d || 0);
  }
  return b;
}
function lastFor(name, excludeId) {
  const h = derive().hist[name] || [];
  for (let i = h.length - 1; i >= 0; i--) if (h[i].wid !== excludeId) return h[i];
  return null;
}
const workoutVolume = w => (w.exercises || []).reduce((a, ex) => a + ((ex.kind || 'wr') === 'wr' ? sum(ex.sets || [], s => s.r > 0 ? (s.w || 0) * s.r : 0) : 0), 0);
const workoutSets = w => (w.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter(s => valid(ex.kind || 'wr', s)).length, 0);

/* Day streak: consecutive calendar days with a logged workout, ending today (or yesterday if today isn't logged yet). */
function dayStreak() {
  const dates = new Set(S.workouts.map(w => w.date));
  const d = new Date(); const loggedToday = dates.has(ymd(d));
  if (!loggedToday) d.setDate(d.getDate() - 1);
  let n = 0; while (dates.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  let best = 0, run = 0, prev = null;
  for (const s of [...dates].sort()) { const t = parseYmd(s).getTime(); run = (prev != null && Math.round((t - prev) / DAY) === 1) ? run + 1 : 1; best = Math.max(best, run); prev = t; }
  return {n, loggedToday, best};
}

/* ===================== storage =====================
   Every piece of data is a JSON document at a path ("workouts/<id>", "routines/<id>", "settings/main", "active/current"),
   stored in Supabase table public.docs (one row per user + path, private to that user by row-level security).
   A copy of everything is cached on the device, and changes made offline wait in a queue until the connection returns. */
const CFG = window.LIFTLOG_CONFIG || {};
const CONFIGURED = !!(CFG.supabaseUrl && CFG.supabaseKey && !/YOUR_/.test(CFG.supabaseUrl + CFG.supabaseKey));
let sb = null;
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const LS_ACTIVE = () => 'liftlog.active.' + (S.user ? S.user.id : 'anon');
const LS_CACHE = () => 'liftlog.cache.' + S.user.id;
const LS_QUEUE = () => 'liftlog.queue.' + S.user.id;
let CACHE = {}, QUEUE = {};
let failures = 0, flushing = false, retryT = null;

function setSync(kind, text) { const el = $('#sync'); if (!el) return; el.className = 'sync ' + kind; el.querySelector('span').textContent = text; el.title = text; }
function updateSyncBadge() {
  if (!S.user) return setSync('', '');
  const waiting = Object.keys(QUEUE).length;
  if (!navigator.onLine) return setSync('bad', waiting ? 'Offline · will sync' : 'Offline');
  if (failures && waiting) return setSync('bad', 'Not synced yet, retrying');
  if (!S.loaded) return setSync('busy', 'Loading…');
  setSync(waiting || flushing ? 'busy' : 'ok', waiting || flushing ? 'Saving…' : 'Synced');
}
const persistCache = () => lsSet(LS_CACHE(), CACHE);
const persistQueue = () => lsSet(LS_QUEUE(), QUEUE);
function applyDocs() {
  const w = [], r = []; let st = {};
  for (const [path, data] of Object.entries(CACHE)) {
    const [col, id] = path.split('/');
    if (col === 'workouts') w.push({...data, id}); else if (col === 'routines') r.push({...data, id}); else if (path === 'settings/main') st = data || {};
  }
  S.workouts = w; S.routines = r; S.settings = st; S._d = null;
}
function saveDoc(path, data) {
  data = data === null ? null : clone(data);
  if (data === null) delete CACHE[path]; else CACHE[path] = data;
  QUEUE[path] = data;
  persistCache(); persistQueue();
  if (path !== 'active/current') applyDocs();
  updateSyncBadge(); flushQueue();
}
async function flushQueue() {
  if (flushing || !sb || !S.user || !Object.keys(QUEUE).length) return;
  if (!navigator.onLine) { updateSyncBadge(); return; }
  flushing = true; updateSyncBadge(); clearTimeout(retryT);
  try {
    while (Object.keys(QUEUE).length) {
      const entries = Object.entries(QUEUE);
      const now = new Date().toISOString();
      const ups = entries.filter(([, d]) => d !== null).map(([path, data]) => ({user_id: S.user.id, path, data, updated_at: now}));
      const dels = entries.filter(([, d]) => d === null).map(([p]) => p);
      if (ups.length) { const {error} = await sb.from('docs').upsert(ups, {onConflict: 'user_id,path'}); if (error) throw error; }
      if (dels.length) { const {error} = await sb.from('docs').delete().eq('user_id', S.user.id).in('path', dels); if (error) throw error; }
      for (const [p, d] of entries) if (QUEUE[p] === d) delete QUEUE[p];
      persistQueue();
    }
    failures = 0;
  } catch (e) {
    failures++; console.warn('Sync failed', e);
    if (e && (e.code === '42P01' || /relation .*docs/.test(e.message || ''))) toast('The database isn’t set up yet. Run schema.sql in Supabase (see README).');
    retryT = setTimeout(flushQueue, Math.min(30000, 2000 * failures));
  } finally { flushing = false; updateSyncBadge(); }
}
async function loadAll() {
  if (!sb || !S.user) return;
  const rows = []; let from = 0;
  try {
    while (true) {
      const {data, error} = await sb.from('docs').select('path,data').eq('user_id', S.user.id).order('path').range(from, from + 999);
      if (error) throw error;
      rows.push(...data); if (data.length < 1000) break; from += 1000;
    }
  } catch (e) {
    console.warn('Load failed', e); S.loaded = S.loaded || Object.keys(CACHE).length > 0; updateSyncBadge();
    if (e && (e.code === '42P01' || /relation .*docs/.test(e.message || ''))) toast('The database isn’t set up yet. Run schema.sql in Supabase (see README).');
    return;
  }
  const server = {}; for (const r of rows) server[r.path] = r.data;
  CACHE = server;
  for (const [p, d] of Object.entries(QUEUE)) { if (d === null) delete CACHE[p]; else CACHE[p] = d; }
  persistCache(); applyDocs();
  const remote = CACHE['active/current'] && CACHE['active/current'].workout;
  if (remote && (!S.active || (remote.updatedAt || 0) > (S.active.updatedAt || 0))) { S.active = clone(remote); lsSet(LS_ACTIVE(), S.active); if (S.tab === 'home') S.tab = 'log'; }
  S.loaded = true; S.routinesReady = S.settingsReady = true;
  maybeInit(); safeRender(); updateSyncBadge(); flushQueue();
}
let channel = null;
function subscribeLive() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('docs-' + S.user.id)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'docs', filter: 'user_id=eq.' + S.user.id}, payload => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (!row || row.user_id !== S.user.id || !row.path) return;
      if (row.path in QUEUE || row.path === 'active/current') return;   // local edits win; the open workout is never overwritten live
      if (payload.eventType === 'DELETE') delete CACHE[row.path]; else CACHE[row.path] = row.data;
      persistCache(); applyDocs(); safeRender();
    })
    .subscribe();
}
/* Writes that keep the in-memory copy current right away. */
function saveSettings(patch) {
  S.settings = {...S.settings, ...patch};
  const doc = {custom: custom(), programs: S.settings.programs || [], activeProgram: S.settings.activeProgram || 'ppl', clips: S.settings.clips || []};
  saveDoc('settings/main', doc);
}
function saveRoutine(id, doc) {
  const clean = {name: doc.name, sub: doc.sub || '', order: doc.order || 0, program: doc.program || 'ppl', exercises: (doc.exercises || []).map(e => ({name: e.name, sets: e.sets || 3, reps: e.reps || '', kind: e.kind || exInfo(e.name).kind, ...(e.unit || exInfo(e.name).unit ? {unit: e.unit || exInfo(e.name).unit} : {})}))};
  saveDoc('routines/' + id, clean);
}
function deleteRoutine(id) { saveDoc('routines/' + id, null); }
/* First run for a new account: turn the built-in Push / Pull / Legs into a real, editable split. */
function maybeInit() {
  if (S.initDone || !S.routinesReady || !S.settingsReady) return;
  S.initDone = true;
  if (S.settings.programs && S.settings.programs.length) return;
  saveSettings({programs: [{id: 'ppl', name: 'Push / Pull / Legs'}], activeProgram: 'ppl'});
  DEFAULT_DAYS.forEach((d, i) => {
    const ex = S.routines.find(r => r.id === d.id);
    if (!ex) saveRoutine(d.id, {name: d.name, sub: d.sub, order: i + 1, program: 'ppl', exercises: []});
    else if (!ex.program) saveRoutine(d.id, {...ex, program: 'ppl'});
  });
}
let activeTimer = null;
function persistActive() {
  if (S.active) S.active.updatedAt = Date.now();
  lsSet(LS_ACTIVE(), S.active);
  clearTimeout(activeTimer);
  activeTimer = setTimeout(() => saveDoc('active/current', S.active ? {workout: S.active} : null), S.active ? 1200 : 0);
}

/* ===================== accounts + boot ===================== */
function startUser(user) {
  if (S.user && S.user.id === user.id) return;
  S.user = user; S.loaded = false; S.initDone = false; S.routinesReady = S.settingsReady = false;
  CACHE = lsGet(LS_CACHE()) || {}; QUEUE = lsGet(LS_QUEUE()) || {};
  applyDocs();
  if (Object.keys(CACHE).length) { S.loaded = true; S.routinesReady = S.settingsReady = true; S.initDone = true; }
  const la = lsGet(LS_ACTIVE()); S.active = la && la.exercises ? la : null;
  S.tab = S.active ? 'log' : 'home';
  render(); updateSyncBadge();
  loadAll(); subscribeLive();
}
function stopUser() {
  if (channel) { sb.removeChannel(channel); channel = null; }
  S.user = null; S.active = null; CACHE = {}; QUEUE = {}; applyDocs(); S.loaded = false;
  M.key = null; M.urls = {}; S.tab = 'home'; S.authView = 'signin';
  render(); updateSyncBadge();
}
async function boot() {
  if (!CONFIGURED || !window.supabase) { S.authView = 'setup'; render(); return; }
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.authView = 'recover'; if (session) S.recoverUser = session.user; render(); return; }
    if (event === 'SIGNED_OUT') { stopUser(); return; }
    if (session && session.user && S.authView !== 'recover') setTimeout(() => startUser(session.user), 0);
  });
  const {data} = await sb.auth.getSession();
  if (data && data.session && S.authView !== 'recover') startUser(data.session.user);
  else if (!S.user) { S.authView = S.authView === 'recover' ? 'recover' : 'signin'; render(); }
}
addEventListener('online', () => { updateSyncBadge(); flushQueue(); loadAll(); });
addEventListener('offline', updateSyncBadge);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && S.active) { clearTimeout(activeTimer); saveDoc('active/current', {workout: S.active}); }
  if (document.visibilityState === 'visible' && S.user) { loadAll(); flushQueue(); }
});

/* ---------- sign in / create account ---------- */
function viewAuth() {
  const v = S.authView, msg = S.authMsg ? `<div class="banner ${S.authErr ? '' : 'okmsg'}">${esc(S.authMsg)}</div>` : '';
  if (v === 'setup') return `<div class="auth"><h1 class="page-h">Almost there</h1>
    <p class="dim">Lift Log isn’t connected to its database yet. Open <b style="color:var(--val)">config.js</b> and paste your Supabase Project URL and publishable key, then reload. The README has the steps.</p></div>`;
  const head = `<div class="auth-brand"><span class="n">LIFT</span><span class="n">LOG</span></div>`;
  if (v === 'recover') return `<div class="auth">${head}<h2 class="h2">Set a new password</h2>${msg}
    <form class="auth-form" data-form="recover">
      <label class="eyebrow" for="au-pass">New password</label><input class="field" id="au-pass" type="password" autocomplete="new-password" minlength="6" required>
      <button class="btn primary block" type="submit">Save new password</button></form></div>`;
  if (v === 'forgot') return `<div class="auth">${head}<h2 class="h2">Reset password</h2>${msg}
    <form class="auth-form" data-form="forgot">
      <label class="eyebrow" for="au-email">Email</label><input class="field" id="au-email" type="email" autocomplete="email" value="${esc(S.authEmail || '')}" required>
      <button class="btn primary block" type="submit">Email me a reset link</button></form>
    <button class="btn quiet sm" data-a="auth-view" data-v="signin">Back to sign in</button></div>`;
  const up = v === 'signup';
  return `<div class="auth">${head}
    <div class="seg" role="group" aria-label="Account" style="align-self:flex-start">
      <button data-a="auth-view" data-v="signin" aria-pressed="${!up}">Sign in</button>
      <button data-a="auth-view" data-v="signup" aria-pressed="${up}">Create account</button></div>
    ${msg}
    <form class="auth-form" data-form="${up ? 'signup' : 'signin'}">
      <label class="eyebrow" for="au-email">Email</label>
      <input class="field" id="au-email" type="email" autocomplete="email" value="${esc(S.authEmail || '')}" required>
      <label class="eyebrow" for="au-pass">Password</label>
      <input class="field" id="au-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required placeholder="${up ? 'At least 6 characters' : ''}">
      <button class="btn primary block" type="submit" ${S.authBusy ? 'disabled' : ''}>${S.authBusy ? 'One sec…' : up ? 'Create account' : 'Sign in'}</button>
    </form>
    ${up ? '<p class="dim small" style="margin:0">Your workouts are private to your account. Friends make their own accounts with the same link.</p>' : '<button class="btn quiet sm" data-a="auth-view" data-v="forgot">Forgot password?</button>'}
  </div>`;
}
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, email = (f.querySelector('#au-email') || {}).value, pass = (f.querySelector('#au-pass') || {}).value;
  S.authEmail = email || S.authEmail; S.authBusy = true; S.authMsg = ''; render();
  let res;
  try {
    if (kind === 'signin') res = await sb.auth.signInWithPassword({email, password: pass});
    else if (kind === 'signup') res = await sb.auth.signUp({email, password: pass, options: {emailRedirectTo: location.origin + location.pathname}});
    else if (kind === 'forgot') res = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
    else if (kind === 'recover') res = await sb.auth.updateUser({password: pass});
  } catch (err) { res = {error: err}; }
  S.authBusy = false;
  if (res && res.error) { S.authErr = true; S.authMsg = friendlyAuth(res.error); render(); return; }
  S.authErr = false;
  if (kind === 'signup' && !(res.data && res.data.session)) { S.authMsg = 'Account created. Check your email for a confirmation link, then sign in here.'; S.authView = 'signin'; }
  else if (kind === 'forgot') S.authMsg = 'If that email has an account, a reset link is on its way.';
  else if (kind === 'recover') { S.authMsg = ''; S.authView = 'signin'; toast('Password updated'); const {data} = await sb.auth.getSession(); if (data.session) startUser(data.session.user); }
  else S.authMsg = '';
  render();
});
function friendlyAuth(err) {
  const m = (err && err.message) || String(err);
  if (/Invalid login/i.test(m)) return 'That email and password don’t match. Try again or reset your password.';
  if (/Email not confirmed/i.test(m)) return 'Confirm your email first. Check your inbox for the link.';
  if (/already registered|already exists/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/rate limit/i.test(m)) return 'Too many emails sent for now. Wait a bit and try again.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Can’t reach the server. Check your connection.';
  return m;
}

/* ---------- account page ---------- */
function viewAccount() {
  const waiting = Object.keys(QUEUE).length;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="narrow">
    <div><div class="eyebrow">Account</div><h1 class="page-h">You</h1></div>
    <section class="card">
      <div class="row"><span class="eyebrow">Signed in as</span></div>
      <div style="color:var(--val);font-weight:700;font-size:18px;word-break:break-all">${esc(S.user.email || '')}</div>
      <div class="dim small">${waiting ? `${V(waiting)} change${waiting > 1 ? 's' : ''} waiting to sync.` : 'Everything is synced.'} Your data is private to this account.</div>
      <button class="btn quiet" data-a="sign-out">Sign out</button>
    </section>
    ${standalone ? '' : `<section class="card">
      <h2 class="h2">Put it on your home screen</h2>
      <p class="dim small" style="margin:0"><b style="color:var(--red-text)">iPhone (Safari):</b> tap Share, then “Add to Home Screen”.<br>
      <b style="color:var(--red-text)">Android (Chrome):</b> tap ⋮, then “Add to Home screen” or “Install app”.</p>
    </section>`}
    <section class="card">
      <h2 class="h2">Backup</h2>
      <p class="dim small" style="margin:0">Your data lives in your database and on this device. A backup copy is extra safety.</p>
      <button class="btn" data-a="backup">Copy all my data</button>
      <label class="eyebrow" for="imp">Restore or import a backup</label>
      <textarea class="notes" id="imp" data-bind="importText" placeholder="Paste a backup here">${esc(S.importText || '')}</textarea>
      <button class="btn ${S.confirm === 'import' ? 'armed' : ''}" data-a="import">${S.confirm === 'import' ? 'Tap again to import' : 'Import backup'}</button>
    </section>
  </div>`;
}
function importBackup(text) {
  let j; try { j = JSON.parse(text); } catch (e) { toast('That doesn’t look like a Lift Log backup.'); return; }
  let n = 0;
  for (const w of (j.workouts || [])) { if (!w || !w.id) continue; const {id, ...rest} = w; saveDoc('workouts/' + id, rest); n++; }
  for (const d of (j.days || j.exerciseLists || [])) { if (!d || !d.id) continue; const {id, ...rest} = d; saveDoc('routines/' + id, {program: 'ppl', ...rest}); }
  const st = j.settings || {};
  const patch = {};
  const progs = j.splits || st.programs; if (progs && progs.length) patch.programs = [...programs().filter(p => !progs.some(q => q.id === p.id)), ...progs];
  const cus = j.customExercises || st.custom; if (cus && cus.length) patch.custom = [...custom().filter(c => !cus.some(x => x.name === c.name)), ...cus];
  if (st.activeProgram) patch.activeProgram = st.activeProgram;
  if (Object.keys(patch).length) saveSettings(patch);
  S.importText = ''; toast(`Imported ${n} workout${n === 1 ? '' : 's'}`); render();
}

/* ===================== rendering ===================== */
function safeRender() {
  const ae = document.activeElement;
  if (ae && $('#main').contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) { S.pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => {
  if (!S.pendingRender) return;
  const ae = document.activeElement;
  if (ae && $('#main').contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return;
  S.pendingRender = false; render();
}, 0));

function renderMenu() {
  const cur = PAGES.find(p => p[0] === S.tab);
  $('#menu-wrap').innerHTML = `
    <button class="menu-btn" data-a="menu" aria-expanded="${S.menuOpen}" aria-haspopup="true" aria-controls="menu">${ICON.menu}<span class="lbl-long">${cur ? cur[1] : 'Menu'}</span><span class="lbl-short">Menu</span></button>
    ${S.menuOpen ? `<div class="menu" id="menu" role="menu">
      ${PAGES.slice(0, 4).map(([k, l]) => `<button role="menuitem" data-a="go" data-tab="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${ICON[k]}${l}</button>`).join('')}
      <hr>
      <button role="menuitem" data-a="go" data-tab="splits" ${S.tab === 'splits' ? 'aria-current="page"' : ''}>${ICON.splits}My splits</button>
      <button role="menuitem" data-a="go" data-tab="account" ${S.tab === 'account' ? 'aria-current="page"' : ''}>${ICON.user}Account</button>
    </div>` : ''}`;
}
function render() {
  if (!S.user) { $('#menu-wrap').innerHTML = ''; $('#main').innerHTML = viewAuth(); renderPicker(); return; }
  renderMenu();
  let html = '';
  if (S.tab === 'home') html += viewHome();
  else if (S.tab === 'log') html += S.active ? viewActive() : viewChoose();
  else if (S.tab === 'history') html += viewHistory();
  else if (S.tab === 'progress') html += viewProgress();
  else if (S.tab === 'account') html += viewAccount();
  else html += viewSplits();
  $('#main').innerHTML = html;
  renderPicker();
  if (S.tab === 'progress') requestAnimationFrame(drawCharts);
  tickElapsed();
  mountMotivation();
}
function go(tab) { S.tab = tab; S.menuOpen = false; S.editR = null; S.confirm = null; S.splitEdit = null; S.newSplit = null; render(); window.scrollTo(0, 0); }

/* ---------- Home ---------- */
function upNext(pid) {
  const days = daysOf(pid); if (!days.length) return null;
  const asc = derive().asc;
  for (let i = asc.length - 1; i >= 0; i--) { const idx = days.findIndex(d => d.id === asc[i].routineId); if (idx >= 0) return days[(idx + 1) % days.length]; }
  return days[0];
}
function prRow(p, date) {
  return `<div class="it"><span class="chip pr">${p.label}</span><span class="exn">${esc(p.ex)}</span><span class="dim small">${fmtDate(date)} · ${V(fmtSet(p.set, p.kind, p.unit))}</span><span class="num-big">${p.txt}</span></div>`;
}
function viewHome() {
  const now = new Date(); const st = dayStreak();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const dates = new Set(S.workouts.map(w => w.date));
  let weekCount = 0;
  const week = ['M','T','W','T','F','S','S'].map((l, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const on = dates.has(ymd(d)); if (on) weekCount++;
    return `<div class="d ${on ? 'on' : ''} ${i === dow ? 'today' : ''}"><b>${d.getDate()}</b>${l}</div>`;
  }).join('');
  const status = st.loggedToday ? 'Today is logged. Streak is safe.' : st.n ? 'Log a workout today to keep it going.' : S.workouts.length ? 'Log today to start a new streak.' : 'Log your first workout to start your streak.';
  const d = derive(); const last = d.asc[d.asc.length - 1];
  const prog = activeProgram(); const nx = upNext(prog.id);
  return `
  <div class="eyebrow">${now.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</div>
  <div class="home-grid">
    <section class="streak" aria-label="Day streak">
      <div class="big"><span class="n">${st.n}</span><span class="lbl">Day<br>streak</span></div>
      <div class="status">${status}</div>
      <div class="week" aria-label="Days logged this week">${week}</div>
      <div class="meta">
        <div><span class="eyebrow">Best streak</span><b>${st.best}</b></div>
        <div><span class="eyebrow">This week</span><b>${weekCount}</b></div>
        <div><span class="eyebrow">All time</span><b>${S.workouts.length}</b></div>
      </div>
    </section>
    <div class="narrow" style="gap:18px">
      ${S.active
        ? `<button class="btn primary block log-cta" data-a="go" data-tab="log">Resume ${esc(S.active.name)}</button>`
        : `<button class="btn primary block log-cta" data-a="go" data-tab="log">Log a workout</button>
           ${nx ? `<div class="dim small" style="margin-top:-10px">Up next in ${esc(prog.name)}: <b style="color:var(--red-text)">${esc(nx.name)}</b></div>` : ''}`}
      ${last ? `<section class="card">
        <div class="row"><h2 class="h2">Last session</h2><span class="spacer"></span><span class="dim small">${fmtDate(last.date, {weekday: 'short', month: 'short', day: 'numeric'})}</span></div>
        <div class="stats3">
          <div><span class="eyebrow">Day</span><b>${esc(last.name || 'Workout')}</b></div>
          <div><span class="eyebrow">Sets</span><b>${workoutSets(last)}</b></div>
          <div><span class="eyebrow">Lbs moved</span><b>${fmtVol(workoutVolume(last))}</b></div>
          ${last.durationMin ? `<div><span class="eyebrow">Minutes</span><b>${last.durationMin}</b></div>` : ''}
        </div>
      </section>` : ''}
      ${viewMotivation()}
    </div>
  </div>`;
}

/* ---------- Log: choose the day ---------- */
function viewChoose() {
  const asc = derive().asc; const prog = activeProgram(); const days = daysOf(prog.id); const nx = upNext(prog.id);
  const lastDone = id => { for (let i = asc.length - 1; i >= 0; i--) if (asc[i].routineId === id) return asc[i].date; return null; };
  const ps = programs();
  return `<div class="narrow" style="max-width:1080px">
    <div><div class="eyebrow">Log workout</div><h1 class="page-h">What are you hitting?</h1></div>
    <div class="row">
      <label class="eyebrow" for="prog-pick">Split</label>
      <select class="sel" id="prog-pick" data-c="program">${ps.map(p => `<option value="${p.id}" ${p.id === prog.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <button class="btn quiet sm" data-a="go" data-tab="splits">Build or edit splits</button>
    </div>
    ${days.length ? `<div class="split-grid">${days.map(s => {
      const ld = lastDone(s.id); const n = (s.exercises || []).length; const isNext = nx && nx.id === s.id;
      const sub = s.sub || (n ? s.exercises.slice(0, 3).map(e => e.name).join(' · ') + (n > 3 ? ' …' : '') : '');
      return `<button class="split ${isNext ? 'next' : ''}" data-a="start" data-rid="${s.id}">
        ${isNext ? '<span class="chip pr tag">Up next</span>' : ''}
        <span class="nm">${esc(s.name)}</span>
        ${sub ? `<span class="sb">${esc(sub)}</span>` : ''}
        <span class="last">${n ? `<b>${n}</b> exercises` : 'No exercises saved yet'} · ${ld ? `last <b>${fmtDate(ld)}</b>` : 'not logged yet'}</span>
      </button>`; }).join('')}
    </div>` : `<div class="empty">This split has no days yet. Add some under My splits.</div>`}
    <div class="row"><button class="btn quiet sm" data-a="start-empty">Something else (blank workout)</button></div>
  </div>`;
}

/* ---------- Log: active workout ---------- */
function newSet() { return {w: null, r: null, t: null, d: null, done: false}; }
function mkEx(name, n, target) { const i = exInfo(name); return {name, kind: i.kind, unit: i.unit, ...(target ? {target} : {}), sets: Array.from({length: Math.max(1, n)}, newSet)}; }
function startWorkout(dayId) {
  const day = dayId ? dayById(dayId) : null;
  const exercises = day ? (day.exercises || []).map(e => {
    const ex = mkEx(e.name, e.sets || 3, {sets: e.sets || 3, reps: e.reps || ''});
    if (e.kind) { ex.kind = e.kind; ex.unit = e.unit; }
    return ex;
  }) : [];
  S.active = {id: uid(), name: day ? day.name : 'Workout', date: ymd(new Date()), startedAt: Date.now(), routineId: day ? day.id : null, notes: '', exercises};
  persistActive(); S.tab = 'log'; render(); window.scrollTo(0, 0);
}
const exKind = ex => ex.kind || 'wr';
function placeholders(ex, si) {
  const last = lastFor(ex.name, S.active.editingId);
  const prev = last ? (last.sets[si] || last.sets[last.sets.length - 1]) : null;
  const ph = {prev: last ? last.sets[si] : null, w: prev ? prev.w : null, r: prev ? prev.r : null, t: prev ? prev.t : null, d: prev ? prev.d : null};
  if (exKind(ex) === 'wr' && ph.r == null && ex.target && ex.target.reps) { const lr = parseInt(ex.target.reps, 10); if (isFinite(lr)) ph.r = lr; }
  return ph;
}
function isPR(ex, s) {
  const kind = exKind(ex);
  if (!s.done || !valid(kind, s)) return false;
  const b = bestFor(ex.name, S.active.editingId);
  switch (kind) {
    case 'wr': { const e = e1rm(s.w || 0, s.r); return (e > 0 && b.e > 0 && e > b.e + 0.05) || ((s.w || 0) > 0 && b.w > 0 && s.w > b.w); }
    case 'h': case 't': return b.t > 0 && s.t > b.t;
    case 'c': return (b.d > 0 && s.d > b.d) || (!s.d && b.t > 0 && s.t > b.t);
    case 'y': return (b.w > 0 && (s.w || 0) > b.w) || (b.d > 0 && (s.d || 0) > b.d);
  }
  return false;
}
function activeVolume() { return S.active.exercises.reduce((a, ex) => a + (exKind(ex) === 'wr' ? sum(ex.sets, s => s.done && s.r > 0 ? (s.w || 0) * s.r : 0) : 0), 0); }
function inputVal(f, kind, v) {
  if (v == null) return '';
  if (f === 'w') return fmtW(v);
  if (f === 'd') return fmtNum(v);
  if (f === 't') return kind === 'h' ? String(Math.round(v)) : fmtDur(v);
  return String(v);
}
function inputAttrs(f, kind) {
  if (f === 'w' || f === 'd') return 'inputmode="decimal"';
  if (f === 'r') return 'inputmode="numeric"';
  if (f === 't') return kind === 'h' ? 'inputmode="numeric"' : 'inputmode="text"';
  return '';
}
function phText(f, kind, ph) { const v = ph[f]; if (v == null) return f === 't' ? (kind === 'h' ? 'sec' : 'mm:ss') : '0'; return inputVal(f, kind, v); }
function viewActive() {
  const A = S.active;
  const day = A.routineId ? dayById(A.routineId) : null;
  const onList = new Set(day ? (day.exercises || []).map(e => e.name) : []);
  const exHtml = A.exercises.map((ex, ei) => {
    const kind = exKind(ex), unit = ex.unit, [c1, c2] = cols(kind, unit);
    const last = lastFor(ex.name, A.editingId); const b = bestFor(ex.name, A.editingId);
    const sub = [];
    if (ex.target && (ex.target.sets || ex.target.reps) && kind === 'wr') sub.push(`Target ${V(ex.target.sets + ' × ' + esc(ex.target.reps || '?'))}`);
    if (last) sub.push(`Last time (${fmtDate(last.date)}): ${V(last.sets.map(s => fmtSet(s, kind, unit)).join(', '))}`);
    if (kind === 'wr' && b.e > 0) sub.push(`Best est. 1RM ${V(Math.round(b.e))}`);
    if (day && !onList.has(ex.name) && !A.editingId) sub.push(`<span style="color:var(--red-text)">New: saves to your ${esc(day.name)} list when you finish</span>`);
    const rows = ex.sets.map((s, si) => {
      const ph = placeholders(ex, si); const pr = isPR(ex, s);
      const inp = c => c ? `<input class="num" id="${c[0]}-${ei}-${si}" ${inputAttrs(c[0], kind)} enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} set ${si + 1} ${c[1]}" data-ei="${ei}" data-si="${si}" data-f="${c[0]}" value="${inputVal(c[0], kind, s[c[0]])}" placeholder="${phText(c[0], kind, ph)}">` : '<span></span>';
      return `<div class="set-row ${s.done ? 'done' : ''}" id="row-${ei}-${si}">
        <span class="setno">${pr ? '<span class="chip pr">PR</span>' : si + 1}</span>
        <span class="prev">${ph.prev ? fmtSet(ph.prev, kind, unit) : '—'}</span>
        ${inp(c1)}${inp(c2)}
        <button class="check" data-a="toggle" data-ei="${ei}" data-si="${si}" aria-pressed="${s.done ? 'true' : 'false'}" aria-label="Mark ${esc(ex.name)} set ${si + 1} done">${ICON.check}</button>
      </div>`;
    }).join('');
    const armed = S.confirm === 'exdel-' + ei;
    return `<article class="ex" id="ex-${ei}">
      <div class="ex-h">
        <div style="min-width:0"><h3>${esc(ex.name)}</h3><div class="ex-sub">${sub.map(x => `<span>${x}</span>`).join('')}</div></div>
        <div class="ex-act">
          <button class="icon-btn" data-a="ex-up" data-ei="${ei}" aria-label="Move ${esc(ex.name)} up" ${ei === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button class="icon-btn" data-a="ex-down" data-ei="${ei}" aria-label="Move ${esc(ex.name)} down" ${ei === A.exercises.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
          <button class="icon-btn ${armed ? 'armed' : ''}" data-a="ex-del" data-ei="${ei}" aria-label="${armed ? 'Tap again to remove' : 'Remove'} ${esc(ex.name)}">${ICON.x}</button>
        </div>
      </div>
      <div class="sets">
        <div class="set-row head"><span style="text-align:center">Set</span><span>Prev</span><span>${c1 ? c1[1] : ''}</span><span>${c2[1]}</span><span></span></div>
        ${rows}
      </div>
      <div class="ex-foot">
        <button class="btn sm" data-a="add-set" data-ei="${ei}">+ Add set</button>
        ${ex.sets.length > 1 ? `<button class="btn sm quiet" data-a="del-set" data-ei="${ei}">Remove last set</button>` : ''}
      </div>
    </article>`;
  }).join('');
  const discardArmed = S.confirm === 'discard';
  return `
  <section class="active-head">
    <div class="eyebrow">${A.editingId ? 'Editing workout' : 'In progress'}</div>
    <input class="title-input" id="a-name" data-af="name" value="${esc(A.name)}" aria-label="Workout name">
    <div class="meta">
      <input type="date" id="a-date" data-af="date" value="${esc(A.date)}" aria-label="Workout date">
      ${A.editingId ? '' : `<span class="stat"><b id="elapsed" class="tnum">0:00</b>elapsed</span>`}
      <span class="stat"><b class="tnum" id="a-vol">${fmtVol(activeVolume())}</b>lbs moved</span>
    </div>
  </section>
  ${exHtml ? `<div class="ex-grid">${exHtml}</div>` : `<div class="empty">${day ? `Your ${esc(day.name)} list is empty. Add exercises below and they’re saved to ${esc(day.name)} when you finish.` : 'No exercises yet. Add your first one below.'}</div>`}
  <button class="btn block" data-a="pick" data-target="active">+ Add exercise</button>
  <textarea class="notes" id="a-notes" data-af="notes" placeholder="Notes: how it felt, sleep, anything to remember next time">${esc(A.notes || '')}</textarea>
  <div class="finish-bar">
    <button class="btn quiet ${discardArmed ? 'armed' : ''}" data-a="discard">${discardArmed ? 'Tap again to discard' : (A.editingId ? 'Cancel' : 'Discard')}</button>
    <button class="btn primary" data-a="finish">${A.editingId ? 'Save changes' : 'Finish workout'}</button>
  </div>`;
}
let elapsedInt = null;
function tickElapsed() {
  clearInterval(elapsedInt);
  const el = $('#elapsed'); if (!el || !S.active) return;
  const upd = () => { el.textContent = fmtDur(Math.max(0, (Date.now() - S.active.startedAt) / 1000)); };
  upd(); elapsedInt = setInterval(() => { if (!document.body.contains(el)) return clearInterval(elapsedInt); upd(); }, 1000);
}
function refreshRow(ei, si) {
  const ex = S.active.exercises[ei], s = ex.sets[si];
  const row = $(`#row-${ei}-${si}`); if (!row) return;
  row.querySelector('.setno').innerHTML = isPR(ex, s) ? '<span class="chip pr">PR</span>' : String(si + 1);
  const v = $('#a-vol'); if (v) v.textContent = fmtVol(activeVolume());
}
function finishWorkout() {
  const A = S.active;
  const exercises = A.exercises.map(ex => {
    const kind = exKind(ex);
    return {name: ex.name, kind, ...(ex.unit ? {unit: ex.unit} : {}), sets: ex.sets.filter(s => valid(kind, s)).map(s => cleanSet(kind, ex.unit, s))};
  }).filter(ex => ex.sets.length);
  if (!exercises.length) { toast('Log at least one complete set before finishing.'); return; }
  const id = A.editingId || A.id;
  const prev = A.editingId ? S.workouts.find(w => w.id === A.editingId) : null;
  const doc = {
    name: (A.name || 'Workout').trim() || 'Workout', date: A.date || ymd(new Date()),
    startedAt: prev ? (prev.startedAt || A.startedAt) : A.startedAt,
    finishedAt: prev ? (prev.finishedAt || Date.now()) : Date.now(),
    durationMin: prev ? (prev.durationMin || null) : Math.max(1, Math.round((Date.now() - A.startedAt) / 60000)),
    routineId: A.routineId || null, notes: (A.notes || '').trim(), exercises,
  };
  let prCount = 0; A.exercises.forEach(ex => ex.sets.forEach(s => { if (isPR(ex, s)) prCount++; }));
  saveDoc('workouts/' + id, doc);
  // Remember: any exercise added during this workout joins that day's saved list.
  let added = 0;
  const day = A.routineId ? dayById(A.routineId) : null;
  if (day && !A.editingId) {
    const list = (day.exercises || []).slice();
    for (const ex of exercises) if (!list.some(e => e.name === ex.name)) { list.push({name: ex.name, sets: ex.sets.length, reps: '', kind: ex.kind, unit: ex.unit}); added++; }
    if (added) saveRoutine(day.id, {...day, exercises: list});
  }
  S.active = null; S.confirm = null; persistActive();
  toast(A.editingId ? 'Workout updated' : `Workout saved${prCount ? ` · ${prCount} PR${prCount > 1 ? 's' : ''}` : ''}${added ? ` · ${added} exercise${added > 1 ? 's' : ''} added to your ${day.name} list` : ''}`);
  go(A.editingId ? 'history' : 'home');
}

/* ---------- History ---------- */
function viewHistory() {
  const d = derive(); const desc = [...d.asc].reverse();
  if (!desc.length) return `<div class="narrow"><h1 class="page-h">History</h1><div class="empty">No workouts yet. Finish one from Log workout and it lands here.</div></div>`;
  let html = `<div><h1 class="page-h">History</h1><p class="dim" style="margin:6px 0 0">${V(desc.length)} workout${desc.length > 1 ? 's' : ''} since ${V(fmtDate(d.asc[0].date, {month: 'short', day: 'numeric', year: 'numeric'}))}</p></div>`;
  let curMonth = '';
  for (const w of desc) {
    const mk = w.date.slice(0, 7);
    if (mk !== curMonth) { curMonth = mk; html += `<h2 class="month-h">${parseYmd(w.date).toLocaleDateString(undefined, {month: 'long', year: 'numeric'})}</h2>`; }
    const open = S.expanded.has(w.id); const prs = d.prs[w.id] || []; const dt = parseYmd(w.date);
    const vol = workoutVolume(w);
    html += `<article class="hcard">
      <button class="hhead" data-a="expand" data-id="${w.id}" aria-expanded="${open}">
        <div class="hdate"><span class="dw">${dt.toLocaleDateString(undefined, {weekday: 'short'}).toUpperCase()}</span><span class="dn">${dt.getDate()}</span></div>
        <div class="hmain">
          <div class="row" style="gap:8px"><span class="hname">${esc(w.name || 'Workout')}</span>${prs.length ? `<span class="chip pr">${prs.length} PR${prs.length > 1 ? 's' : ''}</span>` : ''}</div>
          <div class="hsub tnum">${V((w.exercises || []).length)} exercises · ${V(workoutSets(w))} sets${vol ? ` · ${V(fmtVol(vol))} lbs` : ''}${w.durationMin ? ` · ${V(w.durationMin)} min` : ''}</div>
          ${open ? '' : `<div class="hex">${(w.exercises || []).map(e => esc(e.name)).join(' · ')}</div>`}
        </div>
      </button>
      ${open ? `<div class="hbody">
        ${(w.exercises || []).map(ex => {
          const p = prs.find(x => x.ex === ex.name);
          return `<div class="hx"><div class="n">${esc(ex.name)}${p ? `<span class="chip pr">PR · ${p.txt}</span>` : ''}</div>
          <div class="setchips">${(ex.sets || []).map(s => `<span>${fmtSet(s, ex.kind || 'wr', ex.unit)}</span>`).join('')}</div></div>`;
        }).join('')}
        ${w.notes ? `<p class="hnotes">${esc(w.notes)}</p>` : ''}
        <div class="row">
          <button class="btn sm" data-a="edit-w" data-id="${w.id}">Edit</button>
          <button class="btn sm" data-a="repeat-w" data-id="${w.id}">Repeat this workout</button>
          <span class="spacer"></span>
          <button class="btn sm quiet ${S.confirm === 'wdel-' + w.id ? 'armed' : ''}" data-a="del-w" data-id="${w.id}">${S.confirm === 'wdel-' + w.id ? 'Tap again to delete' : 'Delete'}</button>
        </div>
      </div>` : ''}
    </article>`;
  }
  html += `<div class="row" style="justify-content:center;margin-top:8px"><button class="btn sm quiet" data-a="backup">Copy all data as a backup</button></div>`;
  return `<div class="narrow">${html}</div>`;
}

/* ---------- Progress ---------- */
const RANGES = {'1M': 31, '3M': 92, '6M': 183, '1Y': 366, 'All': 1e6};
function metricsFor(h) {
  const s0 = h[0], kind = s0.kind;
  if (kind === 'wr') return h.every(s => s.topW === 0) ? [['reps', 'Best reps'], ['totr', 'Total reps']] : [['e1rm', 'Est. 1RM'], ['top', 'Top weight'], ['vol', 'Volume']];
  if (kind === 'h') return h.some(s => s.topW > 0) ? [['hold', 'Longest hold'], ['top', 'Heaviest']] : [['hold', 'Longest hold']];
  if (kind === 't') return [['time', 'Total time']];
  if (kind === 'c') return [['dist', 'Distance'], ['time', 'Time']].concat((UNIT[s0.unit] || {}).paceDiv ? [['pace', 'Pace']] : []);
  if (kind === 'y') return [['top', 'Heaviest'], ['dist', 'Distance']];
  return [['e1rm', 'Est. 1RM']];
}
function metricVal(m, s) {
  switch (m) {
    case 'e1rm': return s.e1rm; case 'top': return s.topW; case 'vol': return s.vol; case 'reps': return s.bestR; case 'totr': return s.totR;
    case 'hold': return s.bestT; case 'time': return s.totT; case 'dist': return s.kind === 'c' ? s.totD : s.maxD; case 'pace': return s.pace;
  }
  return 0;
}
function metricFmt(m, v, unit, kind) {
  switch (m) {
    case 'e1rm': case 'top': case 'vol': return fmtAxis(Math.round(v)) + ' lbs';
    case 'reps': case 'totr': return Math.round(v) + ' reps';
    case 'hold': return fmtHold(v); case 'time': return fmtDur(v);
    case 'dist': return fmtNum(v) + ' ' + (kind === 'c' ? (UNIT[unit] || UNIT.mi).h : 'm');
    case 'pace': return fmtDur(v) + (UNIT[unit] || {}).pace;
  }
  return String(v);
}
const axisFmt = m => (m === 'hold' || m === 'time' || m === 'pace') ? (v => fmtDur(v)) : (m === 'dist' ? fmtNum : fmtAxis);
function bestTiles(h) {
  const k = h[0].kind, u = h[0].unit, long = s => fmtDate(s.date, {month: 'short', day: 'numeric', year: 'numeric'});
  const t = (l, s, f, sub) => `<div class="best"><div class="l">${l}</div><div class="v">${f}</div><div class="s">${sub ? sub + ' · ' : ''}${long(s)}</div></div>`;
  if (k === 'wr') {
    if (h.every(s => s.topW === 0)) { const a = maxBy(h, s => s.bestR), b = maxBy(h, s => s.totR); return t('Most reps', a, a.bestR) + t('Most total reps', b, b.totR); }
    const a = maxBy(h, s => s.e1rm), b = h.reduce((m, s) => (s.topW > m.topW || (s.topW === m.topW && s.topSet.r > m.topSet.r)) ? s : m, h[0]), c = maxBy(h, s => s.vol);
    return t('Best est. 1RM', a, Math.round(a.e1rm), fmtSet(a.eSet, k)) + t('Heaviest set', b, fmtW(b.topW), fmtSet(b.topSet, k)) + t('Best volume', c, fmtVol(c.vol));
  }
  if (k === 'h' || k === 't') { const a = maxBy(h, s => s.bestT), b = maxBy(h, s => s.totT); return t(k === 'h' ? 'Longest hold' : 'Longest session', a, k === 'h' ? fmtHold(a.bestT) : fmtDur(a.bestT)) + t('Most total time', b, fmtDur(b.totT)); }
  if (k === 'c') {
    let out = ''; const a = maxBy(h, s => s.totD), b = maxBy(h, s => s.totT);
    if (a.totD) out += t('Farthest', a, fmtNum(a.totD) + ' ' + (UNIT[u] || UNIT.mi).h);
    out += t('Longest time', b, fmtDur(b.totT));
    const ps = h.filter(s => s.pace); if (ps.length) { const p = ps.reduce((m, s) => s.pace < m.pace ? s : m, ps[0]); out += t('Best pace', p, fmtDur(p.pace) + UNIT[u].pace); }
    return out;
  }
  if (k === 'y') { const a = maxBy(h, s => s.topW), b = maxBy(h, s => s.maxD); return t('Heaviest', a, fmtW(a.topW) + ' lbs', fmtSet(a.best, k)) + t('Farthest', b, fmtNum(b.maxD) + ' m'); }
  return '';
}
function viewProgress() {
  const d = derive(); const ws = d.asc; const now = new Date();
  const monthKey = ymd(now).slice(0, 7);
  const thisMonth = ws.filter(w => w.date.startsWith(monthKey)).length;
  const eightAgo = ymd(new Date(Date.now() - 56 * DAY));
  const last8 = ws.filter(w => w.date >= eightAgo).length;
  const st = dayStreak();
  const tiles = `<div class="tiles">
    <div class="tile"><div class="l">Day streak</div><div class="v">${st.n}<small>days</small></div></div>
    <div class="tile"><div class="l">This month</div><div class="v">${thisMonth}<small>workouts</small></div></div>
    <div class="tile"><div class="l">Avg / week</div><div class="v">${(last8 / 8).toFixed(1)}<small>8 wk</small></div></div>
    <div class="tile"><div class="l">All time</div><div class="v">${ws.length}<small>workouts</small></div></div>
  </div>`;
  if (!ws.length) return `<h1 class="page-h">Progress</h1>${tiles}<div class="empty">Log a few sessions and your trends, PRs and monthly volume show up here.</div>`;
  const exNames = Object.keys(d.hist).sort((a, b) => d.hist[b].length - d.hist[a].length || a.localeCompare(b));
  if (!S.progEx || !d.hist[S.progEx]) S.progEx = exNames[0];
  const h = d.hist[S.progEx] || [];
  const metrics = metricsFor(h);
  if (!metrics.some(m => m[0] === S.metric)) S.metric = metrics[0][0];
  const k = h[0].kind, u = h[0].unit;
  const repCols = k === 'wr' && !h.every(s => s.topW === 0) ? [1, 3, 5, 8, 10, 12].map(r => {
    let bw = 0, date = null;
    for (const s of h) for (const x of s.sets) if (x.r >= r && (x.w || 0) > bw) { bw = x.w; date = s.date; }
    return `<div title="${date ? 'Set on ' + fmtDate(date) : 'No set yet'}"><div class="r">${r} rep${r > 1 ? 's' : ''}</div><div class="w">${bw ? fmtW(bw) : '—'}</div></div>`;
  }).join('') : '';
  const recent = [...h].reverse().slice(0, 12);
  const m0 = metrics[0][0];
  return `
  <h1 class="page-h">Progress</h1>
  ${tiles}
  <div class="prog-grid">
    <section class="card">
      <div class="row" style="align-items:flex-end">
        <div style="flex:1;min-width:200px"><label class="eyebrow" for="prog-ex">Exercise</label><br>
          <select class="sel" id="prog-ex" data-c="progEx" style="width:100%">${exNames.map(n => `<option ${n === S.progEx ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="seg" role="group" aria-label="Time range">${Object.keys(RANGES).map(r => `<button data-a="range" data-v="${r}" aria-pressed="${S.range === r}">${r}</button>`).join('')}</div>
      </div>
      <div class="row"><div class="seg" role="group" aria-label="Metric">${metrics.map(([key, l]) => `<button data-a="metric" data-v="${key}" aria-pressed="${S.metric === key}">${l}</button>`).join('')}</div>
        <span class="spacer"></span><span class="dim small">${V(h.length)} session${h.length > 1 ? 's' : ''}</span></div>
      <div class="chart" data-chart="exercise" role="img" aria-label="Line chart of ${esc(S.progEx)} over time"></div>
      <div class="bests">${bestTiles(h)}</div>
      ${repCols ? `<div><div class="eyebrow" style="margin-bottom:6px">Heaviest weight for at least…</div><div class="repgrid">${repCols}</div></div>` : ''}
    </section>
    <div style="display:flex;flex-direction:column;gap:18px">
      <section class="card">
        <div class="row"><h2 class="h2">Monthly volume</h2><span class="spacer"></span><span class="dim small">lbs lifted (weight × reps)</span></div>
        <div class="chart" data-chart="months" role="img" aria-label="Bar chart of pounds lifted per month, last 12 months"></div>
      </section>
      <section class="card">
        <h2 class="h2">${esc(S.progEx)} sessions</h2>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Date</th><th>Sets</th><th class="r">${metrics[0][1]}</th></tr></thead>
          <tbody>${recent.map(s => `<tr><td>${fmtDate(s.date, {month: 'short', day: 'numeric', year: '2-digit'})}</td><td>${s.sets.map(x => fmtSet(x, k, u)).join(', ')}</td><td class="r">${metricFmt(m0, metricVal(m0, s), u, k)}</td></tr>`).join('')}</tbody>
        </table></div>
        ${k === 'wr' ? `<p class="dim small" style="margin:0">Est. 1RM uses the Epley formula: weight × (1 + reps ÷ 30). It’s most accurate for sets of 10 reps or fewer.</p>` : ''}
      </section>
    </div>
  </div>`;
}

/* ---------- charts (hand-drawn SVG) ---------- */
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const step0 = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(step0))), nrm = step0 / mag;
  const step = (nrm < 1.5 ? 1 : nrm < 3 ? 2 : nrm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return {lo, hi, ticks};
}
const tip = $('#tip');
function showTip(html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top < 8) top = y + 14;
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
const hideTip = () => { tip.hidden = true; };
const fmtAxis = v => v >= 10000 ? (v / 1000) + 'k' : v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(v * 100) / 100);

function drawLine(el, pts, label, fmtTipV, fmtAx) {
  const W = Math.max(280, el.clientWidth), H = 230, m = {l: 50, r: 52, t: 20, b: 28};
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  if (!pts.length) { el.innerHTML = `<div class="empty" style="margin-top:10px">No sessions in this range. Try a longer range.</div>`; return; }
  let x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  if (x1 - x0 < 14 * DAY) { const c = (x0 + x1) / 2; x0 = c - 7 * DAY; x1 = c + 7 * DAY; }
  const ys = pts.map(p => p.y); const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const padY = (ymax - ymin) * 0.15 || Math.max(ymax * 0.1, 1);
  const T = niceTicks(Math.max(0, ymin - padY), ymax + padY);
  const X = t => m.l + (t - x0) / (x1 - x0) * iw, Y = v => m.t + ih - (v - T.lo) / (T.hi - T.lo) * ih;
  let g = '';
  for (const t of T.ticks) g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis-n" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${fmtAx(t)}</text>`;
  const span = x1 - x0; const months = [];
  const sd = new Date(x0); let mc = new Date(sd.getFullYear(), sd.getMonth() + (sd.getDate() > 1 ? 1 : 0), 1);
  while (mc.getTime() <= x1) { months.push(new Date(mc)); mc = new Date(mc.getFullYear(), mc.getMonth() + 1, 1); }
  const stepM = Math.ceil(months.length / Math.max(2, Math.floor(iw / 70))) || 1;
  months.forEach((d, i) => { if (i % stepM) return; const lbl = d.toLocaleDateString(undefined, {month: 'short'}) + (span > 330 * DAY && (d.getMonth() === 0 || i === 0) ? ' ’' + String(d.getFullYear()).slice(2) : ''); g += `<text class="axis-t" x="${X(d.getTime())}" y="${H - 8}" text-anchor="middle">${lbl}</text>`; });
  if (!months.length) g += `<text class="axis-t" x="${X(pts[0].x)}" y="${H - 8}" text-anchor="middle">${new Date(pts[0].x).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</text>`;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const area = line + `L${X(pts[pts.length - 1].x).toFixed(1)},${Y(T.lo)}L${X(pts[0].x).toFixed(1)},${Y(T.lo)}Z`;
  const showDots = pts.length <= 60;
  const dots = pts.map((p, i) => (showDots || i === pts.length - 1) ? `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="${i === pts.length - 1 ? 5.5 : 4}"/>` : '').join('');
  const lp = pts[pts.length - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="height:${H}px">
    ${g}<path class="ar" d="${area}"/><path class="ln" d="${line}"/>
    <line class="xh" id="xh" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>
    ${dots}<text class="end-t" x="${X(lp.x) + 9}" y="${Y(lp.y) + 5}">${fmtAx(lp.y)}</text>
    <rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>
  </svg>`;
  const svg = el.querySelector('svg'), xh = svg.querySelector('#xh');
  const move = e => {
    const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width);
    let best = pts[0], bd = Infinity; for (const p of pts) { const dd = Math.abs(X(p.x) - px); if (dd < bd) { bd = dd; best = p; } }
    xh.setAttribute('x1', X(best.x)); xh.setAttribute('x2', X(best.x)); xh.setAttribute('visibility', 'visible');
    showTip(`${new Date(best.x).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})}<br>${label}: ${V(fmtTipV(best.y))}${best.note ? '<br>' + best.note : ''}`, r.left + X(best.x) * (r.width / W), r.top + Y(best.y) * (r.height / H));
  };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); hideTip(); });
}
function drawBars(el, bars) {
  const W = Math.max(280, el.clientWidth), H = 210, m = {l: 44, r: 10, t: 14, b: 28};
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const T = niceTicks(0, Math.max(1, ...bars.map(b => b.v)));
  const Y = v => m.t + ih - v / T.hi * ih;
  const bw = iw / bars.length, gap = Math.max(2, bw * 0.28);
  let g = '';
  for (const t of T.ticks) g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis-n" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${fmtAxis(t)}</text>`;
  bars.forEach((b, i) => {
    const x = m.l + i * bw + gap / 2, w = bw - gap, y = Y(b.v), h = m.t + ih - y, rr = Math.min(4, w / 2, h);
    if (b.v > 0) g += `<path class="bar" d="M${x},${m.t + ih}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${m.t + ih}Z"/>`;
    g += `<text class="axis-t" x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${b.label}</text>`;
    g += `<rect class="hit" data-i="${i}" x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${ih}"/>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="height:${H}px">${g}</svg>`;
  el.querySelectorAll('.hit').forEach(r => {
    const b = bars[+r.dataset.i];
    const show = e => showTip(`${b.full}<br>${V(Math.round(b.v).toLocaleString() + ' lbs')}<br>${V(b.n)} workout${b.n === 1 ? '' : 's'}`, e.clientX, e.clientY);
    r.addEventListener('pointermove', show); r.addEventListener('pointerdown', show); r.addEventListener('pointerleave', hideTip);
  });
}
function drawCharts() {
  const d = derive();
  const mEl = document.querySelector('[data-chart="months"]');
  if (mEl) {
    const now = new Date(), bars = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = ymd(dt).slice(0, 7);
      const ws = d.asc.filter(w => w.date.startsWith(key));
      bars.push({label: dt.toLocaleDateString(undefined, {month: 'narrow'}), full: dt.toLocaleDateString(undefined, {month: 'long', year: 'numeric'}), v: ws.reduce((a, w) => a + workoutVolume(w), 0), n: ws.length});
    }
    drawBars(mEl, bars);
  }
  const eEl = document.querySelector('[data-chart="exercise"]');
  if (eEl && S.progEx) {
    const cutoff = ymd(new Date(Date.now() - RANGES[S.range] * DAY));
    const h = (d.hist[S.progEx] || []).filter(s => s.date >= cutoff);
    const m = S.metric, lowerBetter = m === 'pace';
    const byDay = new Map();
    for (const s of h) {
      const y = metricVal(m, s); if (y == null || (m === 'pace' && !y)) continue;
      const note = V(s.sets.map(x => fmtSet(x, s.kind, s.unit)).join(', '));
      const prev = byDay.get(s.date);
      if (!prev || (lowerBetter ? y < prev.y : y > prev.y)) byDay.set(s.date, {x: parseYmd(s.date).getTime(), y, note});
    }
    const pts = [...byDay.values()].sort((a, b) => a.x - b.x);
    const k = h.length ? h[0].kind : 'wr', u = h.length ? h[0].unit : undefined;
    const label = (metricsFor(d.hist[S.progEx]).find(x => x[0] === m) || ['', ''])[1];
    drawLine(eEl, pts, label, v => metricFmt(m, v, u, k), axisFmt(m));
  }
}
let rsz; addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { if (S.tab === 'progress') drawCharts(); }, 150); });

/* ---------- My splits ---------- */
function viewSplits() {
  const ps = programs(); const act = activeProgram();
  let html = `<div class="row" style="align-items:flex-end"><div style="flex:1;min-width:240px"><div class="eyebrow">My splits</div><h1 class="page-h">Build your split</h1>
    <p class="dim" style="margin:8px 0 0">The active split is what Log workout shows. Editing a list never changes workouts you already logged.</p></div>
    ${S.newSplit ? '' : '<button class="btn primary" data-a="new-split">+ New split</button>'}</div>`;
  if (S.newSplit) {
    html += `<article class="rcard" style="border-color:var(--red)">
      <label class="eyebrow" for="ns-name">New split name</label>
      <input class="field" id="ns-name" data-bind="newSplit.name" value="${esc(S.newSplit.name)}" placeholder="e.g. Upper / Lower" style="font-weight:700;font-size:18px">
      <div class="eyebrow">Start from</div>
      <div class="tpl-grid">${TEMPLATES.map(t => `<button class="tpl ${S.newSplit.tpl === t.id ? 'on' : ''}" data-a="tpl" data-v="${t.id}" aria-pressed="${S.newSplit.tpl === t.id}"><b>${t.name}</b><span>${t.days.join(' · ')}</span></button>`).join('')}</div>
      <p class="dim small" style="margin:0">You can rename, add or remove days afterwards.</p>
      <div class="row"><span class="spacer"></span><button class="btn quiet" data-a="cancel-split">Cancel</button><button class="btn primary" data-a="create-split">Create split</button></div>
    </article>`;
  }
  for (const p of ps) {
    const days = daysOf(p.id); const isAct = p.id === act.id; const editing = S.splitEdit === p.id;
    html += `<article class="rcard ${isAct ? 'act' : ''}">
      <div class="row">
        ${editing ? `<input class="field" id="sp-name-${p.id}" data-bind="splitDraftName" value="${esc(S.splitDraftName)}" aria-label="Split name" style="flex:1;min-width:180px;font-weight:700;font-size:18px">`
          : `<span class="pname">${esc(p.name)}</span>`}
        ${isAct ? '<span class="chip pr">Active</span>' : ''}
        <span class="spacer"></span>
        ${!isAct && !editing ? `<button class="btn sm" data-a="use-split" data-id="${p.id}">Use this split</button>` : ''}
        ${editing ? `<button class="btn sm primary" data-a="done-split" data-id="${p.id}">Done</button>` : `<button class="btn sm quiet" data-a="edit-split" data-id="${p.id}">Edit split</button>`}
      </div>
      <div class="days">
      ${days.map((d, i) => {
        if (S.editR && S.editR.id === d.id) return editorCard();
        const n = (d.exercises || []).length;
        return `<div class="dayrow">
          <div class="dmain"><span class="dname">${esc(d.name)}</span>
            <span class="dsub">${n ? `${V(n)} exercises: ${d.exercises.map(e => esc(e.name)).join(', ')}` : 'No exercises yet'}</span></div>
          <div class="row" style="gap:4px;flex-wrap:nowrap">
            ${editing ? `<button class="icon-btn" data-a="day-up" data-id="${d.id}" data-pid="${p.id}" aria-label="Move ${esc(d.name)} up" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
              <button class="icon-btn" data-a="day-down" data-id="${d.id}" data-pid="${p.id}" aria-label="Move ${esc(d.name)} down" ${i === days.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
              <button class="icon-btn ${S.confirm === 'dday-' + d.id ? 'armed' : ''}" data-a="day-del" data-id="${d.id}" aria-label="${S.confirm === 'dday-' + d.id ? 'Tap again to delete' : 'Delete'} ${esc(d.name)}">${ICON.x}</button>` : ''}
            <button class="btn sm" data-a="edit-r" data-id="${d.id}">Edit day</button>
          </div>
        </div>`;
      }).join('') || '<div class="dim small">No days yet.</div>'}
      </div>
      ${editing ? `<div class="row">
          <input class="field" id="add-day" data-bind="addDayName" value="${esc(S.addDayName)}" placeholder="New day name, e.g. Arms" style="flex:1;min-width:160px">
          <button class="btn sm" data-a="add-day" data-pid="${p.id}">+ Add day</button>
        </div>
        ${ps.length > 1 ? `<div class="row"><span class="spacer"></span><button class="btn sm quiet ${S.confirm === 'dsplit-' + p.id ? 'armed' : ''}" data-a="del-split" data-id="${p.id}">${S.confirm === 'dsplit-' + p.id ? 'Tap again to delete this split' : 'Delete split'}</button></div>` : ''}` : ''}
    </article>`;
  }
  return `<div class="narrow">${html}</div>`;
}
function editorCard() {
  const R = S.editR;
  return `<div class="rcard" style="border-color:var(--red);background:var(--bg)">
    <label class="eyebrow" for="r-name">Day name</label>
    <input class="field" id="r-name" data-bind="editR.name" value="${esc(R.name)}" style="font-weight:700;font-size:18px">
    <div>
      ${R.exercises.length ? `<div class="redit-row" style="border-top:0;padding-bottom:0"><span class="tiny" style="text-align:left">Exercise</span><span class="tiny">Sets</span><span class="tiny">Target</span><span></span></div>` : ''}
      ${R.exercises.map((e, i) => `<div class="redit-row">
        <span class="nm2">${esc(e.name)}${(e.kind || exInfo(e.name).kind) !== 'wr' ? ` <span class="dim small">· ${KIND_LABEL[e.kind || exInfo(e.name).kind]}</span>` : ''}</span>
        <input class="field c" id="rs-${i}" inputmode="numeric" data-ri="${i}" data-rf="sets" value="${e.sets ?? 3}" aria-label="${esc(e.name)} sets">
        <input class="field c" id="rr-${i}" data-ri="${i}" data-rf="reps" value="${esc(e.reps ?? '')}" placeholder="8-10" aria-label="${esc(e.name)} target reps">
        <span class="row" style="gap:0;flex-wrap:nowrap">
          <button class="icon-btn" data-a="r-up" data-ri="${i}" aria-label="Move ${esc(e.name)} up" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button class="icon-btn" data-a="r-del-ex" data-ri="${i}" aria-label="Remove ${esc(e.name)}">${ICON.x}</button>
        </span>
      </div>`).join('')}
    </div>
    <button class="btn" data-a="pick" data-target="routine">+ Add exercise</button>
    <div class="row"><span class="spacer"></span>
      <button class="btn quiet" data-a="cancel-r">Cancel</button>
      <button class="btn primary" data-a="save-r">Save day</button>
    </div>
  </div>`;
}


/* ---------- Motivation player (home) ----------
   Cycles your uploaded clips (stored as artifact assets, listed in settings.clips).
   With no clips yet it cycles short lines. The player element lives outside render() so a re-render never restarts a clip. */
const LINES = [
  'Nobody’s coming to lift it for you.',
  'The weight doesn’t know it’s Monday.',
  'You don’t have to feel like it. You just have to start.',
  'Small plates add up. Keep stacking.',
  'Discipline is what’s left when the motivation runs out.',
  'Last set. Make it count.',
  'Earn the streak. Protect the streak.',
  'Strong is built one rep at a time.',
  'Show up. Log it. Beat it next time.',
  'Rest days are part of the plan. Quitting isn’t.',
  'The only bad workout is the one you skipped.',
  'Your future self is watching. Give them a reason to say thanks.',
];
const M = {i: Math.floor(Math.random() * 1000), muted: true, el: null, key: null, timer: null, busy: '', urls: {}, fetching: null};
const clips = () => S.settings.clips || [];
function viewMotivation() {
  const cs = clips();
  return `<section class="card motiv" aria-label="Motivation">
    <div class="row"><h2 class="h2">Motivation</h2><span class="spacer"></span>
      <button class="btn sm quiet" data-a="clips-manage">${S.clipsManage ? 'Done' : (cs.length ? 'Manage clips' : 'Add clips')}</button></div>
    <div id="motiv-slot"></div>
    ${S.clipsManage ? clipManager() : ''}
  </section>`;
}
function clipManager() {
  const cs = clips();
  const can = true;
  return `<div class="clipman">
    ${can ? `<label class="btn block" for="clip-file">+ Upload video clips</label>
      <input type="file" id="clip-file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.m4v,.webm" multiple hidden>
      <p class="dim small" style="margin:0">MP4 or MOV, up to 50 MB each. They play muted in order and loop. Tap the speaker for sound. The free plan has 1 GB of clip space in total.</p>`
      : `<p class="dim small" style="margin:0">Uploading clips only works when Lift Log is opened from your Claude account.</p>`}
    ${M.busy ? `<p class="small" style="margin:0;color:var(--val)">${esc(M.busy)}</p>` : ''}
    ${cs.length ? `<ul class="rlist">${cs.map((c, i) => `<li><span>${V(i + 1)}. ${esc(c.name || 'Clip')}</span>
        <button class="btn sm quiet ${S.confirm === 'clipdel-' + c.id ? 'armed' : ''}" data-a="clip-del" data-id="${c.id}">${S.confirm === 'clipdel-' + c.id ? 'Tap again to remove' : 'Remove'}</button></li>`).join('')}</ul>`
      : '<p class="dim small" style="margin:0">No clips yet. Until you add some, this shows a rotating line.</p>'}
  </div>`;
}
function mountMotivation() {
  const slot = $('#motiv-slot');
  if (!slot) { clearTimeout(M.timer); return; }
  if (!M.el) { M.el = document.createElement('div'); }
  const key = clips().map(c => c.id).join(',');
  if (M.key !== key) { M.key = key; buildStage(); }
  slot.appendChild(M.el);
  const v = M.el.querySelector('video'); if (v) v.play().catch(() => {});
  if (!clips().length) scheduleLine();
}
function buildStage() {
  clearTimeout(M.timer);
  const cs = clips();
  if (!cs.length) {
    const line = LINES[M.i % LINES.length];
    M.el.className = 'stage q';
    M.el.innerHTML = `<div class="qtext">${esc(line)}</div>
      <div class="sctl"><button class="sbtn" data-a="clip-prev" aria-label="Previous">${ICON.up.replace('M6 15l6-6 6 6', 'M15 6l-6 6 6 6')}</button>
      <span class="scount">${V((M.i % LINES.length) + 1)} / ${V(LINES.length)}</span>
      <button class="sbtn" data-a="clip-next" aria-label="Next">${ICON.up.replace('M6 15l6-6 6 6', 'M9 6l6 6-6 6')}</button></div>`;
    return;
  }
  const c = cs[M.i % cs.length];
  const u = M.urls[c.id];
  if (!u || u.exp < Date.now()) {
    M.el.className = 'stage q';
    M.el.innerHTML = `<div class="qtext" style="font-size:22px">${navigator.onLine ? 'Loading clip…' : 'Clips need an internet connection.'}</div>
      <div class="sctl"><button class="sbtn" data-a="clip-next" aria-label="Next">${ICON.up.replace('M6 15l6-6 6 6', 'M9 6l6 6-6 6')}</button></div>`;
    if (navigator.onLine) fetchClipUrls().then(ok => { const cur = clips()[M.i % (clips().length || 1)]; if (ok && cur && cur.id === c.id && M.urls[c.id]) { buildStage(); const v = M.el.querySelector('video'); if (v && document.body.contains(M.el)) v.play().catch(() => {}); } });
    return;
  }
  M.el.className = 'stage';
  M.el.innerHTML = `<video src="${esc(u.url)}" playsinline autoplay ${M.muted ? 'muted' : ''} preload="auto" aria-label="${esc(c.name || 'Motivation clip')}"></video>
    <div class="sctl">
      <button class="sbtn" data-a="clip-prev" aria-label="Previous clip">${ICON.up.replace('M6 15l6-6 6 6', 'M15 6l-6 6 6 6')}</button>
      <span class="scount">${V((M.i % cs.length) + 1)} / ${V(cs.length)}</span>
      <button class="sbtn" data-a="clip-sound" aria-label="${M.muted ? 'Turn sound on' : 'Mute'}">${M.muted ? SPK_OFF : SPK_ON}</button>
      <button class="sbtn" data-a="clip-next" aria-label="Next clip">${ICON.up.replace('M6 15l6-6 6 6', 'M9 6l6 6-6 6')}</button>
    </div>`;
  const v = M.el.querySelector('video');
  v.muted = M.muted;
  v.addEventListener('ended', () => stepClip(1));
  v.addEventListener('error', () => { M.el.insertAdjacentHTML('afterbegin', '<div class="serr">This clip can’t play in this browser. Skipping…</div>'); M.timer = setTimeout(() => stepClip(1), 2500); });
}
const SPK_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
const SPK_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
function scheduleLine() {
  clearTimeout(M.timer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  M.timer = setTimeout(() => { if ($('#motiv-slot') && !clips().length) stepClip(1); }, 7000);
}
function stepClip(dir) {
  const n = clips().length || LINES.length;
  M.i = ((M.i + dir) % n + n) % n;
  buildStage();
  const v = M.el.querySelector('video'); if (v) v.play().catch(() => {});
  if (!clips().length) scheduleLine();
}
async function fetchClipUrls() {
  if (M.fetching) return M.fetching;
  const paths = clips().map(c => c.id).filter(Boolean);
  if (!paths.length || !sb) return false;
  M.fetching = (async () => {
    try {
      const {data, error} = await sb.storage.from('clips').createSignedUrls(paths, 6 * 3600);
      if (error) throw error;
      const exp = Date.now() + 5.5 * 3600 * 1000;
      for (const r of data || []) if (r.signedUrl && !r.error) M.urls[r.path] = {url: r.signedUrl, exp};
      return true;
    } catch (e) { console.warn('Clip links failed', e); return false; }
    finally { setTimeout(() => { M.fetching = null; }, 0); }
  })();
  return M.fetching;
}
async function uploadClips(files) {
  if (!navigator.onLine) { toast('Connect to the internet to upload clips.'); return; }
  const list = [...files]; let added = [];
  for (const [k, f] of list.entries()) {
    M.busy = `Uploading ${k + 1} of ${list.length}: ${f.name}…`; safeRender();
    if (f.size > 50 * 1024 * 1024) { toast(`${f.name} is over 50 MB. Trim or compress it, then try again.`); continue; }
    const t = (f.type || '').toLowerCase(), ext = (f.name.split('.').pop() || '').toLowerCase();
    let type = t === 'video/mp4' || t === 'video/webm' ? t : (t === 'video/quicktime' || ext === 'mov' || ext === 'm4v' || ext === 'mp4') ? 'video/mp4' : ext === 'webm' ? 'video/webm' : null;
    if (!type) { toast(`${f.name} isn’t a video Lift Log can play. Use MP4 or MOV.`); continue; }
    const path = `${S.user.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`;
    const ctype = t === 'video/quicktime' ? 'video/quicktime' : type;
    const {error} = await sb.storage.from('clips').upload(path, f, {contentType: ctype, cacheControl: '86400', upsert: false});
    if (error) { const m = error.message || ''; toast(/exceed|too large|maximum/i.test(m) ? `${f.name} is too big for the free plan.` : /bucket/i.test(m) ? 'The clips folder isn’t set up yet. Run schema.sql in Supabase (see README).' : `Couldn’t upload ${f.name}: ${m}`); continue; }
    added.push({id: path, name: f.name.replace(/\.[^.]+$/, ''), sizeBytes: f.size, addedAt: Date.now()});
  }
  M.busy = '';
  if (added.length) { saveSettings({clips: clips().concat(added)}); M.i = clips().length - added.length; toast(`${added.length} clip${added.length > 1 ? 's' : ''} added`); }
  render();
}

/* ---------- Exercise picker ---------- */
function renderPicker() {
  const host = $('#modal');
  if (!S.picker) { host.innerHTML = ''; return; }
  if (!host.querySelector('.overlay')) {
    host.innerHTML = `<div class="overlay" data-a="close-pick"><div class="sheet" role="dialog" aria-modal="true" aria-label="Add exercise">
      <div class="sheet-h"><input id="pick-q" placeholder="Search ${EXERCISE_COUNT}+ exercises, or type a new one" autocomplete="off" aria-label="Search exercises"><button class="btn quiet sm" data-a="close-pick">Close</button></div>
      <div class="gchips" id="pick-groups"></div>
      <div class="sheet-b" id="pick-list"></div></div></div>`;
    const q = $('#pick-q'); q.value = S.picker.q || '';
    q.addEventListener('input', () => { S.picker.q = q.value; S.picker.creating = null; renderPickList(); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#pick-list .pi'); if (f) f.click(); } if (e.key === 'Escape') closePicker(); });
    setTimeout(() => q.focus(), 30);
  }
  renderPickList();
}
function renderPickList() {
  const P = S.picker;
  $('#pick-groups').innerHTML = ['All'].concat(groupNames()).map(g => `<button data-a="pick-group" data-v="${esc(g)}" aria-pressed="${(P.group || 'All') === g}">${esc(g)}</button>`).join('');
  if (P.creating) {
    const opts = [['wr', null, 'Weight × reps', 'Most lifts: bench, curls, machines'], ['h', null, 'Timed hold', 'Planks, hangs, wall sits (optional weight)'], ['c', 'mi', 'Cardio · miles', 'Runs, bike rides, walks'], ['c', 'm', 'Cardio · meters', 'Rowing, SkiErg, swimming'], ['c', 'cal', 'Cardio · calories', 'Assault bike, machines that show calories'], ['y', null, 'Carry / sled', 'Weight × meters: carries, sled push/pull'], ['t', null, 'Time only', 'Classes, sports, mobility']];
    $('#pick-list').innerHTML = `<div class="pg">How do you log “${esc(P.creating)}”?</div>` + opts.map(([k, u, l, s]) => `<button class="pi" data-a="create-kind" data-k="${k}" data-u="${u || ''}"><span><b style="display:block">${l}</b><span class="dim small">${s}</span></span></button>`).join('') + `<button class="btn quiet sm" style="margin:10px 8px" data-a="create-back">Back</button>`;
    return;
  }
  const q = (P.q || '').trim().toLowerCase();
  const all = allExercises();
  const used = new Set((P.target === 'active' ? S.active.exercises : S.editR.exercises).map(e => e.name));
  const inGroup = e => !P.group || P.group === 'All' || e.group === P.group;
  const words = q.replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  const match = e => {
    if (!inGroup(e)) return false; if (!q) return true;
    const n = e.name.toLowerCase().replace(/-/g, ' '), nc = n.replace(/\s+/g, ''), g = e.group.toLowerCase();
    if (n.includes(q) || g.includes(q)) return true;
    return words.every(w => (ALIAS[w] || [w]).some(x => n.includes(x) || nc.includes(x.replace(/\s+/g, '')) || g.includes(x)));
  };
  const hist = derive().hist;
  const tag = e => e.kind === 'wr' ? '' : ` <span class="chip out">${e.kind === 'c' ? (UNIT[e.unit] || UNIT.mi).h : KIND_LABEL[e.kind].split(' ')[0].toLowerCase()}</span>`;
  const item = e => `<button class="pi" data-a="pick-ex" data-name="${esc(e.name)}">${esc(e.name)}${tag(e)}${used.has(e.name) ? ' <span class="chip out">added</span>' : ''}<span class="g">${esc(e.group)}</span></button>`;
  const exact = all.some(e => e.name.toLowerCase() === q);
  const createBtn = q && !exact ? `<button class="pi create" data-a="create-ex" data-name="${esc(P.q.trim())}">+ Create “${esc(P.q.trim())}” as your own exercise</button>` : '';
  let html = '';
  const matches = all.filter(match);
  if (createBtn && !matches.length) html += createBtn;
  if (!q && (!P.group || P.group === 'All')) {
    const recentNames = Object.keys(hist).sort((a, b) => hist[b][hist[b].length - 1].date.localeCompare(hist[a][hist[a].length - 1].date)).slice(0, 8);
    if (recentNames.length) html += `<div class="pg">Recent</div>` + recentNames.map(n => item({name: n, ...exInfo(n)})).join('');
  }
  const groups = {}, seen = new Set();
  for (const e of matches) { const key = e.group + '|' + e.name; if (seen.has(key)) continue; seen.add(key); (groups[e.group] = groups[e.group] || []).push(e); }
  const order = groupNames();
  for (const g of order) if (groups[g]) html += `<div class="pg">${esc(g)} · ${groups[g].length}</div>` + groups[g].map(item).join('');
  if (createBtn && matches.length) html += `<div class="pg">Not listed?</div>` + createBtn;
  $('#pick-list').innerHTML = html || `<p class="dim" style="padding:12px">No matches. Type a name to create your own.</p>`;
}
function closePicker() { S.picker = null; renderPicker(); }
function addExercise(name) {
  const i = exInfo(name);
  if (S.picker.target === 'active') {
    const last = lastFor(name, S.active.editingId);
    S.active.exercises.push(mkEx(name, last ? Math.min(Math.max(last.sets.length, 1), 8) : (i.kind === 'wr' ? 3 : 1)));
    persistActive();
  } else S.editR.exercises.push({name, sets: i.kind === 'wr' ? 3 : 1, reps: i.kind === 'wr' ? '8-10' : '', kind: i.kind, unit: i.unit});
  closePicker(); render();
  if (S.tab === 'log' && S.active) { const el = $(`#ex-${S.active.exercises.length - 1}`); if (el) el.scrollIntoView({block: 'center', behavior: 'smooth'}); }
}

/* ===================== events ===================== */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
function setPath(path, v) { const ks = path.split('.'); let o = S; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) { let r = false; if (S.menuOpen) { S.menuOpen = false; r = true; } if (S.confirm) { S.confirm = null; r = true; } if (r) render(); return; }
  const a = el.dataset.a;
  if (a === 'close-pick') { if (e.target === el || el.tagName === 'BUTTON') closePicker(); return; }
  if (a !== 'menu' && S.menuOpen) S.menuOpen = false;
  const ei = el.dataset.ei != null ? +el.dataset.ei : null, si = el.dataset.si != null ? +el.dataset.si : null;
  if (!/^(ex-del|discard|del-w|day-del|del-split|clip-del|import)$/.test(a)) S.confirm = null;
  switch (a) {
    case 'menu': S.menuOpen = !S.menuOpen; renderMenu(); break;
    case 'auth-view': S.authView = el.dataset.v; S.authMsg = ''; render(); break;
    case 'sign-out': if (Object.keys(QUEUE).length && !navigator.onLine) { toast('You have changes that haven’t synced. Connect to the internet before signing out.'); break; } sb.auth.signOut(); break;
    case 'import': if (S.confirm === 'import') { S.confirm = null; importBackup(S.importText || ''); } else { if (!(S.importText || '').trim()) { toast('Paste a backup first'); break; } S.confirm = 'import'; render(); } break;
    case 'clip-prev': stepClip(-1); break;
    case 'clip-next': stepClip(1); break;
    case 'clip-sound': { M.muted = !M.muted; const v = M.el && M.el.querySelector('video'); if (v) { v.muted = M.muted; v.play().catch(() => {}); } el.innerHTML = M.muted ? SPK_OFF : SPK_ON; el.setAttribute('aria-label', M.muted ? 'Turn sound on' : 'Mute'); break; }
    case 'clips-manage': S.clipsManage = !S.clipsManage; render(); break;
    case 'clip-del': {
      const id = el.dataset.id;
      if (S.confirm === 'clipdel-' + id) {
        S.confirm = null; saveSettings({clips: clips().filter(c => c.id !== id)});
        if (sb) sb.storage.from('clips').remove([id]).catch(() => {});
        toast('Clip removed');
      } else S.confirm = 'clipdel-' + id;
      render(); break;
    }
    case 'go': go(el.dataset.tab); break;
    case 'start': if (S.active) { toast('Finish or discard the current workout first'); go('log'); break; } startWorkout(el.dataset.rid); break;
    case 'start-empty': if (S.active) { toast('Finish or discard the current workout first'); break; } startWorkout(null); break;
    case 'toggle': {
      const ex = S.active.exercises[ei], s = ex.sets[si], kind = exKind(ex);
      if (!s.done) {
        const ph = placeholders(ex, si);
        for (const c of cols(kind, ex.unit)) if (c && s[c[0]] == null && ph[c[0]] != null) s[c[0]] = ph[c[0]];
        if (!valid(kind, s)) { toast(kind === 'wr' ? 'Enter reps for this set first' : 'Fill in this set first'); const c = cols(kind, ex.unit)[1]; $(`#${c[0]}-${ei}-${si}`)?.focus(); break; }
        s.done = true;
      } else s.done = false;
      persistActive(); render();
      if (s.done && isPR(ex, s)) toast(`New PR on ${ex.name}: ${fmtSet(s, kind, ex.unit)}`);
      break;
    }
    case 'add-set': { const ex = S.active.exercises[ei]; const l = ex.sets[ex.sets.length - 1]; ex.sets.push(l ? {...newSet(), w: l.w, r: l.r, t: l.t, d: l.d} : newSet()); persistActive(); render(); break; }
    case 'del-set': { const ex = S.active.exercises[ei]; if (ex.sets.length > 1) ex.sets.pop(); persistActive(); render(); break; }
    case 'ex-up': if (ei > 0) { const x = S.active.exercises; [x[ei - 1], x[ei]] = [x[ei], x[ei - 1]]; persistActive(); render(); } break;
    case 'ex-down': { const x = S.active.exercises; if (ei < x.length - 1) { [x[ei + 1], x[ei]] = [x[ei], x[ei + 1]]; persistActive(); render(); } break; }
    case 'ex-del': if (S.confirm === 'exdel-' + ei) { S.active.exercises.splice(ei, 1); S.confirm = null; persistActive(); } else S.confirm = 'exdel-' + ei; render(); break;
    case 'discard': if (S.confirm === 'discard') { const editing = S.active.editingId; S.active = null; S.confirm = null; persistActive(); go(editing ? 'history' : 'log'); } else { S.confirm = 'discard'; render(); } break;
    case 'finish': finishWorkout(); break;
    case 'pick': S.picker = {target: el.dataset.target, q: '', group: 'All'}; renderPicker(); break;
    case 'pick-group': S.picker.group = el.dataset.v; S.picker.creating = null; renderPickList(); $('#pick-list').scrollTop = 0; break;
    case 'pick-ex': addExercise(el.dataset.name); break;
    case 'create-ex': S.picker.creating = el.dataset.name.replace(/\s+/g, ' ').trim(); renderPickList(); break;
    case 'create-back': S.picker.creating = null; renderPickList(); break;
    case 'create-kind': {
      const name = S.picker.creating; if (!name) break;
      const entry = {name, group: 'My exercises', kind: el.dataset.k, ...(el.dataset.u ? {unit: el.dataset.u} : {})};
      saveSettings({custom: custom().filter(c => c.name !== name).concat([entry])});
      S.picker.creating = null; addExercise(name); toast(`“${name}” saved to your exercises`); break;
    }
    case 'expand': { const id = el.dataset.id; S.expanded.has(id) ? S.expanded.delete(id) : S.expanded.add(id); render(); break; }
    case 'edit-w': case 'repeat-w': {
      if (S.active) { toast('Finish or discard the current workout first'); go('log'); break; }
      const w = S.workouts.find(x => x.id === el.dataset.id); if (!w) break;
      const exs = (w.exercises || []).map(ex => ({name: ex.name, kind: ex.kind || 'wr', ...(ex.unit ? {unit: ex.unit} : {}), sets: ex.sets.map(s => a === 'edit-w' ? {...newSet(), ...s, done: true} : newSet())}));
      S.active = a === 'edit-w'
        ? {id: w.id, editingId: w.id, name: w.name, date: w.date, startedAt: w.startedAt || Date.now(), routineId: w.routineId || null, notes: w.notes || '', exercises: exs}
        : {id: uid(), name: w.name, date: ymd(new Date()), startedAt: Date.now(), routineId: w.routineId || null, notes: '', exercises: exs};
      persistActive(); go('log'); break;
    }
    case 'del-w': {
      const id = el.dataset.id;
      if (S.confirm === 'wdel-' + id) { saveDoc('workouts/' + id, null); S.confirm = null; toast('Workout deleted'); }
      else S.confirm = 'wdel-' + id;
      render(); break;
    }
    case 'backup': {
      const data = JSON.stringify({app: 'Lift Log', exportedAt: new Date().toISOString(), units: 'lbs', workouts: derive().asc, days: S.routines, splits: programs(), customExercises: custom(), settings: S.settings}, null, 2);
      navigator.clipboard.writeText(data).then(() => toast('Copied. Paste it into a note or file to keep a backup.'), () => toast('Your browser blocked copying. Try a different browser.'));
      break;
    }
    case 'range': S.range = el.dataset.v; render(); break;
    case 'metric': S.metric = el.dataset.v; render(); break;
    /* ----- splits ----- */
    case 'new-split': S.newSplit = {name: '', tpl: 'blank'}; render(); setTimeout(() => $('#ns-name')?.focus(), 30); break;
    case 'tpl': S.newSplit.tpl = el.dataset.v; if (!S.newSplit.name.trim()) { const t = TEMPLATES.find(x => x.id === el.dataset.v); if (t.id !== 'blank') S.newSplit.name = t.name; } render(); break;
    case 'cancel-split': S.newSplit = null; render(); break;
    case 'create-split': {
      const name = S.newSplit.name.trim(); if (!name) { toast('Give the split a name'); $('#ns-name')?.focus(); break; }
      const pid = uid(); const t = TEMPLATES.find(x => x.id === S.newSplit.tpl) || TEMPLATES[0];
      saveSettings({programs: programs().concat([{id: pid, name}]), activeProgram: pid});
      t.days.forEach((dn, i) => saveRoutine(uid() + i, {name: dn, order: i + 1, program: pid, exercises: []}));
      S.newSplit = null; S.splitEdit = pid; S.splitDraftName = name; toast(`${name} created and set as your active split`); render(); break;
    }
    case 'use-split': saveSettings({activeProgram: el.dataset.id}); toast(`${programs().find(p => p.id === el.dataset.id).name} is now your active split`); render(); break;
    case 'edit-split': S.splitEdit = el.dataset.id; S.splitDraftName = programs().find(p => p.id === el.dataset.id).name; S.addDayName = ''; S.editR = null; render(); break;
    case 'done-split': {
      const pid = el.dataset.id; const name = (S.splitDraftName || '').trim();
      if (name && name !== programs().find(p => p.id === pid).name) saveSettings({programs: programs().map(p => p.id === pid ? {...p, name} : p)});
      else if (!(S.settings.programs && S.settings.programs.length)) saveSettings({programs: programs()});
      S.splitEdit = null; render(); break;
    }
    case 'add-day': {
      const pid = el.dataset.pid; const name = (S.addDayName || '').trim(); if (!name) { toast('Type a name for the day'); $('#add-day')?.focus(); break; }
      const days = daysOf(pid); saveRoutine(uid(), {name, order: Math.max(0, ...days.map(d => d.order || 0)) + 1, program: pid, exercises: []});
      S.addDayName = ''; render(); setTimeout(() => $('#add-day')?.focus(), 30); break;
    }
    case 'day-up': case 'day-down': {
      const days = daysOf(el.dataset.pid); const i = days.findIndex(d => d.id === el.dataset.id); const j = a === 'day-up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= days.length) break;
      [days[i], days[j]] = [days[j], days[i]];
      days.forEach((d, k) => { if ((d.order || 0) !== k + 1 || d.virtual) saveRoutine(d.id, {...d, order: k + 1}); });
      render(); break;
    }
    case 'day-del': {
      const id = el.dataset.id;
      if (S.confirm === 'dday-' + id) { deleteRoutine(id); S.confirm = null; toast('Day deleted. Past workouts are kept.'); } else S.confirm = 'dday-' + id;
      render(); break;
    }
    case 'del-split': {
      const pid = el.dataset.id;
      if (S.confirm === 'dsplit-' + pid) {
        daysOf(pid).forEach(d => { if (!d.virtual) deleteRoutine(d.id); });
        const rest = programs().filter(p => p.id !== pid);
        saveSettings({programs: rest, activeProgram: activeProgram().id === pid ? rest[0].id : activeProgram().id});
        S.confirm = null; S.splitEdit = null; toast('Split deleted. Past workouts are kept.');
      } else S.confirm = 'dsplit-' + pid;
      render(); break;
    }
    case 'edit-r': { const d = dayById(el.dataset.id); S.editR = {id: d.id, name: d.name, sub: d.sub || '', order: d.order, program: d.program || 'ppl', exercises: clone(d.exercises || [])}; render(); break; }
    case 'cancel-r': S.editR = null; render(); break;
    case 'r-up': { const i = +el.dataset.ri; if (i > 0) { const x = S.editR.exercises; [x[i - 1], x[i]] = [x[i], x[i - 1]]; render(); } break; }
    case 'r-del-ex': S.editR.exercises.splice(+el.dataset.ri, 1); render(); break;
    case 'save-r': {
      const R = S.editR; const name = (R.name || '').trim() || 'Day';
      saveRoutine(R.id, {...R, name, exercises: R.exercises.map(e => ({...e, sets: Math.min(20, Math.max(1, parseInt(e.sets, 10) || 1)), reps: String(e.reps || '').trim()}))});
      S.editR = null; toast(`${name} saved`); render(); break;
    }
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.menuOpen) { S.menuOpen = false; renderMenu(); $('.menu-btn')?.focus(); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f && S.active) {
    const ei = +t.dataset.ei, si = +t.dataset.si; const ex = S.active.exercises[ei]; const s = ex.sets[si]; const f = t.dataset.f;
    if (f === 't') s.t = parseDur(t.value, exKind(ex) === 'h' ? 'sec' : 'min');
    else if (f === 'r') { const r = num(t.value); s.r = r == null ? null : Math.round(r); }
    else s[f] = num(t.value);
    persistActive(); refreshRow(ei, si);
  } else if (t.dataset.af && S.active) { S.active[t.dataset.af] = t.value; persistActive(); }
  else if (t.dataset.rf && S.editR) S.editR.exercises[+t.dataset.ri][t.dataset.rf] = t.value;
  else if (t.dataset.bind) setPath(t.dataset.bind, t.value);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'clip-file' && t.files && t.files.length) { uploadClips(t.files); return; }
  if (t.dataset.c === 'progEx') { S.progEx = t.value; S.metric = null; t.blur(); S.pendingRender = false; render(); }
  if (t.dataset.c === 'program') { saveSettings({activeProgram: t.value, ...(S.settings.programs && S.settings.programs.length ? {} : {programs: programs()})}); t.blur(); S.pendingRender = false; render(); }
});
// Enter in the first box jumps to the second; Enter in the second marks the set done
document.addEventListener('keydown', e => {
  const t = e.target; if (e.key !== 'Enter' || !t.dataset) return;
  if (t.dataset.bind === 'addDayName') { e.preventDefault(); document.querySelector('[data-a="add-day"]')?.click(); return; }
  if (!t.dataset.f) return;
  e.preventDefault();
  const ei = +t.dataset.ei, si = +t.dataset.si; const ex = S.active.exercises[ei]; const [c1, c2] = cols(exKind(ex), ex.unit);
  if (c1 && t.dataset.f === c1[0]) $(`#${c2[0]}-${ei}-${si}`)?.focus();
  else { const b = document.querySelector(`.check[data-ei="${ei}"][data-si="${si}"]`); t.blur(); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
});

boot();
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
