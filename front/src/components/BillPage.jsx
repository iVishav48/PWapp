import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { idbPut, idbGetAll } from '../utils/idb';
import { CheckCircle, X, Download, Printer } from 'lucide-react';

const BillPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bill, setBill] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    // Get bill from location state or IndexedDB
    if (location.state?.bill) {
      setBill(location.state.bill);
      setIsPaid(location.state.bill.paymentStatus === 'paid');
      // Store in IndexedDB
      idbPut('bills', location.state.bill);
    } else {
      // Try to load from IndexedDB if available
      loadBillFromStorage();
    }
  }, [location]);

  const loadBillFromStorage = async () => {
    try {
      const storedBills = await idbGetAll('bills');
      if (storedBills && storedBills.length > 0) {
        // Get the most recent pending bill
        const pendingBill = storedBills
          .filter(b => b.paymentStatus === 'pending' || !b.paymentStatus)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
        if (pendingBill) {
          setBill(pendingBill);
          setIsPaid(pendingBill.paymentStatus === 'paid');
        }
      }
    } catch (error) {
      console.error('Error loading bill:', error);
    }
  };

  const handlePayNow = async () => {
    setIsPaying(true);
    // Simulate payment processing
    setTimeout(async () => {
      const updatedBill = {
        ...bill,
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
      };
      setBill(updatedBill);
      setIsPaid(true);
      setIsPaying(false);
      // Update in IndexedDB
      await idbPut('bills', updatedBill);
      // Update order status on server if online
      if (navigator.onLine && bill.orderId) {
        try {
          const token = localStorage.getItem('token');
          await fetch(`/api/orders/${bill.orderId}/payment`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'paid',
            }),
          });
        } catch (error) {
          console.error('Error updating payment status:', error);
        }
      }
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const billContent = generateBillText();
    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-${bill.orderNumber || bill.orderId || 'pending'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateBillText = () => {
    if (!bill) return '';
    return `
═══════════════════════════════════════
           INVOICE / BILL
═══════════════════════════════════════

Order Number: ${bill.orderNumber || bill.orderId || 'PENDING'}
Date: ${new Date(bill.createdAt).toLocaleDateString()}
Status: ${bill.paymentStatus?.toUpperCase() || 'PENDING'}

───────────────────────────────────────
CUSTOMER INFORMATION
───────────────────────────────────────
Name: ${bill.shippingAddress?.fullName || bill.customer?.name || 'N/A'}
Email: ${bill.customer?.email || 'N/A'}
Phone: ${bill.shippingAddress?.phone || bill.customer?.phone || 'N/A'}
Address: ${bill.shippingAddress?.address || 'N/A'}
City: ${bill.shippingAddress?.city || 'N/A'}
ZIP: ${bill.shippingAddress?.zipCode || 'N/A'}

───────────────────────────────────────
ORDER ITEMS
───────────────────────────────────────
${bill.items?.map((item, idx) => 
  `${idx + 1}. ${item.name || item.product?.name || 'Product'}
   Quantity: ${item.quantity}
   Price: $${item.price?.toFixed(2) || '0.00'}
   Subtotal: $${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`
).join('\n\n') || 'No items'}

───────────────────────────────────────
BILL SUMMARY
───────────────────────────────────────
Subtotal:                    $${(bill.subtotal || 0).toFixed(2)}
Tax:                         $${(bill.tax || 0).toFixed(2)}
Shipping:                    $${(bill.shippingCost || 0).toFixed(2)}
Discount:                    -$${(bill.discount || 0).toFixed(2)}
───────────────────────────────────────
TOTAL BILL:                  $${(bill.total || 0).toFixed(2)}
───────────────────────────────────────

Payment Status: ${bill.paymentStatus?.toUpperCase() || 'PENDING'}
${bill.paidAt ? `Paid At: ${new Date(bill.paidAt).toLocaleString()}` : ''}
${bill.expectedDeliveryDate ? `Expected Delivery: ${new Date(bill.expectedDeliveryDate).toLocaleDateString()}` : ''}

═══════════════════════════════════════
Thank you for your purchase!
═══════════════════════════════════════
`;
  };

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
            <p className="text-gray-600">No bill found</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 print:mb-6">
            <div>
              <h1 className="text-3xl font-display font-light text-gray-900 mb-2">Invoice / Bill</h1>
              <p className="text-sm text-gray-500">Order #{bill.orderNumber || bill.orderId || 'PENDING'}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Print"
              >
                <Printer size={20} />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            {isPaid ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                <CheckCircle size={18} />
                <span className="font-medium">Paid</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                <X size={18} />
                <span className="font-medium">Pending Payment</span>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-lg font-light text-gray-900 mb-4">Bill To</h2>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{bill.shippingAddress?.fullName || bill.customer?.name || 'N/A'}</p>
                <p>{bill.shippingAddress?.address || 'N/A'}</p>
                <p>{bill.shippingAddress?.city || 'N/A'}, {bill.shippingAddress?.zipCode || ''}</p>
                <p>{bill.customer?.email || 'N/A'}</p>
                <p>{bill.shippingAddress?.phone || bill.customer?.phone || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-light text-gray-900 mb-4">Order Details</h2>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium text-gray-900">Date:</span> {new Date(bill.createdAt).toLocaleDateString()}</p>
                <p><span className="font-medium text-gray-900">Order #:</span> {bill.orderNumber || bill.orderId || 'PENDING'}</p>
                {bill.expectedDeliveryDate && (
                  <p><span className="font-medium text-gray-900">Expected Delivery:</span> {new Date(bill.expectedDeliveryDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-8">
            <h2 className="text-lg font-light text-gray-900 mb-4">Order Items</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bill.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="font-light text-gray-900">{item.name || item.product?.name || 'Product'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.quantity || 1}</td>
                      <td className="px-4 py-3 text-right text-gray-600">${(item.price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-light text-gray-900">
                        ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill Summary */}
          <div className="border-t border-gray-200 pt-6">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${(bill.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${(bill.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>${(bill.shippingCost || 0).toFixed(2)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${(bill.discount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-light text-gray-900 pt-3 border-t border-gray-200">
                <span>Total Bill</span>
                <span>${(bill.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          {!isPaid && (
            <div className="mt-8 pt-6 border-t border-gray-200 print:hidden">
              <button
                onClick={handlePayNow}
                disabled={isPaying}
                className="w-full px-6 py-4 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaying ? 'Processing Payment...' : 'Pay Now'}
              </button>
            </div>
          )}

          {isPaid && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="mx-auto mb-2 text-green-600" size={32} />
                <p className="text-green-800 font-medium">Payment Successful!</p>
                {bill.paidAt && (
                  <p className="text-sm text-green-600 mt-1">
                    Paid on {new Date(bill.paidAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4 print:hidden">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </button>
          {!isPaid && (
            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All Orders
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillPage;
