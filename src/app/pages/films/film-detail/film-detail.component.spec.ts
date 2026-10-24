import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../http/api-url';
import { describeDetailPage } from '../../support/detail-page.testing';

const personMin = { id: '1', name: 'Luke Skywalker', gender: 'male' };
const starshipMin = { id: '12', name: 'X-wing', model: 'T-65', starshipClass: 'Starfighter' };

const body = {
  id: '1',
  title: 'A New Hope',
  episodeId: 4,
  director: 'George Lucas',
  producer: 'Gary Kurtz',
  releaseDate: '1977-05-25',
  openingCrawl: 'It is a period of civil war.\r\nRebel spaceships strike.',
  characters: [personMin],
  starships: [starshipMin],
  vehicles: [],
};

describeDetailPage({
  name: 'Film',
  route: 'films',
  listLabel: 'films',
  notFoundTitle: 'Film not found',
  load: () => import('./film-detail.component'),
  body,
  title: 'A New Hope',
  attributes: { Director: 'George Lucas', Episode: '4', 'Release date': '1977-05-25' },
  sections: { Characters: ['/people/1'], Starships: ['/starships/12'] },
  allSections: ['Characters', 'Starships', 'Vehicles'],
});

describe('Film detail page crawl', () => {
  it('shows the opening crawl in its own section keeping line breaks', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'films/:id', loadComponent: () => import('./film-detail.component') },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(API_BASE_URL);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/films/1');
    http.expectOne(`${api}/api/v1/films/1`).flush({
      ...body,
      openingCrawl: 'It is a period of civil war.\r\nRebel spaceships strike.',
    });
    await harness.fixture.whenStable();

    const root = harness.fixture.nativeElement as HTMLElement;
    const crawl = Array.from(root.querySelectorAll('section')).find(
      (s) => s.querySelector('h2')?.textContent?.trim() === 'Opening crawl',
    );
    expect(crawl?.textContent).toContain('It is a period of civil war.');
    expect(crawl?.querySelector('p')?.className).toContain('whitespace-pre-line');
    http.verify();
  });
});
