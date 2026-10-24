import { describeDetailPage } from '../../support/detail-page.testing';

const filmMin = { id: '1', title: 'A New Hope', episodeId: 4, releaseDate: '1977-05-25' };

describeDetailPage({
  name: 'Starship',
  route: 'starships',
  listLabel: 'starships',
  notFoundTitle: 'Starship not found',
  load: () => import('./starship-detail.component'),
  body: {
    id: '1',
    name: 'Millennium Falcon',
    model: 'YT-1300',
    starshipClass: 'Light freighter',
    manufacturer: 'Corellian',
    costInCredits: '100000',
    length: '34.37',
    crew: '4',
    passengers: '6',
    maxAtmospheringSpeed: '1050',
    hyperdriveRating: '0.5',
    mglt: '75',
    cargoCapacity: '100000',
    consumables: 'unknown',
    films: [filmMin],
  },
  title: 'Millennium Falcon',
  attributes: {
    Cost: '100,000 cr',
    Length: '34.37 m',
    'Hyperdrive rating': '0.5',
    Consumables: '—',
  },
  sections: { Films: ['/films/1'] },
  allSections: ['Films'],
});
