import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Activity } from 'lucide-react';

interface Centre {
  id: string;
  name: string;
}

interface Test {
  id: string;
  name: string;
}

interface CentreTest {
  id: string;
  centreId: string;
  testId: string;
  pricePaise: number;
  isActive: boolean;
  centre: Centre;
  test: Test;
}

export default function BookTest() {
  const [centreTests, setCentreTests] = useState<CentreTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCentre, setSelectedCentre] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/centres'); 
      if (res.ok) {
        const data = await res.json();
        setCentreTests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentre || !selectedTest || !date || !time) {
      setError('Please fill in all fields');
      return;
    }

    setBooking(true);
    setError('');

    try {
      const appointmentAt = new Date(`${date}T${time}:00Z`).toISOString();
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          centreId: selectedCentre,
          testId: selectedTest,
          appointmentAt
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Booking failed');

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><div className="spinner"></div></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Book a Diagnostic Test</h1>
      
      <div className="glass-panel">
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleBook}>
          <div className="grid">
            <div className="form-group">
              <label className="form-label"><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }}/> Select Centre</label>
              <select className="form-input" value={selectedCentre} onChange={(e) => setSelectedCentre(e.target.value)}>
                <option value="">-- Choose a Centre --</option>
                {Array.from(new Set(centreTests.map(ct => ct.centre.id))).map(cid => {
                  const centre = centreTests.find(ct => ct.centre.id === cid)?.centre;
                  return <option key={cid} value={cid}>{centre?.name}</option>;
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label"><Activity size={14} style={{ display: 'inline', marginRight: '4px' }}/> Select Test</label>
              <select className="form-input" value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} disabled={!selectedCentre}>
                <option value="">-- Choose a Test --</option>
                {centreTests.filter(ct => ct.centre.id === selectedCentre).map(ct => (
                  <option key={ct.test.id} value={ct.test.id}>
                    {ct.test.name} - ₹{(ct.pricePaise / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Appointment Date</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="form-group">
              <label className="form-label">Time (UTC)</label>
              <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={booking}>
              {booking ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div> : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
