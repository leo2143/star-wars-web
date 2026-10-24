import { Film } from '../interfaces/film.interface';
import { Person } from '../interfaces/person.interface';
import { Starship } from '../interfaces/starship.interface';
import { Vehicle } from '../interfaces/vehicle.interface';
import {
  EMPTY_VALUE,
  displayCredits,
  displayMeasure,
  displayText,
  toFilmRow,
  toPersonRow,
  toStarshipRow,
  toVehicleRow,
} from './display.mapper';

describe('display helpers', () => {
  it.each(['unknown', 'Unknown', 'n/a', 'N/A', '', '   ', null, undefined])(
    'turns %s into a dash',
    (value) => {
      expect(displayText(value)).toBe(EMPTY_VALUE);
    },
  );

  it('keeps meaningful text', () => {
    expect(displayText('Tatooine')).toBe('Tatooine');
  });

  it('formats measures with units and thousands separators', () => {
    expect(displayMeasure('172', 'cm')).toBe('172 cm');
    expect(displayMeasure('1,358', 'kg')).toBe('1,358 kg');
    expect(displayMeasure('unknown', 'kg')).toBe(EMPTY_VALUE);
  });

  it('keeps non numeric measures untouched instead of inventing a unit', () => {
    expect(displayMeasure('varies', 'cm')).toBe('varies');
  });

  it('formats credits', () => {
    expect(displayCredits('1000000')).toBe('1,000,000 cr');
    expect(displayCredits('unknown')).toBe(EMPTY_VALUE);
  });
});

describe('row mappers', () => {
  it('maps a person', () => {
    const person = {
      id: '1',
      name: 'Luke Skywalker',
      height: '172',
      mass: 'unknown',
      birthYear: '19BBY',
      gender: 'male',
    } as Person;
    expect(toPersonRow(person)).toEqual({
      id: '1',
      name: 'Luke Skywalker',
      gender: 'Male',
      birthYear: '19BBY',
      height: '172 cm',
      mass: EMPTY_VALUE,
    });
  });

  it('maps a film keeping the crawl as secondary text', () => {
    const film = {
      id: '4',
      title: 'A New Hope',
      episodeId: 4,
      director: 'George Lucas',
      releaseDate: '1977-05-25',
      openingCrawl: 'It is a period of civil war.',
    } as Film;
    expect(toFilmRow(film)).toEqual({
      id: '4',
      title: 'A New Hope',
      episode: 'Episode 4',
      director: 'George Lucas',
      releaseDate: '1977-05-25',
      openingCrawl: 'It is a period of civil war.',
    });
  });

  it('maps a starship', () => {
    const ship = {
      id: '10',
      name: 'Millennium Falcon',
      model: 'YT-1300',
      manufacturer: 'Corellian Engineering Corporation',
      starshipClass: 'Light freighter',
      costInCredits: '100000',
    } as Starship;
    expect(toStarshipRow(ship)).toEqual({
      id: '10',
      name: 'Millennium Falcon',
      model: 'YT-1300',
      manufacturer: 'Corellian Engineering Corporation',
      starshipClass: 'Light freighter',
      cost: '100,000 cr',
    });
  });

  it('maps a vehicle with unknown cost', () => {
    const vehicle = {
      id: '4',
      name: 'Sand Crawler',
      model: 'Digger Crawler',
      manufacturer: 'Corellia Mining Corporation',
      vehicleClass: 'wheeled',
      costInCredits: 'unknown',
    } as Vehicle;
    expect(toVehicleRow(vehicle)['cost']).toBe(EMPTY_VALUE);
  });
});
