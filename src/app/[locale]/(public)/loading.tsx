export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full min-h-[60vh] md:min-h-[80vh] bg-zinc-200" />

      {/* Collections skeleton */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-zinc-200 rounded-lg mx-auto mb-4" />
            <div className="h-1 w-16 bg-zinc-200 rounded-full mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/5] bg-zinc-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Featured Products skeleton */}
      <div className="py-20 bg-[var(--color-ivory-100)]">
        <div className="container mx-auto px-6">
          <div className="hidden md:block">
            <div className="text-center mb-16">
              <div className="h-10 w-48 bg-zinc-200 rounded-lg mx-auto mb-4" />
              <div className="h-1 w-24 bg-zinc-200 rounded mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-[var(--color-ivory-200)]">
                  <div className="aspect-[4/3] w-full bg-zinc-200 rounded-md mb-4" />
                  <div className="h-5 w-3/4 bg-zinc-200 rounded mx-auto mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-200 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
