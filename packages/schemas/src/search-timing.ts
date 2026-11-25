import { z } from 'zod'
import type { DesktopPreferences } from './index'

/*
 * Search timing (Settings → Preferences → Search → Search timing): how long Google searches wait between steps, so
 * Google is less likely to stop them (AGENTS.md, rule 5). Used by LeadsGhr Scraper (saved with each job when it is
 * sent) and by the Google Search business list in the app. The lower limits keep searches polite and cannot be set
 * lower; values outside the limits are clamped.
 */

export const SEARCH_SPEEDS = ['careful', 'normal', 'faster', 'custom'] as const
export type SearchSpeed = (typeof SEARCH_SPEEDS)[number]
export type SearchSpeedPreset = Exclude<SearchSpeed, 'custom'>

/** Allowed range of each setting: [lowest, highest]. */
export const SEARCH_TIMING_LIMITS = {
  listingPauseSec: [0.5, 10],
  scrollPauseSec: [1.5, 10],
  morePlacesPauseSec: [2, 15],
  scrollRounds: [3, 30],
  pagePauseMinSec: [3, 60],
  pagePauseMaxSec: [3, 60],
  pagesPerLocation: [1, 5],
  locationPauseSec: [30, 600],
  /** 0 turns the longer break off. */
  breakEvery: [0, 100],
  breakMinutes: [1, 60],
} as const

export const searchTimingSchema = z.object({
  /** Pause on each listing while the Scraper moves down the list one business at a time (jobs sent before this
   *  setting existed have none and use Normal's). */
  listingPauseSec: z
    .number()
    .min(SEARCH_TIMING_LIMITS.listingPauseSec[0])
    .max(SEARCH_TIMING_LIMITS.listingPauseSec[1])
    .default(1.2),
  scrollPauseSec: z.number().min(SEARCH_TIMING_LIMITS.scrollPauseSec[0]).max(SEARCH_TIMING_LIMITS.scrollPauseSec[1]),
  morePlacesPauseSec: z
    .number()
    .min(SEARCH_TIMING_LIMITS.morePlacesPauseSec[0])
    .max(SEARCH_TIMING_LIMITS.morePlacesPauseSec[1]),
  scrollRounds: z.number().int().min(SEARCH_TIMING_LIMITS.scrollRounds[0]).max(SEARCH_TIMING_LIMITS.scrollRounds[1]),
  pagePauseMinSec: z
    .number()
    .min(SEARCH_TIMING_LIMITS.pagePauseMinSec[0])
    .max(SEARCH_TIMING_LIMITS.pagePauseMinSec[1]),
  pagePauseMaxSec: z
    .number()
    .min(SEARCH_TIMING_LIMITS.pagePauseMaxSec[0])
    .max(SEARCH_TIMING_LIMITS.pagePauseMaxSec[1]),
  pagesPerLocation: z
    .number()
    .int()
    .min(SEARCH_TIMING_LIMITS.pagesPerLocation[0])
    .max(SEARCH_TIMING_LIMITS.pagesPerLocation[1]),
  locationPauseSec: z
    .number()
    .min(SEARCH_TIMING_LIMITS.locationPauseSec[0])
    .max(SEARCH_TIMING_LIMITS.locationPauseSec[1]),
  breakEvery: z.number().int().min(SEARCH_TIMING_LIMITS.breakEvery[0]).max(SEARCH_TIMING_LIMITS.breakEvery[1]),
  breakMinutes: z.number().min(SEARCH_TIMING_LIMITS.breakMinutes[0]).max(SEARCH_TIMING_LIMITS.breakMinutes[1]),
})
export type SearchTiming = z.infer<typeof searchTimingSchema>

/** The presets offered under Speed. Normal keeps the pauses LeadsGhr used before these settings existed. */
export const SEARCH_TIMING_PRESETS: Record<SearchSpeedPreset, SearchTiming> = {
  careful: {
    listingPauseSec: 2.5,
    scrollPauseSec: 3.5,
    morePlacesPauseSec: 4,
    scrollRounds: 12,
    pagePauseMinSec: 8,
    pagePauseMaxSec: 14,
    pagesPerLocation: 5,
    locationPauseSec: 120,
    breakEvery: 5,
    breakMinutes: 10,
  },
  normal: {
    listingPauseSec: 1.2,
    scrollPauseSec: 2.2,
    morePlacesPauseSec: 3,
    scrollRounds: 12,
    pagePauseMinSec: 4,
    pagePauseMaxSec: 7,
    pagesPerLocation: 5,
    locationPauseSec: 45,
    breakEvery: 10,
    breakMinutes: 5,
  },
  faster: {
    listingPauseSec: 0.8,
    scrollPauseSec: 1.5,
    morePlacesPauseSec: 2,
    scrollRounds: 8,
    pagePauseMinSec: 3,
    pagePauseMaxSec: 5,
    pagesPerLocation: 5,
    locationPauseSec: 30,
    breakEvery: 20,
    breakMinutes: 3,
  },
}

/** The preference that holds each timing setting. */
export const SEARCH_TIMING_PREFERENCES = {
  listingPauseSec: 'searchListingPauseSec',
  scrollPauseSec: 'searchScrollPauseSec',
  morePlacesPauseSec: 'searchMorePlacesPauseSec',
  scrollRounds: 'searchScrollRounds',
  pagePauseMinSec: 'searchPagePauseMinSec',
  pagePauseMaxSec: 'searchPagePauseMaxSec',
  pagesPerLocation: 'searchPagesPerLocation',
  locationPauseSec: 'searchLocationPauseSec',
  breakEvery: 'searchBreakEvery',
  breakMinutes: 'searchBreakMinutes',
} as const satisfies Record<keyof SearchTiming, string>

const clamp = (value: number, [low, high]: readonly [number, number]) =>
  Math.min(high, Math.max(low, Number.isFinite(value) ? value : low))

/** Keeps every value inside its limits, with the longest page pause never below the shortest. */
export function clampSearchTiming(timing: SearchTiming): SearchTiming {
  const next = { ...timing }
  for (const key of Object.keys(SEARCH_TIMING_LIMITS) as (keyof SearchTiming)[])
    next[key] = clamp(next[key], SEARCH_TIMING_LIMITS[key])
  for (const key of ['scrollRounds', 'pagesPerLocation', 'breakEvery'] as const) next[key] = Math.round(next[key])
  if (next.pagePauseMaxSec < next.pagePauseMinSec) next.pagePauseMaxSec = next.pagePauseMinSec
  return next
}

/** The timing chosen in Preferences (clamped to the limits). */
export function searchTimingFrom(preferences: DesktopPreferences): SearchTiming {
  const timing = {} as SearchTiming
  for (const [key, preference] of Object.entries(SEARCH_TIMING_PREFERENCES) as [keyof SearchTiming, keyof DesktopPreferences][])
    timing[key] = preferences[preference] as number
  return clampSearchTiming(timing)
}

/** The preferences to change when a preset is picked. */
export function searchTimingPreferences(timing: SearchTiming): Partial<DesktopPreferences> {
  const next: Partial<Record<keyof DesktopPreferences, number>> = {}
  for (const [key, preference] of Object.entries(SEARCH_TIMING_PREFERENCES) as [keyof SearchTiming, keyof DesktopPreferences][])
    next[preference] = timing[key]
  return next as Partial<DesktopPreferences>
}

/** The preset whose values match exactly, or `custom`. */
export function matchingSearchSpeed(timing: SearchTiming): SearchSpeed {
  const same = (preset: SearchTiming) =>
    (Object.keys(preset) as (keyof SearchTiming)[]).every((key) => Math.abs(preset[key] - timing[key]) < 1e-9)
  return (Object.keys(SEARCH_TIMING_PRESETS) as SearchSpeedPreset[]).find((name) => same(SEARCH_TIMING_PRESETS[name])) ?? 'custom'
}

/** A random page pause in milliseconds between the shortest and the longest. */
export const pagePauseMs = (timing: SearchTiming) =>
  Math.round((timing.pagePauseMinSec + Math.random() * (timing.pagePauseMaxSec - timing.pagePauseMinSec)) * 1000)

/** Rough minutes one location takes at this timing (pauses only; for the preset cards). */
export function minutesPerLocation(timing: SearchTiming): number {
  const pages = timing.pagesPerLocation
  // About 20 businesses a page, each with its pause, and a few loads of more results.
  const listings = pages * 20 * timing.listingPauseSec
  const scrolling = pages * Math.min(timing.scrollRounds, 3) * timing.scrollPauseSec + listings
  const paging = (pages - 1) * ((timing.pagePauseMinSec + timing.pagePauseMaxSec) / 2)
  const breaks = timing.breakEvery ? (timing.breakMinutes * 60) / timing.breakEvery : 0
  return (timing.locationPauseSec + scrolling + paging + breaks) / 60
}
