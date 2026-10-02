import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CreditCard, Activity, XCircle } from 'lucide-react';

interface Booking {
  id: string;
  appointmentAt: string;
  amountPaise: number;
  status: string;
  centreTest: {
    centre: { name: string };
    test: { name: string };
  };
}

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBookings(); // refresh
    } catch (err) {
      console.error(err);
    }
  };

  const simulatePayment = async (bookingId: string) => {
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookingId })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Payment simulation failed');
      }
      
      alert('Payment simulated successfully! Webhook delivered. Refreshing bookings...');
      fetchBookings(); // refresh the UI to show CONFIRMED status
    } catch(err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>My Dashboard</h1>
          <p>Manage your upcoming diagnostic tests.</p>
        </div>
        <Link to="/book" className="btn btn-primary">
          <Calendar size={18} /> Book New Test
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Activity size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3>No bookings yet</h3>
          <p>You don't have any upcoming diagnostic tests scheduled.</p>
          <Link to="/book" className="btn btn-primary" style={{ marginTop: '1rem' }}>Get Started</Link>
        </div>
      ) : (
        <div className="grid">
          {bookings.map(b => (
            <div key={b.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                  ₹{(b.amountPaise / 100).toFixed(2)}
                </span>
              </div>
              
              <div>
                <h3 style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>{b.centreTest.test.name}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{b.centreTest.centre.name}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Calendar size={16} />
                {new Date(b.appointmentAt).toLocaleString()}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
                {b.status === 'PENDING' && (
                  <>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleCancel(b.id)}>
                      <XCircle size={16} /> Cancel
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => simulatePayment(b.id)}>
                      <CreditCard size={16} /> Pay
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
