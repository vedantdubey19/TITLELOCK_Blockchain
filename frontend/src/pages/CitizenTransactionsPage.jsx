import { Link } from 'react-router-dom';
import { SaleRequestsPanel } from '../components/SaleRequestsPanel';

export function CitizenTransactionsPage() {
  return <div className="space-y-4">
    <Link to="/citizen/notifications" className="underline">Sale notifications</Link>
    <SaleRequestsPanel readOnly />
  </div>;
}
export default CitizenTransactionsPage;
