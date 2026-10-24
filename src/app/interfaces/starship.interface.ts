import { FilmMin } from './film.interface';

/** Mirrors `StarshipDto` of the backend. Text fields may hold SWAPI values such as "unknown". */
export interface Starship {
  id: string;
  name: string;
  model: string;
  starshipClass: string;
  manufacturer: string;
  costInCredits: string;
  length: string;
  crew: string;
  passengers: string;
  maxAtmospheringSpeed: string;
  hyperdriveRating: string;
  mglt: string;
  cargoCapacity: string;
  consumables: string;
}

/** Mirrors `StarshipMinDto`: a starship as embedded in the detail of people and films. */
export interface StarshipMin {
  id: string;
  name: string;
  model: string;
  starshipClass: string;
}

/** Mirrors `StarshipDetailDto`: the listing fields plus the films the starship appears in. */
export interface StarshipDetail extends Starship {
  films: FilmMin[];
}
