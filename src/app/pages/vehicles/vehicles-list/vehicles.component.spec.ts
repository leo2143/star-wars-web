import { describeListPage } from '../../support/list-page.testing';
import VehiclesComponent from './vehicles.component';

describeListPage({
  name: 'Vehicles',
  href: '/vehicles/4',
  component: VehiclesComponent,
  method: 'getVehicles',
  item: {
    id: '4',
    name: 'Sand Crawler',
    model: 'Digger',
    manufacturer: 'Corellia',
    vehicleClass: 'wheeled',
    costInCredits: 'unknown',
  },
  headers: ['Name', 'Model', 'Manufacturer', 'Class', 'Cost'],
  cells: ['Sand Crawler', 'Digger', 'Corellia', 'wheeled', '—'],
  sortable: ['Name', 'Cost'],
  sortBy: ['costInCredits', 'Cost'],
});
