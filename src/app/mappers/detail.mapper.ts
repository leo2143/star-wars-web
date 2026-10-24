import { FilmDetail, FilmMin } from '../interfaces/film.interface';
import { PersonDetail, PersonMin } from '../interfaces/person.interface';
import { StarshipDetail, StarshipMin } from '../interfaces/starship.interface';
import { VehicleDetail, VehicleMin } from '../interfaces/vehicle.interface';
import {
  EMPTY_VALUE,
  capitalize,
  displayCredits,
  displayMeasure,
  displayText,
} from './display.mapper';

/** One label/value pair of a detail page's attribute grid; the value is display-ready. */
export interface Attribute {
  label: string;
  value: string;
}

/** A related entity shown as a link to its own detail page. */
export interface RelatedItem {
  link: string[];
  label: string;
  /** Secondary line; already display-ready. */
  meta: string;
}

export function personAttributes(person: PersonDetail): Attribute[] {
  return [
    { label: 'ID', value: displayText(person.id) },
    { label: 'Gender', value: capitalize(displayText(person.gender)) },
    { label: 'Birth year', value: displayText(person.birthYear) },
    { label: 'Height', value: displayMeasure(person.height, 'cm') },
    { label: 'Mass', value: displayMeasure(person.mass, 'kg') },
    { label: 'Hair color', value: displayText(person.hairColor) },
    { label: 'Skin color', value: displayText(person.skinColor) },
    { label: 'Eye color', value: displayText(person.eyeColor) },
  ];
}

export function filmAttributes(film: FilmDetail): Attribute[] {
  return [
    { label: 'ID', value: displayText(film.id) },
    { label: 'Episode', value: String(film.episodeId) },
    { label: 'Director', value: displayText(film.director) },
    { label: 'Producer', value: displayText(film.producer) },
    { label: 'Release date', value: displayText(film.releaseDate) },
  ];
}

export function starshipAttributes(ship: StarshipDetail): Attribute[] {
  return [
    { label: 'ID', value: displayText(ship.id) },
    { label: 'Model', value: displayText(ship.model) },
    { label: 'Class', value: displayText(ship.starshipClass) },
    { label: 'Manufacturer', value: displayText(ship.manufacturer) },
    { label: 'Cost', value: displayCredits(ship.costInCredits) },
    { label: 'Length', value: displayMeasure(ship.length, 'm') },
    { label: 'Crew', value: displayText(ship.crew) },
    { label: 'Passengers', value: displayText(ship.passengers) },
    { label: 'Max atmosphering speed', value: displayMeasure(ship.maxAtmospheringSpeed, 'km/h') },
    { label: 'Hyperdrive rating', value: displayText(ship.hyperdriveRating) },
    { label: 'MGLT', value: displayText(ship.mglt) },
    { label: 'Cargo capacity', value: displayMeasure(ship.cargoCapacity, 'kg') },
    { label: 'Consumables', value: displayText(ship.consumables) },
  ];
}

export function vehicleAttributes(vehicle: VehicleDetail): Attribute[] {
  return [
    { label: 'ID', value: displayText(vehicle.id) },
    { label: 'Model', value: displayText(vehicle.model) },
    { label: 'Class', value: displayText(vehicle.vehicleClass) },
    { label: 'Manufacturer', value: displayText(vehicle.manufacturer) },
    { label: 'Cost', value: displayCredits(vehicle.costInCredits) },
    { label: 'Length', value: displayMeasure(vehicle.length, 'm') },
    { label: 'Crew', value: displayText(vehicle.crew) },
    { label: 'Passengers', value: displayText(vehicle.passengers) },
    {
      label: 'Max atmosphering speed',
      value: displayMeasure(vehicle.maxAtmospheringSpeed, 'km/h'),
    },
    { label: 'Cargo capacity', value: displayMeasure(vehicle.cargoCapacity, 'kg') },
    { label: 'Consumables', value: displayText(vehicle.consumables) },
  ];
}

/** Key facts for a heading: known parts joined by a dot, or an empty string when none is known. */
export function factsLine(parts: string[]): string {
  return parts.filter((part) => part !== EMPTY_VALUE).join(' · ');
}

function joinKnown(parts: string[]): string {
  return factsLine(parts) || EMPTY_VALUE;
}

export function filmItem(film: FilmMin): RelatedItem {
  return {
    link: ['/films', film.id],
    label: film.title,
    meta: joinKnown([`Episode ${film.episodeId}`, displayText(film.releaseDate)]),
  };
}

export function personItem(person: PersonMin): RelatedItem {
  return {
    link: ['/people', person.id],
    label: person.name,
    meta: capitalize(displayText(person.gender)),
  };
}

export function starshipItem(ship: StarshipMin): RelatedItem {
  return {
    link: ['/starships', ship.id],
    label: ship.name,
    meta: joinKnown([displayText(ship.starshipClass), displayText(ship.model)]),
  };
}

export function vehicleItem(vehicle: VehicleMin): RelatedItem {
  return {
    link: ['/vehicles', vehicle.id],
    label: vehicle.name,
    meta: displayText(vehicle.model),
  };
}
