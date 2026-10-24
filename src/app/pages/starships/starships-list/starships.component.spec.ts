import { describeListPage } from '../../support/list-page.testing';
import StarshipsComponent from './starships.component';

describeListPage({
  name: 'Starships',
  href: '/starships/10',
  component: StarshipsComponent,
  method: 'getStarships',
  item: {
    id: '10',
    name: 'Millennium Falcon',
    model: 'YT-1300',
    manufacturer: 'Corellian',
    starshipClass: 'Light freighter',
    costInCredits: '100000',
  },
  headers: ['Name', 'Model', 'Manufacturer', 'Class', 'Cost'],
  cells: ['Millennium Falcon', 'YT-1300', 'Corellian', 'Light freighter', '100,000 cr'],
  sortable: ['Name', 'Cost'],
  sortBy: ['costInCredits', 'Cost'],
});
