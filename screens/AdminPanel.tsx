import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, ShieldCheck, Smartphone, Globe, Heart, Users, Trash2, Plus, User as UserIcon, Clock, Mail, Search, X, ChevronRight, FileText, MapPin, Wifi, Calendar, Monitor, Activity, Bell, Send, Edit, RefreshCw, Camera, Image as ImageIcon, Copy, Filter, AlertTriangle, Check, CreditCard, DollarSign, Link, MessageSquare, Phone, Reply, LayoutGrid, ShieldAlert, Ban, Server, Laptop, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc, collection, getDocs, orderBy, query, addDoc, deleteDoc, updateDoc, onSnapshot, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { AppConfig, UserProfile, AppNotification, DonationMethod, SocialLink, UserFeedback, UserStatus } from '../types';

type AdminSection = 'identity' | 'notifications' | 'users' | 'feedback' | 'developer' | 'donation' | 'legal' | 'admins';

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { appConfig } = useSettings();
  const { user } = useAuth();
  
  const [config, setConfig] = useState<AppConfig>(appConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection | null>(null);

  // Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const methodLogoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMethodId, setUploadingMethodId] = useState<string | null>(null);
  const devProfileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDevProfile, setIsUploadingDevProfile] = useState(false);
  
  // Admin Management
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isUpdatingAdmins, setIsUpdatingAdmins] = useState(false);

  // User Management
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserIpDetails, setShowUserIpDetails] = useState(false);
  const [newStatus, setNewStatus] = useState<UserStatus>('active');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Custom Delete Confirm State
  const [confirmDeleteData, setConfirmDeleteData] = useState<{ type: 'user' | 'admin' | 'feedback' | 'notification', id: string, name?: string } | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<'all' | 'individual'>('all');
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Feedback
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);

  const CLOUD_NAME = "dkd5jmq2d";
  const UPLOAD_PRESET = "Ramadan Buddy"; 

  useEffect(() => {
    if (appConfig) setConfig(appConfig);
  }, [appConfig]);

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserFeedback));
        setFeedbacks(fb);
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("lastLogin", "desc"));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id,
            email: doc.data().email || 'No Email',
            displayName: doc.data().displayName || 'Anonymous'
        } as UserProfile));
        setUserList(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
  };

  const fetchNotifications = async () => {
      setLoadingNotifs(true);
      try {
          const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);
          setAllNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      } catch (e) {
          console.error("Error fetching notifs:", e);
      } finally {
          setLoadingNotifs(false);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "app_config", "main"), config);
      setMessage({ type: 'success', text: 'Saved successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save.' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers ---
  const handleInputChange = (section: keyof AppConfig | null, field: string, value: any) => {
    setConfig(prev => {
      if (section && typeof prev[section] === 'object' && !Array.isArray(prev[section])) {
        return { ...prev, [section]: { ...(prev[section] as object), [field]: value } };
      }
      return { ...prev, [field]: value };
    });
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET); 
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Upload failed');
    return data.secure_url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      handleInputChange(null, 'appLogo', url);
    } catch (e) { console.error(e); } 
    finally { setIsUploadingLogo(false); if(fileInputRef.current) fileInputRef.current.value=''; }
  };

  const handleDevProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDevProfile(true);
    try {
      const url = await uploadToCloudinary(file);
      handleInputChange('developer', 'image', url);
    } catch (error) { console.error(error); } 
    finally { setIsUploadingDevProfile(false); if (devProfileInputRef.current) devProfileInputRef.current.value = ''; }
  };

  const handleMethodLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingMethodId) return;
    try {
      const url = await uploadToCloudinary(file);
      handleMethodChange(uploadingMethodId, 'logoUrl', url);
    } catch (error) { console.error(error); } 
    finally { setUploadingMethodId(null); if(methodLogoInputRef.current) methodLogoInputRef.current.value = ''; }
  };

  // --- Array Logic ---
  const handleAddMethod = () => {
    const newMethod: DonationMethod = { id: Date.now().toString(), name: '', number: '', logoUrl: '' };
    setConfig(prev => ({ ...prev, donation: { ...prev.donation, methods: [...(prev.donation.methods || []), newMethod] } }));
  };
  const handleRemoveMethod = (id: string) => {
    setConfig(prev => ({ ...prev, donation: { ...prev.donation, methods: prev.donation.methods.filter(m => m.id !== id) } }));
  };
  const handleMethodChange = (id: string, field: keyof DonationMethod, value: string) => {
    setConfig(prev => ({ ...prev, donation: { ...prev.donation, methods: prev.donation.methods.map(m => m.id === id ? { ...m, [field]: value } : m) } }));
  };

  const handleAddSocialLink = () => {
    const newLink: SocialLink = { id: Date.now().toString(), label: '', url: '' };
    setConfig(prev => ({ ...prev, developer: { ...prev.developer, socialLinks: [...(prev.developer.socialLinks || []), newLink] } }));
  };
  const handleRemoveSocialLink = (id: string) => {
    setConfig(prev => ({ ...prev, developer: { ...prev.developer, socialLinks: prev.developer.socialLinks.filter(l => l.id !== id) } }));
  };
  const handleSocialLinkChange = (id: string, field: keyof SocialLink, value: string) => {
    setConfig(prev => ({ ...prev, developer: { ...prev.developer, socialLinks: prev.developer.socialLinks.map(l => l.id === id ? { ...l, [field]: value } : l) } }));
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) return;
    const email = newAdminEmail.trim();
    if (config.adminEmails.includes(email)) return;
    setIsUpdatingAdmins(true);
    try {
        await updateDoc(doc(db, "app_config", "main"), { adminEmails: arrayUnion(email) });
        setConfig(prev => ({ ...prev, adminEmails: [...prev.adminEmails, email] }));
        setNewAdminEmail('');
    } catch (e) { console.error(e); } finally { setIsUpdatingAdmins(false); }
  };

  // --- DELETE LOGIC WITH CUSTOM MODAL ---
  const initiateDelete = (type: 'user' | 'admin' | 'feedback' | 'notification', id: string, name?: string) => {
      setConfirmDeleteData({ type, id, name });
  };

  const executeDelete = async () => {
      if (!confirmDeleteData) return;
      setIsProcessingDelete(true);
      const { type, id } = confirmDeleteData;

      try {
          if (type === 'user') {
              await deleteDoc(doc(db, "users", id));
              setUserList(prev => prev.filter(u => u.uid !== id));
              if (selectedUser?.uid === id) setSelectedUser(null);
          } else if (type === 'admin') {
              await updateDoc(doc(db, "app_config", "main"), { adminEmails: arrayRemove(id) }); 
              setConfig(prev => ({ ...prev, adminEmails: prev.adminEmails.filter(e => e !== id) }));
          } else if (type === 'feedback') {
              await deleteDoc(doc(db, "feedback", id));
          } else if (type === 'notification') {
              await deleteDoc(doc(db, "notifications", id));
              setAllNotifications(prev => prev.filter(n => n.id !== id));
          }
          setMessage({ type: 'success', text: `${type.toUpperCase()} deleted successfully.` });
      } catch (error: any) {
          console.error("Delete failed:", error);
          setMessage({ type: 'error', text: `Failed to delete: ${error.message}` });
      } finally {
          setIsProcessingDelete(false);
          setConfirmDeleteData(null);
      }
  };

  const openUserModal = (user: UserProfile) => {
      setSelectedUser(user);
      setNewStatus(user.status || 'active');
      setStatusReason(user.statusReason || '');
      setShowUserIpDetails(false);
  };

  const handleUpdateStatus = async () => {
      if (!selectedUser) return;
      setIsUpdatingStatus(true);
      try {
          await updateDoc(doc(db, "users", selectedUser.uid), {
              status: newStatus,
              statusReason: newStatus === 'active' ? '' : statusReason
          });
          setUserList(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, status: newStatus, statusReason: newStatus === 'active' ? '' : statusReason } : u));
          setSelectedUser(prev => prev ? ({...prev, status: newStatus, statusReason: newStatus === 'active' ? '' : statusReason}) : null);
          setMessage({ type: 'success', text: 'Status updated.' });
      } catch (e) { console.error(e); setMessage({ type: 'error', text: 'Update failed.' }); } 
      finally { setIsUpdatingStatus(false); }
  };

  const handleSendNotification = async () => {
      if (!notifTitle.trim()) return;
      setIsSendingNotif(true);
      try {
          const payload = {
             title: notifTitle, body: notifBody, type: notifType,
             targetUserId: notifType === 'individual' ? targetUser?.uid : null,
             targetEmail: notifType === 'individual' ? targetUser?.email : null,
             createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, "notifications"), payload);
          setNotifTitle(''); setNotifBody('');
          fetchNotifications();
          setMessage({ type: 'success', text: 'Notification sent!' });
      } catch(e) { console.error(e); } finally { setIsSendingNotif(false); }
  };

  const handleReplyFeedback = async (fb: UserFeedback) => {
      const text = replyText[fb.id];
      if (!text) return;
      setSendingReplyId(fb.id);
      try {
          await updateDoc(doc(db, "feedback", fb.id), { reply: text, replyAt: new Date().toISOString(), read: true });
          if (fb.userId && fb.userId !== 'anonymous') {
              await addDoc(collection(db, "notifications"), {
                  title: "Reply to Feedback", body: `Admin: ${text}`, type: 'individual', targetUserId: fb.userId, createdAt: new Date().toISOString()
              });
          }
          setReplyText(prev => ({...prev, [fb.id]: ''}));
          setMessage({type:'success', text:'Replied!'});
      } catch(e){ console.error(e); } finally { setSendingReplyId(null); }
  };

  const filteredUsers = userList.filter(u => 
    (u.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const MenuCard = ({ id, icon: Icon, title, desc, count }: any) => (
      <button onClick={() => setActiveSection(id)} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3"><Icon size={20}/></div>
          <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500">{desc}</p>
          {count > 0 && <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] px-2 rounded-full">{count}</span>}
      </button>
  );

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-0 md:flex-1 bg-gray-50 dark:bg-gray-950 flex flex-col animate-in slide-in-from-right duration-300 md:animate-none">
      
      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeleteData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in zoom-in-95">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900 text-center">
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <Trash2 size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Delete {confirmDeleteData.type === 'admin' ? 'Admin' : confirmDeleteData.type === 'user' ? 'User' : 'Item'}?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                      Are you sure you want to delete <b>{confirmDeleteData.name || 'this item'}</b>? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setConfirmDeleteData(null)}
                          className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={executeDelete}
                          disabled={isProcessingDelete}
                          className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                          {isProcessingDelete ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="text-gray-600 dark:text-gray-300" size={20} />
          </button>
          <h1 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
             <ShieldCheck size={18} className="text-emerald-600" /> Admin
          </h1>
        </div>
        {!activeSection && (
             <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-700 disabled:opacity-50">
               {isSaving ? 'Saving...' : 'Save Changes'}
             </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
         {message && (
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-bold shadow-lg z-50 animate-in slide-in-from-top-5 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {message.text}
            </div>
         )}

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <MenuCard id="users" icon={Users} title="Users" desc="Manage Users" count={userList.length} />
             <MenuCard id="feedback" icon={MessageSquare} title="Feedback" desc="User Messages" count={feedbacks.filter(f=>!f.read).length} />
             <MenuCard id="notifications" icon={Bell} title="Notifications" desc="Send Alerts" />
             <MenuCard id="admins" icon={ShieldCheck} title="Admins" desc="Manage Access" />
             <MenuCard id="identity" icon={Smartphone} title="App Info" desc="Logo & Name" />
             <MenuCard id="developer" icon={Globe} title="Developer" desc="Profile & Social" />
             <MenuCard id="donation" icon={Heart} title="Donations" desc="Methods & Messages" />
             <MenuCard id="legal" icon={FileText} title="Legal" desc="Terms & Privacy" />
         </div>
      </div>

      {/* --- MODALS --- */}

      {/* USERS MODAL */}
      {activeSection === 'users' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              {selectedUser ? (
                  <div className="bg-white dark:bg-gray-900 w-full max-w-lg h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">
                      <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-950 rounded-t-2xl">
                          <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1 text-gray-500 font-bold text-sm"><ArrowLeft size={16} /> Back</button>
                          <h2 className="font-bold text-gray-800 dark:text-white">User Details</h2>
                          <div className="w-8"/>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          <div className="flex flex-col items-center">
                               <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-3 border-4 border-white dark:border-gray-700 shadow">
                                    {selectedUser.photoURL ? <img src={selectedUser.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="m-auto mt-5 text-gray-400" size={32} />}
                               </div>
                               <h3 className="text-xl font-bold text-gray-800 dark:text-white">{selectedUser.displayName}</h3>
                               <p className="text-sm text-gray-500">{selectedUser.email}</p>
                               <div className="mt-2 flex gap-2">
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedUser.status === 'disabled' ? 'bg-red-100 text-red-700' : selectedUser.status === 'suspended' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                       {selectedUser.status || 'Active'}
                                   </span>
                                   <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">{selectedUser.location || 'Unknown'}</span>
                               </div>
                          </div>

                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                              <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm">Action</h4>
                              <div className="flex gap-2 mb-3">
                                  {['active', 'suspended', 'disabled'].map((s) => (
                                      <button key={s} onClick={() => setNewStatus(s as UserStatus)} className={`flex-1 py-2 text-[10px] font-bold rounded border uppercase ${newStatus === s ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
                                          {s}
                                      </button>
                                  ))}
                              </div>
                              {newStatus !== 'active' && <textarea rows={2} placeholder="Reason..." value={statusReason} onChange={e=>setStatusReason(e.target.value)} className="w-full p-2 border rounded text-xs mb-3 dark:bg-gray-900 dark:text-white"/>}
                              <div className="flex gap-2">
                                  <button onClick={handleUpdateStatus} disabled={isUpdatingStatus} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-emerald-700">Update Status</button>
                                  <button 
                                    onClick={() => initiateDelete('user', selectedUser.uid, selectedUser.email || selectedUser.displayName || 'User')} 
                                    className="px-4 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                              </div>
                          </div>
                          
                          <div className="space-y-2 text-xs text-gray-500">
                              <p><b>UID:</b> {selectedUser.uid}</p>
                              <p><b>Joined:</b> {new Date(selectedUser.createdAt || '').toLocaleString()}</p>
                              <p><b>Last Login:</b> {new Date(selectedUser.lastLogin).toLocaleString()}</p>
                              <p><b>IP:</b> {selectedUser.ip}</p>
                              <p><b>User Agent:</b> {selectedUser.userAgent}</p>
                          </div>
                      </div>
                  </div>
              ) : (
                <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">
                    <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg dark:text-white">Users ({userList.length})</h2>
                        <button onClick={() => setActiveSection(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18} /></button>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-950">
                        <input type="text" placeholder="Search..." value={userSearchQuery} onChange={e=>setUserSearchQuery(e.target.value)} className="w-full p-2 rounded-lg border text-sm dark:bg-gray-800 dark:text-white"/>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredUsers.map(u => (
                            <div key={u.uid} onClick={() => openUserModal(u)} className="p-4 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden"><img src={u.photoURL || ''} className="w-full h-full object-cover" onError={(e:any)=>e.target.style.display='none'}/></div>
                                    <div>
                                        <p className="text-sm font-bold dark:text-white">{u.displayName}</p>
                                        <p className="text-[10px] text-gray-500">{u.email}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${u.status === 'active' || !u.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status || 'Active'}</span>
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>
      )}

      {/* FEEDBACK MODAL */}
      {activeSection === 'feedback' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg h-[85vh] rounded-2xl shadow-2xl flex flex-col border dark:border-gray-800">
                  <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                      <h2 className="font-bold text-lg dark:text-white">User Feedback</h2>
                      <button onClick={() => setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
                      {feedbacks.map(fb => (
                          <div key={fb.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h4 className="font-bold text-sm dark:text-white">{fb.name}</h4>
                                      <p className="text-[10px] text-gray-500">{fb.email}</p>
                                  </div>
                                  <button onClick={() => initiateDelete('feedback', fb.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-900 p-2 rounded">{fb.message}</p>
                              {fb.reply ? (
                                  <p className="text-xs text-emerald-600 font-bold pl-2 border-l-2 border-emerald-500">Replied: {fb.reply}</p>
                              ) : (
                                  <div className="flex gap-2">
                                      <input type="text" placeholder="Reply..." value={replyText[fb.id] || ''} onChange={e=>setReplyText({...replyText, [fb.id]: e.target.value})} className="flex-1 text-xs border rounded p-2 dark:bg-gray-900 dark:text-white"/>
                                      <button onClick={() => handleReplyFeedback(fb)} disabled={sendingReplyId === fb.id} className="bg-blue-600 text-white px-3 rounded text-xs font-bold">Reply</button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {activeSection === 'notifications' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg h-[85vh] rounded-2xl shadow-2xl flex flex-col border dark:border-gray-800">
                  <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                      <h2 className="font-bold text-lg dark:text-white">Notifications</h2>
                      <button onClick={() => setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="p-4 border-b dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-950">
                      <input type="text" placeholder="Title" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} className="w-full p-2 rounded border text-sm dark:bg-gray-800 dark:text-white"/>
                      <textarea placeholder="Body" value={notifBody} onChange={e=>setNotifBody(e.target.value)} className="w-full p-2 rounded border text-sm dark:bg-gray-800 dark:text-white"/>
                      <div className="flex gap-2">
                          <button onClick={()=>setNotifType('all')} className={`flex-1 py-1 text-xs font-bold rounded ${notifType==='all'?'bg-emerald-600 text-white':'bg-gray-200'}`}>All Users</button>
                          <button onClick={()=>setNotifType('individual')} className={`flex-1 py-1 text-xs font-bold rounded ${notifType==='individual'?'bg-emerald-600 text-white':'bg-gray-200'}`}>Individual</button>
                      </div>
                      {notifType === 'individual' && (
                          <select className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:text-white" onChange={e=>setTargetUser(userList.find(u=>u.uid===e.target.value)||null)}>
                              <option value="">Select User</option>
                              {userList.map(u=><option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>)}
                          </select>
                      )}
                      <button onClick={handleSendNotification} disabled={isSendingNotif} className="w-full bg-emerald-600 text-white py-2 rounded font-bold text-sm">Send</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {allNotifications.map(n => (
                          <div key={n.id} className="flex justify-between items-center p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                              <div>
                                  <p className="font-bold text-sm dark:text-white">{n.title}</p>
                                  <p className="text-xs text-gray-500">{n.body}</p>
                              </div>
                              <button onClick={() => initiateDelete('notification', n.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* ADMINS MODAL */}
      {activeSection === 'admins' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col border dark:border-gray-800">
                  <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                      <h2 className="font-bold text-lg dark:text-white">Manage Admins</h2>
                      <button onClick={() => setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex gap-2">
                          <input type="email" placeholder="New Admin Email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} className="flex-1 p-2 rounded border text-sm dark:bg-gray-800 dark:text-white"/>
                          <button onClick={handleAddAdmin} disabled={isUpdatingAdmins} className="bg-purple-600 text-white px-3 rounded text-sm font-bold">Add</button>
                      </div>
                      <div className="space-y-2">
                          {config.adminEmails.map(email => (
                              <div key={email} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
                                  <span className="text-sm dark:text-white">{email}</span>
                                  <button onClick={() => initiateDelete('admin', email, email)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* IDENTITY (App Info) */}
      {activeSection === 'identity' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 border dark:border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg dark:text-white">App Identity</h2>
                      <button onClick={()=>setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <input type="text" value={config.appName} onChange={e=>handleInputChange(null,'appName',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="App Name"/>
                      <div className="flex items-center gap-3">
                          <img src={config.appLogo} className="w-12 h-12 object-contain bg-gray-100 rounded"/>
                          <button onClick={()=>fileInputRef.current?.click()} className="text-xs bg-gray-200 px-3 py-2 rounded font-bold">Change Logo</button>
                          <input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload}/>
                      </div>
                      <input type="text" value={config.version} onChange={e=>handleInputChange(null,'version',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Version"/>
                      <button onClick={()=>{handleSave();setActiveSection(null)}} className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* DEVELOPER SECTION */}
      {activeSection === 'developer' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 border dark:border-gray-800 max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg dark:text-white">Developer Info</h2>
                      <button onClick={()=>setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div className="flex flex-col items-center mb-2">
                          <div onClick={() => devProfileInputRef.current?.click()} className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-2 cursor-pointer overflow-hidden border-2 border-gray-300 relative group">
                              {config.developer.image ? <img src={config.developer.image} className="w-full h-full object-cover"/> : <UserIcon className="m-auto mt-6 text-gray-400"/>}
                              <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center text-white"><Camera size={20}/></div>
                          </div>
                          <input type="file" ref={devProfileInputRef} hidden onChange={handleDevProfileUpload} />
                          <p className="text-[10px] text-gray-400">Tap to change photo</p>
                      </div>

                      <input type="text" value={config.developer.name} onChange={e=>handleInputChange('developer','name',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Name"/>
                      <textarea value={config.developer.mission} onChange={e=>handleInputChange('developer','mission',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Mission"/>
                      
                      <div className="flex gap-2">
                          <input type="text" value={config.developer.email} onChange={e=>handleInputChange('developer','email',e.target.value)} className="flex-1 p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Email"/>
                          <button onClick={()=>handleInputChange('developer','showEmail',!config.developer.showEmail)} className={`p-2 rounded border ${config.developer.showEmail ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{config.developer.showEmail ? <Check size={16}/> : <X size={16}/>}</button>
                      </div>

                      <div className="flex gap-2">
                          <input type="text" value={config.developer.website} onChange={e=>handleInputChange('developer','website',e.target.value)} className="flex-1 p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Website"/>
                          <button onClick={()=>handleInputChange('developer','showWebsite',!config.developer.showWebsite)} className={`p-2 rounded border ${config.developer.showWebsite ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{config.developer.showWebsite ? <Check size={16}/> : <X size={16}/>}</button>
                      </div>

                      <div className="border-t pt-4 dark:border-gray-800">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-gray-500">Social Links</span>
                              <button onClick={handleAddSocialLink} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">+ Add</button>
                          </div>
                          {(config.developer.socialLinks || []).map((link) => (
                              <div key={link.id} className="flex gap-2 mb-2">
                                  <input type="text" value={link.label} onChange={(e)=>handleSocialLinkChange(link.id, 'label', e.target.value)} placeholder="Label (e.g. FB)" className="w-1/3 p-2 text-xs border rounded dark:bg-gray-800 dark:text-white"/>
                                  <input type="text" value={link.url} onChange={(e)=>handleSocialLinkChange(link.id, 'url', e.target.value)} placeholder="URL" className="flex-1 p-2 text-xs border rounded dark:bg-gray-800 dark:text-white"/>
                                  <button onClick={()=>handleRemoveSocialLink(link.id)} className="text-red-500 p-1"><X size={16}/></button>
                              </div>
                          ))}
                      </div>

                      <button onClick={()=>{handleSave();setActiveSection(null)}} className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* DONATION SECTION (RESTORED) */}
      {activeSection === 'donation' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 border dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg dark:text-white">Donation Settings</h2>
                      <button onClick={()=>setActiveSection(null)}><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm font-bold dark:text-white">Enable Donations</span>
                          <button 
                            onClick={() => handleInputChange('donation', 'enabled', !config.donation.enabled)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${config.donation.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.donation.enabled ? 'translate-x-6' : ''}`} />
                          </button>
                      </div>

                      <input type="text" value={config.donation.title} onChange={e=>handleInputChange('donation','title',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Title"/>
                      <input type="text" value={config.donation.subtitle} onChange={e=>handleInputChange('donation','subtitle',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Subtitle"/>
                      <textarea value={config.donation.description} onChange={e=>handleInputChange('donation','description',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white" placeholder="Description" rows={3}/>

                      <div className="border-t pt-4 dark:border-gray-800">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-gray-500">Payment Methods</span>
                              <button onClick={handleAddMethod} className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded font-bold">+ Add</button>
                          </div>
                          {(config.donation.methods || []).map((method) => (
                              <div key={method.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-3 border border-gray-100 dark:border-gray-700 relative">
                                  <button onClick={()=>handleRemoveMethod(method.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><X size={14}/></button>
                                  <div className="flex gap-3 items-center mb-2">
                                      <div 
                                        onClick={() => { setUploadingMethodId(method.id); methodLogoInputRef.current?.click(); }}
                                        className="w-10 h-10 bg-white dark:bg-gray-700 rounded border flex items-center justify-center cursor-pointer overflow-hidden"
                                      >
                                          {method.logoUrl ? <img src={method.logoUrl} className="w-full h-full object-cover"/> : <Plus size={14} className="text-gray-400"/>}
                                      </div>
                                      <input type="text" value={method.name} onChange={(e)=>handleMethodChange(method.id, 'name', e.target.value)} className="flex-1 p-1 text-sm border-b bg-transparent outline-none dark:text-white" placeholder="Method Name (e.g. Bkash)"/>
                                  </div>
                                  <input type="text" value={method.number} onChange={(e)=>handleMethodChange(method.id, 'number', e.target.value)} className="w-full p-1 text-sm border-b bg-transparent outline-none font-mono dark:text-white" placeholder="Account Number"/>
                              </div>
                          ))}
                          <input type="file" ref={methodLogoInputRef} hidden onChange={handleMethodLogoUpload} />
                      </div>

                      <button onClick={()=>{handleSave();setActiveSection(null)}} className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* LEGAL SECTION (RESTORED) */}
      {activeSection === 'legal' && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 border dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg dark:text-white">Legal Information</h2>
                      <button onClick={()=>setActiveSection(null)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Privacy Policy URL</label>
                          <input type="text" value={config.legal.privacyPolicyUrl} onChange={e=>handleInputChange('legal','privacyPolicyUrl',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Privacy Policy Text</label>
                          <textarea rows={4} value={config.legal.privacyPolicyText} onChange={e=>handleInputChange('legal','privacyPolicyText',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                      </div>
                      <div className="border-t dark:border-gray-800 my-2"></div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Terms URL</label>
                          <input type="text" value={config.legal.termsUrl} onChange={e=>handleInputChange('legal','termsUrl',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Terms Text</label>
                          <textarea rows={4} value={config.legal.termsText} onChange={e=>handleInputChange('legal','termsText',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                      </div>
                      <div className="border-t dark:border-gray-800 my-2"></div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Copyright Text</label>
                          <input type="text" value={config.legal.copyrightText} onChange={e=>handleInputChange('legal','copyrightText',e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-800 dark:text-white"/>
                      </div>
                      
                      <button onClick={()=>{handleSave();setActiveSection(null)}} className="w-full bg-emerald-600 text-white py-2 rounded font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;