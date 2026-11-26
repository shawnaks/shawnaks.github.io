/** The skill stack, as full-width bars. Deliberately no percentages. */
const SKILLS = [
  'Python',
  'JavaScript / TypeScript',
  'React & Next.js',
  'Data Engineering (Snowflake, pandas)',
  'FastAPI & Node.js',
  'Machine Learning (PyTorch, TensorFlow)',
  'Java & C/C++',
  'Cloud & DevOps (AWS, Docker)',
] as const;

/**
 * Full-width skill bars in the accent green. The bars carry no numbers and no
 * relative lengths: each track is the same, so the list claims membership in
 * the stack rather than a measured score.
 */
export function SkillBars() {
  return (
    <ul className="skill-bars hatch anim">
      {SKILLS.map((label) => (
        <li className="skill-bar" key={label}>
          <span className="skill-name skill-name--top">{label}</span>
          <div className="skill-track">
            <div className="skill-fill">
              <span className="skill-name">{label}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
