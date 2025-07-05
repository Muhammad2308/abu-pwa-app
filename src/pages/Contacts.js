import React from 'react';
import toast from 'react-hot-toast';

const dummyContacts = [
  {
    id: 1,
    name: 'Amina Bello',
    status: 'Alumni, Class of 2012',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 2,
    name: 'John Okafor',
    status: 'Staff, Registry',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 3,
    name: 'Fatima Yusuf',
    status: 'Alumni, Class of 2018',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    id: 4,
    name: 'Chinedu Eze',
    status: 'Alumni, Class of 2015',
    avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
  },
  {
    id: 5,
    name: 'Maryam Sani',
    status: 'Alumni, Class of 2020',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    id: 6,
    name: 'Ahmed Musa',
    status: 'Staff, Bursary',
    avatar: 'https://randomuser.me/api/portraits/men/36.jpg',
  },
];

const handleInvite = (name) => {
  toast.success(`Invitation sent to ${name}!`);
};

const Contacts = () => {
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Contacts</h1>
      <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
        {dummyContacts.map((contact) => (
          <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="h-12 w-12 rounded-full object-cover border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{contact.name}</div>
              <div className="text-xs text-gray-500 truncate">{contact.status}</div>
            </div>
            <button
              onClick={() => handleInvite(contact.name)}
              className="ml-2 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700 transition"
            >
              Invite
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-gray-400 text-xs">Inspired by WhatsApp contacts UI</div>
    </div>
  );
};

export default Contacts; 