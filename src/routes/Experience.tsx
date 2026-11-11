import '../styles/experience.css';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Cta } from '../components/Cta';
import { PlanList } from '../components/PlanList';
import { SectionTitle } from '../components/SectionTitle';
import { TransitionLink } from '../components/TransitionLink';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';

type RecordCardData = {
  /** Company, lab, or hackathon — the card's h3. */
  name: string;
  /** Role / event line, rendered in the accent meta style. */
  meta: string;
  /** Achievement bullets; nodes allow inline links. */
  achievements: readonly ReactNode[];
};

/** A records card in the plan-item language: hatch, HUD corners, bulleted detail. */
function RecordCard({ name, meta, achievements }: RecordCardData) {
  return (
    <li className="plan-item hatch anim record-card">
      <span className="ui-corner tl" aria-hidden="true" />
      <span className="ui-corner tr" aria-hidden="true" />
      <span className="ui-corner bl" aria-hidden="true" />
      <span className="ui-corner br" aria-hidden="true" />
      <h3 className="plan-name">{name}</h3>
      <p className="plan-meta">{meta}</p>
      <ul className="record-list">
        {achievements.map((achievement, i) => (
          <li key={i}>{achievement}</li>
        ))}
      </ul>
    </li>
  );
}

const ROLE_ITEMS: readonly RecordCardData[] = [
  {
    name: 'delta dental insurance',
    meta: 'data engineering intern · atlanta, ga · may–aug 2026',
    achievements: [
      'Engineered a Python + Snowflake ETL pipeline for the National Provider File — 53M+ raw records refined into 27M dashboard-ready rows.',
      'Developed a Python AI agent connected to Snowflake and Matillion that builds and QA-checks pipelines from business-logic documents — saving 80% of developer time on manual ETL work.',
      'Led data validation across environments, ensuring consistent pipeline behavior over 600M+ records and 50 distinct data sources.',
    ],
  },
  {
    name: 'safe robotics lab, georgia tech',
    meta: 'undergraduate research assistant · dec 2025 – present',
    achievements: [
      'Teleoperate an OpenArm bimanual robot with Python scripts in MuJoCo for real-time object manipulation.',
      'Process data from human robot operators to train robot-learning models for autonomous actions.',
    ],
  },
  {
    name: 'nasa genelab multi-omics awg',
    meta: 'data analyst intern · remote · jun 2024 – sep 2025',
    achievements: [
      'Processed and analyzed stained microscopy data to identify gene-expression patterns.',
      'Clustered biological samples with K-Means to uncover structural relationships across gene datasets.',
      'Applied Random Forest, Logistic Regression, Single-Layer Perceptron, SVM, Ridge, and Lasso models, combining results through union/intersection analysis for predictive reliability.',
      'Communicated model insights and technical findings to the biological research team.',
    ],
  },
];

function hackathonItems(onNavigate?: SectionNavHandler): readonly RecordCardData[] {
  return [
    {
      name: 'hacklytics 2026 — 2nd place, best use of actian vectorai db',
      meta: 'georgia tech · 50+ teams',
      achievements: [
        <>
          Built{' '}
          <TransitionLink to="/projects/" className="record-pill" onNavigate={onNavigate}>
            RxGuard
          </TransitionLink>
          , a semantic drug-interaction search engine over FDA adverse-event data — four progressive
          search engines, 384-dim embeddings, and ~30% better retrieval than keyword search.
        </>,
      ],
    },
    {
      name: 'ai atl 2025',
      meta: 'hackathon · atlanta',
      achievements: [
        'Built Hearo — a voice-first AI vision assistant that narrates scenes for blind and low-vision users, using Gemini 2.5 Flash and ElevenLabs.',
      ],
    },
    {
      name: 'hackgt 2025 — team lead',
      meta: 'georgia tech hackathon',
      achievements: [
        'Led SnapFind, an AI-assisted lost & found platform: chose the tech stack and managed PRs, workflows, and delivery milestones.',
      ],
    },
  ];
}

export type ExperienceProps = {
  onNavigate?: SectionNavHandler;
};

/** The `experience` section: work.log. */
export function Experience({ onNavigate }: ExperienceProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page"
      id="experience"
      aria-labelledby="experience-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// work.log</p>
          <SectionTitle id="experience-title" text="experience" />
        </header>

        <div className="section-body">
          <p className="section-intro anim">
            Roles, research, and hackathon results — the record so far:
          </p>

          <PlanList className="record-list-group">
            {ROLE_ITEMS.map((item) => (
              <RecordCard key={item.name} {...item} />
            ))}
          </PlanList>

          <hr className="rule" />

          <p className="section-note anim">// hackathons &amp; medals</p>

          <PlanList className="record-list-group">
            {hackathonItems(onNavigate).map((item) => (
              <RecordCard key={item.name} {...item} />
            ))}
          </PlanList>

          <p className="cta-row anim">
            <Cta onNavigate={onNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
