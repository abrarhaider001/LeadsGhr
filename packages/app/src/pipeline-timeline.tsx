const steps = ['Details', 'Niches', 'States', 'Locations', 'Crawl', 'Export'] as const

export function PipelineTimeline({ current, completed }: { current: number; completed?: number[] }) {
  return <ol className="la-pipeline-timeline" aria-label="Pipeline progress">{steps.map((label, index) => {
    const done = completed ? completed.includes(index) : index < current
    return <li key={label} className={index === current ? 'la-pipeline-timeline-current' : done ? 'la-pipeline-timeline-done' : ''} aria-current={index === current ? 'step' : undefined}>
      <span className="la-pipeline-step-mark" aria-hidden="true">{done ? '✓' : index + 1}</span><span>{label}</span>
    </li>
  })}</ol>
}
