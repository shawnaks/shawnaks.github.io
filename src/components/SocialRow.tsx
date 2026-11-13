import { EMAIL, SOCIALS } from '../data/site';
import { COPY_EMAIL_LABEL, copyEmail } from './CopyEmail';
import { Icon } from './Icon';
import { openResumePreview } from './ResumePreview';

/** github · linkedin · email · résumé — external links, copy, in-page preview. */
export function SocialRow() {
  return (
    <ul className="social-row anim">
      {SOCIALS.map((social) => (
        <li key={social.id}>
          {social.id === 'email' ? (
            <button
              type="button"
              className="copy-email-icon"
              aria-label={COPY_EMAIL_LABEL}
              title={EMAIL}
              onClick={() => void copyEmail()}
            >
              <Icon name={social.icon} />
            </button>
          ) : social.id === 'resume' ? (
            // copy-email-icon is the row's button square: same 48/42px + hover
            // states as the link siblings, without a second set of styles.
            <button
              type="button"
              className="copy-email-icon"
              aria-label="preview résumé"
              title={social.title}
              onClick={openResumePreview}
            >
              <Icon name={social.icon} />
            </button>
          ) : (
            <a
              href={social.href}
              {...(social.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              {...(social.download ? { download: '' } : {})}
              aria-label={social.label}
              title={social.title}
            >
              <Icon name={social.icon} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
