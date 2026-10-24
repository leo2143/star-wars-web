import { describeListPage } from '../../support/list-page.testing';
import PeopleComponent from './people.component';

describeListPage({
  name: 'People',
  href: '/people/1',
  component: PeopleComponent,
  method: 'getPeople',
  item: {
    id: '1',
    name: 'Luke Skywalker',
    gender: 'male',
    birthYear: '19BBY',
    height: '172',
    mass: '77',
  },
  headers: ['Name', 'ID', 'Gender', 'Birth year', 'Height', 'Mass'],
  cells: ['Luke Skywalker', '1', 'Male', '19BBY', '172 cm', '77 kg'],
  sortable: ['Name', 'Height', 'Mass'],
  sortBy: ['height', 'Height'],
});
