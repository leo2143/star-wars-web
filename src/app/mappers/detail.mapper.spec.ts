import { FilmDetail } from '../interfaces/film.interface';
import { PersonDetail } from '../interfaces/person.interface';
import { StarshipDetail } from '../interfaces/starship.interface';
import { VehicleDetail } from '../interfaces/vehicle.interface';
import {
  filmAttributes,
  filmItem,
  personAttributes,
  personItem,
  starshipAttributes,
  starshipItem,
  vehicleAttributes,
  vehicleItem,
} from './detail.mapper';

const asMap = (attributes: { label: string; value: string }[]) =>
  Object.fromEntries(attributes.map((a) => [a.label, a.value]));

describe('detail attributes', () => {
  it('lists every scalar field of a person with units and placeholders', () => {
    const person = {
      id: '1',
      name: 'Luke',
      height: '172',
      mass: 'unknown',
      hairColor: 'blond',
      skinColor: 'fair',
      eyeColor: 'blue',
      birthYear: '19BBY',
      gender: 'male',
    } as PersonDetail;
    expect(asMap(personAttributes(person))).toEqual({
      ID: '1',
      Gender: 'Male',
      'Birth year': '19BBY',
      Height: '172 cm',
      Mass: '—',
      'Hair color': 'blond',
      'Skin color': 'fair',
      'Eye color': 'blue',
    });
  });

  it('lists every scalar field of a film except the crawl', () => {
    const film = {
      id: '4',
      title: 'A New Hope',
      episodeId: 4,
      director: 'George Lucas',
      producer: 'Gary Kurtz, Rick McCallum',
      releaseDate: '1977-05-25',
      openingCrawl: 'long ago',
    } as FilmDetail;
    expect(asMap(filmAttributes(film))).toEqual({
      ID: '4',
      Episode: '4',
      Director: 'George Lucas',
      Producer: 'Gary Kurtz, Rick McCallum',
      'Release date': '1977-05-25',
    });
  });

  it('lists every scalar field of a starship', () => {
    const ship = {
      id: '10',
      name: 'Millennium Falcon',
      model: 'YT-1300 light freighter',
      starshipClass: 'Light freighter',
      manufacturer: 'Corellian Engineering Corporation',
      costInCredits: '100000',
      length: '34.37',
      crew: '4',
      passengers: '6',
      maxAtmospheringSpeed: '1050',
      hyperdriveRating: '0.5',
      mglt: '75',
      cargoCapacity: '100000',
      consumables: '2 months',
    } as StarshipDetail;
    expect(asMap(starshipAttributes(ship))).toEqual({
      ID: '10',
      Model: 'YT-1300 light freighter',
      Class: 'Light freighter',
      Manufacturer: 'Corellian Engineering Corporation',
      Cost: '100,000 cr',
      Length: '34.37 m',
      Crew: '4',
      Passengers: '6',
      'Max atmosphering speed': '1,050 km/h',
      'Hyperdrive rating': '0.5',
      MGLT: '75',
      'Cargo capacity': '100,000 kg',
      Consumables: '2 months',
    });
  });

  it('lists every scalar field of a vehicle, with n/a as a dash', () => {
    const vehicle = {
      id: '4',
      name: 'Sand Crawler',
      model: 'Digger Crawler',
      vehicleClass: 'wheeled',
      manufacturer: 'Corellia Mining Corporation',
      costInCredits: '150000',
      length: '36.8',
      crew: '46',
      passengers: '30',
      maxAtmospheringSpeed: '30',
      cargoCapacity: '50000',
      consumables: 'n/a',
    } as VehicleDetail;
    expect(asMap(vehicleAttributes(vehicle))).toEqual({
      ID: '4',
      Model: 'Digger Crawler',
      Class: 'wheeled',
      Manufacturer: 'Corellia Mining Corporation',
      Cost: '150,000 cr',
      Length: '36.8 m',
      Crew: '46',
      Passengers: '30',
      'Max atmosphering speed': '30 km/h',
      'Cargo capacity': '50,000 kg',
      Consumables: '—',
    });
  });
});

describe('related items', () => {
  it('links a film to its detail page', () => {
    expect(
      filmItem({ id: '4', title: 'A New Hope', episodeId: 4, releaseDate: '1977-05-25' }),
    ).toEqual({ link: ['/films', '4'], label: 'A New Hope', meta: 'Episode 4 · 1977-05-25' });
  });

  it('links a person to their detail page', () => {
    expect(personItem({ id: '1', name: 'Luke', gender: 'male' })).toEqual({
      link: ['/people', '1'],
      label: 'Luke',
      meta: 'Male',
    });
  });

  it('links a starship and a vehicle', () => {
    expect(
      starshipItem({ id: '12', name: 'X-wing', model: 'T-65', starshipClass: 'Starfighter' }),
    ).toEqual({ link: ['/starships', '12'], label: 'X-wing', meta: 'Starfighter · T-65' });
    expect(vehicleItem({ id: '4', name: 'Sand Crawler', model: 'unknown' })).toEqual({
      link: ['/vehicles', '4'],
      label: 'Sand Crawler',
      meta: '—',
    });
  });
});
