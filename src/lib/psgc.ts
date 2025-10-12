// PSGC API utilities for Philippine locations
// Using the PSGC API: https://psgc.gitlab.io/api/

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

export interface Region {
  code: string;
  name: string;
  regionName: string;
}

export interface Province {
  code: string;
  name: string;
  regionCode: string;
}

export interface CityMunicipality {
  code: string;
  name: string;
  provinceCode: string;
}

export interface Barangay {
  code: string;
  name: string;
  cityCode: string;
}

// Fetch all regions
export async function fetchRegions(): Promise<Region[]> {
  try {
    const response = await fetch(`${PSGC_BASE_URL}/regions`);
    if (!response.ok) throw new Error('Failed to fetch regions');
    return await response.json();
  } catch (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
}

// Fetch provinces by region code
export async function fetchProvinces(regionCode: string): Promise<Province[]> {
  try {
    const response = await fetch(`${PSGC_BASE_URL}/regions/${regionCode}/provinces`);
    if (!response.ok) throw new Error('Failed to fetch provinces');
    return await response.json();
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
}

// Fetch cities/municipalities by province code
export async function fetchCitiesMunicipalities(provinceCode: string): Promise<CityMunicipality[]> {
  try {
    const response = await fetch(`${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities`);
    if (!response.ok) throw new Error('Failed to fetch cities/municipalities');
    return await response.json();
  } catch (error) {
    console.error('Error fetching cities/municipalities:', error);
    return [];
  }
}

// Fetch barangays by city/municipality code
export async function fetchBarangays(cityCode: string): Promise<Barangay[]> {
  try {
    const response = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${cityCode}/barangays`);
    if (!response.ok) throw new Error('Failed to fetch barangays');
    return await response.json();
  } catch (error) {
    console.error('Error fetching barangays:', error);
    return [];
  }
}
