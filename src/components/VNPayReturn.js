import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const VNPayReturn = () => {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaymentResult = async () => {
      const params = window.location.search;
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/orders/vnpay-return${params}`
        );
        if (res.data.success) {
          setStatus('success');
          setMessage(res.data.message || 'Payment successful!');
        } else {
          setStatus('failed');
          setMessage(res.data.message || 'Payment failed or cancelled.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage(
          err.response?.data?.message || 'Payment verification failed. Please contact support.'
        );
      }
    };
    fetchPaymentResult();
  }, []);

  return (
    <div className="vnpay-return-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>VNPay Payment Result</h1>
      {status === 'pending' && <p>Verifying payment, please wait...</p>}
      {status === 'success' && <p style={{ color: 'green' }}>{message}</p>}
      {status === 'failed' && <p style={{ color: 'red' }}>{message}</p>}
      <button onClick={() => navigate('/orders')} style={{ marginTop: '2rem' }}>
        Go to My Orders
      </button>
    </div>
  );
};

export default VNPayReturn; 