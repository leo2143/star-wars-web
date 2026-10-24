import { describeListPage } from '../../support/list-page.testing';
import FilmsComponent from './films.component';

describeListPage({
  name: 'Films',
  href: '/films/4',
  component: FilmsComponent,
  method: 'getFilms',
  item: {
    id: '4',
    title: 'A New Hope',
    episodeId: 4,
    director: 'George Lucas',
    releaseDate: '1977-05-25',
    openingCrawl: 'unknown',
  },
  headers: ['Title', 'Episode', 'Director', 'Release date'],
  cells: ['A New Hope', 'Episode 4', 'George Lucas', '1977-05-25'],
  sortable: ['Title', 'Episode', 'Release date'],
  sortBy: ['episodeId', 'Episode'],
});
