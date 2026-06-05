interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
}

function RefreshButton({ onClick, loading }: RefreshButtonProps) {
  return (
    <button
      className="refresh-btn"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? '刷新中...' : '刷新'}
    </button>
  );
}

export { RefreshButton };
export type { RefreshButtonProps };
