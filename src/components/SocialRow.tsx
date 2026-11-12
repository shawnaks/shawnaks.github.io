import { SOCIALS } from '../data/site';
import { Icon } from './Icon';

/** github · linkedin · email · résumé — external links + PDF download. */
export function SocialRow() {
  return (
    <ul className="social-row anim">
      {SOCIALS.map((social) => (
        <li key={social.id}>
          <a
            href={social.href}
            {...(social.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            {...(social.download ? { download: '' } : {})}
            aria-label={social.label}
            title={social.title}
          >
            <Icon name={social.icon} />
          </a>
        </li>
      ))}
    </ul>
  );
}
