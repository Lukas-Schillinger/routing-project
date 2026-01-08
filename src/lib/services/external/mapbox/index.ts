// Mapbox external service exports
export { MapboxApiError, mapboxClient } from './client';
export {
	mapboxDistanceMatrix,
	type DistanceMatrixResult
} from './distance-matrix';
export { mapboxGeocoding, MapboxGeocodingService } from './geocoding';
export { mapboxNavigation } from './navigation';
export type {
	Coordinate,
	DirectionsLeg,
	DirectionsResponse,
	DirectionsResponseGeoJson,
	DirectionsRoute,
	DirectionsRouteGeoJson,
	DirectionsStep,
	DirectionsWaypoint,
	GeocodingFeature,
	GeocodingResponse,
	GeoJsonLineString,
	MapboxError,
	MatrixResponse,
	MatrixWaypoint
} from './types';
