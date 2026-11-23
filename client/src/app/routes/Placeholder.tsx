/** Stand-in page for screens not built yet. Each is replaced by its own issue. */
export function Placeholder({ screen, title }: { screen: string; title: string }) {
  return (
    <section className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin">
      <p className="text-label-md font-label-md uppercase text-on-surface-variant">{screen}</p>
      <h1 className="text-headline-xl-mobile font-headline-xl-mobile md:text-headline-xl md:font-headline-xl">
        {title}
      </h1>
      <p className="mt-space-md text-body-lg text-on-surface-variant">
        This screen is coming soon.
      </p>
    </section>
  )
}
