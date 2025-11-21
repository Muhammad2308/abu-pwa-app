import React, { useEffect, useState } from 'react';
import { FaUserPlus, FaGift, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { donationsAPI, formatNaira } from '../services/api';

const Contacts = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState(null);
  const [inviteStatus, setInviteStatus] = useState(null);

  // Contact Picker handler
  const handleContactInvite = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: false };
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          setInviteStatus(`Invite sent to ${contact.name ? contact.name : contact.tel ? contact.tel[0] : 'contact'}!`);
          setTimeout(() => setInviteStatus(null), 3000);
        }
      } catch (err) {
        setInviteStatus('Contact picking cancelled or failed.');
        setTimeout(() => setInviteStatus(null), 3000);
      }
    } else {
      setInviteStatus('Contact Picker API not supported on this device/browser.');
      setTimeout(() => setInviteStatus(null), 3000);
    }
  };

  // Fetch previous donations
  useEffect(() => {
    setDonationsLoading(true);
    donationsAPI.getHistory()
      .then(res => {
        setDonations(res.data.donations || []);
        setDonationsLoading(false);
      })
      .catch(() => {
        setDonationsError('Failed to load donations');
        setDonationsLoading(false);
      });
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8">
      {/* Invite from Contacts */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl shadow p-6 mb-4">
        <button
          onClick={handleContactInvite}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 transition mb-2"
        >
          <FaUserPlus className="text-xl" /> Invite from Phone Contacts
        </button>
        {inviteStatus && (
          <div className="mt-2 text-sm text-blue-900 bg-blue-100 rounded px-3 py-1 shadow-inner animate-pulse">{inviteStatus}</div>
        )}
        <div className="text-xs text-gray-500 mt-2">Invite your friends to support ABU!</div>
      </div>

      {/* Previous Donations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FaGift className="text-pink-500 text-2xl" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Your Previous Donations</h2>
        </div>
        {donationsLoading ? (
          <div className="text-center text-gray-400 py-8">Loading donations...</div>
        ) : donationsError ? (
          <div className="text-center text-red-500 py-8">{donationsError}</div>
        ) : donations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No donations yet. Start making a difference today!</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {donations.map((don, idx) => (
              <div key={don.id || idx} className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-2 border-t-4 border-blue-200 hover:border-blue-400 transition-all relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {don.project_title || 'Endowment Fund'}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{don.date ? new Date(don.date).toLocaleDateString() : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-700">{formatNaira(don.amount)}</span>
                  {don.status === 'success' ? (
                    <FaCheckCircle className="text-green-500 ml-2" title="Success" />
                  ) : (
                    <FaTimesCircle className="text-red-400 ml-2" title="Failed" />
                  )}
                </div>
                {don.message && (
                  <div className="bg-blue-50 text-blue-900 rounded-lg px-3 py-2 mt-2 text-xs shadow-inner">
                    {don.message}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-xs font-medium">{don.payment_method || 'Paystack'}</span>
                  {don.status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${don.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{don.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer/Extra */}
      <div className="mt-10 text-center text-xs text-gray-400">Inspired by WhatsApp contacts UI & ABU Endowment vision. <span className="text-blue-600 font-bold">#GiveBack</span></div>
    </div>
  );
};

export default Contacts; 