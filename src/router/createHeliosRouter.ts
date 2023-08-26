import type { AppState } from '../state-management/appState';
import type {
  RouteDefaultExport,
  RouterAppState,
  Routes,
} from './router-types';
import { matchRoute } from './matchRoute';

//
//

export type CreateHeliosRouterOptions<T extends RouterAppState> = {
  routes: Routes;
  appState: AppState<T>;
  hydrating?: boolean;
};

//
//

export type HeliosRouter<T> = {
  /**
   * The routes config for that router
   */
  routes: Routes;

  /**
   * Store using immer to handle the app state
   */
  appState: AppState<T>;

  /**
   * Given a url, load the route and update the app state
   *
   * Does not update the browser history
   */
  load: (url: URL) => Promise<void>;

  /**
   * The function that is called when the user clicks the back button
   * or the forward button
   */
  popState: () => void;
};

//
//

/**
 * Create a Helios router instance
 */
export function createHeliosRouter<T extends RouterAppState>({
  routes,
  appState,
}: CreateHeliosRouterOptions<T>): HeliosRouter<T> {
  //
  //

  let lastHref: string | null = null;

  //
  //

  async function load(url: URL) {
    if (lastHref === url.href) {
      return;
    }
    lastHref = url.href;

    const matched = matchRoute(url, routes);

    let moduleDefault!: RouteDefaultExport;

    try {
      moduleDefault = (await matched.import()).default;
    } catch (error) {
      throw error;
    }

    if (__DEV__) {
      if (!moduleDefault) {
        throw new Error(`Route ${lastHref} does not have a default export`);
      }

      if (typeof moduleDefault !== 'object') {
        throw new Error(
          `Route ${lastHref} default export is not an object. It is ${typeof moduleDefault}`,
        );
      }
    }

    //
    //
    
    appState.produce((appStateValue) => {
      appStateValue.router.urlProps = matched.urlProps;
      appStateValue.router.routeMatched = matched.routeMatched;
      appStateValue.router.routeExport = moduleDefault;
    });
  }

  //
  //

  function popState() {
    load(new URL(location.href));
  }

  //
  //

  return {
    routes,
    appState,
    load,
    popState,
  };
}