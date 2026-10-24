import { FilmMin } from './film.interface';
import { StarshipMin } from './starship.interface';
import { VehicleMin } from './vehicle.interface';

/** Mirrors `PersonDto` of the backend. Text fields may hold SWAPI values such as "unknown". */
export interface Person {
  id: string;
  name: string;
  height: string;
  mass: string;
  hairColor: string;
  skinColor: string;
  eyeColor: string;
  birthYear: string;
  gender: string;
}

/** Mirrors `PersonMinDto`: a person as embedded in the detail of a film. */
export interface PersonMin {
  id: string;
  name: string;
  gender: string;
}

/** Mirrors `PersonDetailDto`: the listing fields plus the related films, starships and vehicles. */
export interface PersonDetail extends Person {
  films: FilmMin[];
  starships: StarshipMin[];
  vehicles: VehicleMin[];
}
