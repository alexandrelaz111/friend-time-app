// src/services/placesService.ts
// Reverse geocoding via Nominatim (OpenStreetMap) — gratuit, sans clé API

export type PlaceCategory =
  | 'restaurant' | 'cafe' | 'bar'
  | 'cinema' | 'theatre' | 'museum' | 'concert'
  | 'park' | 'outdoor'
  | 'hotel' | 'travel'
  | 'sport'
  | 'shopping' | 'supermarket'
  | 'university' | 'school'
  | 'unknown';

export const PLACE_EMOJIS: Record<PlaceCategory, string> = {
  restaurant:  '🍽️',
  cafe:        '☕',
  bar:         '🍻',
  cinema:      '🎬',
  theatre:     '🎭',
  museum:      '🏛️',
  concert:     '🎵',
  park:        '🌿',
  outdoor:     '🏞️',
  hotel:       '🏨',
  travel:      '✈️',
  sport:       '🏋️',
  shopping:    '🛍️',
  supermarket: '🛒',
  university:  '🎓',
  school:      '📚',
  unknown:     '📍',
};

export interface PlaceInfo {
  place_name: string;
  place_category: PlaceCategory;
  place_emoji: string;
  city: string;
}

// ---------- Types Nominatim ----------
// Ref: https://nominatim.org/release-docs/latest/api/Reverse/

interface NominatimResult {
  // Nom EXACT de l'établissement (ex: "Bouillon Chartier", "UGC Ciné Cité Les Halles")
  name?: string;
  // Clé OSM — ex: "amenity", "shop", "leisure", "tourism"
  class?: string;
  // Valeur OSM — ex: "restaurant", "cafe", "cinema", "supermarket"
  type?: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    country?: string;
  };
  error?: string;
}

// ---------- Catégorie depuis class + type OSM ----------

const getCategory = (cls: string, type: string): PlaceCategory => {
  if (cls === 'amenity') {
    if (['restaurant', 'fast_food', 'food_court', 'ice_cream', 'bbq'].includes(type)) return 'restaurant';
    if (['cafe', 'coffee'].includes(type))                                               return 'cafe';
    if (['bar', 'pub', 'biergarten', 'nightclub'].includes(type))                        return 'bar';
    if (type === 'cinema')                                                               return 'cinema';
    if (type === 'theatre')                                                              return 'theatre';
    if (['museum', 'arts_centre'].includes(type))                                        return 'museum';
    if (['concert_hall', 'music_venue'].includes(type))                                  return 'concert';
    if (['sports_centre', 'fitness_centre', 'gym'].includes(type))                       return 'sport';
    if (['university', 'college'].includes(type))                                        return 'university';
    if (type === 'school')                                                               return 'school';
  }
  if (cls === 'leisure') {
    if (['park', 'garden', 'nature_reserve'].includes(type))                             return 'park';
    if (['pitch', 'track', 'stadium', 'sports_hall', 'fitness_centre'].includes(type))  return 'sport';
    if (['beach_resort', 'picnic_table'].includes(type))                                 return 'outdoor';
  }
  if (cls === 'tourism') {
    if (['museum', 'gallery'].includes(type))                                            return 'museum';
    if (['hotel', 'motel', 'hostel', 'guest_house', 'apartment'].includes(type))        return 'hotel';
    if (['theme_park', 'attraction', 'zoo', 'aquarium'].includes(type))                 return 'travel';
  }
  if (cls === 'shop') {
    if (['supermarket', 'convenience', 'grocery', 'food'].includes(type))               return 'supermarket';
    return 'shopping';
  }
  if (cls === 'natural' || cls === 'boundary') return 'outdoor';

  return 'unknown';
};

// ---------- Ville ----------

const getCity = (addr: NominatimResult['address']): string =>
  addr.city || addr.town || addr.village || addr.municipality || addr.county || '';

// ---------- Overpass (fallback) ----------

interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

/**
 * Cherche un commerce/POI dans un rayon via Overpass API.
 * Utilisé quand Nominatim ne retourne qu'une rue/adresse.
 */
const searchNearbyPOI = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 30,
): Promise<{ name: string; cls: string; type: string } | null> => {
  try {
    const query = `[out:json];node(around:${radiusMeters},${latitude},${longitude})[amenity];out body 1;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'FriendTimeApp/1.0' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    // Filtrer les résultats intéressants (ignorer poubelles, parking vélo, etc.)
    const ignoredTypes = new Set([
      'waste_basket', 'bicycle_parking', 'bench', 'recycling',
      'drinking_water', 'post_box', 'telephone', 'toilets',
      'parking', 'parking_space', 'vending_machine',
    ]);

    const poi = elements.find(
      e => e.tags?.name && !ignoredTypes.has(e.tags.amenity)
    );

    if (!poi) return null;

    return {
      name: poi.tags.name,
      cls: 'amenity',
      type: poi.tags.amenity,
    };
  } catch (err) {
    console.warn('[placesService] Overpass fallback failed:', err);
    return null;
  }
};

// ---------- Nominatim ne renvoie pas de commerce ? ----------

const isGenericResult = (cls: string, type: string): boolean => {
  const genericClasses = new Set(['highway', 'place', 'boundary', 'landuse', 'building']);
  return genericClasses.has(cls);
};

// ---------- Export principal ----------

/**
 * Retourne les infos du lieu à partir des coordonnées GPS.
 *
 * 1. Nominatim (reverse geocoding rapide)
 * 2. Si le résultat est générique (rue, adresse…), Overpass en fallback
 *    pour chercher un commerce dans un rayon de 30m.
 */
export const getPlaceFromCoords = async (
  latitude: number,
  longitude: number,
): Promise<PlaceInfo> => {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':      'FriendTimeApp/1.0',
        'Accept-Language': 'fr,en',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result: NominatimResult = await response.json();
    if (result.error) throw new Error(result.error);

    let cls  = result.class ?? '';
    let type = result.type  ?? '';
    const addr = result.address;
    const city = getCity(addr);
    let placeName = result.name?.trim() || '';

    // Si Nominatim retourne un résultat générique, essayer Overpass
    if (!placeName || isGenericResult(cls, type)) {
      const poi = await searchNearbyPOI(latitude, longitude);
      if (poi) {
        placeName = poi.name;
        cls = poi.cls;
        type = poi.type;
      }
    }

    const category = getCategory(cls, type);
    const emoji    = PLACE_EMOJIS[category];

    // Fallback nom : rue + quartier, sinon ville
    if (!placeName) {
      placeName =
        [addr.road, addr.neighbourhood || addr.suburb].filter(Boolean).join(', ') ||
        city ||
        'Quelque part';
    }

    return {
      place_name:     placeName,
      place_category: category,
      place_emoji:    emoji,
      city,
    };
  } catch (err) {
    console.warn('[placesService] Lookup failed:', err);
    return {
      place_name:     'Lieu inconnu',
      place_category: 'unknown',
      place_emoji:    '📍',
      city:           '',
    };
  }
};
