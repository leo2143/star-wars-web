import { describeDetailPage } from '../../support/detail-page.testing';

describeDetailPage({
  name: 'Vehicle',
  route: 'vehicles',
  listLabel: 'vehicles',
  notFoundTitle: 'Vehicle not found',
  load: () => import('./vehicle-detail.component'),
  body: {
    id: '1',
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
    consumables: '2 months',
    films: [],
  },
  title: 'Sand Crawler',
  attributes: { Class: 'wheeled', Cost: '150,000 cr', 'Cargo capacity': '50,000 kg' },
  sections: {},
  allSections: ['Films'],
});
