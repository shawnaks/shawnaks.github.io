import { useRef } from 'react';
import { Cta } from '../components/Cta';
import { LeafRain } from '../components/LeafRain';
import { PlanList } from '../components/PlanList';
import type { PlanItemData } from '../components/PlanItem';
import { Portrait } from '../components/Portrait';
import { SectionTitle } from '../components/SectionTitle';
import { SkillBars } from '../components/SkillBars';
import { FACTS } from '../data/site';
import type { SectionNavHandler } from '../lib/sections';
import { useReveal } from '../hooks/useReveal';
import '../styles/about.css';

const EDUCATION: readonly PlanItemData[] = [
  {
    name: 'Georgia Institute of Technology',
    meta: `B.S. computer science · atlanta, ga · ${FACTS.graduationShort}`,
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
  onNavigate?: SectionNavHandler;
};

/** The `about` section: bio, education, coursework, skill stack. */
export function About({ onNavigate }: AboutProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="section section--page"
      id="about"
      aria-labelledby="about-title"
    >
      <LeafRain />

      <div className="container">
        <header className="section-head">
          <p className="section-label anim">// whoami</p>
          <SectionTitle id="about-title" text="about" letters />
        </header>

        <div className="section-body">
          <div className="about-bio">
            <div className="about-bio-copy">
              <p className="lead anim">
                I’m <strong>Shawnak Samaddar</strong>, a computer science undergraduate at Georgia
                Institute of Technology in Atlanta. My threads are artificial intelligence and
                information internetworks, with a minor in mathematics — expected {FACTS.graduation}.
              </p>

              <p className="lead anim">
                I build full-stack web applications and machine-learning tools, and I like turning
                real-world problems into working software. My work so far spans data engineering —{' '}
                {FACTS.deltaRecords} record pipelines at Delta Dental — applied machine learning — CNNs
                and six-model ensembles at NASA GeneLab, semantic search in RxGuard — and robotics
                research in Georgia Tech’s Safe Robotics Lab.
              </p>

              <p className="lead anim">
                I started in 2022 by rebuilding Pong in a single Python file. Since then I’ve led a
                hackathon team, taken {FACTS.hackathonPlace} out of {FACTS.hackathonTeams}, and shipped
                AI-powered products end to end — from React frontends to FastAPI backends to deployed
                models.
              </p>
            </div>

            <Portrait size="lg" />
          </div>

          <p id="about-education" className="section-label about-label anim">// education</p>

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
