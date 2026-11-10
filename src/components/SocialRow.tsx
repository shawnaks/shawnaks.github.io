import { SOCIALS } from '../data/site';
import { Icon } from './Icon';

export type SocialRowProps = {
  className?: string;
};

/** github · linkedin · email · résumé — external links + PDF download. */
export function SocialRow({ className }: SocialRowProps) {
  return (
    <ul className={['social-row', 'anim', className].filter(Boolean).join(' ')}>
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
