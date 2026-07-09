import { useLocationSimulationStore } from '@/features/location/locationSimulationStore';

import { LocationSimulationService } from './LocationSimulationService';

describe('LocationSimulationService', () => {
  afterEach(() => useLocationSimulationStore.setState({ enabled: false }));

  it('injecte et active un point simulé', () => {
    LocationSimulationService.setSimulatedLocation(43.6081, 3.8797, 'Comédie');
    expect(LocationSimulationService.isSimulating()).toBe(true);
    expect(LocationSimulationService.getSimulatedPlace()).toEqual({
      latitude: 43.6081,
      longitude: 3.8797,
      label: 'Comédie',
    });
  });

  it('renvoie la position simulée (sans toucher au GPS) quand activée', async () => {
    LocationSimulationService.setSimulatedLocation(43.8383, 4.36, 'Nîmes');
    await expect(LocationSimulationService.getCurrentLocation()).resolves.toEqual({
      latitude: 43.8383,
      longitude: 4.36,
      accuracy: 5,
    });
  });

  it('désactive → retour à la vraie géolocalisation (plus de simulation)', () => {
    LocationSimulationService.enableSimulation();
    LocationSimulationService.disableSimulation();
    expect(LocationSimulationService.isSimulating()).toBe(false);
  });

  it('expose les points favoris de test (Comédie, Écusson, Gare, Quissac, Nîmes, Clermont)', () => {
    const labels = LocationSimulationService.presets.map((p) => p.label);
    expect(labels).toEqual([
      'Place de la Comédie (Montpellier)',
      'Écusson (Montpellier)',
      'Gare Saint-Roch (Montpellier)',
      'Quissac',
      'Nîmes',
      'Clermont-Ferrand',
    ]);
  });
});
