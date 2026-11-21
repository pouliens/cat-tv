import { GoldfishScene } from './goldfish.js';
import { AquariumScene } from './aquarium.js';
import { LogoScene } from './logo.js';
import { IntroScene } from './intro.js';
import { BirdsScene } from './birds.js';
import { LaserScene } from './laser.js';
import { MiceScene } from './mice.js';
import { ButterfliesScene } from './butterflies.js';
import { WandScene } from './wand.js';
import { YarnScene } from './yarn.js';
import { FirefliesScene } from './fireflies.js';

export const SCENES = [
  { id: 'aquarium', name: 'Aquarium', blurb: 'Fish, bubbles, and swaying seaweed', sound: true, factory: AquariumScene },
  { id: 'goldfish', name: 'Lone Goldfish', blurb: 'One goldfish glides through clear blue water, seen from above', sound: true, factory: GoldfishScene },
  { id: 'logo', name: 'Bouncing Logo', blurb: 'A CAT TV logo that bounces and changes colour', sound: true, factory: LogoScene },
  { id: 'intro', name: 'Meow Intro', blurb: 'A looping red-ribbon letter animation', sound: true, factory: IntroScene },
  { id: 'birds', name: 'Birds', blurb: 'Birds hopping, flying, and singing', sound: true, factory: BirdsScene },
  { id: 'laser', name: 'Laser Pointer', blurb: 'A darting laser dot to chase', sound: true, factory: LaserScene },
  { id: 'mice', name: 'Mice', blurb: 'Mice scurry, hide, and peek', sound: true, factory: MiceScene },
  { id: 'butterflies', name: 'Butterflies', blurb: 'Butterflies fluttering over a meadow', sound: true, factory: ButterfliesScene },
  { id: 'wand', name: 'Wand Toy', blurb: 'A feather wand swings and twitches', sound: true, factory: WandScene },
  { id: 'yarn', name: 'Yarn Ball', blurb: 'A ball of yarn rolls and unravels', sound: true, factory: YarnScene },
  { id: 'fireflies', name: 'Fireflies', blurb: 'A night meadow of glowing fireflies', sound: true, factory: FirefliesScene },
];

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    sceneIds: SCENES.map((s) => s.id),
  },
};

export const DEFAULT_THEME = 'classic';

export function getScene(id) {
  return SCENES.find((s) => s.id === id) || SCENES[0];
}

export function createScene(id, env) {
  const def = getScene(id);
  return new def.factory(env);
}
