import { Link } from 'react-router-dom';
import { useConfigContext } from '../context/ConfigContext';
import { ConfigForm } from '../components/ConfigForm';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

function ConfigPage() {
  const { loading, error } = useConfigContext();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="config-page">
      <Link to="/" className="back-link">← 返回首页</Link>
      <ConfigForm />
    </div>
  );
}

export { ConfigPage };
