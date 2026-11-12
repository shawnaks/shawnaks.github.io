import { describe, expect, it } from 'vitest';
import { PROJECTS, getNextProject, getProject } from './projects';

describe('PROJECTS data', () => {
  it('has six projects with unique slugs', () => {
    expect(PROJECTS).toHaveLength(6);
    expect(new Set(PROJECTS.map((project) => project.slug)).size).toBe(PROJECTS.length);
  });

  it('gives every project at least one step with a challenge and a solution', () => {
    for (const project of PROJECTS) {
      expect(project.steps.length, project.slug).toBeGreaterThan(0);
      for (const step of project.steps) {
        expect(step.challenge.trim(), project.slug).not.toBe('');
        expect(step.solution.trim(), project.slug).not.toBe('');
      }
    }
  });
});

describe('getProject', () => {
  it('finds every slug, case-insensitively', () => {
    for (const project of PROJECTS) {
      expect(getProject(project.slug)).toBe(project);
      expect(getProject(project.slug.toUpperCase())).toBe(project);
    }
  });
});

describe('getNextProject', () => {
  it('wraps from the last project back to the first', () => {
    expect(getNextProject('pong')).toBe(PROJECTS[0]);
    expect(getNextProject('pong')).toBe(getProject('snapfind'));
  });

  it('matches slugs case-insensitively', () => {
    expect(getNextProject('PONG')).toBe(PROJECTS[0]);
    expect(getNextProject('SNAPFIND')).toBe(PROJECTS[1]);
  });
});
