/* ====================================================================================================
 * File Name: WeavingTimeline.jsx
 * Folder: frontend/src/components/
 * 
 * 8-Step Weaving Ritual Timeline Component
 * ----------------------------------------------------------------------------------------------------
 * Displays the 8-fold traditional handloom process (1000-Day Discipline) of crafting authentic Patola sarees.
 * ==================================================================================================== */

import React from 'react';

const STEPS = [
  { step: 1, title: 'Pure Mulberry Silk Spinning', badge: 'Step 1 • Selection', desc: 'Only premium eight-ply raw mulberry silk yarns are spun and degummed to achieve high tensile resilience and radiant natural lustre.' },
  { step: 2, title: 'Geometric Graph Plotting', badge: 'Step 2 • Mathematics', desc: 'The Master Weaver drafts the entire saree design on graph paper. Every intersecting coordinate of warp and weft is calculated before a single knot is tied.' },
  { step: 3, title: 'Bandhani on Loose Silk Threads', badge: 'Step 3 • Resist Tying', desc: 'Cotton strings are tied tightly around microscopic clusters of silk yarn according to the graph to block dyes from penetrating specific zones.' },
  { step: 4, title: 'Natural Herbal Dyes', badge: 'Step 4 • Resilient Dyeing', desc: 'Threads undergo repetitive cycles of tying, untying, and boiling in natural pigments—madder root for crimson, fermented indigo for peacock blue, and turmeric for golden saffron.' },
  { step: 5, title: 'Mounting on Slanted Rosewood Loom', badge: 'Step 5 • Loom Dressing', desc: 'Dyed warp yarns are stretched onto a handcrafted rosewood loom, tilted at an angle so two master weavers can balance body weight and maintain uniform tension.' },
  { step: 6, title: 'Bamboo Needle Alignment', badge: 'Step 6 • Dual Weaving', desc: 'With every single pass of the weft shuttle, artisans use pointed bamboo pins to microscopically lock each color point in place. Only 8 to 10 inches can be woven in a full day.' },
  { step: 7, title: 'Identical Front & Back Radiance', badge: 'Step 7 • Reversible Perfection', desc: 'Because every thread is dyed completely through before weaving, the finished masterpiece is 100% identical on both front and back. There is no reverse side.' },
  { step: 8, title: 'Silk Mark & Lifetime Guarantee', badge: 'Step 8 • Heirloom Seal', desc: 'Each saree is numbered, tested, and sealed with government Silk Mark certification, arriving in a custom handcrafted velvet box with an authenticity scroll.' }
];

export default function WeavingTimeline() {
  return (
    <section className="section-padding craftsmanship-section" id="craftsmanship">
      <div className="container">
        <div className="section-header">
          <span className="section-eyebrow">The 1000-Day Discipline</span>
          <h2 className="section-title">The 8-Fold Weaving Ritual</h2>
          <p className="section-subtitle">
            Unlike ordinary printed or jacquard sarees, a true Double Ikat Patola is created through sheer mathematics and handloom mastery.
          </p>
          <div className="gold-divider"></div>
        </div>

        <div className="timeline-track-wrap">
          {STEPS.map((s) => (
            <div key={s.step} className="timeline-step-row">
              <div className="timeline-center-node">{s.step}</div>
              <div className="timeline-step-content">
                <span className="step-meta-badge">{s.badge}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
