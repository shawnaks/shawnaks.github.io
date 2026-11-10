import { useRef } from 'react';
import { Cta } from '../components/Cta';
import { PlanList } from '../components/PlanList';
import type { PlanItemData } from '../components/PlanItem';
import { SectionTitle } from '../components/SectionTitle';
import { SkillBars } from '../components/SkillBars';
import type { NavigateHandler } from '../lib/transition';
import { revealDelay } from '../lib/transition';
import { useReveal } from '../hooks/useReveal';
import '../styles/about.css';

const EDUCATION: readonly PlanItemData[] = [
  {
    name: 'Georgia Institute of Technology',
    meta: 'B.S. computer science · atlanta, ga · dec 2027',
    body: 'threads: artificial intelligence & information internetworks · minor in mathematics',
  },
];

const COURSES = [
  'Data Structures & Algorithms',
  'Machine Learning',
  'Database Systems',
  'Systems & Networks',
  'Object Oriented Programming',
  'Probability & Statistics',
  'Combinatorial Analysis',
  'Objects & Design',
] as const;

const TOOLS =
  'Git · VS Code · IntelliJ & PyCharm · Jupyter · Claude Code & GitHub Copilot · Figma · Agile/Scrum · Prompt Engineering';

export type AboutProps = {
  onNavigate?: NavigateHandler;
};

/** `#/about/` — whoami: bio, education, coursework, skill stack. */
export function About({ onNavigate }: AboutProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef, revealDelay());

  return (
    <section
      ref={sectionRef}
      className="section section--page is-active"
      id="about"
      aria-labelledby="about-title"
    >
      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// whoami</p>
          <SectionTitle id="about-title" text="about" />
        </header>

        <div className="section-body">
          <p className="lead anim">
            I’m <strong>Shawnak Samaddar</strong>, a computer science undergraduate at Georgia
            Institute of Technology in Atlanta. My threads are artificial intelligence and
            information internetworks, with a minor in mathematics — expected December 2027.
          </p>

          <p className="lead anim">
            I build full-stack web applications and machine-learning tools, and I like turning
            real-world problems into working software. My work so far spans data engineering — 53M+
            record pipelines at Delta Dental — applied machine learning — CNNs, semantic search, and
            six-model ensembles for NASA GeneLab — and robotics research in Georgia Tech’s Safe
            Robotics Lab.
          </p>

          <p className="lead anim">
            I started in 2022 by rebuilding Pong in a single Python file. Since then I’ve led a
            hackathon team, taken 2nd place out of 50+ teams, and shipped AI-powered products end to
            end — from React frontends to FastAPI backends to deployed models.
          </p>

          <p className="section-label about-label anim">// education</p>

          <PlanList className="about-edu" items={EDUCATION} />

          <p className="section-label about-label anim">// coursework</p>

          <ul className="course-list" aria-label="coursework">
            {COURSES.map((course) => (
              <li className="course-chip anim" key={course}>
                {course}
              </li>
            ))}
          </ul>

          <p className="section-label about-label anim">// skill stack</p>

          <SkillBars />

          <p className="section-label about-label anim">// tools &amp; more</p>

          <p className="tools-line anim">{TOOLS}</p>

          <p className="cta-row anim">
            <Cta onNavigate={onNavigate} />
          </p>
        </div>
      </div>
    </section>
  );
}
