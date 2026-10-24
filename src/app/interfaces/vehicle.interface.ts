import { FilmMin } from './film.interface';

/** Mirrors `VehicleDto` of the backend. Text fields may hold SWAPI values such as "unknown". */
export interface Vehicle {
  id: string;
  name: string;
  model: string;
  vehicleClass: string;
  manufacturer: string;
  costInCredits: string;
  length: string;
  crew: string;
  passengers: string;
  maxAtmospheringSpeed: string;
  cargoCapacity: string;
  consumables: string;
}

/** Mirrors `VehicleMinDto`: a vehicle as embedded in the detail of people and films. */
export interface VehicleMin {
  id: string;
  name: string;
  model: string;
}

/** Mirrors `VehicleDetailDto`: the listing fields plus the films the vehicle appears in. */
export interface VehicleDetail extends Vehicle {
  films: FilmMin[];
}
