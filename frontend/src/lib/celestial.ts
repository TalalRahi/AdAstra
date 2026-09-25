// Facts for the Sky page. Values are rounded, well-established figures from
// Wikipedia / NASA fact sheets (each object links to its Wikipedia article).
// Numbers that keep changing (e.g. moon counts of the giant planets) are
// written as "N+" rather than an exact count.

export type CelestialKind = 'star' | 'planet' | 'moon' | 'galaxy' | 'shower' | 'constellation' | 'nebula' | 'comet'

export interface CelestialObject {
  id: string
  name: string
  kind: CelestialKind
  type: string          // e.g. "Gas giant"
  facts: [string, string][]
  blurb: string
  wiki: string
  note?: string         // e.g. "Illustration: no photo of the whole Milky Way exists"
  related?: string[]
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

export const MOONS: CelestialObject[] = [
  {
    id: 'europa', name: 'Europa', kind: 'moon', type: 'Moon of Jupiter',
    facts: [['Diameter', '3,122 km'], ['Orbits', 'Jupiter'], ['Orbital period', '3.6 days'], ['Surface', 'Smooth water ice, cracked into long lines']],
    blurb: 'An icy moon thought to hide a deep liquid-water ocean under its cracked, smooth shell, making it a target in the search for life.',
    wiki: 'https://en.wikipedia.org/wiki/Europa_(moon)', related: ['jupiter'],
  },
  {
    id: 'titan', name: 'Titan', kind: 'moon', type: 'Moon of Saturn',
    facts: [['Diameter', '5,150 km'], ['Orbits', 'Saturn'], ['Orbital period', '15.9 days'], ['Atmosphere', 'Thick, mostly nitrogen']],
    blurb: "Saturn's largest moon, and the only moon in the Solar System with a thick atmosphere and lakes, made of liquid methane and ethane.",
    wiki: 'https://en.wikipedia.org/wiki/Titan_(moon)', related: ['saturn'],
  },
  {
    id: 'io', name: 'Io', kind: 'moon', type: 'Moon of Jupiter',
    facts: [['Diameter', '3,643 km'], ['Orbits', 'Jupiter'], ['Orbital period', '1.8 days'], ['Surface', 'Over 400 active volcanoes']],
    blurb: 'The most volcanically active body in the Solar System, covered in sulphur that gives it a yellow-orange colour.',
    wiki: 'https://en.wikipedia.org/wiki/Io_(moon)', related: ['jupiter'],
  },
  {
    id: 'enceladus', name: 'Enceladus', kind: 'moon', type: 'Moon of Saturn',
    facts: [['Diameter', '504 km'], ['Orbits', 'Saturn'], ['Orbital period', '1.4 days'], ['Surface', 'Bright ice; geysers at the south pole']],
    blurb: 'A small, brilliant-white moon that sprays plumes of water ice from an ocean hidden beneath its icy shell.',
    wiki: 'https://en.wikipedia.org/wiki/Enceladus', related: ['saturn'],
  },
  {
    id: 'triton', name: 'Triton', kind: 'moon', type: 'Moon of Neptune',
    facts: [['Diameter', '2,707 km'], ['Orbits', 'Neptune'], ['Orbital period', '5.9 days (retrograde)'], ['Origin', 'Likely a captured Kuiper belt object']],
    blurb: "Neptune's largest moon, unusual because it orbits backwards. It has active geysers of nitrogen gas.",
    wiki: 'https://en.wikipedia.org/wiki/Triton_(moon)', related: ['neptune'],
  },
]

export const SHOWERS: CelestialObject[] = [
  {
    id: 'perseids', name: 'Perseids', kind: 'shower', type: 'Annual meteor shower',
    facts: [['Peak', 'around 12–13 August'], ['Parent body', 'Comet Swift–Tuttle'], ['Radiant', 'Perseus'], ['Peak rate', 'about 100/hour']],
    blurb: 'One of the most active and reliable showers of the year, known for many bright meteors and occasional fireballs.',
    wiki: 'https://en.wikipedia.org/wiki/Perseids', related: ['swift-tuttle'],
  },
  {
    id: 'geminids', name: 'Geminids', kind: 'shower', type: 'Annual meteor shower',
    facts: [['Peak', 'around 13–14 December'], ['Parent body', 'Asteroid 3200 Phaethon'], ['Radiant', 'Gemini'], ['Peak rate', 'about 120/hour']],
    blurb: 'Often the strongest shower of the year, with slow, bright, multicoloured meteors. Unusually, its parent is an asteroid, not a comet.',
    wiki: 'https://en.wikipedia.org/wiki/Geminids',
  },
  {
    id: 'leonids', name: 'Leonids', kind: 'shower', type: 'Annual meteor shower',
    facts: [['Peak', 'around 17–18 November'], ['Parent body', 'Comet Tempel–Tuttle'], ['Radiant', 'Leo'], ['Peak rate', 'about 15/hour (storms roughly every 33 years)']],
    blurb: 'Usually a modest shower, but every 33 years, when its parent comet returns, it can produce a spectacular meteor storm.',
    wiki: 'https://en.wikipedia.org/wiki/Leonids', related: ['tempel-tuttle'],
  },
  {
    id: 'orionids', name: 'Orionids', kind: 'shower', type: 'Annual meteor shower',
    facts: [['Peak', 'around 21–22 October'], ['Parent body', 'Comet Halley'], ['Radiant', 'Orion'], ['Peak rate', 'about 20/hour']],
    blurb: "Fast meteors, some leaving glowing trails, formed from dust left behind by Halley's Comet.",
    wiki: 'https://en.wikipedia.org/wiki/Orionids', related: ['halley', 'orion'],
  },
  {
    id: 'quadrantids', name: 'Quadrantids', kind: 'shower', type: 'Annual meteor shower',
    facts: [['Peak', 'around 3–4 January'], ['Parent body', 'Asteroid 2003 EH1'], ['Radiant', 'Boötes (near the old constellation Quadrans Muralis)'], ['Peak rate', 'about 110/hour, but the peak lasts only a few hours']],
    blurb: 'A strong shower with a very sharp, brief peak, making it easy to miss. Its likely parent is a "rock comet".',
    wiki: 'https://en.wikipedia.org/wiki/Quadrantids',
  },
]

export const COMETS: CelestialObject[] = [
  {
    id: 'halley', name: "Halley's Comet", kind: 'comet', type: 'Periodic comet',
    facts: [['Orbital period', 'about 76 years'], ['Next return', '2061'], ['Parent of', 'Orionids and Eta Aquariids']],
    blurb: "The most famous comet, visible to the naked eye roughly every 76 years. Dust it left behind produces the Orionid meteor shower.",
    wiki: 'https://en.wikipedia.org/wiki/Halley%27s_Comet', related: ['orionids'],
  },
  {
    id: 'swift-tuttle', name: 'Swift–Tuttle', kind: 'comet', type: 'Periodic comet',
    facts: [['Orbital period', 'about 133 years'], ['Next return', '2126'], ['Parent of', 'Perseid meteor shower']],
    blurb: 'A large comet whose trail of dust the Earth passes through every August, producing the Perseid meteor shower.',
    wiki: 'https://en.wikipedia.org/wiki/Comet_Swift%E2%80%93Tuttle', related: ['perseids'],
  },
  {
    id: 'tempel-tuttle', name: 'Tempel–Tuttle', kind: 'comet', type: 'Periodic comet',
    facts: [['Orbital period', 'about 33 years'], ['Next return', '2031'], ['Parent of', 'Leonid meteor shower']],
    blurb: "This comet's close returns to the inner Solar System every 33 years are linked to spectacular Leonid meteor storms.",
    wiki: 'https://en.wikipedia.org/wiki/55P/Tempel%E2%80%93Tuttle', related: ['leonids'],
  },
]

export const CONSTELLATIONS: CelestialObject[] = [
  {
    id: 'orion', name: 'Orion', kind: 'constellation', type: 'Constellation',
    facts: [['Best season', 'Winter (Northern Hemisphere)'], ['Visible from', 'Nearly worldwide'], ['Notable stars', 'Betelgeuse, Rigel'], ['Mythology', 'A hunter in Greek mythology']],
    blurb: "One of the most recognisable constellations, marked by the three stars of Orion's Belt and home to the Orion Nebula.",
    wiki: 'https://en.wikipedia.org/wiki/Orion_(constellation)', related: ['betelgeuse', 'rigel', 'orion-nebula'],
  },
  {
    id: 'ursa-major', name: 'Ursa Major', kind: 'constellation', type: 'Constellation',
    facts: [['Best season', 'Spring (Northern Hemisphere)'], ['Visible from', 'Northern sky, circumpolar at high latitudes'], ['Notable stars', 'Dubhe, Alkaid (the Big Dipper)'], ['Mythology', 'The Great Bear']],
    blurb: 'The third-largest constellation, containing the well-known Big Dipper asterism used to find the North Star.',
    wiki: 'https://en.wikipedia.org/wiki/Ursa_Major',
  },
  {
    id: 'cassiopeia', name: 'Cassiopeia', kind: 'constellation', type: 'Constellation',
    facts: [['Best season', 'Autumn (Northern Hemisphere)'], ['Visible from', 'Northern sky, circumpolar at high latitudes'], ['Notable stars', 'Schedar'], ['Mythology', 'A vain queen in Greek mythology']],
    blurb: 'Instantly recognisable for its distinctive W (or M) shape of five bright stars.',
    wiki: 'https://en.wikipedia.org/wiki/Cassiopeia_(constellation)',
  },
  {
    id: 'scorpius', name: 'Scorpius', kind: 'constellation', type: 'Constellation',
    facts: [['Best season', 'Summer (Northern Hemisphere)'], ['Visible from', 'Best seen from southern latitudes'], ['Notable stars', 'Antares'], ['Mythology', 'The scorpion that killed Orion']],
    blurb: 'A constellation that genuinely looks like its name, with a curved tail of stars and the red giant Antares as its heart.',
    wiki: 'https://en.wikipedia.org/wiki/Scorpius',
  },
  {
    id: 'southern-cross', name: 'Southern Cross', kind: 'constellation', type: 'Constellation (Crux)',
    facts: [['Best season', 'Autumn (Southern Hemisphere)'], ['Visible from', 'Southern Hemisphere and low northern latitudes'], ['Notable stars', 'Acrux, Mimosa'], ['Mythology', 'Used for centuries to find south']],
    blurb: 'The smallest constellation, but one of the most famous, appearing on several national flags and used to navigate south.',
    wiki: 'https://en.wikipedia.org/wiki/Crux',
  },
]

export const NEBULAE: CelestialObject[] = [
  {
    id: 'orion-nebula', name: 'Orion Nebula', kind: 'nebula', type: 'Emission/reflection nebula',
    facts: [['Distance', 'about 1,344 light-years'], ['Constellation', 'Orion'], ['Diameter', 'about 24 light-years'], ['Seen from Earth', 'Visible to the naked eye as a fuzzy "star"']],
    blurb: "A bright stellar nursery visible to the naked eye below Orion's Belt, where new stars are actively forming.",
    wiki: 'https://en.wikipedia.org/wiki/Orion_Nebula', related: ['orion'],
  },
  {
    id: 'crab-nebula', name: 'Crab Nebula', kind: 'nebula', type: 'Supernova remnant',
    facts: [['Distance', 'about 6,500 light-years'], ['Constellation', 'Taurus'], ['Diameter', 'about 11 light-years'], ['Origin', 'A supernova observed in 1054 CE']],
    blurb: 'The expanding wreckage of a star that exploded nearly a thousand years ago; a rapidly spinning pulsar sits at its centre.',
    wiki: 'https://en.wikipedia.org/wiki/Crab_Nebula',
  },
  {
    id: 'eagle-nebula', name: 'Eagle Nebula', kind: 'nebula', type: 'Emission nebula, star cluster',
    facts: [['Distance', 'about 7,000 light-years'], ['Constellation', 'Serpens'], ['Diameter', 'about 70 light-years'], ['Famous feature', 'The "Pillars of Creation"']],
    blurb: 'Home to the famous "Pillars of Creation", towering columns of gas and dust where new stars are being born.',
    wiki: 'https://en.wikipedia.org/wiki/Eagle_Nebula',
  },
  {
    id: 'helix-nebula', name: 'Helix Nebula', kind: 'nebula', type: 'Planetary nebula',
    facts: [['Distance', 'about 650 light-years'], ['Constellation', 'Aquarius'], ['Diameter', 'about 5.5 light-years'], ['Nickname', 'The "Eye of God"']],
    blurb: 'The glowing shell of gas shed by a dying, Sun-like star, one of the closest and brightest planetary nebulae.',
    wiki: 'https://en.wikipedia.org/wiki/Helix_Nebula',
  },
  {
    id: 'ring-nebula', name: 'Ring Nebula', kind: 'nebula', type: 'Planetary nebula',
    facts: [['Distance', 'about 2,570 light-years'], ['Constellation', 'Lyra'], ['Diameter', 'about 1 light-year'], ['Seen from Earth', 'Needs a small telescope']],
    blurb: 'A classic planetary nebula, its glowing ring shape formed as a dying star puffed off its outer layers.',
    wiki: 'https://en.wikipedia.org/wiki/Ring_Nebula',
  },
]

export const STARS: CelestialObject[] = [
  {
    id: 'sirius', name: 'Sirius', kind: 'star', type: 'Main-sequence star (A-type)',
    facts: [['Distance', '8.6 light-years'], ['Constellation', 'Canis Major'], ['Apparent brightness', 'Brightest star in the night sky'], ['Companion', 'A white dwarf, Sirius B']],
    blurb: 'The brightest star seen from Earth, appearing bright mainly because it is one of our nearest stellar neighbours.',
    wiki: 'https://en.wikipedia.org/wiki/Sirius',
  },
  {
    id: 'betelgeuse', name: 'Betelgeuse', kind: 'star', type: 'Red supergiant',
    facts: [['Distance', 'about 550 light-years'], ['Constellation', 'Orion'], ['Diameter', '~700 times the Sun'], ['Future', 'Expected to explode as a supernova, astronomically soon']],
    blurb: "A huge, aging red supergiant marking Orion's shoulder; if it were at the Sun's place, it would engulf the inner planets.",
    wiki: 'https://en.wikipedia.org/wiki/Betelgeuse', related: ['orion'],
  },
  {
    id: 'proxima-centauri', name: 'Proxima Centauri', kind: 'star', type: 'Red dwarf',
    facts: [['Distance', '4.24 light-years'], ['Constellation', 'Centaurus'], ['Diameter', 'about 1/7th of the Sun'], ['Notable', 'The closest known star to the Sun']],
    blurb: 'A faint red dwarf that is the nearest star to our Sun, with at least one known planet, Proxima b.',
    wiki: 'https://en.wikipedia.org/wiki/Proxima_Centauri',
  },
  {
    id: 'rigel', name: 'Rigel', kind: 'star', type: 'Blue supergiant',
    facts: [['Distance', 'about 860 light-years'], ['Constellation', 'Orion'], ['Luminosity', 'tens of thousands of times the Sun'], ['Notable', 'The brightest star in Orion']],
    blurb: "A brilliant blue supergiant marking Orion's foot, tens of thousands of times more luminous than the Sun.",
    wiki: 'https://en.wikipedia.org/wiki/Rigel', related: ['orion'],
  },
  {
    id: 'polaris', name: 'Polaris', kind: 'star', type: 'Yellow supergiant',
    facts: [['Distance', 'about 433 light-years'], ['Constellation', 'Ursa Minor'], ['Notable', 'Current North Star, within about 0.5° of the north celestial pole'], ['Type', 'A pulsating variable star']],
    blurb: "The current North Star, useful for navigation because it sits almost exactly above Earth's north pole in the sky.",
    wiki: 'https://en.wikipedia.org/wiki/Polaris',
  },
]

export const ALL_SKY_OBJECTS = [SUN, ...PLANETS, ...MOONS, ...GALAXIES, ...SHOWERS, ...COMETS, ...CONSTELLATIONS, ...NEBULAE, ...STARS]