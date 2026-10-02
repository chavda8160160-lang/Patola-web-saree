/* ====================================================================================================
 * File Name: ArtisanStory.jsx
 * Folder: frontend/src/components/
 * 
 * Artisan Heritage & Loom Lineage Story Component
 * ----------------------------------------------------------------------------------------------------
 * Showcases the cultural legacy of master handloom weavers in Gujarat, ethical fair-trade support,
 * and genuine Silk Mark certifications.
 * ==================================================================================================== */

import React from 'react';

export default function ArtisanStory({ onOpenBooking }) {
  return (
    <section className="section-padding artisan-section" id="artisans">
      <div className="container">
        <div className="artisan-split-grid">
          <div className="artisan-media-composition">
            <img
              src="/assets/images/artisan_loom.jpg"
              alt="Master Craftsman weaving authentic Patola on traditional loom"
              className="artisan-main-img"
            />
            <div className="artisan-floating-quote-card">
              <p>"We don't weave threads; we weave prayers and mathematics that will live for three hundred years."</p>
              <span>— Master Artisan, 4th Generation</span>
            </div>
          </div>

          <div className="artisan-text-details">
            <span className="section-eyebrow">Living Cultural Heritage</span>
            <h2>Preserving An Ancient Loom Lineage</h2>
            <p>
              For centuries, the traditional weavers of Gujarat have guarded the closely held secrets of Double Ikat. Passed down strictly from father to son, this complex mathematical art requires two master artisans working synchronously on a single loom.
            </p>
            <p>
              By collecting a Patola Made Vankar drape, you become a custodian of this rare handloom heritage, ensuring master weaver families continue to practice their sacred art with dignity and pride.
            </p>

            <ul className="artisan-features-list">
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100% Ethical Fair-Trade compensation direct to weaver families
              </li>
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                No modern powerlooms or digital printed replicas
              </li>
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Authenticity scroll signed by the master craftsman who crafted your saree
              </li>
            </ul>

            <button className="btn-primary-gold" onClick={onOpenBooking}>
              Plan a Loom Studio Visit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
