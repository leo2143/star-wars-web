import { PersonMin } from './person.interface';
import { StarshipMin } from './starship.interface';
import { VehicleMin } from './vehicle.interface';

/** Mirrors `FilmDto` of the backend. */
export interface Film {
  id: string;
  title: string;
  episodeId: number;
  director: string;
  producer: string;
  /** ISO date (yyyy-MM-dd). */
  releaseDate: string;
  openingCrawl: string;
}

/** Mirrors `FilmMinDto`: a film as embedded in the detail of people, starships and vehicles. */
export interface FilmMin {
  id: string;
  title: string;
  episodeId: number;
  /** ISO date (yyyy-MM-dd). */
  releaseDate: string;
}

/** Mirrors `FilmDetailDto`: the listing fields plus characters, starships and vehicles. */
export interface FilmDetail extends Film {
  characters: PersonMin[];
  starships: StarshipMin[];
  vehicles: VehicleMin[];
}
