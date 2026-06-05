interface ErrorStateProps {
  message: string;
  inline?: boolean;
  onRetry?: () => void;
}

function ErrorState({ message, inline, onRetry }: ErrorStateProps) {
  if (inline) {
    return (
      <div className="error-state error-state--inline">
        <span>{message}</span>
        {onRetry && (
          <button className="error-state__retry" onClick={onRetry}>点击重试</button>
        )}
      </div>
    );
  }
  return (
    <div className="error-state">
      <p className="error-state__icon">:(</p>
      <p>{message}</p>
      {onRetry && (
        <button className="error-state__retry" onClick={onRetry}>重试</button>
      )}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };
