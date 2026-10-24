import { EntityRow } from '../interfaces/common/entity-row.interface';
import { Film } from '../interfaces/film.interface';
import { Person } from '../interfaces/person.interface';
import { Starship } from '../interfaces/starship.interface';
import { Vehicle } from '../interfaces/vehicle.interface';

/** Shown instead of values the data source does not know. */
export const EMPTY_VALUE = '—';

const MISSING = new Set(['', 'unknown', 'n/a']);

/** SWAPI encodes "no data" as free text; the UI shows a single, consistent placeholder. */
export function displayText(value: string | null | undefined): string {
  const text = value?.trim() ?? '';
  return MISSING.has(text.toLowerCase()) ? EMPTY_VALUE : text;
}

function parseNumber(text: string): number | null {
  const parsed = Number(text.replace(/,/g, ''));
  return text !== '' && Number.isFinite(parsed) ? parsed : null;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** "172" -> "172 cm". Non numeric text is shown as is rather than with a made up unit. */
export function displayMeasure(value: string | null | undefined, unit: string): string {
  const text = displayText(value);
  if (text === EMPTY_VALUE) return text;
  const parsed = parseNumber(text);
  return parsed === null ? text : `${numberFormat.format(parsed)} ${unit}`;
}

export function displayCredits(value: string | null | undefined): string {
  return displayMeasure(value, 'cr');
}

export function capitalize(text: string): string {
  return text === EMPTY_VALUE ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

export function toPersonRow(person: Person): EntityRow {
  return {
    id: person.id,
    name: person.name,
    gender: capitalize(displayText(person.gender)),
    birthYear: displayText(person.birthYear),
    height: displayMeasure(person.height, 'cm'),
    mass: displayMeasure(person.mass, 'kg'),
  };
}

export function toFilmRow(film: Film): EntityRow {
  return {
    id: film.id,
    title: film.title,
    episode: `Episode ${film.episodeId}`,
    director: displayText(film.director),
    releaseDate: displayText(film.releaseDate),
    openingCrawl: displayText(film.openingCrawl),
  };
}

export function toStarshipRow(starship: Starship): EntityRow {
  return {
    id: starship.id,
    name: starship.name,
    model: displayText(starship.model),
    manufacturer: displayText(starship.manufacturer),
    starshipClass: displayText(starship.starshipClass),
    cost: displayCredits(starship.costInCredits),
  };
}

export function toVehicleRow(vehicle: Vehicle): EntityRow {
  return {
    id: vehicle.id,
    name: vehicle.name,
    model: displayText(vehicle.model),
    manufacturer: displayText(vehicle.manufacturer),
    vehicleClass: displayText(vehicle.vehicleClass),
    cost: displayCredits(vehicle.costInCredits),
  };
}
