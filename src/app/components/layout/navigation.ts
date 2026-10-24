export interface NavItem {
  path: string;
  label: string;
  description: string;
  /** Font Awesome classes. */
  icon: string;
}

export const DASHBOARD_ITEM: NavItem = {
  path: '/dashboard',
  label: 'Dashboard',
  description: 'Mission control',
  icon: 'fa-solid fa-border-all',
};

/** The four explorable categories, in menu order. */
export const EXPLORE_ITEMS: readonly NavItem[] = [
  {
    path: '/people',
    label: 'People',
    description: 'Heroes, villains and everyone between',
    icon: 'fa-solid fa-user-astronaut',
  },
  {
    path: '/films',
    label: 'Films',
    description: 'The saga, episode by episode',
    icon: 'fa-solid fa-film',
  },
  {
    path: '/starships',
    label: 'Starships',
    description: 'Fighters, freighters and capital ships',
    icon: 'fa-solid fa-rocket',
  },
  {
    path: '/vehicles',
    label: 'Vehicles',
    description: 'Speeders, walkers and crawlers',
    icon: 'fa-solid fa-truck-monster',
  },
];

export const NAV_ITEMS: readonly NavItem[] = [DASHBOARD_ITEM, ...EXPLORE_ITEMS];
