function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner" />
      <p>正在加载热榜数据...</p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card-skeleton__row">
          <div className="card-skeleton__rank" />
          <div className="card-skeleton__text">
            <div className="card-skeleton__line card-skeleton__line--long" />
            <div className="card-skeleton__line card-skeleton__line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { LoadingState, CardSkeleton };
