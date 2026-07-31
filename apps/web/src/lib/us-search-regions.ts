export const US_SEARCH_REGIONS = {
  east: {
    label: "East Coast",
    broadLocation: "Northeastern United States",
    states: ["Connecticut", "Delaware", "Maine", "Maryland", "Massachusetts", "New Hampshire", "New Jersey", "New York", "Pennsylvania", "Rhode Island", "Vermont"],
  },
  north: {
    label: "Northern",
    broadLocation: "Northern United States",
    states: ["Illinois", "Indiana", "Iowa", "Kansas", "Michigan", "Minnesota", "Missouri", "Nebraska", "North Dakota", "Ohio", "South Dakota", "Wisconsin"],
  },
  south: {
    label: "Southern",
    broadLocation: "Southern United States",
    states: ["Alabama", "Arkansas", "Florida", "Georgia", "Kentucky", "Louisiana", "Mississippi", "North Carolina", "Oklahoma", "South Carolina", "Tennessee", "Texas", "Virginia", "West Virginia"],
  },
  west: {
    label: "West Coast & West",
    broadLocation: "Western United States",
    states: ["Alaska", "Arizona", "California", "Colorado", "Hawaii", "Idaho", "Montana", "Nevada", "New Mexico", "Oregon", "Utah", "Washington", "Wyoming"],
  },
} as const;

export type UsSearchRegionId = keyof typeof US_SEARCH_REGIONS;

export const US_SEARCH_REGION_IDS = Object.keys(US_SEARCH_REGIONS) as UsSearchRegionId[];
export const ALL_US_STATES = US_SEARCH_REGION_IDS.flatMap((id) => US_SEARCH_REGIONS[id].states).sort();

export function locationForScope(regionId: UsSearchRegionId, state: string): string {
  const region = US_SEARCH_REGIONS[regionId];
  return state && region.states.some((candidate) => candidate === state)
    ? `${state}, United States`
    : region.broadLocation;
}
