/**
 * @file cadastreUtils.js
 * @description Centralized GIS, Geodesic Distance, and Cadastral Map helpers for TitleLock.
 * Standardizes Haversine mathematics, coordinate transformations, and status color mappings across all viewports.
 */

/**
 * Computes great-circle geodesic distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 - Origin latitude in decimal degrees
 * @param {number} lon1 - Origin longitude in decimal degrees
 * @param {number} lat2 - Destination latitude in decimal degrees
 * @param {number} lon2 - Destination longitude in decimal degrees
 * @returns {number|null} Distance in kilometers, or null if coordinates are invalid
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers into human-readable user interface strings.
 * @param {number|null} distanceKm - Distance in kilometers
 * @returns {string} Formatted string (e.g. "450 meters away" or "12.40 km away")
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null) return 'Distance unavailable';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} meters away`;
  }
  return `${distanceKm.toFixed(2)} km away`;
}

/**
 * Computes the geographic centroid of a cadastral parcel polygon.
 * @param {Object} parcel - Property parcel object containing boundary [[lng, lat], ...]
 * @returns {{lat: number, lng: number}} Centroid coordinate object
 */
export function getParcelCentroid(parcel) {
  if (parcel?.boundary && parcel.boundary.length > 0) {
    const avgLat = parcel.boundary.reduce((sum, pt) => sum + pt[1], 0) / parcel.boundary.length;
    const avgLng = parcel.boundary.reduce((sum, pt) => sum + pt[0], 0) / parcel.boundary.length;
    return { lat: avgLat, lng: avgLng };
  }
  // Fallback to Greater Noida cadastre default datum
  return { lat: 28.46329, lng: 77.51478 };
}

/**
 * Resolves exact GIS stroke and fill color tokens according to land title legal status.
 * @param {Object} parcel - Parcel title record
 * @returns {{stroke: string, fill: string, dot: string, badgeBg: string, badgeText: string}} Theme tokens
 */
export function getParcelStatusColors(parcel) {
  if (!parcel) {
    return {
      stroke: '#10b981',
      fill: '#10b981',
      dot: 'bg-emerald-400',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-400'
    };
  }

  const isFrozen = Boolean(parcel.frozen) || parcel.titleStatus === 'FROZEN';
  const isDisputed = parcel.titleStatus === 'DISPUTED' || (parcel.disputes && parcel.disputes.length > 0);
  const isSuccessionPending = parcel.titleStatus === 'SUCCESSION_PENDING';
  const isReviewOrEncumbered =
    parcel.titleStatus === 'REVIEW' ||
    parcel.titleStatus === 'VERIFIED_WITH_ENCUMBRANCE' ||
    parcel.riskStatus === 'REVIEW';

  // Red - Frozen / High Risk
  if (isFrozen || parcel.statusVariant === 'danger') {
    return {
      stroke: '#ef4444',
      fill: '#ef4444',
      dot: 'bg-rose-500',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-400'
    };
  }

  // Orange - Active Legal Dispute
  if (isDisputed) {
    return {
      stroke: '#f97316',
      fill: '#f97316',
      dot: 'bg-orange-500',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400'
    };
  }

  // Purple / Violet - Succession Pending
  if (isSuccessionPending) {
    return {
      stroke: '#a855f7',
      fill: '#9333ea',
      dot: 'bg-purple-500',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-400'
    };
  }

  // Amber / Yellow - Under Review or Encumbered
  if (isReviewOrEncumbered || parcel.statusVariant === 'warning') {
    return {
      stroke: '#eab308',
      fill: '#eab308',
      dot: 'bg-amber-400',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-400'
    };
  }

  // Emerald Green - Verified / Clear Title
  return {
    stroke: '#10b981',
    fill: '#10b981',
    dot: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400'
  };
}
