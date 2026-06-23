import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { serviceApi, activityApi, Service, Activity, CreateServiceRequest, CreateActivityRequest } from '../api';
import AppDatePicker from '../components/AppDatePicker';
import BackgroundPicker from './BackgroundPicker';
import { MdEvent, MdAdd, MdEdit, MdDelete, MdPerson, MdClose, MdWarning, MdWallpaper, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import './ServiceManager.css';

const SERVICE_BG_KEY = 'service-bg-overrides';
const ACTIVITY_BG_KEY = 'activity-bg-overrides';

const ServiceManager: React.FC = () => {
  const location = useLocation();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

  const [serviceBgOverrides, setServiceBgOverrides] = useState<Record<string, string | null>>(() => {
    try {
      return JSON.parse(localStorage.getItem(SERVICE_BG_KEY) || '{}');
    } catch { return {}; }
  });
  const [activityBgOverrides, setActivityBgOverrides] = useState<Record<string, string | null>>(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVITY_BG_KEY) || '{}');
    } catch { return {}; }
  });
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [pendingBgCallback, setPendingBgCallback] = useState<((bg: string | null) => void) | null>(null);
  const [pendingBgInitial, setPendingBgInitial] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
    if (location.state?.openModal === 'new-service') {
      setShowServiceModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedService) {
      loadActivities(selectedService.id);
    }
  }, [selectedService]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await serviceApi.getAll();
      setServices(data);
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0]);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (serviceId: string) => {
    try {
      const data = await activityApi.getByService(serviceId);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const getTotalDuration = () => {
    return activities.reduce((sum, activity) => sum + activity.duration_minutes, 0);
  };

  const handleDeleteActivity = async () => {
    if (!deletingActivity) return;
    try {
      await activityApi.delete(deletingActivity.id);
      setDeletingActivity(null);
      if (selectedService) loadActivities(selectedService.id);
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setShowActivityModal(true);
  };

  const handleOpenEditService = (service: Service) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const moveService = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= services.length) return;
    const reordered = [...services];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setServices(reordered);
  };

  const moveActivity = async (index: number, direction: 'up' | 'down') => {
    if (!selectedService) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;
    const reordered = [...activities];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setActivities(reordered);
    try {
      await activityApi.reorder(selectedService.id, reordered.map(a => a.id));
    } catch (err) {
      console.error('Failed to reorder activities:', err);
      loadActivities(selectedService.id);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!window.confirm(`Delete service "${service.title}"? This will also delete all its activities.`)) return;
    try {
      await serviceApi.delete(service.id);
      if (selectedService?.id === service.id) {
        setSelectedService(null);
      }
      loadServices();
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleServiceModalSave = () => {
    loadServices();
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleAddActivity = () => {
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  const handleActivityModalSave = () => {
    if (selectedService) loadActivities(selectedService.id);
    setShowActivityModal(false);
    setEditingActivity(null);
  };

  return (
    <div className="service-manager">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdEvent size={28} color="#3b82f6" /> Service Manager
          </h1>
          <p>Plan and organize your worship services</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowServiceModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <MdAdd size={20} /> New Service
        </button>
      </header>

      <div className="service-layout">
        {/* Service List */}
          <div className="service-list">
          <h3>Services</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : services.length === 0 ? (
            <div className="empty-state">
              <p>No services yet. Create your first service!</p>
            </div>
          ) : (
            <div className="service-items">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className={`service-item ${selectedService?.id === service.id ? 'active' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', service.id);
                    e.currentTarget.classList.add('dragging');
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('dragging');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    e.currentTarget.classList.toggle('drag-over-top', e.clientY < mid);
                    e.currentTarget.classList.toggle('drag-over-bottom', e.clientY >= mid);
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId === service.id) return;
                    const reordered = [...services];
                    const fromIdx = reordered.findIndex(s => s.id === draggedId);
                    const toIdx = reordered.indexOf(service);
                    if (fromIdx === -1) return;
                    const [moved] = reordered.splice(fromIdx, 1);
                    reordered.splice(toIdx, 0, moved);
                    setServices(reordered);
                  }}
                >
                  <div className="service-item-row" onClick={() => setSelectedService(service)}>
                    <span className="drag-handle" title="Drag to reorder">⠿</span>
                    <div className="service-item-info">
                      <div className="service-date">{service.date}</div>
                      <div className="service-title">{service.title}</div>
                      {service.theme && <div className="service-theme">{service.theme}</div>}
                    </div>
                  </div>
                  <div className="service-item-actions">
                    <button className="service-action-btn" title="Move up" onClick={(e) => { e.stopPropagation(); moveService(index, 'up'); }} disabled={index === 0}>
                      <MdArrowUpward size={14} />
                    </button>
                    <button className="service-action-btn" title="Move down" onClick={(e) => { e.stopPropagation(); moveService(index, 'down'); }} disabled={index === services.length - 1}>
                      <MdArrowDownward size={14} />
                    </button>
                    <button className="service-action-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleOpenEditService(service); }}>
                      <MdEdit size={14} />
                    </button>
                    <button className="service-action-btn" title="Set Background" onClick={(e) => {
                      e.stopPropagation();
                      setPendingBgCallback(() => (bg: string | null) => {
                        const updated = { ...serviceBgOverrides, [service.id]: bg };
                        setServiceBgOverrides(updated);
                        localStorage.setItem(SERVICE_BG_KEY, JSON.stringify(updated));
                      });
                      setPendingBgInitial(serviceBgOverrides[service.id] ?? null);
                      setShowBgPicker(true);
                    }}>
                      <MdWallpaper size={14} />
                    </button>
                    <button className="service-action-btn btn-danger-outline" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteService(service); }}>
                      <MdDelete size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="activity-panel">
          {selectedService ? (
            <>
              <div className="panel-header">
                <div>
                  <h3>{selectedService.title}</h3>
                  <p className="service-info">
                    {selectedService.date} • Total: {getTotalDuration()} minutes
                  </p>
                </div>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleAddActivity}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <MdAdd size={16} /> Add Activity
                </button>
              </div>

              {activities.length === 0 ? (
                <div className="empty-state">
                  <p>No activities yet. Add activities to this service!</p>
                </div>
              ) : (
                <div className="activity-timeline">
                  {activities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className="activity-card"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', activity.id);
                        e.currentTarget.classList.add('dragging');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('dragging');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const mid = rect.top + rect.height / 2;
                        e.currentTarget.classList.toggle('drag-over-top', e.clientY < mid);
                        e.currentTarget.classList.toggle('drag-over-bottom', e.clientY >= mid);
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                        const draggedId = e.dataTransfer.getData('text/plain');
                        if (draggedId === activity.id || !selectedService) return;
                        const reordered = [...activities];
                        const fromIdx = reordered.findIndex(a => a.id === draggedId);
                        const toIdx = index;
                        if (fromIdx === -1) return;
                        const [moved] = reordered.splice(fromIdx, 1);
                        reordered.splice(toIdx, 0, moved);
                        setActivities(reordered);
                        try {
                          await activityApi.reorder(selectedService.id, reordered.map(a => a.id));
                        } catch (err) {
                          console.error('Failed to reorder activities:', err);
                          loadActivities(selectedService.id);
                        }
                      }}
                    >
                      <div className="activity-card-main">
                        <span className="drag-handle" title="Drag to reorder">⠿</span>
                        <div className="activity-number">{index + 1}</div>
                        <div className="activity-content">
                          <div className="activity-header">
                            <h4>{activity.name}</h4>
                            <span className="activity-duration">
                              {activity.duration_minutes} min
                            </span>
                          </div>
                          {activity.leader && (
                            <div className="activity-leader" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MdPerson size={14} /> {activity.leader}
                            </div>
                          )}
                          {activity.notes && (
                            <div className="activity-notes">{activity.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="activity-card-actions">
                        <button className="btn-icon" title="Move up" onClick={() => moveActivity(index, 'up')} disabled={index === 0}>
                          <MdArrowUpward size={14} />
                        </button>
                        <button className="btn-icon" title="Move down" onClick={() => moveActivity(index, 'down')} disabled={index === activities.length - 1}>
                          <MdArrowDownward size={14} />
                        </button>
                        <button className="btn-icon" title="Set Background" onClick={() => {
                          setPendingBgCallback(() => (bg: string | null) => {
                            const updated = { ...activityBgOverrides, [activity.id]: bg };
                            setActivityBgOverrides(updated);
                            localStorage.setItem(ACTIVITY_BG_KEY, JSON.stringify(updated));
                          });
                          setPendingBgInitial(activityBgOverrides[activity.id] ?? null);
                          setShowBgPicker(true);
                        }}>
                          <MdWallpaper size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => handleEditActivity(activity)}>
                          <MdEdit size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => setDeletingActivity(activity)}>
                          <MdDelete size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Select a service to view activities</p>
            </div>
          )}
        </div>
      </div>

      {showServiceModal && (
        <ServiceModal
          editService={editingService}
          onClose={() => { setShowServiceModal(false); setEditingService(null); }}
          onSave={handleServiceModalSave}
        />
      )}

      {showActivityModal && selectedService && (
        <ActivityModal
          serviceId={selectedService.id}
          editActivity={editingActivity}
          onClose={() => { setShowActivityModal(false); setEditingActivity(null); }}
          onSave={handleActivityModalSave}
        />
      )}

      {deletingActivity && (
        <div className="modal-overlay" onClick={() => setDeletingActivity(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <MdWarning size={32} color="#f59e0b" />
            </div>
            <h2>Delete Activity</h2>
            <p>Are you sure you want to delete <strong>{deletingActivity.name}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setDeletingActivity(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleDeleteActivity}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBgPicker && (
        <BackgroundPicker
          currentBackground={pendingBgInitial ?? null}
          onApply={(bg) => {
            if (pendingBgCallback) {
              pendingBgCallback(bg);
              setPendingBgCallback(null);
              setPendingBgInitial(null);
            }
            setShowBgPicker(false);
          }}
          onClose={() => {
            setPendingBgCallback(null);
            setPendingBgInitial(null);
            setShowBgPicker(false);
          }}
        />
      )}
    </div>
  );
};

interface ServiceModalProps {
  editService: Service | null;
  onClose: () => void;
  onSave: () => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ editService, onClose, onSave }) => {
  const isEditing = editService !== null;
  const [formData, setFormData] = useState<CreateServiceRequest>({
    title: editService?.title || '',
    date: editService?.date || new Date().toISOString().split('T')[0],
    theme: editService?.theme || '',
    notes: editService?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editService) {
        await serviceApi.update(editService.id, formData);
      } else {
        await serviceApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Service' : 'Create New Service'}</h2>
          <button className="close-btn" onClick={onClose}><MdClose size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Service Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Sunday Morning Service"
            />
          </div>

          <div className="form-group">
            <label>Date *</label>
            <AppDatePicker value={formData.date}
              onChange={(d) => setFormData({ ...formData, date: d })}
              required className="form-input" />
          </div>

          <div className="form-group">
            <label>Theme</label>
            <input
              type="text"
              value={formData.theme || ''}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              placeholder="e.g., Grace and Mercy"
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or instructions..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ActivityModalProps {
  serviceId: string;
  editActivity: Activity | null;
  onClose: () => void;
  onSave: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ serviceId, editActivity, onClose, onSave }) => {
  const isEditing = editActivity !== null;
  const [formData, setFormData] = useState<CreateActivityRequest>({
    service_id: serviceId,
    name: editActivity?.name || '',
    duration_minutes: editActivity?.duration_minutes || 10,
    leader: editActivity?.leader || '',
    notes: editActivity?.notes || '',
  });

  const activityTemplates = [
    { name: 'Opening Prayer', duration: 5 },
    { name: 'Praise & Worship', duration: 20 },
    { name: 'Announcements', duration: 5 },
    { name: 'Offering', duration: 10 },
    { name: 'Sermon', duration: 45 },
    { name: 'Altar Call', duration: 15 },
    { name: 'Closing Prayer', duration: 5 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editActivity) {
        await activityApi.update(editActivity.id, formData);
      } else {
        await activityApi.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Activity' : 'Add Activity'}</h2>
          <button className="close-btn" onClick={onClose}><MdClose size={20} /></button>
        </div>

        {!isEditing && (
          <div className="activity-templates">
            <p>Quick Templates:</p>
            <div className="template-buttons">
              {activityTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn-template"
                  onClick={() => setFormData({
                    ...formData,
                    name: template.name,
                    duration_minutes: template.duration,
                  })}
                >
                  {template.name} ({template.duration}m)
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Activity Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Opening Prayer"
            />
          </div>

          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              required
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>Leader</label>
            <input
              type="text"
              value={formData.leader || ''}
              onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
              placeholder="e.g., Pastor John"
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instructions or special notes..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceManager;
