// ✏️ Your AI employees. Add or edit entries here to change who works in the office.
//   floor: 3 or 4 = office floors (sit at the shared desk), 5 = roof (gym), 1 = café
//   seat:  office seat 0-4 = front side of the desk (back to the camera), 5-9 = back side (facing you)
//   pos:   [x, z] for people who stand somewhere instead of sitting (e.g. the gym), ry = facing
//   look:  hair, hairStyle ('short' | 'long' | 'bun'), shirt, pants, tie, outfit ('office' | 'sport'), glasses
//   tasks: the scheduled tasks this employee runs. `when` is shown on their card; `at` is used to
//          work out the next run (times are Singapore time):
//            { every: 'hour', m }          -> every hour at minute m
//            { every: 'day', h, m }        -> every day at h:m
//            { every: 'week', dow, h, m }  -> every week on day dow (0 = Sunday) at h:m
export const EMPLOYEES = [
  {
    name: 'JungKook', role: 'Currency Analyst · KRW', floor: 3, seat: 5,
    hair: '#5a3a22', shirt: '#ffffff', tie: '#2b2a2c',
    tasks: [
      { name: 'Daily KRW trend analysis', when: 'Every day, 8:08 am', at: { every: 'day', h: 8, m: 8 } },
      { name: 'Hourly SGD to KRW rate', when: 'Every hour at :39', at: { every: 'hour', m: 39 } },
    ],
  },
  {
    name: 'XiaoMing', role: 'Currency Analyst · CNY', floor: 3, seat: 6,
    hair: '#1f1a17', shirt: '#e3ecf6', tie: '#b23a3a', glasses: true,
    tasks: [
      { name: 'Hourly SGD to CNY rate', when: 'Every hour at :04', at: { every: 'hour', m: 4 } },
    ],
  },
  {
    name: 'Aida', role: 'AI News Editor', floor: 3, seat: 8,
    hair: '#3b2418', hairStyle: 'long', shirt: '#f6e1e6', tie: '#c9667a',
    tasks: [
      { name: 'Daily AI newsletter', when: 'Every day, 7:40 am', at: { every: 'day', h: 7, m: 40 } },
    ],
  },
  {
    name: 'Mary', role: 'Personal Assistant', floor: 3, seat: 9,
    hair: '#6b4a2b', hairStyle: 'bun', shirt: '#e8f0dd', tie: '#5f8a5b',
    tasks: [
      { name: 'Morning usage reminder', when: 'Every day, 6:39 am', at: { every: 'day', h: 6, m: 39 } },
    ],
  },
  {
    name: 'Eugene', role: 'Wellness Coach', floor: 5, pos: [-6.2, -1.2], ry: 0.6, idle: 'Coaching in the gym',
    hair: '#2a1d16', outfit: 'sport', shirt: '#3fa58f', pants: '#2f3a44',
    tasks: [
      { name: 'Weekly weight check-in', when: 'Every Sunday, 8:40 pm', at: { every: 'week', dow: 0, h: 20, m: 40 } },
    ],
  },
  {
    name: 'Jennie', role: "Cashier at Joe's Café", floor: 1, pos: [-17.0, 5.3], y: 0.3, ry: 0, idle: 'Ready to take your order',
    hair: '#2a1a12', hairStyle: 'long', outfit: 'apron', shirt: '#fbf7f0', pants: '#3a3a3e',
    tasks: [],   // no scheduled tasks yet
  },
  {
    name: 'Violet', role: 'Receptionist · welcome lounge', floor: 1, pos: [2.0, 4.55], y: 0.25, ry: 0, idle: 'Welcoming guests at reception',
    hair: '#2a1a12', hairStyle: 'long', outfit: 'blazer', skirt: '#2b3550', shirt: '#2b3550', blouse: '#ffffff', pants: '#f6d6bd',
    tasks: [],
  },
  // ---- cleaners: push their carts around floors 1-5 (never on the same floor); routines in js/staff.js
  {
    name: 'Lily', role: 'Cleaner', floor: 1, cleaner: true,
    hair: '#3b2418', hairStyle: 'bun', outfit: 'apron', apron: '#2f5f8a', shirt: '#cfe0f0', pants: '#2f3a44',
    tasks: [],
  },
  {
    name: 'Robert', role: 'Cleaner', floor: 4, cleaner: true,
    hair: '#2a1d16', outfit: 'apron', apron: '#2f5f8a', shirt: '#b8c8d8', pants: '#2f3a44', cap: '#2f5f8a',
    tasks: [],
  },
  // ---- the owners: no scheduled tasks, they just enjoy the house (routines in js/staff.js)
  {
    name: 'Ivan', role: 'Owner of the home office', floor: 5, owner: true,
    hair: '#1f1a17', outfit: 'casual', shirt: '#3b5b8a', pants: '#c2a878', collar: '#ffffff',
    tasks: [],
  },
  {
    name: 'Phil', role: 'Owner of the home office · music lover', floor: 2, owner: true,
    hair: '#6b4a2b', outfit: 'casual', shirt: '#d9a441', pants: '#2f3a44', collar: '#2b2a2c', glasses: true,
    tasks: [],
  },
];
