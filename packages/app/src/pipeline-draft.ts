import type { PipelineProvider, SearchCriteria } from '@leadsghr/schemas'

export type PipelineDraft = {
  name: string
  provider: PipelineProvider
  criteria: SearchCriteria
  reuse: { niches: boolean; states: boolean; locations: boolean }
}
