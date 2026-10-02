/* ====================================================================================================
 * File Name: ConsultationModal.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Private video consultation and loom visit booking modal form.
 * - Collects customer name, phone, email, experience type, and date.
 * - Submits data via ApiService.createBooking to .NET Core Web API.
 * - Saves booking record to SQL Server Database.
 * 
 * Connected Stored Procedure:
 * - EXEC [dbo].[sp_CreateBooking] @FullName, @Phone, @Email, @ExperienceType, @PreferredDate, 
 *                                 @MotifPreference, @Notes, @NewBookingId OUTPUT
 * ==================================================================================================== */

import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { validateCustomerSecurity, showSecurityToast } from '../utils/security';

export default function ConsultationModal({ isOpen, onClose, onShowToast }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    experienceType: 'Virtual Video Call',
    preferredDate: '',
    motifPreference: 'Nari Kunjar',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sec = validateCustomerSecurity(formData.fullName, formData.phone, formData.email);
    if (sec.isFake) {
      showSecurityToast(sec.reason);
      alert(sec.reason);
      return;
    }

    setSubmitting(true);

    await ApiService.createBooking(formData);

    setSubmitting(false);
    try {
      window.dispatchEvent(new CustomEvent('patola:booking_created', { detail: formData }));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    onClose();
    onShowToast(`✨ Consultation confirmed for ${formData.fullName}!`);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      experienceType: 'Virtual Video Call',
      preferredDate: '',
      motifPreference: 'Nari Kunjar',
      notes: ''
    });
  };

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '780px', padding: '2.5rem' }} onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose} aria-label="Close Modal">✕</button>

        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <span className="section-eyebrow">Private Concierge</span>
          <h3 style={{ fontFamily: 'var(--font-royal)', fontSize: '1.8rem', color: 'var(--color-primary-dark)' }}>
            Schedule Royal Consultation
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            1-on-1 virtual video loom session or private heritage studio appointment.
          </p>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="form-label">Phone / WhatsApp *</label>
            <input
              type="tel"
              className="form-input"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter 10-digit mobile"
            />
          </div>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="form-label">Experience Type</label>
            <select
              className="form-select"
              value={formData.experienceType}
              onChange={(e) => setFormData({ ...formData, experienceType: e.target.value })}
            >
              <option value="Virtual Video Call">Virtual Video Loom Consultation</option>
              <option value="Studio Loom Visit">In-person Loom Studio Visit</option>
              <option value="Bridal Trousseau Curation">Bridal Trousseau Curation</option>
            </select>
          </div>

          <div>
            <label className="form-label">Preferred Date *</label>
            <input
              type="date"
              className="form-input"
              required
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">Motif Preference</label>
            <select
              className="form-select"
              value={formData.motifPreference}
              onChange={(e) => setFormData({ ...formData, motifPreference: e.target.value })}
            >
              <option value="Nari Kunjar">Nari Kunjar (Elephant & Lady)</option>
              <option value="Ratanchowk">Ratanchowk (Jewel Square)</option>
              <option value="Chhabdi Bhat">Chhabdi Bhat (Floral Basket)</option>
              <option value="Pan Bhat">Pan Bhat (Betel Leaf & Gems)</option>
              <option value="Navratna">Navratna (Nine Gems Geometric)</option>
              <option value="Sakhiyo">Sakhiyo (Figurative / Human)</option>
            </select>
          </div>

          <div className="form-group-full">
            <label className="form-label">Special Notes / Wedding Date</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special request"
            />
          </div>

          <button type="submit" className="btn-submit-booking" disabled={submitting}>
            {submitting ? 'Connecting to SQL Server...' : 'Confirm Consultation  ✦'}
          </button>
        </form>
      </div>
    </div>
  );
}
