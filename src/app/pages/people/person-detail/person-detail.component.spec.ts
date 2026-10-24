import { describeDetailPage } from '../../support/detail-page.testing';

const filmMin = { id: '1', title: 'A New Hope', episodeId: 4, releaseDate: '1977-05-25' };
const starshipMin = { id: '12', name: 'X-wing', model: 'T-65', starshipClass: 'Starfighter' };

describeDetailPage({
  name: 'Person',
  route: 'people',
  listLabel: 'people',
  notFoundTitle: 'Person not found',
  load: () => import('./person-detail.component'),
  body: {
    id: '1',
    name: 'Luke Skywalker',
    height: '172',
    mass: '77',
    hairColor: 'blond',
    skinColor: 'fair',
    eyeColor: 'blue',
    birthYear: '19BBY',
    gender: 'male',
    films: [filmMin],
    starships: [starshipMin],
    vehicles: [],
  },
  title: 'Luke Skywalker',
  attributes: { Height: '172 cm', 'Hair color': 'blond', Gender: 'Male' },
  sections: { Films: ['/films/1'], Starships: ['/starships/12'] },
  allSections: ['Films', 'Starships', 'Vehicles'],
});
