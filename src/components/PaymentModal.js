import React from 'react';

const PaymentModal = ({ open, onClose, onPay, amount, project }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="flex items-center gap-2 mb-4">
          <img src="https://flutterwave.com/images/logo-colored.svg" alt="Flutterwave" className="h-7" />
          <span className="text-lg font-bold text-primary-700">Flutterwave</span>
        </div>
        <h2 className="text-xl font-bold mb-2 text-primary-700">Complete Your Payment</h2>
        <p className="mb-4 text-gray-600 text-sm">Project: <span className="font-semibold">{project}</span></p>
        <form
          onSubmit={e => {
            e.preventDefault();
            onPay();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Card Number</label>
            <input
              type="text"
              maxLength={19}
              pattern="[0-9 ]*"
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              placeholder="1234 5678 9012 3456"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Expiry</label>
              <input
                type="text"
                maxLength={5}
                pattern="[0-9/]*"
                required
                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                placeholder="MM/YY"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">CVV</label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                required
                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
                placeholder="123"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 border-gray-300"
              placeholder="Name on card"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-yellow-400 text-primary-900 py-2 px-4 rounded-md hover:bg-yellow-500 transition font-semibold flex items-center justify-center gap-2"
          >
            <img src="https://flutterwave.com/images/logo-colored.svg" alt="Flutterwave" className="h-5" />
            Pay ₦{amount} with Flutterwave
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal; 