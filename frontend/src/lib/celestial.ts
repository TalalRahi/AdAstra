// Facts for the Sky page. Values are rounded, well-established figures from
// Wikipedia / NASA fact sheets (each object links to its Wikipedia article).
// Numbers that keep changing (e.g. moon counts of the giant planets) are
// written as "N+" rather than an exact count.

export type CelestialKind = 'star' | 'planet' | 'galaxy'

export interface CelestialObject {
  id: string
  name: string
  kind: CelestialKind
  type: string          // e.g. "Gas giant"
  facts: [string, string][]
  blurb: string
  wiki: string
  note?: string         // e.g. "Illustration: no photo of the whole Milky Way exists"
}

export const SUN: CelestialObject = {
  id: 'sun', name: 'Sun', kind: 'star', type: 'Yellow dwarf star (G2V)',
  facts: [
    ['Diameter', '1.39 million km'],
    ['Distance from Earth', '1 AU (about 150 million km)'],
    ['Surface temperature', 'about 5,500 °C'],
    ['Age', 'about 4.6 billion years'],
  ],
  blurb: 'The star at the centre of our Solar System. It holds more than 99.8% of the Solar System’s mass.',
  wiki: 'https://en.wikipedia.org/wiki/Sun',
}

export const PLANETS: CelestialObject[] = [
  {
    id: 'mercury', name: 'Mercury', kind: 'planet', type: 'Rocky planet',
    facts: [['Diameter', '4,879 km'], ['From the Sun', '0.39 AU'], ['One year', '88 Earth days'], ['Rotation', '58.6 Earth days'], ['Moons', 'none']],
    blurb: 'The smallest planet and the closest to the Sun, with a heavily cratered surface.',
    wiki: 'https://en.wikipedia.org/wiki/Mercury_(planet)',
  },
  {
    id: 'venus', name: 'Venus', kind: 'planet', type: 'Rocky planet',
    facts: [['Diameter', '12,104 km'], ['From the Sun', '0.72 AU'], ['One year', '225 Earth days'], ['Rotation', '243 Earth days (backwards)'], ['Moons', 'none']],
    blurb: 'Wrapped in thick clouds of sulphuric acid; its greenhouse atmosphere makes it the hottest planet.',
    wiki: 'https://en.wikipedia.org/wiki/Venus',
  },
  {
    id: 'earth', name: 'Earth', kind: 'planet', type: 'Rocky planet',
    facts: [['Diameter', '12,742 km'], ['From the Sun', '1 AU'], ['One year', '365.25 days'], ['Rotation', '24 hours'], ['Moons', '1']],
    blurb: 'Our home: the only world known to have liquid water on its surface and life.',
    wiki: 'https://en.wikipedia.org/wiki/Earth',
  },
  {
    id: 'mars', name: 'Mars', kind: 'planet', type: 'Rocky planet',
    facts: [['Diameter', '6,779 km'], ['From the Sun', '1.52 AU'], ['One year', '687 Earth days'], ['Rotation', '24.6 hours'], ['Moons', '2 (Phobos, Deimos)']],
    blurb: 'The red planet, coloured by iron oxide dust. It has the tallest volcano in the Solar System, Olympus Mons.',
    wiki: 'https://en.wikipedia.org/wiki/Mars',
  },
  {
    id: 'jupiter', name: 'Jupiter', kind: 'planet', type: 'Gas giant',
    facts: [['Diameter', '139,820 km'], ['From the Sun', '5.2 AU'], ['One year', '11.9 Earth years'], ['Rotation', '9.9 hours'], ['Moons', '95+']],
    blurb: 'The largest planet, more than twice as massive as all the others combined. Its Great Red Spot is a giant storm.',
    wiki: 'https://en.wikipedia.org/wiki/Jupiter',
  },
  {
    id: 'saturn', name: 'Saturn', kind: 'planet', type: 'Gas giant',
    facts: [['Diameter', '116,460 km'], ['From the Sun', '9.5 AU'], ['One year', '29.4 Earth years'], ['Rotation', '10.7 hours'], ['Moons', '270+']],
    blurb: 'Famous for its bright rings of ice and rock. It is less dense than water.',
    wiki: 'https://en.wikipedia.org/wiki/Saturn',
  },
  {
    id: 'uranus', name: 'Uranus', kind: 'planet', type: 'Ice giant',
    facts: [['Diameter', '50,724 km'], ['From the Sun', '19.2 AU'], ['One year', '84 Earth years'], ['Rotation', '17.2 hours (backwards)'], ['Moons', '28+']],
    blurb: 'An ice giant tipped on its side: its axis is tilted by about 98°, so it rolls around the Sun.',
    wiki: 'https://en.wikipedia.org/wiki/Uranus',
  },
  {
    id: 'neptune', name: 'Neptune', kind: 'planet', type: 'Ice giant',
    facts: [['Diameter', '49,244 km'], ['From the Sun', '30.1 AU'], ['One year', '165 Earth years'], ['Rotation', '16.1 hours'], ['Moons', '16']],
    blurb: 'The farthest planet from the Sun, with the fastest winds measured in the Solar System.',
    wiki: 'https://en.wikipedia.org/wiki/Neptune',
  },
]

export const GALAXIES: CelestialObject[] = [
  {
    id: 'milkyway', name: 'Milky Way', kind: 'galaxy', type: 'Barred spiral galaxy',
    facts: [['Diameter', 'about 100,000 light-years'], ['Stars', '100–400 billion'], ['Our position', 'about 26,000 light-years from the centre'], ['Distance', 'we live inside it']],
    blurb: 'Our home galaxy. The Sun is one of its hundreds of billions of stars, in a minor spiral arm.',
    wiki: 'https://en.wikipedia.org/wiki/Milky_Way',
    note: 'Illustration: no picture of the whole Milky Way exists, because we are inside it.',
  },
  {
    id: 'andromeda', name: 'Andromeda (M31)', kind: 'galaxy', type: 'Barred spiral galaxy',
    facts: [['Distance', 'about 2.5 million light-years'], ['Diameter', 'about 150,000 light-years'], ['Stars', 'about 1 trillion'], ['Seen from Earth', 'visible to the naked eye in dark skies']],
    blurb: 'The nearest large galaxy to the Milky Way. The two are expected to merge in about 4–5 billion years.',
    wiki: 'https://en.wikipedia.org/wiki/Andromeda_Galaxy',
  },
  {
    id: 'triangulum', name: 'Triangulum (M33)', kind: 'galaxy', type: 'Spiral galaxy',
    facts: [['Distance', 'about 2.7 million light-years'], ['Diameter', 'about 60,000 light-years'], ['Stars', 'about 40 billion'], ['Group', 'Local Group (with the Milky Way)']],
    blurb: 'The third-largest member of our Local Group of galaxies, with loose, patchy spiral arms full of star formation.',
    wiki: 'https://en.wikipedia.org/wiki/Triangulum_Galaxy',
  },
  {
    id: 'whirlpool', name: 'Whirlpool (M51)', kind: 'galaxy', type: 'Grand-design spiral galaxy',
    facts: [['Distance', 'about 31 million light-years'], ['Diameter', 'about 76,000 light-years'], ['Companion', 'small galaxy NGC 5195'], ['Seen from Earth', 'needs a telescope']],
    blurb: 'A classic face-on spiral with sharply defined arms, shaped by its interaction with a smaller companion galaxy.',
    wiki: 'https://en.wikipedia.org/wiki/Whirlpool_Galaxy',
  },
]

export const ALL_OBJECTS = [SUN, ...PLANETS, ...GALAXIES]