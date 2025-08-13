import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Clock, XCircle } from 'lucide-react';

export default function VNPayReturn() {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaymentResult = async () => {
      const params = window.location.search;
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/orders/vnpay-return${params}`
        );
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Thanh toán thành công!');
          setOrderId(data.data?.orderId || data.orderId || '');
          setAmount(data.data?.amount || data.amount || '');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Thanh toán thất bại hoặc bị hủy.');
          setOrderId(data.data?.orderId || data.orderId || '');
          setAmount(data.data?.amount || data.amount || '');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('Xác minh thanh toán thất bại. Vui lòng liên hệ hỗ trợ.');
      }
    };
    fetchPaymentResult();
  }, []);

  // Determine if payment is successful (including 'Order already paid')
  const isSuccess = status === 'success' || message === 'Order already paid';

  return (
    <div className="main-content" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <div className="payment-result-container" style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32, textAlign: 'center' }}>
        <div className="payment-result-icon" style={{ marginBottom: 16 }}>
          {isSuccess && <CheckCircle size={64} color="#22c55e" />}
          {!isSuccess && status === 'failed' && <XCircle size={64} color="#ef4444" />}
          {!isSuccess && status === 'pending' && <Clock size={64} color="#3b82f6" className="animate-pulse" />}
        </div>
        <h2 className="payment-result-title" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: isSuccess ? '#22c55e' : status === 'failed' ? '#ef4444' : '#3b82f6' }}>
          {isSuccess ? 'Payment Successful!' : status === 'failed' ? 'Payment Failed' : 'Verifying Payment...'}
        </h2>
        <p className="payment-result-message" style={{ color: '#64748b', marginBottom: 24 }}>
          {status === 'pending' && 'Please wait a moment...'}
          {isSuccess && (message === 'Order already paid' ? 'This order has already been paid.' : message)}
          {!isSuccess && status !== 'pending' && message !== 'Order already paid' && message}
        </p>

        <div className="payment-result-actions" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 500, cursor: 'pointer', fontSize: 16 }}
            onClick={() => navigate('/')}
          >
            <Home size={20} /> Back to Home
          </button>
          <button
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 6, border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontWeight: 500, cursor: 'pointer', fontSize: 16 }}
            onClick={() => navigate('/orders')}
          >
            <Clock size={20} /> View My Orders
          </button>
        </div>

        <div className="payment-result-info" style={{ textAlign: 'left', marginBottom: 20 }}>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#334155' }}>Transaction Information</h3>
            <p style={{ fontSize: 14, color: '#334155' }}>
              Total Amount: <span style={{ fontWeight: 500 }}>{amount ? `${Number(amount).toLocaleString('en-US')} VND` : '-'}</span>
            </p>
            <p style={{ fontSize: 14, color: '#334155' }}>
              Order ID: <span style={{ fontWeight: 500, color: '#2563eb' }}>{orderId || '-'}</span>
            </p>
          </div>
          <div style={{ background: isSuccess ? '#dcfce7' : status === 'failed' ? '#fee2e2' : '#f3f4f6', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#334155' }}>Notification</h3>
            <ul style={{ paddingLeft: 20, fontSize: 14, color: '#334155', margin: 0 }}>
              {isSuccess && <>
                <li>Your order has been confirmed and will be prepared soon.</li>
                <li>You can track the status in "Order History".</li>
                <li>An electronic invoice will be sent via email (if available).</li>
              </>}
              {!isSuccess && status === 'failed' && <>
                <li>Payment was unsuccessful or cancelled.</li>
                <li>Please try again or contact support.</li>
              </>}
              {!isSuccess && status === 'pending' && <>
                <li>Verifying payment...</li>
              </>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 