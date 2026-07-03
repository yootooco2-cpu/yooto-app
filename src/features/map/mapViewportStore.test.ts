/// <reference types="jest" />
import { useMapViewportStore } from './mapViewportStore';
import type { MapViewport } from './types';

const V: MapViewport = {
  center: { latitude: 43.6108, longitude: 3.8767 },
  zoom: 13.2,
  bounds: { west: 3.8, south: 43.55, east: 3.95, north: 43.67 },
};

describe('mapViewportStore', () => {
  beforeEach(() => useMapViewportStore.setState({ lastViewport: null }));

  it('démarre vide', () => {
    expect(useMapViewportStore.getState().lastViewport).toBeNull();
  });

  it('mémorise le dernier viewport', () => {
    useMapViewportStore.getState().setLastViewport(V);
    expect(useMapViewportStore.getState().lastViewport).toEqual(V);
  });

  it('remplace le viewport à chaque mise à jour', () => {
    useMapViewportStore.getState().setLastViewport(V);
    const V2: MapViewport = { ...V, zoom: 15 };
    useMapViewportStore.getState().setLastViewport(V2);
    expect(useMapViewportStore.getState().lastViewport?.zoom).toBe(15);
  });
});
